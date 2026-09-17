// ============================================================
// Pacedemy — luyện nghe Part 1 đến 4
// Part 1 và 2: đáp án không in ra, chỉ hiện A B C D như thi thật.
// Part 3 và 4: một file âm thanh gắn với ba câu hỏi.
// Nghe xong mỗi bài sẽ hiện lời thoại kèm bản dịch.
// ============================================================

const SETS_12 = 10;   // Part 1 và 2 lấy 10 bài, mỗi bài 1 câu
const SETS_34 = 3;    // Part 3 và 4 lấy 3 bài, mỗi bài 3 câu
const XP_RIGHT = 1;

let me = null;
let part = 1;
let setId = null;

let queue = [];       // [{ set, q }]
let at = 0;
let right = 0;
let xp = 0;
let wrongs = [];
let started = null;
let attemptId = null;

let curSetId = null;  // bài nghe đang phát
let slow = false;
let selected = null;  // đáp án đang chọn, chưa nộp

const au = document.getElementById('au');
const $ = function (id) { return document.getElementById(id); };

const PART_NAME = {
  1: 'Part 1 — Mô tả tranh',
  2: 'Part 2 — Hỏi đáp',
  3: 'Part 3 — Hội thoại ngắn',
  4: 'Part 4 — Bài nói ngắn'
};

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const p = new URLSearchParams(location.search);
  setId = p.get('set');
  part = parseInt(p.get('part') || '1', 10);
  const dang = p.get('dang');

  started = new Date();
  await loadSets();

  if (!queue.length) {
    $('view-start').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
    return;
  }

  $('part-name').textContent = PART_NAME[part] || 'Luyện nghe';
  $('start-title').textContent = PART_NAME[part] || 'Luyện nghe';
  $('start-sub').textContent =
    (dang ? 'Dạng: ' + dang + ' · ' : '') +
    queue.length + ' câu. Bấm nút bên dưới để bắt đầu, tiếng sẽ tự phát.';
  $('btn-start').classList.remove('hidden');
})();

// ---------- Lấy bài nghe và câu hỏi ----------

async function loadSets() {
  const dang = new URLSearchParams(location.search).get('dang');

  if (dang) {
    // Luyện theo đúng một dạng câu hỏi — không giới hạn ngẫu nhiên như luyện thường
    const { data: qs } = await db
      .from('questions')
      .select('id, set_id, question_text, options, correct_answer, explanation, translation_vi, key_point, order_index')
      .eq('part', part)
      .eq('topic_tag', dang)
      .eq('is_active', true)
      .order('set_id').order('order_index');

    if (!qs || !qs.length) return;

    const setIds = Array.from(new Set(qs.map(function (q) { return q.set_id; })));

    const { data: dsets } = await db
      .from('listening_sets')
      .select('id, part, title, audio_url, image_url, transcript, transcript_vi')
      .in('id', setIds)
      .eq('is_active', true);

    const byTagId = {};
    for (const s of (dsets || [])) byTagId[s.id] = s;

    for (const q of qs) {
      const s = byTagId[q.set_id];
      if (s) queue.push({ set: s, q: q });
    }
    return;
  }

  let sq = db
    .from('listening_sets')
    .select('id, part, title, audio_url, image_url, transcript, transcript_vi')
    .eq('is_active', true);

  if (setId) sq = sq.eq('id', setId);
  else sq = sq.eq('part', part);

  const { data: sets } = await sq;
  if (!sets || !sets.length) return;

  if (setId) part = sets[0].part;

  let picked = sets;
  if (!setId) {
    const n = (part <= 2) ? SETS_12 : SETS_34;
    picked = shuffle(sets).slice(0, n);
  }

  const ids = picked.map(function (s) { return s.id; });

  const { data: qs } = await db
    .from('questions')
    .select('id, set_id, question_text, options, correct_answer, explanation, translation_vi, key_point, order_index')
    .in('set_id', ids)
    .eq('is_active', true)
    .order('order_index');

  if (!qs || !qs.length) return;

  const byId = {};
  for (const s of picked) byId[s.id] = s;

  // Giữ nguyên thứ tự bài, trong mỗi bài giữ thứ tự câu
  for (const s of picked) {
    const mine = qs.filter(function (q) { return q.set_id === s.id; });
    for (const q of mine) queue.push({ set: s, q: q });
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

// ---------- Bắt đầu ----------

$('btn-start').addEventListener('click', function () {
  $('view-start').classList.add('hidden');
  $('view-q').classList.remove('hidden');
  started = new Date();
  render();
});

// ---------- Hiển thị một câu ----------

function render() {
  const item = queue[at];
  const s = item.set;
  const q = item.q;

  $('counter').textContent = 'Câu ' + (at + 1) + ' / ' + queue.length;
  $('progress').style.width = (at / queue.length * 100) + '%';
  $('after').classList.add('hidden');
  $('script-box').innerHTML = '';

  // Đổi bài nghe thì nạp file mới và phát từ đầu
  if (curSetId !== s.id) {
    curSetId = s.id;
    au.src = s.audio_url;
    au.playbackRate = slow ? 0.75 : 1;
    au.currentTime = 0;
    au.play().catch(function () { /* trình duyệt chặn thì học viên tự bấm Phát */ });
  }

  $('set-title').textContent = s.title || 'Bài nghe';
  $('set-meta').textContent = seatInSet(at);

  // Ảnh minh hoạ — Part 1 luôn có, Part 3/4 có khi bài dùng dạng "graphic" (bảng biểu, hoá đơn...)
  if (s.image_url) {
    $('pic-img').src = s.image_url;
    $('pic').classList.remove('hidden');
  } else {
    $('pic').classList.add('hidden');
  }

  const hideText = (part === 1 || part === 2);

  $('q-text').textContent = hideText
    ? (part === 1 ? 'Nghe bốn câu và chọn câu mô tả đúng bức ảnh.'
                  : 'Nghe câu hỏi và chọn câu đáp phù hợp nhất.')
    : (q.question_text || '');

  const opts = q.options || {};
  let html = '';

  for (const k of ['A', 'B', 'C', 'D']) {
    if (opts[k] == null || opts[k] === '') continue;
    html +=
      '<label class="opt-radio" data-k="' + k + '">' +
        '<span class="radio-dot"></span>' +
        '<span class="letter">' + k + '</span>' +
        '<span class="say">' + (hideText ? '' : esc(opts[k])) + '</span>' +
      '</label>';
  }

  $('opts').innerHTML = html;

  selected = null;
  $('btn-submit').disabled = true;
  $('btn-submit').classList.remove('hidden');

  $('opts').querySelectorAll('.opt-radio').forEach(function (el) {
    el.addEventListener('click', function () { selectOpt(el.dataset.k); });
  });
}

// Chọn đáp án — chưa chấm, chỉ đánh dấu và mở khoá nút Nộp bài
function selectOpt(k) {
  selected = k;
  $('opts').querySelectorAll('.opt-radio').forEach(function (el) {
    el.classList.toggle('on', el.dataset.k === k);
  });
  $('btn-submit').disabled = false;
}

// Câu thứ mấy trong bài nghe hiện tại
function seatInSet(i) {
  const sid = queue[i].set.id;
  const all = queue.filter(function (x) { return x.set.id === sid; });
  if (all.length < 2) return '';
  const pos = all.indexOf(queue[i]) + 1;
  return 'Câu ' + pos + ' của ' + all.length + ' trong bài này';
}

function isLastOfSet(i) {
  return !queue[i + 1] || queue[i + 1].set.id !== queue[i].set.id;
}

// ---------- Chấm câu ----------

async function answer(k) {
  const item = queue[at];
  const q = item.q;
  const s = item.set;
  const opts = q.options || {};
  const ok = (k === q.correct_answer);

  $('btn-submit').classList.add('hidden');

  // Hiện đầy đủ nội dung các lựa chọn sau khi đã chọn
  $('opts').querySelectorAll('.opt-radio').forEach(function (el) {
    el.classList.add('disabled');
    const key = el.dataset.k;
    const say = el.querySelector('.say');
    if (say && !say.textContent) say.textContent = opts[key] || '';
    if (key === q.correct_answer) el.classList.add('right');
    else if (key === k) el.classList.add('wrong');
  });

  if (ok) { right++; xp += XP_RIGHT; }
  else { wrongs.push({ set: s, q: q, chose: k }); }

  $('verdict').textContent = ok
    ? 'Chính xác.'
    : 'Chưa đúng — đáp án là ' + q.correct_answer + '.';
  $('verdict').className = 'verdict ' + (ok ? 'ok' : 'no');

  let box = '';
  if (q.key_point) box += '<p class="key-point">' + esc(q.key_point) + '</p>';
  box += '<p class="full-sentence">' + esc(opts[q.correct_answer] || '') + '</p>';
  if (q.translation_vi) box += '<p class="trans">' + esc(q.translation_vi) + '</p>';
  if (q.explanation) box += '<p class="why-text">' + esc(q.explanation) + '</p>';
  $('why').innerHTML = box;

  // Chỉ mở lời thoại khi đã trả lời hết các câu của bài nghe này
  if (isLastOfSet(at)) $('script-box').innerHTML = scriptHtml(s);

  $('after').classList.remove('hidden');
  $('btn-next').textContent = (at + 1 >= queue.length) ? 'Xem kết quả' : 'Câu tiếp theo';

  saveAnswer(q, k, ok);
}

function scriptHtml(s) {
  if (!s.transcript && !s.transcript_vi) return '';
  return '<div class="script">' +
           '<h3>Lời thoại</h3>' +
           (s.transcript ? '<p class="line-en">' + esc(s.transcript) + '</p>' : '') +
           (s.transcript_vi ? '<p class="line-vi">' + esc(s.transcript_vi) + '</p>' : '') +
         '</div>';
}

// ---------- Ghi lại kết quả ----------

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
    is_correct: ok
  });

  if (ansErr) toast('Không lưu được câu trả lời: ' + ansErr.message, 'bad');
}

// ---------- Nộp bài ----------

$('btn-submit').addEventListener('click', function () {
  if (!selected) return;
  answer(selected);
});

// ---------- Chuyển câu ----------

$('btn-next').addEventListener('click', function () {
  at++;
  if (at >= queue.length) finish();
  else render();
});

// ---------- Kết quả ----------

async function finish() {
  au.pause();

  $('view-q').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  $('done-score').textContent = right + '/' + queue.length;

  const pct = right / queue.length;
  $('done-title').textContent =
    pct === 1 ? 'Đúng hết. Tai nghe tốt lắm.' : (pct >= 0.7 ? 'Làm tốt lắm.' : 'Xong bài nghe.');

  $('done-sub').textContent = wrongs.length
    ? 'Dưới đây là những câu cần nghe lại.'
    : 'Không sai câu nào.';

  if (wrongs.length) showWrongs();

  const seconds = Math.round((Date.now() - started.getTime()) / 1000);

  if (attemptId) {
    const { error } = await db.from('attempts').update({
      submitted_at: new Date().toISOString(),
      correct_count: right,
      listening_correct: right,
      seconds_used: seconds,
      xp_earned: xp
    }).eq('id', attemptId);

    if (error) toast('Không lưu được kết quả bài nghe: ' + error.message, 'bad');
  }

  await db.rpc('add_xp', { p_xp: xp });
}

function showWrongs() {
  let html = '<p class="review-head">Nghe lại những chỗ này</p>';

  for (const w of wrongs) {
    const opts = w.q.options || {};
    html +=
      '<div class="wrong-q">' +
        '<span class="q-tag">' + esc(w.set.title || 'Bài nghe') + '</span>' +
        (w.q.key_point ? '<p class="key-point">' + esc(w.q.key_point) + '</p>' : '') +
        '<p class="wq">' + esc(w.q.question_text || '') + '</p>' +
        '<p class="wq" style="font-weight:600">' + esc(opts[w.q.correct_answer] || '') + '</p>' +
        (w.q.translation_vi ? '<p class="trans">' + esc(w.q.translation_vi) + '</p>' : '') +
        '<p class="chose">Bạn đã chọn: ' + esc(opts[w.chose] || w.chose) + '</p>' +
      '</div>';
  }

  $('wrong-box').innerHTML = html;
}

$('btn-again').addEventListener('click', function () {
  location.href = setId ? 'listen.html' : 'listen-practice.html?part=' + part;
});

// ---------- Nút điều khiển âm thanh ----------

$('btn-play').addEventListener('click', function () {
  if (au.paused) au.play(); else au.pause();
});

$('btn-replay').addEventListener('click', function () {
  au.currentTime = 0;
  au.play();
});

$('btn-slow').addEventListener('click', function () {
  slow = !slow;
  au.playbackRate = slow ? 0.75 : 1;
  this.classList.toggle('on', slow);
  this.textContent = slow ? 'Đang chậm 0.75x' : 'Chậm 0.75x';
});

$('play-bar').addEventListener('click', function (e) {
  if (!au.duration) return;
  const r = this.getBoundingClientRect();
  au.currentTime = ((e.clientX - r.left) / r.width) * au.duration;
});

au.addEventListener('play',  function () { $('play-label').textContent = 'Tạm dừng'; });
au.addEventListener('pause', function () { $('play-label').textContent = 'Phát'; });
au.addEventListener('ended', function () { $('play-label').textContent = 'Phát lại'; });

au.addEventListener('timeupdate', function () {
  if (!au.duration) return;
  $('play-fill').style.width = (au.currentTime / au.duration * 100) + '%';
});

au.addEventListener('error', function () {
  $('play-hint').textContent =
    'Không mở được file âm thanh của bài này. Bạn báo cô kiểm tra lại đường dẫn nhé.';
});

// ---------- Phím tắt ----------

document.addEventListener('keydown', function (e) {
  if ($('view-q').classList.contains('hidden')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (au.paused) au.play(); else au.pause();
    return;
  }

  if (e.key === 'r' || e.key === 'R') { au.currentTime = 0; au.play(); return; }

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
