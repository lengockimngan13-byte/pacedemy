// ============================================================
// Pacedemy — Luyện nói theo (Shadowing), bản miễn phí.
// Nguồn: audio + transcript THẬT đã tải lên — Part 1-4 (bảng
// listening_sets) hoặc Đề thi thử (bảng exam_listening). Chỉ giáo
// viên mới thêm/sửa được các bài này (qua Nhập bài nghe / Ngân
// hàng đề thi thử) — học viên chỉ chọn và luyện, không tự thêm bài.
// Ngoài ra vẫn có ô tự gõ câu bất kỳ để luyện độc lập.
//
// Nghe mẫu: có audio thật thì phát audio thật; câu tự gõ thì dùng
// giọng đọc trình duyệt (không có file thật để phát).
//
// Ghi âm + chấm điểm dùng Web Speech API của Chrome — chuyển giọng
// nói thành chữ rồi so từ với transcript, ra % từ khớp. Đây CHỈ LÀ
// ước lượng thô theo từ nhận diện được, không phải chấm phát âm
// thật (không đánh giá ngữ điệu/trọng âm).
//
// Không lưu ghi âm lên server — mọi thứ chạy trong trình duyệt,
// rời trang là mất, không tốn dung lượng Supabase.
// ============================================================

let me = null;
let src = '1';   // '1' | '2' | '3' | '4' | 'exam'
let deck = [];
let at = 0;
let recognizing = false;
let recordedUrl = null;

let current = { en: '', vi: '', audioUrl: null };

const $ = function (id) { return document.getElementById(id); };

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

(async function () {
  me = await requireLogin();
  if (!me) return;

  if (!SpeechRec) {
    $('view-unsupported').classList.remove('hidden');
  }

  bindStaticButtons();
  bindSourceTabs();
  await loadDeck(src);
})();

function bindSourceTabs() {
  document.querySelectorAll('#src-tabs .test-tab').forEach(function (b) {
    b.addEventListener('click', async function () {
      document.querySelectorAll('#src-tabs .test-tab').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      src = b.dataset.part;
      await loadDeck(src);
    });
  });
}

async function loadDeck(which) {
  at = 0;
  $('src-count').textContent = 'Đang tải…';

  let rows = [];

  if (which === 'exam') {
    const { data } = await db.from('exam_listening')
      .select('id, part, title, audio_url, transcript, transcript_vi')
      .not('audio_url', 'is', null)
      .not('transcript', 'is', null)
      .order('id');
    rows = data || [];
  } else {
    const { data } = await db.from('listening_sets')
      .select('id, part, title, audio_url, transcript, transcript_vi')
      .eq('part', parseInt(which, 10))
      .eq('is_active', true)
      .not('audio_url', 'is', null)
      .not('transcript', 'is', null)
      .order('id');
    rows = data || [];
  }

  deck = rows;

  const label = which === 'exam' ? 'đề thi thử' : 'Part ' + which;
  $('src-count').textContent = deck.length + ' bài có sẵn audio + script ở ' + label + '.';

  if (deck.length) {
    $('deck-empty-note').classList.add('hidden');
    $('deck-nav-top').classList.remove('hidden');
    $('deck-nav-bottom').classList.remove('hidden');
    renderDeckCard();
  } else {
    $('deck-empty-note').classList.remove('hidden');
    $('deck-nav-top').classList.add('hidden');
    $('deck-nav-bottom').classList.add('hidden');
    showCard({ en: '', vi: '', audioUrl: null });
  }
}

// ---------- Hiển thị 1 bài (dùng chung cho cả bộ đề lẫn tự nhập) ----------

function showCard(c) {
  current = c;
  $('sh-en').textContent = c.en || '—';
  $('sh-vi').textContent = c.vi || '';
  $('sh-result').classList.add('hidden');

  const modelAudio = $('sh-model-audio');
  if (c.audioUrl) {
    modelAudio.src = c.audioUrl;
    modelAudio.classList.remove('hidden');
  } else {
    modelAudio.removeAttribute('src');
    modelAudio.classList.add('hidden');
  }

  if (recordedUrl) { URL.revokeObjectURL(recordedUrl); recordedUrl = null; }
  $('sh-playback').removeAttribute('src');

  resetRecordButton();
}

function renderDeckCard() {
  const w = deck[at];
  $('sh-counter').textContent = 'Bài ' + (at + 1) + ' / ' + deck.length + (w.title ? ' · ' + w.title : '');
  $('sh-progress').style.width = (at / deck.length * 100) + '%';
  showCard({ en: w.transcript, vi: w.transcript_vi || '', audioUrl: w.audio_url });
}

function bindStaticButtons() {
  $('btn-listen').addEventListener('click', function () {
    if (current.audioUrl) {
      const a = $('sh-model-audio');
      a.currentTime = 0;
      a.play();
    } else if (current.en) {
      speak(current.en);
    }
  });

  $('btn-retry').addEventListener('click', function () {
    renderDeckCard();
  });

  $('btn-next').addEventListener('click', function () {
    if (!deck.length) return;
    at = (at + 1) % deck.length;
    renderDeckCard();
  });

  $('btn-use-custom').addEventListener('click', function () {
    const text = $('sh-custom-text').value.trim();
    if (!text) { toast('Gõ một câu trước đã nhé.', 'bad'); return; }
    showCard({ en: text, vi: '', audioUrl: null });
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

  // Tự dừng sau 15 giây phòng khi quên bấm dừng (script Part 3/4 dài hơn câu đơn)
  setTimeout(function () { if (recognizing) rec.stop(); }, 15000);
}

function showResult(heard) {
  const pct = matchScore(current.en, heard);

  $('sh-heard-text').textContent = heard || '(không nghe được gì, thử lại gần micro hơn)';
  $('sh-score-num').textContent = pct + '%';

  let lab, cls;
  if (pct >= 85) { lab = 'Khá sát script'; cls = 'sh-good'; }
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
    .replace(/^[wm]:\s*/gim, '')          // bỏ nhãn người nói "W:"/"M:" đầu dòng
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
