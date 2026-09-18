// ============================================================
// Pacedemy — Ôn tổng hợp: câu hỏi lấy từ kho riêng (extra_items),
// Ngân tự nạp qua Teacher Studio → Nhập Ôn tổng hợp, nguồn tự do
// (từ vựng / đọc / nghe trộn lẫn), không liên quan tới kho Từ vựng,
// Luyện đọc, Luyện nghe đang dùng cho các mục khác.
//
// Có giải thích ngay sau mỗi câu, giống kiểu Luyện Part 5.
// ============================================================

const SIZE = 12;
const XP_RIGHT = 1;
const XP_WRONG = 0;

let me = null;
let queue = [];
let at = 0;
let right = 0;
let xp = 0;
let started = null;

const $ = function (id) { return document.getElementById(id); };

const KIND_LABEL = { vocab: 'Từ vựng', read: 'Đọc', listen: 'Nghe' };

(async function () {
  me = await requireLogin();
  if (!me) return;

  const built = await buildQueue();

  if (built.length < 3) {
    $('view-empty').classList.remove('hidden');
    return;
  }

  queue = built;
  $('start-sub').textContent = queue.length + ' câu, trộn ngẫu nhiên giữa Từ vựng, Đọc và Nghe.';
  $('view-start').classList.remove('hidden');
  $('btn-start').addEventListener('click', startSession);
  $('btn-again').addEventListener('click', function () { location.reload(); });
})();

function startSession() {
  started = new Date();
  $('view-start').classList.add('hidden');
  $('view-q').classList.remove('hidden');
  render();
}

// ---------- Lấy câu hỏi từ kho extra_items ----------

async function buildQueue() {
  const { data } = await db
    .from('extra_items')
    .select('id, kind, prompt, sub, audio_url, image_url, options, correct_answer, explanation, translation_vi, key_point')
    .eq('is_active', true);

  if (!data || !data.length) return [];

  const picked = shuffle(data).slice(0, SIZE);

  return picked.map(function (row) {
    const opts = row.options || {};
    const options = ['A', 'B', 'C', 'D']
      .filter(function (k) { return opts[k] != null && opts[k] !== ''; })
      .map(function (k) { return { key: k, text: opts[k], isCorrect: k === row.correct_answer }; });

    return {
      kind: row.kind,
      main: row.kind === 'read' ? blankify(row.prompt) : (row.prompt || ''),
      raw: row.prompt || '',
      sub: row.sub || '',
      audioUrl: row.audio_url || null,
      imageUrl: row.image_url || null,
      options: options,
      correctKey: row.correct_answer,
      explanation: row.explanation || '',
      translationVi: row.translation_vi || '',
      keyPoint: row.key_point || ''
    };
  });
}

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

function blankify(text) {
  return esc(text || '').replace(/_{2,}/g, '<span class="blank"></span>');
}

function fillBlank(text, word) {
  return esc(text || '').replace(/_{2,}/g, '<b class="filled">' + esc(word || '') + '</b>');
}

// ---------- Hiển thị 1 câu ----------

function render() {
  const item = queue[at];

  $('counter').textContent = 'Câu ' + (at + 1) + ' / ' + queue.length;
  $('progress').style.width = (at / queue.length * 100) + '%';
  $('kind-badge').textContent = KIND_LABEL[item.kind] || '';
  $('after').classList.add('hidden');

  let box = '';

  if (item.kind === 'vocab') {
    box =
      '<p class="word">' + esc(item.main) + '</p>' +
      (item.sub ? '<div class="word-meta"><span>' + esc(item.sub) + '</span></div>' : '');
  } else if (item.kind === 'read') {
    box = '<p class="q-sentence">' + item.main + '</p>';
  } else {
    box =
      '<p class="quiz-prompt">Nghe rồi chọn đáp án đúng</p>' +
      (item.imageUrl ? '<img src="' + esc(item.imageUrl) + '" alt="" style="max-width:100%;border-radius:var(--r);margin-bottom:14px">' : '') +
      '<audio id="extra-audio" controls autoplay style="width:100%" src="' + esc(item.audioUrl) + '"></audio>' +
      (item.main ? '<p class="q-sentence" style="margin-top:14px">' + esc(item.main) + '</p>' : '');
  }

  $('q-box').innerHTML = box;

  $('opts').innerHTML = item.options.map(function (o) {
    return '<label class="opt-radio" data-k="' + esc(o.key) + '"><span class="radio-dot"></span><span class="say">' + esc(o.text) + '</span></label>';
  }).join('');

  $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
    b.addEventListener('click', function () { answer(b.dataset.k); });
  });
}

// ---------- Chấm câu, hiện giải thích ----------

function answer(k) {
  const item = queue[at];
  const ok = k === item.correctKey;

  $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
    b.classList.add('disabled');
    if (b.dataset.k === item.correctKey) b.classList.add('right');
    else if (b.dataset.k === k) b.classList.add('wrong');
  });

  if (ok) { right++; xp += XP_RIGHT; }
  else { xp += XP_WRONG; }

  $('verdict').textContent = ok ? 'Chính xác.' : 'Chưa đúng.';
  $('verdict').className = 'verdict ' + (ok ? 'ok' : 'no');

  let why = '';
  if (item.keyPoint) why += '<p class="key-point">' + esc(item.keyPoint) + '</p>';

  if (item.kind === 'read') {
    const correctText = (item.options.filter(function (o) { return o.isCorrect; })[0] || {}).text;
    why += '<p class="full-sentence">' + fillBlank(item.raw, correctText) + '</p>';
  }

  if (item.translationVi) why += '<p class="trans">' + esc(item.translationVi) + '</p>';
  if (item.explanation) why += '<p class="why-text">' + esc(item.explanation) + '</p>';

  $('why').innerHTML = why;
  $('after').classList.remove('hidden');
  $('btn-next').textContent = (at + 1 >= queue.length) ? 'Xem kết quả' : 'Câu tiếp theo';
  $('btn-next').onclick = next;
}

function next() {
  const a = $('extra-audio');
  if (a) a.pause();

  at++;
  if (at >= queue.length) finish();
  else render();
}

// ---------- Kết quả ----------

async function finish() {
  $('view-q').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  $('done-sub').textContent = 'Bạn trả lời đúng ' + right + '/' + queue.length + ' câu, trộn cả 3 kỹ năng.';

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  const { error } = await db.from('attempts').insert({
    user_id: me.id,
    mode: 'extra',
    started_at: started.toISOString(),
    submitted_at: new Date().toISOString(),
    total_questions: queue.length,
    correct_count: right,
    seconds_used: seconds,
    xp_earned: xp
  });

  if (error) toast('Không lưu được kết quả: ' + error.message, 'bad');

  await db.rpc('add_xp', { p_xp: xp });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
