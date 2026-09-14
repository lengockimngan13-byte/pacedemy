// ============================================================
// Pacedemy — kiểm tra từ vựng, 3 kiểu chọn trước khi vào làm:
//   nghia    — từ → chọn nghĩa tiếng Việt (kiểu gốc, có tính Leitner)
//   colloc   — cụm quen dùng bị khuyết từ → chọn từ điền vào
//   synonym  — từ → chọn từ/cụm gần nghĩa nhất
// Chỉ kiểu "nghia" ghi vào vocab_progress (ảnh hưởng trạng thái
// đã thuộc). Hai kiểu còn lại là luyện thêm, không đụng Leitner.
// Không hiện đúng sai từng câu, dồn vào cuối bài.
// ============================================================

const SIZE = 10;
const XP_RIGHT = 1;   // 1 câu đúng = 1 điểm
const XP_WRONG = 0;

const GAP_MINUTES = { 1: 10, 2: 1440, 3: 4320, 4: 10080, 5: 30240 };

let me = null;
let queue = [];
let at = 0;
let right = 0;
let xp = 0;
let wrongWords = [];
let started = null;
let topicSlug = null;
let mode = 'topic';
let muc = null;
let bo = null;
let kind = null;       // 'nghia' | 'colloc' | 'synonym' — chốt khi bấm chọn ở màn hình picker
const SET_SIZE = 12;
let locked = false;

let topicWords = [];   // toàn bộ từ của chủ đề, không lọc mức/bộ — nguồn nhiễu cho mọi kiểu
let scopeWords = [];   // từ trong phạm vi đang chọn (đã lọc theo mức/bộ nếu có)
let progOf = {};

const $ = function (id) { return document.getElementById(id); };

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const q = new URLSearchParams(location.search);
  topicSlug = q.get('chu-de');
  muc = q.get('muc');
  bo  = q.get('bo');
  mode = q.get('mode') === 'review' ? 'review' : 'topic';

  started = new Date();
  await loadWords();

  if (topicSlug) {
    document.querySelectorAll('a[href="vocab.html"]').forEach(function (a) {
      a.href = 'topic.html?chu-de=' + encodeURIComponent(topicSlug);
    });
  }

  if (!scopeWords.length) {
    $('view-empty').classList.remove('hidden');
    return;
  }

  bindPicker();
  $('view-picker').classList.remove('hidden');
})();

// ---------- Nạp từ của chủ đề/bộ đang chọn ----------

async function loadWords() {
  let topicId = null;
  let topicName = 'Ôn tập';

  if (mode === 'topic' && topicSlug) {
    const { data: t } = await db
      .from('topics').select('id, name_vi').eq('slug', topicSlug).single();
    if (!t) return;
    topicId = t.id;
    topicName = t.name_vi;
  }

  $('topic-name').textContent = topicName;

  let qy = db.from('vocabulary')
    .select('id, word, phonetic, pos, meaning_vi, example_en, example_vi, synonyms, collocations, level, topic_id');
  if (topicId) qy = qy.eq('topic_id', topicId);

  qy = qy.order('level').order('order_index').order('id');

  const { data: words } = await qy;
  if (!words || !words.length) return;

  topicWords = words;

  let list = words;
  let subLabel = topicName;

  if (muc) {
    const lv = parseInt(muc, 10);
    list = list.filter(function (w) { return (w.level || 1) === lv; });
  }
  if (bo) {
    const i = parseInt(bo, 10) - 1;
    list = list.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    subLabel += ' · Bộ ' + bo;
  }

  scopeWords = list;
  $('picker-topic').textContent = subLabel + ' · ' + list.length + ' từ';

  const { data: prog } = await db
    .from('vocab_progress')
    .select('vocabulary_id, status, box, next_review')
    .eq('user_id', me.id);

  for (const p of (prog || [])) progOf[p.vocabulary_id] = p;
}

function queueLimit() {
  return bo ? Math.min(scopeWords.length, SET_SIZE) : SIZE;
}

// ---------- Màn hình chọn kiểu ----------

function bindPicker() {
  document.querySelectorAll('button[data-kind]').forEach(function (b) {
    b.addEventListener('click', function () { startKind(b.dataset.kind); });
  });
}

function startKind(k) {
  const built =
    k === 'nghia'   ? buildNghiaQueue() :
    k === 'colloc'  ? buildCollocQueue() :
                       buildSynonymQueue();

  if (!built.length) {
    $('picker-warn').textContent = 'Bộ này chưa đủ dữ liệu cho kiểu này, chọn kiểu khác nhé.';
    $('picker-warn').classList.remove('hidden');
    return;
  }

  $('picker-warn').classList.add('hidden');

  kind = k;
  queue = built;
  at = 0; right = 0; xp = 0; wrongWords = [];

  $('view-picker').classList.add('hidden');
  $('view-study').classList.remove('hidden');
  render();
}

// ---------- Xây hàng đợi câu hỏi — kiểu Nghĩa của từ (giữ nguyên Leitner) ----------

function buildNghiaQueue() {
  const now = Date.now();
  const due = [];
  const fresh = [];

  for (const w of scopeWords) {
    const p = progOf[w.id];
    if (!p) { fresh.push(w); continue; }
    if (p.status === 'mastered') continue;
    if (new Date(p.next_review).getTime() <= now) due.push(w);
  }

  let picked = mode === 'review' ? due.slice() : due.concat(fresh);

  if (!picked.length) {
    picked = scopeWords.filter(function (w) {
      const p = progOf[w.id];
      return p && p.status !== 'mastered';
    });
  }
  if (!picked.length) picked = scopeWords.slice();

  const qs = shuffle(picked).slice(0, queueLimit());

  for (const w of qs) {
    const others = shuffle(topicWords.filter(function (x) {
      return x.id !== w.id && x.meaning_vi !== w.meaning_vi;
    })).slice(0, 3);
    w.choices = shuffle([w].concat(others));
    w.box = progOf[w.id] ? progOf[w.id].box : 1;
  }

  return qs;
}

// ---------- Xây hàng đợi — kiểu Cụm từ ----------

function buildCollocQueue() {
  const eligible = [];

  for (const w of scopeWords) {
    const entries = splitCollocations(w.collocations);
    let found = null;
    for (const e of entries) {
      if (!e.phrase) continue;
      const blanked = findAndBlank(e.phrase, w.word);
      if (blanked) { found = { phrase: e.phrase, meaning: e.meaning, blanked: blanked }; break; }
    }
    if (found) eligible.push(Object.assign({}, w, { collocPick: found }));
  }

  return finalizeQueue(eligible, function (w) { return w.word; });
}

// ---------- Xây hàng đợi — kiểu Cách nói khác ----------

function buildSynonymQueue() {
  const eligible = [];

  for (const w of scopeWords) {
    const syns = splitSynonyms(w.synonyms);
    if (syns.length) eligible.push(Object.assign({}, w, { synPick: syns[Math.floor(Math.random() * syns.length)] }));
  }

  return finalizeQueue(eligible, function (w) { return w.synPick; });
}

// ---------- Dùng chung: gán 4 lựa chọn (đúng + 3 nhiễu) cho mỗi câu ----------

function finalizeQueue(eligible, answerText) {
  const qs = shuffle(eligible).slice(0, queueLimit());
  const out = [];

  for (const w of qs) {
    const correct = answerText(w);
    const correctLower = correct.toLowerCase();

    const distractPool = shuffle(topicWords.filter(function (x) {
      return x.id !== w.id && x.word.toLowerCase() !== correctLower;
    }));

    const distract = [];
    for (const x of distractPool) {
      if (distract.length >= 3) break;
      if (distract.indexOf(x.word) === -1) distract.push(x.word);
    }
    if (distract.length < 3) continue; // không đủ nhiễu, bỏ câu này

    w.optChoices = shuffle([correct].concat(distract));
    w.optCorrect = correct;
    out.push(w);
  }

  return out;
}

// ---------- Tách chuỗi collocations / synonyms ----------

function splitCollocations(raw) {
  return (raw || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
    const bits = x.split(/\s+[—–-]\s+/);
    return { phrase: bits[0].trim(), meaning: bits.length > 1 ? bits.slice(1).join(' - ').trim() : '' };
  });
}

function splitSynonyms(raw) {
  return (raw || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

// Tìm từ trong cụm rồi thay bằng chỗ trống. Bắt cả biến thể đuôi
// (s/es/ed/ing…) vì cụm hay chia động từ khác dạng gốc.
function findAndBlank(phrase, word) {
  const stem = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + stem + '\\w*', 'i');
  if (!re.test(phrase)) return null;
  return phrase.replace(re, '_____');
}

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

// ---------- Hiển thị câu hỏi ----------

function render() {
  const w = queue[at];
  locked = false;

  $('counter').textContent = 'Câu ' + (at + 1) + ' / ' + queue.length;
  $('progress').style.width = (at / queue.length * 100) + '%';

  let boxHtml = '';
  let opts = [];

  if (kind === 'nghia') {
    boxHtml =
      '<p class="word">' + esc(w.word) + '</p>' +
      '<div class="word-meta">' +
        (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : '') +
        (w.phonetic ? '<span>' + esc(w.phonetic) + '</span>' : '') +
      '</div>';
    opts = w.choices.map(function (c) { return c.meaning_vi; });
  } else if (kind === 'colloc') {
    boxHtml =
      '<p class="quiz-prompt">Điền từ còn thiếu vào cụm</p>' +
      '<p class="quiz-sentence">' + esc(w.collocPick.blanked) + '</p>' +
      (w.collocPick.meaning ? '<p class="quiz-hint">' + esc(w.collocPick.meaning) + '</p>' : '');
    opts = w.optChoices;
  } else {
    boxHtml =
      '<p class="word">' + esc(w.word) + '</p>' +
      '<div class="word-meta">' +
        (w.pos ? '<span class="pos">' + esc(w.pos) + '</span>' : '') +
        (w.phonetic ? '<span>' + esc(w.phonetic) + '</span>' : '') +
      '</div>' +
      '<p class="quiz-prompt">Từ hoặc cụm nào gần nghĩa nhất?</p>';
    opts = w.optChoices;
  }

  $('word-box').innerHTML = boxHtml;

  $('opts').innerHTML = opts.map(function (text, i) {
    return '<button class="opt" data-i="' + i + '">' + esc(text) + '</button>';
  }).join('');

  $('opts').querySelectorAll('.opt').forEach(function (b) {
    b.addEventListener('click', function () { answer(parseInt(b.dataset.i, 10)); });
  });
}

// ---------- Chấm câu, sang câu kế ngay ----------

function answer(i) {
  if (locked) return;
  locked = true;

  const w = queue[at];
  const ok = kind === 'nghia' ? (w.choices[i].id === w.id) : (w.optChoices[i] === w.optCorrect);

  if (ok) { right++; xp += XP_RIGHT; }
  else { xp += XP_WRONG; wrongWords.push(w); }

  if (kind === 'nghia') saveProgress(w, ok);

  at++;
  if (at >= queue.length) finish();
  else render();
}

// ---------- Ghi tiến độ Leitner (chỉ kiểu Nghĩa của từ) ----------

async function saveProgress(w, ok) {
  const box = ok ? Math.min(5, (w.box || 1) + 1) : 1;
  const next = new Date(Date.now() + GAP_MINUTES[box] * 60000).toISOString();
  const status = box >= 4 ? 'mastered' : (box >= 2 ? 'reviewing' : 'learning');

  const { data: old } = await db
    .from('vocab_progress')
    .select('correct_count, wrong_count')
    .eq('user_id', me.id).eq('vocabulary_id', w.id).maybeSingle();

  await db.from('vocab_progress').upsert({
    user_id: me.id,
    vocabulary_id: w.id,
    status: status,
    box: box,
    correct_count: (old ? old.correct_count : 0) + (ok ? 1 : 0),
    wrong_count:   (old ? old.wrong_count   : 0) + (ok ? 0 : 1),
    last_reviewed: new Date().toISOString(),
    next_review: next
  }, { onConflict: 'user_id,vocabulary_id' });
}

// ---------- Kết quả ----------

async function finish() {
  $('view-study').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  $('done-score').textContent = right + '/' + queue.length;

  if (right === queue.length) {
    $('done-title').textContent = 'Đúng hết. Rất tốt.';
    $('done-sub').textContent = kind === 'nghia'
      ? 'Bạn trả lời đúng ' + right + ' câu. Các từ này sẽ quay lại sau vài ngày để kiểm tra trí nhớ.'
      : 'Bạn trả lời đúng ' + right + ' câu.';
  } else {
    $('done-title').textContent = right >= queue.length * 0.7
      ? 'Làm tốt lắm.' : 'Xong bài kiểm tra.';
    $('done-sub').textContent =
      'Bạn trả lời sai ' + wrongWords.length + ' từ, xem lại một lượt nhé.';
    showWrong();
  }

  if (kind === 'nghia') showNotMastered();

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  await db.from('attempts').insert({
    user_id: me.id,
    mode: kind === 'colloc' ? 'vocab_colloc' : (kind === 'synonym' ? 'vocab_synonym' : 'vocab'),
    started_at: started.toISOString(),
    submitted_at: new Date().toISOString(),
    total_questions: queue.length,
    correct_count: right,
    seconds_used: seconds,
    xp_earned: xp
  });

  await db.rpc('add_xp', { p_xp: xp });
}

// ---------- Danh sách từ chưa thuộc ----------

function showWrong() {
  let html = '<p class="review-head">Từ cần xem lại</p><div class="review-list">';
  for (const w of wrongWords) {
    html +=
      '<div class="review-item">' +
        '<p class="rw">' + esc(w.word) +
          '<button class="wl-say" data-rsay="' + esc(w.word) + '" title="Nghe">&#128266;</button>' +
        '</p>' +
        '<p class="rp">' + esc([w.pos, w.phonetic].filter(Boolean).join('  ')) + '</p>' +
        '<p class="rm">' + esc(w.meaning_vi) + '</p>' +
        (w.synonyms ? '<p class="rp">Đồng nghĩa: ' + esc(w.synonyms) + '</p>' : '') +
        (w.collocations ? '<p class="rp">Cụm hay dùng: ' + esc(w.collocations) + '</p>' : '') +
        (w.example_en ? '<p class="re">' + highlight(w.example_en, w.word) + '</p>' : '') +
        (w.example_vi ? '<p class="rp" style="margin-top:5px">' + esc(w.example_vi) + '</p>' : '') +
      '</div>';
  }
  html += '</div>';
  $('wrong-box').innerHTML = html;

  $('wrong-box').querySelectorAll('button[data-rsay]').forEach(function (b) {
    b.addEventListener('click', function () { doc(b.dataset.rsay); });
  });

  if (topicSlug) {
    const b = $('btn-learn-wrong');
    b.classList.remove('hidden');
    b.addEventListener('click', function () {
      const ids = wrongWords.map(function (w) { return w.id; }).join(',');
      location.href = 'flashcard.html?chu-de=' + encodeURIComponent(topicSlug) + '&danh-dau=' + ids;
    });
  }
}

function highlight(sentence, word) {
  const safe = esc(sentence);
  const stem = esc(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp('(' + stem + '\\w*)', 'i'), '<b>$1</b>');
}

// ---------- Phím số chọn nhanh ----------

document.addEventListener('keydown', function (e) {
  if (!$('view-done').classList.contains('hidden')) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 4) {
    const b = $('opts').querySelector('[data-i="' + (n - 1) + '"]');
    if (b) b.click();
  }
});

$('btn-again').addEventListener('click', function () { location.reload(); });

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ---------- Toàn bộ từ trong bộ mà bạn chưa thuộc (chỉ dùng cho kiểu Nghĩa) ----------

async function showNotMastered() {
  if (!topicSlug) return;

  const { data: t } = await db
    .from('topics').select('id').eq('slug', topicSlug).single();
  if (!t) return;

  const { data: words } = await db.from('vocabulary')
    .select('id, word, phonetic, pos, meaning_vi, level')
    .eq('topic_id', t.id).order('level').order('order_index').order('id');

  if (!words || !words.length) return;

  let list = words;

  if (muc) {
    const lv = parseInt(muc, 10);
    list = list.filter(function (w) { return (w.level || 1) === lv; });
  }
  if (bo) {
    const i = parseInt(bo, 10) - 1;
    list = list.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
  }

  const { data: prog } = await db
    .from('vocab_progress').select('vocabulary_id, status').eq('user_id', me.id);

  const st = {};
  for (const p of (prog || [])) st[p.vocabulary_id] = p.status;

  const left = list.filter(function (w) { return st[w.id] !== 'mastered'; });

  const box = document.getElementById('left-box');
  if (!box) return;

  if (!left.length) {
    box.innerHTML =
      '<p class="review-head">Cả ' + list.length + ' từ của bộ này đều đã thuộc hẳn.</p>';
    return;
  }

  let html =
    '<p class="review-head">Tiến độ cả bộ · ' + (list.length - left.length) + '/' +
    list.length + ' từ đã thuộc hẳn</p>' +
    '<p class="review-note">Một từ chỉ tính là thuộc hẳn khi bạn trả lời đúng nhiều lần ' +
    'qua nhiều ngày. Trả lời đúng hôm nay là từ đó tiến thêm một bậc.</p>' +
    '<ul class="wordlist">';

  for (const w of left) {
    const tag = st[w.id] === 'reviewing' ? 'đang ôn'
              : (st[w.id] === 'learning' ? 'mới học' : 'chưa gặp');

    html +=
      '<li>' +
        '<div class="wl-main">' +
          '<span class="wl-word">' + esc(w.word) + '</span>' +
          (w.phonetic ? '<span class="wl-ipa">' + esc(w.phonetic) + '</span>' : '') +
          '<span class="wl-pos">' + tag + '</span>' +
        '</div>' +
        '<div class="wl-mean">' + esc(w.meaning_vi || '') + '</div>' +
        '<div class="wl-act">' +
          '<button class="wl-say" data-leftsay="' + esc(w.word) + '">&#128266;</button>' +
        '</div>' +
      '</li>';
  }

  html += '</ul>';
  box.innerHTML = html;

  box.querySelectorAll('button[data-leftsay]').forEach(function (b) {
    b.addEventListener('click', function () { doc(b.dataset.leftsay); });
  });
}


// ---------- Đọc to bằng giọng của trình duyệt ----------

function doc(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}
