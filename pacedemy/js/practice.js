// ============================================================
// Pacedemy — luyện Part 5
// Chế độ luyện tập: có giải thích ngay sau mỗi câu.
// ============================================================

const SIZE = 10;
const XP_RIGHT = 1;   // 1 câu đúng = 1 điểm
const XP_WRONG = 0;

let me = null;
let part = 5;
let queue = [];
let at = 0;
let right = 0;
let xp = 0;
let wrongs = [];
let started = null;
let attemptId = null;

const $ = function (id) { return document.getElementById(id); };

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const q = new URLSearchParams(location.search);
  part = parseInt(q.get('part') || '5', 10);

  started = new Date();
  await loadQuestions();

  if (!queue.length) {
    $('view-q').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    return;
  }

  render();
})();

// ---------- Lấy câu hỏi ----------

async function loadQuestions() {
  const { data, error } = await db
    .from('questions')
    .select('id, question_text, options, correct_answer, explanation, topic_tag, difficulty, translation_vi, key_point')
    .eq('part', part)
    .eq('is_active', true);

  if (error || !data || !data.length) return;

  queue = shuffle(data).slice(0, SIZE);
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
  const q = queue[at];

  $('counter').textContent = 'Câu ' + (at + 1) + ' / ' + queue.length;
  $('progress').style.width = (at / queue.length * 100) + '%';
  $('after').classList.add('hidden');

  $('q-text').innerHTML = blankify(q.question_text);

  const opts = q.options || {};
  let html = '';
  for (const k of ['A', 'B', 'C', 'D']) {
    if (opts[k] == null) continue;
    html += '<button class="opt" data-k="' + k + '">' +
              '<span class="letter">' + k + '</span>' + esc(opts[k]) +
            '</button>';
  }
  $('opts').innerHTML = html;

  $('opts').querySelectorAll('.opt').forEach(function (b) {
    b.addEventListener('click', function () { answer(b.dataset.k); });
  });
}

// Biến dấu gạch dài trong câu thành ô trống có gạch chân
function blankify(text) {
  return esc(text || '').replace(/_{2,}/g, '<span class="blank"></span>');
}

// Điền đáp án đúng vào chỗ trống và tô đậm
function fillBlank(text, word) {
  return esc(text || '').replace(/_{2,}/g, '<b class="filled">' + esc(word || '') + '</b>');
}

// ---------- Chấm câu ----------

async function answer(k) {
  const q = queue[at];
  const ok = (k === q.correct_answer);

  $('opts').querySelectorAll('.opt').forEach(function (b) {
    b.disabled = true;
    if (b.dataset.k === q.correct_answer) b.classList.add('right');
    else if (b.dataset.k === k) b.classList.add('wrong');
  });

  if (ok) { right++; xp += XP_RIGHT; }
  else { xp += XP_WRONG; wrongs.push({ q: q, chose: k }); }

  $('verdict').textContent = ok
    ? 'Chính xác.'
    : 'Chưa đúng — đáp án là ' + q.correct_answer + '.';
  $('verdict').className = 'verdict ' + (ok ? 'ok' : 'no');

  const opts = q.options || {};
  let box = '';

  if (q.key_point) {
    box += '<p class="key-point">' + esc(q.key_point) + '</p>';
  }

  box += '<p class="full-sentence">' + fillBlank(q.question_text, opts[q.correct_answer]) + '</p>';

  if (q.translation_vi) {
    box += '<p class="trans">' + esc(q.translation_vi) + '</p>';
  }

  box += '<p class="why-text">' + esc(q.explanation || '') + '</p>';

  $('why').innerHTML = box;

  $('after').classList.remove('hidden');
  $('btn-next').textContent = (at + 1 >= queue.length) ? 'Xem kết quả' : 'Câu tiếp theo';

  saveAnswer(q, k, ok);
}

// ---------- Ghi lại từng câu trả lời ----------

async function saveAnswer(q, chose, ok) {
  if (!attemptId) {
    const { data } = await db.from('attempts').insert({
      user_id: me.id,
      mode: 'practice',
      part: part,
      started_at: started.toISOString(),
      total_questions: queue.length,
      correct_count: 0
    }).select('id').single();

    attemptId = data ? data.id : null;
  }

  if (!attemptId) return;

  await db.from('attempt_answers').insert({
    attempt_id: attemptId,
    question_id: q.id,
    selected: chose,
    is_correct: ok
  });
}

// ---------- Chuyển câu ----------

$('btn-next').addEventListener('click', function () {
  at++;
  if (at >= queue.length) finish();
  else render();
});

// ---------- Kết quả ----------

async function finish() {
  $('view-q').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  $('done-score').textContent = right + '/' + queue.length;

  const pct = right / queue.length;
  $('done-title').textContent =
    pct === 1 ? 'Đúng hết. Rất tốt.' : (pct >= 0.7 ? 'Làm tốt lắm.' : 'Xong bài luyện.');

  $('done-sub').textContent =
    (wrongs.length ? 'Dưới đây là những câu cần xem lại.' : 'Không sai câu nào.');

  if (wrongs.length) showWrongs();

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  if (attemptId) {
    await db.from('attempts').update({
      submitted_at: new Date().toISOString(),
      correct_count: right,
      reading_correct: right,
      seconds_used: seconds,
      xp_earned: xp
    }).eq('id', attemptId);
  }

  await db.rpc('add_xp', { p_xp: xp });
}

function showWrongs() {
  let html = '<p class="review-head">Ghi nhớ nhanh</p>';

  for (const w of wrongs) {
    const q = w.q;
    const opts = q.options || {};
    html +=
      '<div class="wrong-q">' +
        (q.key_point ? '<p class="key-point">' + esc(q.key_point) + '</p>' : '') +
        '<p class="wq">' + fillBlank(q.question_text, opts[q.correct_answer]) + '</p>' +
        (q.translation_vi ? '<p class="trans">' + esc(q.translation_vi) + '</p>' : '') +
        '<p class="chose">Bạn đã chọn: ' + esc(opts[w.chose] || w.chose) + '</p>' +
      '</div>';
  }

  $('wrong-box').innerHTML = html;
}

$('btn-again').addEventListener('click', function () { location.reload(); });

// ---------- Phím số ----------

document.addEventListener('keydown', function (e) {
  if (!$('view-done').classList.contains('hidden')) return;

  if (e.key === 'Enter' && !$('after').classList.contains('hidden')) {
    $('btn-next').click();
    return;
  }

  const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D',
                'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' };
  const k = map[e.key.toLowerCase()];
  if (k && $('after').classList.contains('hidden')) {
    const b = $('opts').querySelector('[data-k="' + k + '"]');
    if (b) b.click();
  }
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
