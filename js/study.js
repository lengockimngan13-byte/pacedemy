// ============================================================
// Pacedemy — kiểm tra từ vựng
// Không hiện đúng sai từng câu. Toàn bộ phần ôn dồn vào cuối bài.
// ============================================================

const SIZE = 10;
const XP_RIGHT = 10;
const XP_WRONG = 2;

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
const SET_SIZE = 12;
let locked = false;

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
  await buildQueue();

  if (topicSlug) {
    document.querySelectorAll('a[href="vocab.html"]').forEach(function (a) {
      a.href = 'topic.html?chu-de=' + encodeURIComponent(topicSlug);
    });
  }

  if (!queue.length) {
    $('view-study').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    return;
  }

  render();
})();

// ---------- Chọn từ ----------

async function buildQueue() {
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

  let { data: words } = await qy;
  if (!words || !words.length) return;

  const allWords = words.slice();   // dùng làm phương án nhiễu

  if (muc) {
    const lv = parseInt(muc, 10);
    words = words.filter(function (w) { return (w.level || 1) === lv; });
  }
  if (bo) {
    const i = parseInt(bo, 10) - 1;
    words = words.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
    $('topic-name').textContent = topicName + ' · Bộ ' + bo;
  }
  if (!words.length) return;

  const { data: prog } = await db
    .from('vocab_progress')
    .select('vocabulary_id, status, box, next_review')
    .eq('user_id', me.id);

  const progOf = {};
  for (const p of (prog || [])) progOf[p.vocabulary_id] = p;

  const now = Date.now();
  const due = [];
  const fresh = [];

  for (const w of words) {
    const p = progOf[w.id];
    if (!p) { fresh.push(w); continue; }
    if (p.status === 'mastered') continue;
    if (new Date(p.next_review).getTime() <= now) due.push(w);
  }

  let picked = mode === 'review' ? due.slice() : due.concat(fresh);

  if (!picked.length) {
    picked = words.filter(function (w) {
      const p = progOf[w.id];
      return p && p.status !== 'mastered';
    });
  }
  if (!picked.length) picked = words.slice();

  const limit = bo ? Math.min(words.length, SET_SIZE) : SIZE;
  queue = shuffle(picked).slice(0, limit);

  for (const w of queue) {
    const others = shuffle(allWords.filter(function (x) {
      return x.id !== w.id && x.meaning_vi !== w.meaning_vi;
    })).slice(0, 3);
    w.choices = shuffle([w].concat(others));
    w.box = progOf[w.id] ? progOf[w.id].box : 1;
  }
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

  $('word').textContent = w.word;
  $('pos').textContent = w.pos || '';
  $('pos').style.display = w.pos ? '' : 'none';
  $('phonetic').textContent = w.phonetic || '';

  let html = '';
  for (let i = 0; i < w.choices.length; i++) {
    html += '<button class="opt" data-i="' + i + '">' + esc(w.choices[i].meaning_vi) + '</button>';
  }
  $('opts').innerHTML = html;

  $('opts').querySelectorAll('.opt').forEach(function (b) {
    b.addEventListener('click', function () { answer(parseInt(b.dataset.i, 10)); });
  });
}

// ---------- Chấm câu, sang câu kế ngay ----------

function answer(i) {
  if (locked) return;
  locked = true;

  const w = queue[at];
  const ok = w.choices[i].id === w.id;

  if (ok) { right++; xp += XP_RIGHT; }
  else { xp += XP_WRONG; wrongWords.push(w); }

  saveProgress(w, ok);

  at++;
  if (at >= queue.length) finish();
  else render();
}

// ---------- Ghi tiến độ ----------

async function saveProgress(w, ok) {
  const box = ok ? Math.min(5, (w.box || 1) + 1) : 1;
  const next = new Date(Date.now() + GAP_MINUTES[box] * 60000).toISOString();
  const status = box >= 5 ? 'mastered' : (box >= 2 ? 'reviewing' : 'learning');

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
    $('done-sub').textContent =
      'Bạn nhận được ' + xp + ' điểm. Các từ này sẽ quay lại sau vài ngày để kiểm tra trí nhớ.';
  } else {
    $('done-title').textContent = right >= queue.length * 0.7
      ? 'Làm tốt lắm.' : 'Xong bài kiểm tra.';
    $('done-sub').textContent =
      'Bạn nhận được ' + xp + ' điểm. Dưới đây là ' + wrongWords.length +
      ' từ chưa thuộc, bạn xem lại một lượt nhé.';
    showWrong();
  }

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  await db.from('attempts').insert({
    user_id: me.id,
    mode: 'vocab',
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
        '<p class="rw">' + esc(w.word) + '</p>' +
        '<p class="rp">' + esc([w.pos, w.phonetic].filter(Boolean).join('  ')) + '</p>' +
        '<p class="rm">' + esc(w.meaning_vi) + '</p>' +
        (w.synonyms ? '<p class="rp">Đồng nghĩa: ' + esc(w.synonyms) + '</p>' : '') +
        (w.example_en ? '<p class="re">' + highlight(w.example_en, w.word) + '</p>' : '') +
        (w.example_vi ? '<p class="rp" style="margin-top:5px">' + esc(w.example_vi) + '</p>' : '') +
      '</div>';
  }
  html += '</div>';
  $('wrong-box').innerHTML = html;

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
