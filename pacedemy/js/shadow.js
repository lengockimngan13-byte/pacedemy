// ============================================================
// Pacedemy — Luyện nói theo (Shadowing), bản miễn phí.
// Nguồn câu: câu ví dụ (example_en) có sẵn trong kho từ vựng của
// chủ đề, HOẶC tự gõ câu bất kỳ. Nghe mẫu dùng giọng đọc trình
// duyệt. Ghi âm + chấm điểm dùng Web Speech API của Chrome —
// chuyển giọng nói thành chữ rồi so từ với câu mẫu, ra % từ khớp.
// Đây CHỈ LÀ ước lượng thô theo từ nhận diện được, không phải
// chấm phát âm thật (không đánh giá ngữ điệu/trọng âm).
//
// Không lưu ghi âm lên server — mọi thứ chạy trong trình duyệt,
// rời trang là mất, không tốn dung lượng Supabase.
// ============================================================

let me = null;
let topicSlug = null;
let deck = [];
let at = 0;
let recognizing = false;
let recordedUrl = null;

// Câu đang luyện — lấy từ bộ đề, hoặc tự nhập (custom = true thì ưu
// tiên dùng current thay vì deck[at]).
let current = { en: '', vi: '' };
let customMode = false;

const $ = function (id) { return document.getElementById(id); };

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

(async function () {
  me = await requireLogin();
  if (!me) return;

  topicSlug = new URLSearchParams(location.search).get('chu-de');
  if (!topicSlug) { location.replace('vocab.html'); return; }

  $('crumb-back').href = 'topic.html?chu-de=' + encodeURIComponent(topicSlug);

  await loadDeck();

  if (!SpeechRec) {
    $('view-unsupported').classList.remove('hidden');
  }

  $('view-shadow').classList.remove('hidden');
  bindStaticButtons();

  if (deck.length) {
    renderDeckCard();
  } else {
    $('deck-empty-note').classList.remove('hidden');
    $('deck-nav-top').classList.add('hidden');
    $('deck-nav-bottom').classList.add('hidden');
    showCard({ en: '', vi: '' });
  }
})();

async function loadDeck() {
  const { data: t } = await db.from('topics').select('id, name_vi').eq('slug', topicSlug).single();
  if (!t) return;

  const { data: words } = await db.from('vocabulary')
    .select('id, word, example_en, example_vi')
    .eq('topic_id', t.id)
    .order('level').order('order_index').order('id');

  deck = (words || []).filter(function (w) { return w.example_en && w.example_en.trim(); });

  if (t) $('sh-sub').textContent = t.name_vi + ' · ' + deck.length + ' câu có ví dụ trong kho';
}

// ---------- Hiển thị 1 câu (dùng chung cho cả bộ đề lẫn tự nhập) ----------

function showCard(c) {
  current = c;
  $('sh-en').textContent = c.en || '—';
  $('sh-vi').textContent = c.vi || '';
  $('sh-result').classList.add('hidden');

  if (recordedUrl) { URL.revokeObjectURL(recordedUrl); recordedUrl = null; }
  $('sh-playback').removeAttribute('src');

  resetRecordButton();
}

function renderDeckCard() {
  customMode = false;
  const w = deck[at];
  $('sh-counter').textContent = 'Câu ' + (at + 1) + ' / ' + deck.length;
  $('sh-progress').style.width = (at / deck.length * 100) + '%';
  showCard({ en: w.example_en, vi: w.example_vi || '' });
}

function bindStaticButtons() {
  $('btn-listen').addEventListener('click', function () {
    if (current.en) speak(current.en);
  });

  $('btn-retry').addEventListener('click', function () {
    renderDeckCard();
  });

  $('btn-next').addEventListener('click', function () {
    at = (at + 1) % deck.length;
    renderDeckCard();
  });

  $('btn-use-custom').addEventListener('click', function () {
    const text = $('sh-custom-text').value.trim();
    if (!text) { toast('Gõ một câu trước đã nhé.', 'bad'); return; }
    customMode = true;
    showCard({ en: text, vi: '' });
    $('sh-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function resetRecordButton() {
  const btn = $('btn-record');
  if (!SpeechRec) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden', 'recording');
  btn.disabled = !current.en;
  btn.textContent = '🎙 Ghi âm';
  btn.onclick = function () { if (!recognizing && current.en) startRecording(); };
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

// ---------- Ghi âm + nhận diện giọng nói ----------

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    toast('Không dùng được micro: ' + (e.message || 'bị từ chối quyền'), 'bad');
    return;
  }

  const chunks = [];
  const mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
  mediaRecorder.onstop = function () {
    stream.getTracks().forEach(function (t) { t.stop(); });
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    recordedUrl = URL.createObjectURL(blob);
    $('sh-playback').src = recordedUrl;
  };
  mediaRecorder.start();

  recognizing = true;
  const btn = $('btn-record');
  btn.textContent = '⏹ Đang ghi… bấm để dừng';
  btn.classList.add('recording');

  let finalTranscript = '';

  const rec = new SpeechRec();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = function (ev) {
    for (let i = 0; i < ev.results.length; i++) {
      finalTranscript += ev.results[i][0].transcript + ' ';
    }
  };

  rec.onerror = function () { /* im lặng, xử lý kết quả ở onend */ };

  rec.onend = function () {
    recognizing = false;
    if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    showResult(finalTranscript.trim());
  };

  rec.start();
  btn.onclick = function () { rec.stop(); };

  // Tự dừng sau 12 giây phòng khi quên bấm dừng
  setTimeout(function () { if (recognizing) rec.stop(); }, 12000);
}

function showResult(heard) {
  const pct = matchScore(current.en, heard);

  $('sh-heard-text').textContent = heard || '(không nghe được gì, thử lại gần micro hơn)';
  $('sh-score-num').textContent = pct + '%';

  let lab, cls;
  if (pct >= 85) { lab = 'Khá sát câu mẫu'; cls = 'sh-good'; }
  else if (pct >= 55) { lab = 'Tạm ổn, nghe lại mẫu rồi thử lại'; cls = 'sh-mid'; }
  else { lab = 'Còn lệch nhiều, thử lại nhé'; cls = 'sh-low'; }

  $('sh-score-lab').textContent = lab;
  $('sh-score-box').className = 'sh-score ' + cls;
  $('sh-result').classList.remove('hidden');

  resetRecordButton();
}

// ---------- So khớp từ (ước lượng thô) ----------

function normWords(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[.,!?;:"'()]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function matchScore(target, heard) {
  const tWords = normWords(target);
  const hWords = normWords(heard);
  if (!tWords.length) return 0;

  const hCount = {};
  hWords.forEach(function (w) { hCount[w] = (hCount[w] || 0) + 1; });

  let hit = 0;
  tWords.forEach(function (w) {
    if (hCount[w] > 0) { hit++; hCount[w]--; }
  });

  return Math.round(hit / tWords.length * 100);
}
