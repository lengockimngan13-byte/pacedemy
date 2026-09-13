// ============================================================
// Pacedemy — thi thử full test, lấy đề từ ngân hàng THI THỬ riêng
// (bảng exam_sets / exam_listening / exam_reading / exam_questions),
// không đụng tới ngân hàng luyện đề.
// Giao diện kiểu máy thi thật: mỗi màn một câu (Part 1-5) hoặc
// một bài (Part 6-7, đề bên trái, câu hỏi bên phải).
// ============================================================

let me = null;
let examSet = null;
let screens = [];       // mỗi phần tử: 1 câu (Part 1-5) hoặc 1 bài (Part 6-7)
let cur = 0;
let picked = {};        // id câu -> chữ cái
let deadline = 0;
let tick = null;
let startAt = 0;

const SECONDS_TOTAL = 1 * 3600 + 59 * 60; // 01:59:00, đúng nhịp thi thật

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;
  loadPicker();
})();

// ---------- Chọn bộ đề ----------

async function loadPicker() {
  const { data: sets } = await db.from('exam_sets').select('*').eq('is_active', true).order('order_index');

  if (!sets || !sets.length) {
    $('pick-list').innerHTML = '<p class="empty">Cô chưa đăng bộ đề thi thử nào.</p>';
    return;
  }

  const ids = sets.map(function (s) { return s.id; });
  const { data: qs } = await db.from('exam_questions').select('exam_set_id').in('exam_set_id', ids);

  const n = {};
  for (const q of (qs || [])) n[q.exam_set_id] = (n[q.exam_set_id] || 0) + 1;

  const usable = sets.filter(function (s) { return n[s.id]; });

  if (!usable.length) {
    $('pick-list').innerHTML = '<p class="empty">Bộ đề đang được soạn, quay lại sau nhé.</p>';
    return;
  }

  $('pick-list').innerHTML = '<div class="set-grid">' + usable.map(function (s) {
    return '<div class="set">' +
      '<div class="set-head"><span class="set-name">' + esc(s.name) + '</span>' +
        '<span class="set-count">' + n[s.id] + ' câu</span></div>' +
      '<div class="topic-actions">' +
        '<button class="btn-sm test" data-pick="' + s.id + '">Chọn bộ đề này</button>' +
      '</div></div>';
  }).join('') + '</div>';

  $('pick-list').querySelectorAll('button[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () { prepare(b.dataset.pick); });
  });
}

// ---------- Gom đề của một bộ ----------

async function prepare(setId) {
  const { data: s } = await db.from('exam_sets').select('*').eq('id', setId).single();
  examSet = s;

  const { data: lsets } = await db.from('exam_listening')
    .select('*').eq('exam_set_id', setId).order('order_index');
  const { data: rsets } = await db.from('exam_reading')
    .select('*').eq('exam_set_id', setId).order('order_index');
  const { data: allQ } = await db.from('exam_questions')
    .select('*').eq('exam_set_id', setId).order('order_index');

  const byListening = {};
  const byReading = {};
  const p5 = [];

  for (const q of (allQ || [])) {
    if (q.listening_id) (byListening[q.listening_id] = byListening[q.listening_id] || []).push(q);
    else if (q.reading_id) (byReading[q.reading_id] = byReading[q.reading_id] || []).push(q);
    else if (q.part === 5) p5.push(q);
  }

  screens = [];

  [1, 2, 3, 4].forEach(function (p) {
    (lsets || []).filter(function (x) { return x.part === p; }).forEach(function (x) {
      const qs = (byListening[x.id] || []).sort(function (a, b) { return a.order_index - b.order_index; });
      if (qs.length) screens.push({ part: p, kind: 'audio', title: x.title,
        audio_url: x.audio_url, image_url: x.image_url, questions: qs });
    });
  });

  p5.sort(function (a, b) { return a.order_index - b.order_index; })
    .forEach(function (q) { screens.push({ part: 5, kind: 'p5', questions: [q] }); });

  [6, 7].forEach(function (p) {
    (rsets || []).filter(function (x) { return x.part === p; }).forEach(function (x) {
      const qs = (byReading[x.id] || []).sort(function (a, b) { return a.order_index - b.order_index; });
      if (qs.length) screens.push({ part: p, kind: 'reading', title: x.title, doc_type: x.doc_type,
        passage_text: x.passage_text, passage_vi: x.passage_vi, questions: qs });
    });
  });

  showStart();
}

function countByPart() {
  const n = {};
  for (const s of screens) n[s.part] = (n[s.part] || 0) + s.questions.length;
  return n;
}

function showStart() {
  const n = countByPart();
  const total = screens.reduce(function (m, s) { return m + s.questions.length; }, 0);

  const rows = [1, 2, 3, 4, 5, 6, 7].map(function (p) {
    return '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;padding:10px 14px">' +
      '<span style="flex:1">Part ' + p + '</span>' +
      '<span class="stat-lab">' + (n[p] || 0) + ' câu</span></div>';
  }).join('');

  $('view-pick').classList.add('hidden');
  $('view-start').classList.remove('hidden');

  $('start-info').innerHTML =
    '<div class="greet"><h1>' + esc(examSet.name) + '</h1>' +
      '<p>Bộ đề này có ' + total + ' câu. Thời gian làm bài 1 giờ 59 phút, hết giờ tự nộp.</p></div>' +
    '<div class="tbox">' + rows +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">' +
        '<button class="btn btn-gold" id="btn-go">Bắt đầu làm bài</button>' +
        '<button class="btn btn-line" id="btn-other">Chọn bộ đề khác</button>' +
      '</div></div>';

  $('btn-go').addEventListener('click', begin);
  $('btn-other').addEventListener('click', function () {
    $('view-start').classList.add('hidden');
    $('view-pick').classList.remove('hidden');
  });
}

// ---------- Vào bài ----------

function begin() {
  cur = 0;
  picked = {};
  startAt = Date.now();
  deadline = startAt + SECONDS_TOTAL * 1000;

  $('view-start').classList.add('hidden');
  $('view-test').classList.remove('hidden');
  $('timer').classList.remove('hidden');
  $('link-out').classList.add('hidden');

  window.onbeforeunload = function () { return 'Bài thi đang làm dở. Rời trang là mất bài.'; };

  drawTabs();
  openScreen(0);

  tick = setInterval(function () {
    const left = Math.max(0, deadline - Date.now());
    $('timer').textContent = fmtClock(left);
    $('timer').className = 'timer' + (left < 5 * 60000 ? ' hot' : '');
    if (left <= 0) { clearInterval(tick); submit(true); }
  }, 500);
}

function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function drawTabs() {
  const n = countByPart();
  $('tabs').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(function (p) {
    const first = screens.findIndex(function (s) { return s.part === p; });
    return '<button class="test-tab" data-jump="' + first + '"' +
      (first === -1 ? ' disabled' : '') + '>Part ' + p + '<span>' + (n[p] || 0) + '</span></button>';
  }).join('');

  $('tabs').querySelectorAll('button[data-jump]').forEach(function (b) {
    b.addEventListener('click', function () { openScreen(parseInt(b.dataset.jump, 10)); });
  });
}

// ---------- Hiện một màn ----------

function openScreen(i) {
  cur = i;
  window.scrollTo(0, 0);

  $('tabs').querySelectorAll('button[data-jump]').forEach(function (b) {
    const idx = parseInt(b.dataset.jump, 10);
    const sc = screens[idx];
    b.classList.toggle('on', sc && sc.part === screens[cur].part);
  });

  const s = screens[cur];
  const done = allQuestions().filter(function (q) { return picked[q.id]; }).length;

  $('pos-label').textContent =
    'Part ' + s.part + ' · màn ' + (cur + 1) + '/' + screens.length +
    ' · đã làm ' + done + '/' + allQuestions().length + ' câu';

  $('btn-prev').disabled = cur === 0;
  $('btn-next').classList.toggle('hidden', cur === screens.length - 1);
  $('btn-submit').classList.toggle('hidden', cur !== screens.length - 1);

  if (s.kind === 'p5') drawP5(s);
  else if (s.kind === 'audio') drawAudio(s);
  else drawReading(s);
}

function drawP5(s) {
  const q = s.questions[0];
  $('screen').innerHTML = '<div class="exam-solo">' + qBlock(q, null) + '</div>';
  bindPick();
}

function drawAudio(s) {
  let html = '<div class="exam-solo">';
  html += '<p class="rq-head">' + esc(s.title) + '</p>';
  if (s.image_url) html += '<img class="pic" src="' + esc(s.image_url) + '" alt="">';
  if (s.audio_url) html += '<audio controls preload="none" style="width:100%;margin:10px 0"><source src="' + esc(s.audio_url) + '"></audio>';
  s.questions.forEach(function (q, i) { html += qBlock(q, s.questions.length > 1 ? i + 1 : null); });
  html += '</div>';
  $('screen').innerHTML = html;
  bindPick();
}

function drawReading(s) {
  let text = esc(s.passage_text).replace(/---\s*(\d+)\s*---/g, function (m, n) {
    return '<span class="blank">' + n + '</span>';
  });
  const docs = text.split(/\n?===+\n?/).map(function (d) {
    return '<div class="doc">' + d.replace(/\n/g, '<br>') + '</div>';
  }).join('');

  let qHtml = '';
  s.questions.forEach(function (q, i) { qHtml += qBlock(q, i + 1); });

  $('screen').innerHTML =
    '<div class="exam-split">' +
      '<div class="exam-passage">' +
        '<p class="rq-head">' + esc(s.title) +
          (s.doc_type ? ' <span class="stat-lab">' + esc(s.doc_type) + '</span>' : '') + '</p>' +
        docs +
      '</div>' +
      '<div class="exam-questions">' + qHtml + '</div>' +
    '</div>';
  bindPick();
}

function qBlock(q, no) {
  const o = q.options || {};
  return '<div class="rq" data-q="' + q.id + '">' +
    '<p class="rq-head">' + (no ? no + '. ' : '') + esc(q.question_text || '') + '</p>' +
    ['A', 'B', 'C', 'D'].map(function (L) {
      if (!o[L]) return '';
      const on = picked[q.id] === L;
      return '<button class="opt' + (on ? ' on' : '') + '" data-pick="' + q.id + '" data-l="' + L + '">' +
        '<span class="opt-letter">' + L + '</span><span>' + esc(o[L]) + '</span></button>';
    }).join('') + '</div>';
}

function bindPick() {
  $('screen').querySelectorAll('button[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      const id = b.dataset.pick;
      picked[id] = b.dataset.l;
      openScreen(cur);
    });
  });
}

$('btn-prev').addEventListener('click', function () { if (cur > 0) openScreen(cur - 1); });
$('btn-next').addEventListener('click', function () { if (cur < screens.length - 1) openScreen(cur + 1); });

function allQuestions() {
  let out = [];
  for (const s of screens) out = out.concat(s.questions);
  return out;
}

// ---------- Nộp bài ----------

$('btn-submit').addEventListener('click', function () { submit(false); });

async function submit(auto) {
  const all = allQuestions();
  const left = all.length - all.filter(function (q) { return picked[q.id]; }).length;

  if (!auto && left && !confirm('Còn ' + left + ' câu chưa làm. Nộp bài luôn?')) return;

  if (tick) clearInterval(tick);
  window.onbeforeunload = null;

  const secs = Math.round((Date.now() - startAt) / 1000);

  let lOk = 0, rOk = 0, lN = 0, rN = 0;
  const byPart = {};

  for (const q of all) {
    const right = picked[q.id] === q.correct_answer;
    byPart[q.part] = byPart[q.part] || { ok: 0, n: 0 };
    byPart[q.part].n++;
    if (right) byPart[q.part].ok++;

    if (q.part <= 4) { lN++; if (right) lOk++; }
    else { rN++; if (right) rOk++; }
  }

  $('view-test').classList.add('hidden');
  $('timer').classList.add('hidden');
  $('link-out').classList.remove('hidden');
  $('view-done').classList.remove('hidden');
  window.scrollTo(0, 0);

  const statCards = [stat((lOk + rOk) + '/' + all.length, 'Tổng số câu đúng')];
  if (lN) statCards.push(stat(lOk + '/' + lN, 'Phần Nghe'));
  if (rN) statCards.push(stat(rOk + '/' + rN, 'Phần Đọc'));
  statCards.push(stat(all.length ? Math.round((lOk + rOk) / all.length * 100) + '%' : '—', 'Độ chính xác'));

  $('result').innerHTML =
    '<div class="greet"><h1>' + (auto ? 'Hết giờ, bài đã tự nộp' : 'Đã nộp bài') + '</h1>' +
    '<p>' + esc(examSet.name) + ' · làm hết ' + Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây' +
    (left ? ', bỏ trống ' + left + ' câu' : '') + '.</p></div>' +
    '<section class="stats">' + statCards.join('') + '</section>' +
    '<p class="review-note">Đề này chưa đủ 200 câu như đề thật nên chưa quy ra điểm TOEIC được.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0">' +
      '<button class="btn btn-ink" id="btn-review">Xem lại bài làm</button>' +
      '<a class="btn btn-line" href="app.html">Về trang học</a>' +
    '</div>';

  $('btn-review').addEventListener('click', showReview);

  await db.from('mock_tests').insert({
    user_id: me.id, exam_set_id: examSet.id,
    started_at: new Date(startAt).toISOString(),
    submitted_at: new Date().toISOString(),
    seconds_used: secs, listening_correct: lOk, reading_correct: rOk,
    total_questions: all.length,
    payload: { parts: byPart, listening_total: lN, reading_total: rN }
  });

  const { data: att } = await db.from('attempts').insert({
    user_id: me.id, mode: 'mock', total_questions: all.length,
    correct_count: lOk + rOk, seconds_used: secs, submitted_at: new Date().toISOString()
  }).select('id').single();

  if (att) {
    const rows = all.map(function (q) {
      return { attempt_id: att.id, question_id: null, selected: picked[q.id] || null,
        is_correct: picked[q.id] === q.correct_answer };
    });
    for (let i = 0; i < rows.length; i += 100) await db.from('attempt_answers').insert(rows.slice(i, i + 100));
  }
}

function stat(num, lab) {
  return '<div class="stat"><span class="stat-num">' + num + '</span><span class="stat-lab">' + lab + '</span></div>';
}

function showReview() {
  const all = allQuestions();
  const wrong = all.filter(function (q) { return picked[q.id] !== q.correct_answer; });

  if (!wrong.length) { $('review').innerHTML = '<p class="empty">Bạn làm đúng hết.</p>'; return; }

  let html = '<div class="section-head"><h2>' + wrong.length + ' câu cần xem lại</h2></div>';

  wrong.forEach(function (q) {
    const o = q.options || {};
    const my = picked[q.id];

    html += '<div class="wrong-q">' +
      '<p class="wq">Part ' + q.part + ' · ' + esc(q.question_text || '') + '</p>' +
      ['A', 'B', 'C', 'D'].map(function (L) {
        if (!o[L]) return '';
        const right = L === q.correct_answer;
        const mine = L === my;
        return '<p class="ww" style="margin:3px 0' + (right ? ';color:var(--teal);font-weight:600' : '') +
          (mine && !right ? ';color:var(--danger)' : '') + '">' + L + '. ' + esc(o[L]) +
          (right ? '  ✓' : (mine ? '  ✗ bạn chọn' : '')) + '</p>';
      }).join('') +
      (q.explanation ? '<p class="key-point" style="margin:8px 0 0">' + esc(q.explanation) + '</p>' : '') +
      '</div>';
  });

  $('review').innerHTML = html;
  $('btn-review').classList.add('hidden');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
