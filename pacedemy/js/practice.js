// ============================================================
// Pacedemy — luyện Part 5
// Chế độ luyện tập: có giải thích ngay sau mỗi câu.
// ============================================================

const SIZE = 10;
const XP_RIGHT = 1;   // 1 câu đúng = 1 điểm
const XP_WRONG = 0;

let me = null;
let part = 5;
let dang = null;
let queue = [];
let at = 0;
let marks = [];   // kết quả từng câu, để vẽ thanh tiến độ
let right = 0;
let xp = 0;
let wrongs = [];
let started = null;
let attemptId = null;
let loiTai = '';     // lý do không lấy được đề, để nói cho học viên biết

const $ = function (id) { return document.getElementById(id); };

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const q = new URLSearchParams(location.search);
  part = parseInt(q.get('part') || '5', 10);
  dang = q.get('dang');

  if (dang) $('part-name').textContent = 'Part 5 — ' + dang;
  document.querySelectorAll('a[href="app.html"]').forEach(function (a) {
    if (a.classList.contains('brand')) return;
    a.href = 'part5.html';
  });

  started = new Date();
  await loadQuestions();

  if (!queue.length) {
    $('view-q').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    if (loiTai) {
      const o = $('empty-note');
      if (o) o.textContent = loiTai;
    }
    return;
  }

  render();
})();

// ---------- Lấy câu hỏi ----------

// Xin đề từ máy chủ. Câu gửi về CHỈ có đề và bốn phương án — không
// có đáp án, không có giải thích. Hai lý do:
//
//  1. Trước đây trang này tải về cả 670 câu kèm đáp án rồi mới bốc 10
//     câu ra hiện. Một lần gọi là lấy sạch phần cô soạn công nhất.
//  2. Đáp án nằm sẵn trong máy thì học viên mở tab Network là thấy
//     trước khi chọn.
//
// Máy chủ cũng tự bốc ngẫu nhiên và chỉ trả đúng số câu cần, nên
// không còn chỗ nào nhận cả kho về nữa.
async function loadQuestions() {
  const { data, error } = await db.rpc('cau_luyen', {
    p_part: part,
    p_tag: dang || null,
    p_so: SIZE
  });

  if (error) {
    loiTai = error.message || 'Không lấy được đề.';
    return;
  }
  if (!data || !data.length) return;

  queue = data;
}

// ---------- Hiển thị câu hỏi ----------

// Mốc bắt đầu của câu đang hiển thị, để đo học viên dừng bao lâu ở câu đó
let qStart = 0;

function render() {
  const q = queue[at];
  qStart = Date.now();

  QuizProgress.draw({ at: at, total: queue.length, marks: marks });
  $('after').classList.add('hidden');

  $('q-text').innerHTML = blankify(q.question_text);

  const opts = q.options || {};
  let html = '';
  for (const k of ['A', 'B', 'C', 'D']) {
    if (opts[k] == null) continue;
    html += '<label class="opt-radio" data-k="' + k + '">' +
              '<span class="radio-dot"></span><span class="letter">' + k + '</span><span class="say">' + esc(opts[k]) + '</span>' +
            '</label>';
  }
  $('opts').innerHTML = html;

  $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
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

  // Khoá các ô lại ngay, đừng để bấm hai lần trong lúc chờ máy chủ
  $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
    b.classList.add('disabled');
  });

  // Máy chủ chấm và trả về đáp án kèm giải thích của ĐÚNG CÂU NÀY
  const { data: kq, error } = await db.rpc('cham_cau', { p_id: q.id, p_chon: k });
  const r = Array.isArray(kq) ? kq[0] : kq;

  if (error || !r) {
    // Mạng rớt thì mở lại các ô cho học viên chọn lại, đừng kẹt bài
    $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
      b.classList.remove('disabled');
    });
    toast(error ? error.message : 'Không chấm được câu này, bạn thử lại nhé.', 'bad');
    return;
  }

  // Giữ lại để màn chữa bài cuối giờ dùng, khỏi hỏi máy chủ lần nữa
  q.correct_answer = r.dap_an;
  q.explanation    = r.explanation;
  q.translation_vi = r.translation_vi;
  q.key_point      = r.key_point;

  const ok = !!r.dung;
  marks[at] = ok ? 'ok' : 'no';
  QuizProgress.draw({ at: at, total: queue.length, marks: marks });

  $('opts').querySelectorAll('.opt-radio').forEach(function (b) {
    if (b.dataset.k === q.correct_answer) b.classList.add('right');
    else if (b.dataset.k === k) b.classList.add('wrong');
  });

  if (ok) { right++; xp += XP_RIGHT; }
  else { xp += XP_WRONG; wrongs.push({ q: q, chose: k }); }

  if (typeof Am !== 'undefined') { ok ? Am.dung() : Am.sai(); }

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
    const { data, error } = await db.from('attempts').insert({
      user_id: me.id,
      mode: 'practice',
      part: part,
      started_at: started.toISOString(),
      total_questions: queue.length,
      correct_count: 0
    }).select('id').single();

    if (error) toast('Không lưu được bài luyện: ' + error.message, 'bad');
    attemptId = data ? data.id : null;
  }

  if (!attemptId) return;

  const { error: ansErr } = await db.from('attempt_answers').insert({
    attempt_id: attemptId,
    question_id: q.id,
    selected: chose,
    is_correct: ok,
    seconds_spent: qStart ? Math.round((Date.now() - qStart) / 1000) : null
  });

  if (ansErr) toast('Không lưu được câu trả lời: ' + ansErr.message, 'bad');
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

  // Mời nhặt từ trong mấy câu vừa sai vào sổ từ riêng
  if (typeof SoTu !== 'undefined') SoTu.moiNhat($('st-moi'), wrongs);

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  if (typeof XongBai !== 'undefined') {
    XongBai.ve($('view-done'), {
      dung: right, tong: queue.length, xp: xp, giay: seconds,
      ten: 'Part ' + part + (dang ? ' · ' + dang : ''),
      xemLai: 'wrong-box',
      luot: attemptId
    });
  }

  if (attemptId) {
    const { error } = await db.from('attempts').update({
      submitted_at: new Date().toISOString(),
      correct_count: right,
      reading_correct: right,
      seconds_used: seconds,
      xp_earned: xp
    }).eq('id', attemptId);

    if (error) toast('Không lưu được kết quả bài luyện: ' + error.message, 'bad');
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
