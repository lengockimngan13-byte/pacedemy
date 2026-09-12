// ============================================================
// Pacedemy — thi thử full test có đếm ngược
// Nghe 100 câu, Đọc 100 câu, 120 phút. Thiếu đề thì lấy tối đa
// những gì đang có và nói rõ cho học viên biết.
// ============================================================

let me = null;
let test = null;        // { listening: [...], reading: [...] }
let picked = {};        // id câu -> chữ cái
let deadline = 0;
let tick = null;
let curTab = 1;
let startAt = 0;

const WANT = { 1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54 };
const MINUTES = 120;

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;
  prepare();
})();

// ---------- Gom đề ----------

async function prepare() {
  // Bài nghe
  const { data: lsets } = await db
    .from('listening_sets').select('id, part, title, audio_url, image_url, transcript, transcript_vi')
    .eq('is_active', true);

  // Bài đọc
  const { data: rsets } = await db
    .from('reading_sets').select('id, part, title, passage_text, passage_vi, doc_type')
    .eq('is_active', true);

  const setIds = (lsets || []).map(function (s) { return s.id; });
  const rIds   = (rsets || []).map(function (s) { return s.id; });

  // Câu hỏi thuộc bài nghe
  let lq = [];
  if (setIds.length) {
    const { data } = await db.from('questions')
      .select('id, part, question_text, options, correct_answer, explanation, topic_tag, set_id, order_index')
      .in('set_id', setIds).eq('is_active', true);
    lq = data || [];
  }

  // Câu hỏi thuộc bài đọc
  let rq = [];
  if (rIds.length) {
    const { data } = await db.from('questions')
      .select('id, part, question_text, options, correct_answer, explanation, topic_tag, rset_id, order_index')
      .in('rset_id', rIds).eq('is_active', true);
    rq = data || [];
  }

  // Câu Part 5 rời
  const { data: p5 } = await db.from('questions')
    .select('id, part, question_text, options, correct_answer, explanation, topic_tag')
    .eq('part', 5).eq('is_active', true).limit(400);

  test = {
    lsets: lsets || [], rsets: rsets || [],
    lq: lq, rq: rq, p5: shuffle(p5 || []).slice(0, WANT[5])
  };

  showStart();
}

function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = x[i]; x[i] = x[j]; x[j] = t;
  }
  return x;
}

function countPart(p) {
  if (p === 5) return test.p5.length;
  if (p === 6 || p === 7) return test.rq.filter(function (q) { return q.part === p; }).length;
  return test.lq.filter(function (q) { return q.part === p; }).length;
}

function showStart() {
  let total = 0;
  let rows = '';

  for (const p of [1, 2, 3, 4, 5, 6, 7]) {
    const n = countPart(p);
    total += n;
    const full = n >= WANT[p];

    rows +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;padding:10px 14px">' +
        '<span style="flex:1">Part ' + p + '</span>' +
        '<span class="stat-lab">' + n + ' câu</span>' +
        '<span class="' + (full ? 'tag-warm' : 'tag-cold') + '" style="font-size:0.78rem">' +
          (full ? 'đủ' : 'đề thật ' + WANT[p] + ' câu') + '</span>' +
      '</div>';
  }

  if (!total) {
    $('start-info').innerHTML =
      '<p class="empty">Ngân hàng đề chưa có câu nào. Cô cần đăng đề trước đã.</p>';
    return;
  }

  $('start-info').innerHTML =
    '<div class="tbox">' +
      '<h3>Đề lần này có ' + total + ' câu</h3>' +
      '<p style="margin:0 0 14px;font-size:0.94rem;line-height:1.65">' +
        'Bài thi thật có 200 câu trong 120 phút. Đề của bạn hiện có ' + total + ' câu, ' +
        'thời gian vẫn để 120 phút để bạn quen nhịp. Hết giờ bài tự nộp.</p>' +
      rows +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">' +
        '<button class="btn btn-gold" id="btn-go">Bắt đầu làm bài</button>' +
        '<a class="btn btn-line" href="app.html">Để lúc khác</a>' +
      '</div>' +
    '</div>';

  $('btn-go').addEventListener('click', begin);
}

// ---------- Vào bài ----------

function begin() {
  startAt = Date.now();
  deadline = startAt + MINUTES * 60000;

  $('view-start').classList.add('hidden');
  $('view-test').classList.remove('hidden');
  $('timer').classList.remove('hidden');
  $('link-out').classList.add('hidden');

  window.onbeforeunload = function () { return 'Bài thi đang làm dở. Rời trang là mất bài.'; };

  drawTabs();
  openTab(1);

  tick = setInterval(function () {
    const left = Math.max(0, deadline - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);

    $('timer').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    $('timer').className = 'timer' + (left < 5 * 60000 ? ' hot' : '');

    if (left <= 0) { clearInterval(tick); submit(true); }
  }, 500);
}

function drawTabs() {
  $('tabs').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(function (p) {
    const n = countPart(p);
    return '<button class="test-tab' + (p === curTab ? ' on' : '') + '" data-t="' + p + '"' +
           (n ? '' : ' disabled') + '>Part ' + p + '<span>' + n + '</span></button>';
  }).join('');

  $('tabs').querySelectorAll('button[data-t]').forEach(function (b) {
    b.addEventListener('click', function () { openTab(parseInt(b.dataset.t, 10)); });
  });
}

function openTab(p) {
  curTab = p;
  drawTabs();
  window.scrollTo(0, 0);

  if (p === 5) return drawLoose(test.p5, 'Part 5 · Hoàn thành câu');
  if (p === 6 || p === 7) return drawSets(p, test.rsets, test.rq, false);
  return drawSets(p, test.lsets, test.lq, true);
}

// Part 5: câu rời
function drawLoose(list, title) {
  let html = '<h2 style="margin:0 0 16px">' + title + '</h2>';
  list.forEach(function (q, i) { html += qBlock(q, i + 1); });
  $('body').innerHTML = html;
  bindPick();
}

// Part 1-4, 6, 7: câu gắn với bài
function drawSets(p, allSets, allQs, isAudio) {
  const mine = allSets.filter(function (s) { return s.part === p; });

  if (!mine.length) {
    $('body').innerHTML = '<p class="empty">Part ' + p + ' chưa có bài nào.</p>';
    return;
  }

  let html = '<h2 style="margin:0 0 16px">Part ' + p + '</h2>';
  let no = 0;

  for (const s of mine) {
    const key = isAudio ? 'set_id' : 'rset_id';
    const list = allQs
      .filter(function (q) { return String(q[key]) === String(s.id); })
      .sort(function (a, b) { return (a.order_index || 0) - (b.order_index || 0); });

    if (!list.length) continue;

    html += '<div class="test-set">';

    if (isAudio) {
      html += '<p class="rq-head">' + esc(s.title) + '</p>';
      if (s.image_url) html += '<img class="pic" src="' + esc(s.image_url) + '" alt="">';
      if (s.audio_url) {
        html += '<audio controls preload="none" style="width:100%;margin:10px 0">' +
                '<source src="' + esc(s.audio_url) + '"></audio>';
      }
    } else {
      html += '<p class="rq-head">' + esc(s.title) +
              (s.doc_type ? ' <span class="stat-lab">' + esc(s.doc_type) + '</span>' : '') + '</p>';

      let text = esc(s.passage_text).replace(/---\s*(\d+)\s*---/g, function (m, n) {
        return '<span class="blank">' + n + '</span>';
      });

      html += '<div class="passage">' +
        text.split(/\n?===+\n?/).map(function (d) {
          return '<div class="doc">' + d.replace(/\n/g, '<br>') + '</div>';
        }).join('') + '</div>';
    }

    for (const q of list) { no++; html += qBlock(q, no); }
    html += '</div>';
  }

  $('body').innerHTML = html;
  bindPick();
}

function qBlock(q, no) {
  const o = q.options || {};

  return '<div class="rq" data-q="' + q.id + '">' +
    '<p class="rq-head">' + no + '. ' + esc(q.question_text || '') + '</p>' +
    ['A', 'B', 'C', 'D'].map(function (L) {
      if (!o[L]) return '';
      const on = picked[q.id] === L;
      return '<button class="opt' + (on ? ' on' : '') + '" data-pick="' + q.id +
             '" data-l="' + L + '">' +
               '<span class="opt-letter">' + L + '</span><span>' + esc(o[L]) + '</span>' +
             '</button>';
    }).join('') +
  '</div>';
}

function bindPick() {
  $('body').querySelectorAll('button[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      const id = b.dataset.pick;
      picked[id] = b.dataset.l;

      $('body').querySelectorAll('button[data-pick="' + id + '"]')
        .forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');

      showLeft();
    });
  });

  showLeft();
}

function allQuestions() {
  return test.p5
    .concat(test.lq)
    .concat(test.rq);
}

function showLeft() {
  const all = allQuestions();
  const done = all.filter(function (q) { return picked[q.id]; }).length;
  $('count-left').textContent = 'Đã làm ' + done + '/' + all.length + ' câu';
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
    const p = q.part;

    byPart[p] = byPart[p] || { ok: 0, n: 0 };
    byPart[p].n++;
    if (right) byPart[p].ok++;

    if (p <= 4) { lN++; if (right) lOk++; }
    else { rN++; if (right) rOk++; }
  }

  $('view-test').classList.add('hidden');
  $('timer').classList.add('hidden');
  $('link-out').classList.remove('hidden');
  $('view-done').classList.remove('hidden');
  window.scrollTo(0, 0);

  $('result').innerHTML =
    '<div class="greet"><h1>' + (auto ? 'Hết giờ, bài đã tự nộp' : 'Đã nộp bài') + '</h1>' +
    '<p>Bạn làm hết ' + Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây' +
    (left ? ', bỏ trống ' + left + ' câu' : '') + '.</p></div>' +

    '<section class="stats">' +
      '<div class="stat"><span class="stat-num">' + (lOk + rOk) + '/' + all.length +
        '</span><span class="stat-lab">Tổng số câu đúng</span></div>' +
      '<div class="stat"><span class="stat-num">' + lOk + '/' + lN +
        '</span><span class="stat-lab">Phần Nghe</span></div>' +
      '<div class="stat"><span class="stat-num">' + rOk + '/' + rN +
        '</span><span class="stat-lab">Phần Đọc</span></div>' +
      '<div class="stat"><span class="stat-num">' +
        (all.length ? Math.round((lOk + rOk) / all.length * 100) : 0) +
        '%</span><span class="stat-lab">Độ chính xác</span></div>' +
    '</section>' +

    '<p class="review-note">Đề này chưa đủ 200 câu như đề thật nên chưa quy ra điểm TOEIC được. ' +
    'Tỉ lệ đúng ở trên vẫn cho bạn thấy mình đang ở đâu.</p>' +

    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0">' +
      '<button class="btn btn-ink" id="btn-review">Xem lại bài làm</button>' +
      '<a class="btn btn-line" href="app.html">Về trang học</a>' +
    '</div>';

  $('btn-review').addEventListener('click', showReview);

  // Lưu lại
  const { data: mt } = await db.from('mock_tests').insert({
    user_id: me.id,
    started_at: new Date(startAt).toISOString(),
    submitted_at: new Date().toISOString(),
    seconds_used: secs,
    listening_correct: lOk,
    reading_correct: rOk,
    total_questions: all.length,
    payload: { parts: byPart, listening_total: lN, reading_total: rN }
  }).select('id').single();

  const { data: att } = await db.from('attempts').insert({
    user_id: me.id,
    mode: 'mock',
    total_questions: all.length,
    correct_count: lOk + rOk,
    seconds_used: secs,
    submitted_at: new Date().toISOString()
  }).select('id').single();

  if (att) {
    const rows = all.map(function (q) {
      return {
        attempt_id: att.id,
        question_id: q.id,
        selected: picked[q.id] || null,
        is_correct: picked[q.id] === q.correct_answer
      };
    });
    for (let i = 0; i < rows.length; i += 100) {
      await db.from('attempt_answers').insert(rows.slice(i, i + 100));
    }
  }
}

function showReview() {
  const all = allQuestions();
  const wrong = all.filter(function (q) { return picked[q.id] !== q.correct_answer; });

  if (!wrong.length) {
    $('review').innerHTML = '<p class="empty">Bạn làm đúng hết, không có gì để xem lại.</p>';
    return;
  }

  let html = '<div class="section-head"><h2>' + wrong.length + ' câu cần xem lại</h2></div>';

  wrong.forEach(function (q, i) {
    const o = q.options || {};
    const my = picked[q.id];

    html +=
      '<div class="wrong-q">' +
        '<p class="wq">Part ' + q.part + ' · ' + esc(q.question_text || '') + '</p>' +
        ['A', 'B', 'C', 'D'].map(function (L) {
          if (!o[L]) return '';
          const right = L === q.correct_answer;
          const mine = L === my;
          return '<p class="ww" style="margin:3px 0' +
                 (right ? ';color:var(--teal);font-weight:600' : '') +
                 (mine && !right ? ';color:var(--danger)' : '') + '">' +
                 L + '. ' + esc(o[L]) + (right ? '  ✓' : (mine ? '  ✗ bạn chọn' : '')) + '</p>';
        }).join('') +
        (q.explanation ? '<p class="key-point" style="margin:8px 0 0">' +
          esc(q.explanation) + '</p>' : '') +
      '</div>';
  });

  $('review').innerHTML = html;
  $('btn-review').classList.add('hidden');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
