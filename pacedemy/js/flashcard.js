// ============================================================
// Pacedemy — học thẻ từ vựng
// Lật thẻ, chuyển thẻ bằng bàn phím, tự đọc phát âm,
// đánh dấu từ chưa nhớ để ôn lại sau.
// ============================================================

let me = null;
let deck = [];
let at = 0;
let flipped = false;
let marked = {};          // { vocabulary_id: true }
let topicSlug = null;
let topicName = '';

const $ = function (id) { return document.getElementById(id); };

const AUDIO_KEY = 'pacedemy_tu_doc';

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  // Nhớ lựa chọn tự đọc của học viên
  const saved = localStorage.getItem(AUDIO_KEY);
  $('auto-audio').checked = (saved === null) ? true : (saved === '1');

  const q = new URLSearchParams(location.search);
  topicSlug = q.get('chu-de');
  const only = q.get('danh-dau');   // chỉ học lại các từ đã đánh dấu

  await loadDeck(only);

  if (!deck.length) {
    $('view-deck').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    return;
  }

  $('btn-test').href = 'study.html?chu-de=' + encodeURIComponent(topicSlug || '');
  render();
})();

// ---------- Nạp bộ thẻ ----------

async function loadDeck(onlyIds) {
  if (!topicSlug) return;

  const { data: t } = await db
    .from('topics').select('id, name_vi').eq('slug', topicSlug).single();
  if (!t) return;

  topicName = t.name_vi;
  $('topic-name').textContent = topicName;

  let qy = db.from('vocabulary')
    .select('id, word, phonetic, pos, meaning_vi, example_en, example_vi')
    .eq('topic_id', t.id)
    .order('order_index')
    .order('id');

  const { data: words } = await qy;
  if (!words) return;

  if (onlyIds) {
    const keep = onlyIds.split(',').map(Number);
    deck = words.filter(function (w) { return keep.indexOf(w.id) !== -1; });
  } else {
    deck = words;
  }
}

// ---------- Hiển thị thẻ ----------

function render(speakIt) {
  const w = deck[at];

  flipped = false;
  $('card').classList.remove('flipped');
  $('card').classList.toggle('marked', !!marked[w.id]);

  $('progress').style.width = ((at + 1) / deck.length * 100) + '%';

  $('f-word').textContent = w.word;
  $('f-phonetic').textContent = [w.pos, w.phonetic].filter(Boolean).join('  ');

  $('b-meaning').textContent = w.meaning_vi;
  $('b-ex').innerHTML = w.example_en ? highlight(w.example_en, w.word) : '';
  $('b-exvi').textContent = w.example_vi || '';
  $('b-count').textContent = 'Thẻ ' + (at + 1) + ' / ' + deck.length;

  updateMarkBtn();

  if (speakIt !== false) autoSpeak();
}

function updateMarkBtn() {
  const on = !!marked[deck[at].id];
  const b = $('btn-mark');
  b.classList.toggle('on', on);
  b.textContent = on ? 'Đã đánh dấu — bỏ dấu' : 'Đánh dấu chưa nhớ';
}

function highlight(sentence, word) {
  const safe = esc(sentence);
  const stem = esc(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp('(' + stem + '\\w*)', 'i'), '<b>$1</b>');
}

// ---------- Lật, chuyển thẻ ----------

function flip() {
  flipped = !flipped;
  $('card').classList.toggle('flipped', flipped);
  autoSpeak();
}

function next() {
  if (at + 1 >= deck.length) { finish(); return; }
  at++;
  render();
}

function prev() {
  if (at === 0) return;
  at--;
  render();
}

$('card').addEventListener('click', flip);
$('btn-next').addEventListener('click', next);
$('btn-prev').addEventListener('click', prev);

// ---------- Đánh dấu chưa nhớ ----------

$('btn-mark').addEventListener('click', toggleMark);

async function toggleMark() {
  const w = deck[at];

  if (marked[w.id]) {
    delete marked[w.id];
  } else {
    marked[w.id] = true;
    // Đưa từ này về hộp 1 để nó quay lại sớm trong phần ôn tập
    await db.from('vocab_progress').upsert({
      user_id: me.id,
      vocabulary_id: w.id,
      status: 'learning',
      box: 1,
      last_reviewed: new Date().toISOString(),
      next_review: new Date().toISOString()
    }, { onConflict: 'user_id,vocabulary_id' });
  }

  $('card').classList.toggle('marked', !!marked[w.id]);
  updateMarkBtn();
}

// ---------- Phát âm ----------

$('auto-audio').addEventListener('change', function () {
  localStorage.setItem(AUDIO_KEY, this.checked ? '1' : '0');
  if (this.checked) autoSpeak();
});

function autoSpeak() {
  if (!$('auto-audio').checked) return;
  speak(deck[at].word);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) { /* trình duyệt không hỗ trợ thì bỏ qua */ }
}

// ---------- Phím tắt ----------

document.addEventListener('keydown', function (e) {
  if (!$('view-done').classList.contains('hidden')) return;
  if (e.target.tagName === 'INPUT') return;

  const k = e.key.toLowerCase();

  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  else if (k === 'm') { e.preventDefault(); toggleMark(); }
  else if (k === 'p') { e.preventDefault(); speak(deck[at].word); }
});

// ---------- Kết thúc ----------

function finish() {
  $('view-deck').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  const ids = Object.keys(marked).map(Number);

  if (!ids.length) {
    $('done-sub').textContent =
      'Bạn đã xem hết ' + deck.length + ' thẻ và không đánh dấu từ nào. ' +
      'Làm bài kiểm tra để xem thực sự nhớ được bao nhiêu.';
    return;
  }

  $('done-sub').textContent =
    'Bạn đã xem hết ' + deck.length + ' thẻ, trong đó ' + ids.length +
    ' từ được đánh dấu chưa nhớ. Những từ này sẽ xuất hiện sớm trong phần ôn tập.';

  const words = deck.filter(function (w) { return marked[w.id]; });

  let html = '<p class="review-head">Từ bạn đánh dấu chưa nhớ</p><div class="review-list">';
  for (const w of words) {
    html +=
      '<div class="review-item">' +
        '<p class="rw">' + esc(w.word) + '</p>' +
        '<p class="rp">' + esc([w.pos, w.phonetic].filter(Boolean).join('  ')) + '</p>' +
        '<p class="rm">' + esc(w.meaning_vi) + '</p>' +
        (w.example_en ? '<p class="re">' + highlight(w.example_en, w.word) + '</p>' : '') +
      '</div>';
  }
  html += '</div>';
  $('marked-box').innerHTML = html;

  const redo = $('btn-redo');
  redo.classList.remove('hidden');
  redo.addEventListener('click', function () {
    location.href = 'flashcard.html?chu-de=' + encodeURIComponent(topicSlug) +
                    '&danh-dau=' + ids.join(',');
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
