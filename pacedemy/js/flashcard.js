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
let sessionStart = null;
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
  // Bước 1: cho xem danh sách trước, chưa vào thẻ ngay
  drawList('list-box');
  $('list-sub').textContent =
    'Bộ này có ' + deck.length + ' từ. Xem lướt một lượt cho quen mặt chữ, rồi mới lật thẻ.';
  $('view-list').classList.remove('hidden');

  $('btn-start-deck').addEventListener('click', function () {
    sessionStart = Date.now();
    $('view-list').classList.add('hidden');
    $('view-deck').classList.remove('hidden');
    render();
  });
})();

// ---------- Danh sách từ, dùng cho cả trước và sau khi lật thẻ ----------

function drawList(boxId) {
  const box = $(boxId);
  if (!box) return;

  let html = '<ul class="wordlist">';

  for (const w of deck) {
    html +=
      '<li>' +
        '<div class="wl-main">' +
          '<span class="wl-word">' + esc(w.word) + '</span>' +
          (w.phonetic ? '<span class="wl-ipa">' + esc(w.phonetic) + '</span>' : '') +
          (w.pos ? '<span class="wl-pos">' + esc(w.pos) + '</span>' : '') +
        '</div>' +
        '<div class="wl-mean">' + esc(w.meaning_vi || '') + '</div>' +
        '<div class="wl-act">' +
          '<button class="wl-say" data-listsay="' + esc(w.word) + '" title="Nghe">&#128266;</button>' +
        '</div>' +
      '</li>';
  }

  html += '</ul>';
  box.innerHTML = html;

  box.querySelectorAll('button[data-listsay]').forEach(function (b) {
    b.addEventListener('click', function () { speak(b.dataset.listsay, 'US'); });
  });
}

// ---------- Nạp bộ thẻ ----------

async function loadDeck(onlyIds) {
  if (!topicSlug) return;

  const { data: t } = await db
    .from('topics').select('id, name_vi').eq('slug', topicSlug).single();
  if (!t) return;

  $('topic-name').textContent = t.name_vi;

  const { data: words } = await db.from('vocabulary')
    .select('id, word, phonetic, pos, meaning_vi, example_en, example_vi, synonyms, collocations, level, image_url, am_thanh')
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
  if (w.image_url) {
    $('f-image').src = w.image_url;
    $('f-image').classList.remove('hidden');
  } else {
    $('f-image').classList.add('hidden');
    $('f-image').removeAttribute('src');
  }
  $('f-word').textContent = w.word;
  $('f-pos').textContent = w.pos || '';
  $('f-pos').style.display = w.pos ? '' : 'none';
  $('f-phonetic').textContent = w.phonetic || '';

  // Mặt sau
  $('b-word').textContent = w.word;
  $('b-meaning').textContent = w.meaning_vi;
  $('b-count').textContent = 'Thẻ ' + (at + 1) + ' / ' + deck.length;

  fillList('blk-syn', 'b-syn', w.synonyms, ',', function (x) {
    return '<button class="chip" data-say="' + esc(x) + '">' + esc(x) + '</button>';
  });

  fillList('blk-col', 'b-col', w.collocations, ';', function (x) {
    // Định dạng: "cụm tiếng Anh — nghĩa tiếng Việt"
    const bits = x.split(/\s+[—–-]\s+/);
    const en = bits[0].trim();
    const vi = bits.length > 1 ? bits.slice(1).join(' - ').trim() : '';
    return '<li data-say="' + esc(en) + '">' +
             '<span class="col-en">' + esc(en) + '</span>' +
             (vi ? '<span class="col-vi">' + esc(vi) + '</span>' : '') +
           '</li>';
  });

  bindSayTargets();

  if (w.example_en) {
    $('blk-ex').style.display = '';
    $('b-ex').innerHTML = highlight(w.example_en, w.word);
    $('b-exvi').textContent = w.example_vi || '';
    $('btn-say-ex').dataset.say = w.example_en;
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

// ---------- Bấm vào chữ để nghe ----------

function bindSayTargets() {
  document.querySelectorAll('.card-back [data-say]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      sayHere(el, el.dataset.say);
    });
  });
}

// ---------- Giọng đọc ----------
//
// Trước đây trang này có bộ đọc riêng, không dùng chung với cả web.
// Nó mang đúng ba lỗi mà speak.js đã chữa: lấy giọng en-US đầu tiên
// tìm thấy nên mỗi máy một giọng, đọc cả khi danh sách giọng chưa
// về, và tốc độ 0.8 chậm hơn người nói thật nhiều. Nó cũng không
// đụng tới file ghi âm trong kho, nên bao nhiêu file tạo ra cũng
// không được dùng ở đúng trang học viên mở nhiều nhất.
//
// Giờ gọi thẳng Speak: có file thì phát file, không thì máy đọc.

// Từ của thẻ đang mở mới có file ghi âm; câu ví dụ thì không.
function amCuaThe(text) {
  const t = deck[at] || {};
  const w = String(t.word || '').trim().toLowerCase();
  return w && String(text).trim().toLowerCase() === w ? t.am_thanh : null;
}

// Đọc và tô sáng đúng phần tử vừa bấm
function sayHere(el, text) {
  if (!text || typeof Speak === 'undefined') return;

  document.querySelectorAll('.speaking').forEach(function (x) {
    x.classList.remove('speaking');
  });
  el.classList.add('speaking');

  Speak.phat(amCuaThe(text), text, 'US', function () {
    el.classList.remove('speaking');
  });
}

function speak(text, kind) {
  if (!text || typeof Speak === 'undefined') return;

  document.querySelectorAll('.audio-btn.playing').forEach(function (x) {
    x.classList.remove('playing');
  });
  const btn = document.querySelector('.audio-btn[data-voice="' + kind + '"]');
  if (btn) btn.classList.add('playing');

  Speak.phat(amCuaThe(text), text, kind, function () {
    if (btn) btn.classList.remove('playing');
  });
}

$('btn-say-ex').addEventListener('click', function (e) {
  e.stopPropagation();
  sayHere(this, this.dataset.say);
});

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

  if (sessionStart) {
    const secs = Math.round((Date.now() - sessionStart) / 1000);
    db.from('attempts').insert({
      user_id: me.id, mode: 'flashcard',
      total_questions: deck.length, correct_count: 0,
      seconds_used: secs, submitted_at: new Date().toISOString()
    }).then(function (res) {
      if (res.error) {
        console.error('Không ghi được thời gian học thẻ:', res.error.message);
        toast('Không ghi được thời gian học thẻ.', 'bad');
      }
    });
    sessionStart = null;
  }

  // Cho xem lại toàn bộ danh sách một lần nữa
  $('recap-box').innerHTML = '<p class="review-head">Nhắc lại cả bộ ' + deck.length + ' từ</p>';
  const wrap = document.createElement('div');
  wrap.id = 'recap-list';
  $('recap-box').appendChild(wrap);
  drawList('recap-list');

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
