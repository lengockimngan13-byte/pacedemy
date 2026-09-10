// ============================================================
// Pacedemy — học thẻ từ vựng
// ============================================================

let me = null;
let deck = [];
let at = 0;
let flipped = false;
let marked = {};
let topicSlug = null;
let muc = null;
let bo = null;
const SET_SIZE = 12;

const $ = function (id) { return document.getElementById(id); };
const AUDIO_KEY = 'pacedemy_tu_doc';

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const saved = localStorage.getItem(AUDIO_KEY);
  $('auto-audio').checked = (saved === null) ? true : (saved === '1');

  const q = new URLSearchParams(location.search);
  topicSlug = q.get('chu-de');
  muc = q.get('muc');
  bo  = q.get('bo');
  const only = q.get('danh-dau');

  loadVoices();
  await loadDeck(only);

  if (!deck.length) {
    $('view-deck').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    return;
  }

  $('btn-test').href = 'study.html?chu-de=' + encodeURIComponent(topicSlug || '') +
                       (muc ? '&muc=' + muc : '') + (bo ? '&bo=' + bo : '');
  document.querySelectorAll('a[href="vocab.html"]').forEach(function (a) {
    a.href = 'topic.html?chu-de=' + encodeURIComponent(topicSlug || '');
  });
  render();
})();

// ---------- Nạp bộ thẻ ----------

async function loadDeck(onlyIds) {
  if (!topicSlug) return;

  const { data: t } = await db
    .from('topics').select('id, name_vi').eq('slug', topicSlug).single();
  if (!t) return;

  $('topic-name').textContent = t.name_vi;

  const { data: words } = await db.from('vocabulary')
    .select('id, word, phonetic, pos, meaning_vi, example_en, example_vi, synonyms, collocations, level')
    .eq('topic_id', t.id)
    .order('level')
    .order('order_index')
    .order('id');

  if (!words) return;

  if (onlyIds) {
    const keep = onlyIds.split(',').map(Number);
    deck = words.filter(function (w) { return keep.indexOf(w.id) !== -1; });
    return;
  }

  let list = words;

  if (muc) {
    const lv = parseInt(muc, 10);
    list = list.filter(function (w) { return (w.level || 1) === lv; });
  }

  if (bo) {
    const i = parseInt(bo, 10) - 1;
    list = list.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    $('topic-name').textContent = $('topic-name').textContent + ' · Bộ ' + bo;
  }

  deck = list;
}

// ---------- Hiển thị ----------

function render(speakIt) {
  const w = deck[at];

  flipped = false;
  $('card').classList.remove('flipped');
  $('progress').style.width = ((at + 1) / deck.length * 100) + '%';

  // Mặt trước
  $('f-word').textContent = w.word;
  $('f-pos').textContent = w.pos || '';
  $('f-pos').style.display = w.pos ? '' : 'none';
  $('f-phonetic').textContent = w.phonetic || '';

  // Mặt sau
  $('b-word').textContent = w.word;
  $('b-meaning').textContent = w.meaning_vi;
  $('b-count').textContent = 'Thẻ ' + (at + 1) + ' / ' + deck.length;

  fillList('blk-syn', 'b-syn', w.synonyms, ',', function (x) {
    return '<span class="chip">' + esc(x) + '</span>';
  });

  fillList('blk-col', 'b-col', w.collocations, ';', function (x) {
    return '<li>' + esc(x) + '</li>';
  });

  if (w.example_en) {
    $('blk-ex').style.display = '';
    $('b-ex').innerHTML = highlight(w.example_en, w.word);
    $('b-exvi').textContent = w.example_vi || '';
  } else {
    $('blk-ex').style.display = 'none';
  }

  document.querySelector('.card-back').scrollTop = 0;

  syncBookmarks();
  $('btn-prev').disabled = (at === 0);

  if (speakIt !== false) autoSpeak();
}

function fillList(blockId, listId, raw, sep, wrap) {
  const items = (raw || '').split(sep)
    .map(function (x) { return x.trim(); })
    .filter(Boolean);

  if (!items.length) { $(blockId).style.display = 'none'; return; }

  $(blockId).style.display = '';
  $(listId).innerHTML = items.map(wrap).join('');
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

$('card').addEventListener('click', function (e) {
  if (e.target.closest('.bookmark') || e.target.closest('.audio-btn')) return;
  flip();
});

$('btn-next').addEventListener('click', next);
$('btn-prev').addEventListener('click', prev);
$('btn-flip').addEventListener('click', flip);

// ---------- Đánh dấu chưa nhớ ----------

document.querySelectorAll('[data-mark]').forEach(function (b) {
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMark();
  });
});

function syncBookmarks() {
  const on = !!marked[deck[at].id];
  document.querySelectorAll('.bookmark').forEach(function (b) {
    b.classList.toggle('on', on);
    b.title = on ? 'Bỏ đánh dấu' : 'Đánh dấu chưa nhớ';
  });
}

async function toggleMark() {
  const w = deck[at];

  if (marked[w.id]) {
    delete marked[w.id];
  } else {
    marked[w.id] = true;
    await db.from('vocab_progress').upsert({
      user_id: me.id,
      vocabulary_id: w.id,
      status: 'learning',
      box: 1,
      last_reviewed: new Date().toISOString(),
      next_review: new Date().toISOString()
    }, { onConflict: 'user_id,vocabulary_id' });
  }

  syncBookmarks();
}

// ---------- Giọng đọc Mỹ và Anh ----------

let voices = [];

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function () {
    voices = window.speechSynthesis.getVoices();
  };
}

function pickVoice(kind) {
  const want = kind === 'UK' ? 'en-GB' : 'en-US';

  let v = voices.find(function (x) { return x.lang === want || x.lang === want.replace('-', '_'); });
  if (v) return v;

  // Không có giọng đúng vùng thì lấy giọng tiếng Anh bất kỳ
  v = voices.find(function (x) { return x.lang && x.lang.indexOf('en') === 0; });
  return v || null;
}

function speak(text, kind) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(kind);
    if (v) u.voice = v;
    u.lang = kind === 'UK' ? 'en-GB' : 'en-US';
    u.rate = 0.88;

    const btn = document.querySelector('.audio-btn[data-voice="' + kind + '"]');
    if (btn) {
      btn.classList.add('playing');
      u.onend = function () { btn.classList.remove('playing'); };
      u.onerror = function () { btn.classList.remove('playing'); };
    }

    window.speechSynthesis.speak(u);
  } catch (e) { /* trình duyệt không hỗ trợ thì bỏ qua */ }
}

document.querySelectorAll('.audio-btn').forEach(function (b) {
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    speak(deck[at].word, b.dataset.voice);
  });
});

$('auto-audio').addEventListener('change', function () {
  localStorage.setItem(AUDIO_KEY, this.checked ? '1' : '0');
  if (this.checked) autoSpeak();
});

function autoSpeak() {
  if (!$('auto-audio').checked) return;
  speak(deck[at].word, 'US');
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
  else if (k === 'p') { e.preventDefault(); speak(deck[at].word, 'US'); }
  else if (k === 'b') { e.preventDefault(); speak(deck[at].word, 'UK'); }
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
