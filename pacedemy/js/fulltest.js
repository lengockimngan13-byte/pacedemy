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
let marked = {};        // id câu -> đã đánh dấu xem lại hay chưa
let reviewMode = false; // đang ở chế độ xem lại sau khi nộp bài hay không
let deadline = 0;
let tick = null;
let startAt = 0;
let luyenTap = false;   // đang ở chế độ Luyện tập: không bấm giờ, không tính vào lịch sử thi

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
        audio_url: x.audio_url, image_url: x.image_url, graphic: x.graphic, questions: qs });
    });
  });

  p5.sort(function (a, b) { return a.order_index - b.order_index; })
    .forEach(function (q) { screens.push({ part: 5, kind: 'p5', questions: [q] }); });

  [6, 7].forEach(function (p) {
    (rsets || []).filter(function (x) { return x.part === p; }).forEach(function (x) {
      const qs = (byReading[x.id] || []).sort(function (a, b) { return a.order_index - b.order_index; });
      if (qs.length) screens.push({ part: p, kind: 'reading', title: x.title, doc_type: x.doc_type,
        passage_text: x.passage_text, passage_vi: x.passage_vi, vocab: x.vocab || [], questions: qs });
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
  const nNghe = (n[1] || 0) + (n[2] || 0) + (n[3] || 0) + (n[4] || 0);
  const nDoc  = (n[5] || 0) + (n[6] || 0) + (n[7] || 0);
  const total = nNghe + nDoc;

  const phut = Math.round(SECONDS_TOTAL / 60);

  $('view-pick').classList.add('hidden');
  $('view-start').classList.remove('hidden');

  $('start-info').innerHTML =
    '<div class="ex-head">' +
      '<h1>' + esc(examSet.name) + '</h1>' +
      '<div class="ex-acts">' +
        '<button class="btn btn-gold" id="btn-go">Bắt đầu thi</button>' +
        '<button class="btn btn-line" data-tab="luyen">Luyện tập</button>' +
        '<button class="btn btn-line" data-tab="lichsu">Lịch sử thi</button>' +
        '<button class="btn btn-line" data-tab="causai">Câu sai</button>' +
        '<button class="btn btn-line" data-tab="ghichu">Sổ ghi chú</button>' +
      '</div>' +
      '<button class="btn-quiet ex-back" id="btn-other">← Chọn bộ đề khác</button>' +
    '</div>' +

    '<div class="ex-tiles">' +
      '<div class="ex-tile"><span>Số câu</span><b>' + total + ' câu</b></div>' +
      '<div class="ex-tile gold"><span>Thời gian</span><b>' + phut + ' phút</b></div>' +
    '</div>' +

    '<div class="ex-secs">' +
      secCard('Phần Nghe', 'Part 1 đến 4', nNghe, [1, 2, 3, 4], n) +
      secCard('Phần Đọc', 'Part 5 đến 7', nDoc, [5, 6, 7], n) +
    '</div>' +

    '<div class="tbox ex-guide">' +
      '<h3>Trước khi bắt đầu</h3>' +
      '<ul>' +
        '<li>Bài có ' + total + ' câu, chia 7 Part: 4 Part Nghe và 3 Part Đọc.</li>' +
        '<li>Đồng hồ chạy ' + phut + ' phút cho cả bài, hết giờ tự nộp.</li>' +
        '<li>Câu nào phân vân thì bấm cờ đánh dấu, cuối giờ quay lại xem.</li>' +
        '<li>Phần Nghe mỗi bài nghe được một lượt, nghe xong là chuyển.</li>' +
        '<li>Nộp xong có điểm TOEIC ước lượng và giải thích từng câu.</li>' +
        '<li>Muốn làm thong thả không bấm giờ thì chọn Luyện tập.</li>' +
      '</ul>' +
    '</div>' +

    '<div id="ex-panel"></div>';

  $('btn-go').addEventListener('click', function () { begin(false); });
  $('btn-other').addEventListener('click', function () {
    $('view-start').classList.add('hidden');
    $('view-pick').classList.remove('hidden');
  });

  $('start-info').querySelectorAll('button[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      const dang = b.classList.contains('on');
      $('start-info').querySelectorAll('button[data-tab]').forEach(function (x) { x.classList.remove('on'); });
      if (dang) { $('ex-panel').innerHTML = ''; return; }
      b.classList.add('on');
      if (b.dataset.tab === 'luyen')  return panelLuyen();
      if (b.dataset.tab === 'lichsu') return panelLichSu();
      if (b.dataset.tab === 'causai') return panelCauSai();
      if (b.dataset.tab === 'ghichu') return panelGhiChu();
    });
  });
}

function secCard(ten, dai, soCau, parts, n) {
  const rows = parts.map(function (p) {
    return '<div class="ex-row"><span>Part ' + p + '</span><b>' + (n[p] || 0) + ' câu</b></div>';
  }).join('');

  return '<div class="tbox ex-sec">' +
    '<h3>' + ten + '</h3>' +
    '<p class="ex-sec-sub">' + dai + ' · ' + soCau + ' câu</p>' +
    rows +
  '</div>';
}

function panelBox(tieuDe, than) {
  $('ex-panel').innerHTML = '<div class="tbox ex-panel"><h3>' + tieuDe + '</h3>' + than + '</div>';
}

// ---------- Luyện tập ----------

function panelLuyen() {
  panelBox('Luyện tập',
    '<p class="ex-p">Làm y hệt đề thi nhưng không bấm giờ, rời trang giữa chừng cũng không sao. ' +
    'Nộp xong xem được đáp án và giải thích từng câu. Lần làm này không tính vào Lịch sử thi.</p>' +
    '<button class="btn btn-ink" id="btn-luyen">Vào luyện tập</button>');

  $('btn-luyen').addEventListener('click', function () { begin(true); });
}

// ---------- Lịch sử thi ----------

async function panelLichSu() {
  panelBox('Lịch sử thi', '<p class="empty">Đang tải…</p>');

  const { data, error } = await db.from('mock_tests')
    .select('submitted_at, seconds_used, listening_correct, reading_correct, total_questions')
    .eq('user_id', me.id).eq('exam_set_id', examSet.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false }).limit(30);

  if (error) return panelBox('Lịch sử thi', '<p class="empty">Không tải được: ' + esc(error.message) + '</p>');

  if (!data || !data.length) {
    return panelBox('Lịch sử thi',
      '<p class="empty">Bạn chưa thi bộ đề này lần nào. Thi xong lần đầu, kết quả sẽ nằm ở đây để so với các lần sau.</p>');
  }

  const rows = data.map(function (m) {
    const d = new Date(m.submitted_at);
    const dung = (m.listening_correct || 0) + (m.reading_correct || 0);
    const pct = m.total_questions ? Math.round(dung / m.total_questions * 100) : 0;
    return '<div class="ex-hist">' +
      '<span class="ex-when">' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + '</span>' +
      '<span class="ex-score">' + dung + '/' + (m.total_questions || 0) + '</span>' +
      '<span class="stat-lab">' + pct + '%</span>' +
      '<span class="stat-lab">Nghe ' + (m.listening_correct || 0) + ' · Đọc ' + (m.reading_correct || 0) + '</span>' +
      '<span class="stat-lab">' + Math.round((m.seconds_used || 0) / 60) + ' phút</span>' +
    '</div>';
  }).join('');

  panelBox('Lịch sử thi', '<p class="ex-p">' + data.length + ' lần thi bộ đề này.</p>' + rows);
}

// ---------- Câu sai ----------

async function panelCauSai() {
  panelBox('Câu sai', '<p class="empty">Đang tải…</p>');

  const all = allQuestions();
  const qById = {};
  for (const q of all) qById[q.id] = q;

  const { data: atts } = await db.from('attempts')
    .select('id').eq('user_id', me.id)
    .order('id', { ascending: false }).limit(200);

  const ids = (atts || []).map(function (a) { return a.id; });
  if (!ids.length) {
    return panelBox('Câu sai', '<p class="empty">Chưa có dữ liệu. Làm bộ đề này một lần đi đã.</p>');
  }

  let sai = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await db.from('attempt_answers')
      .select('exam_question_id, selected')
      .in('attempt_id', ids.slice(i, i + 100))
      .eq('is_correct', false)
      .in('exam_question_id', all.map(function (q) { return q.id; }));
    sai = sai.concat(data || []);
  }

  if (!sai.length) {
    return panelBox('Câu sai',
      '<p class="empty">Không có câu nào sai trong bộ đề này. Hoặc bạn chưa làm, hoặc làm đúng hết.</p>');
  }

  // Câu nào sai nhiều lần thì xếp lên trước
  const dem = {};
  const chon = {};
  for (const x of sai) {
    dem[x.exam_question_id] = (dem[x.exam_question_id] || 0) + 1;
    if (x.selected) chon[x.exam_question_id] = x.selected;
  }

  const ds = Object.keys(dem)
    .filter(function (id) { return qById[id]; })
    .sort(function (a, b) { return dem[b] - dem[a]; });

  const html = ds.map(function (id) {
    const q = qById[id];
    const o = q.options || {};
    const my = chon[id];

    const opts = ['A', 'B', 'C', 'D'].map(function (L) {
      if (!o[L]) return '';
      const dung = L === q.correct_answer;
      const daChon = L === my;
      return '<div class="qd-opt' + (dung ? ' is-right' : '') + (daChon && !dung ? ' is-wrong' : '') + '">' +
        '<span class="qd-letter">' + L + '</span><span class="qd-text">' + esc(o[L]) + '</span>' +
        (daChon ? '<span class="qd-tag">bạn chọn</span>' : '') +
        (dung && !daChon ? '<span class="qd-tag">đáp án đúng</span>' : '') +
      '</div>';
    }).join('');

    return '<div class="qd">' +
      '<div class="qd-head">' +
        '<span class="qd-no">Part ' + (q.part || '?') + '</span>' +
        (dem[id] > 1 ? '<span class="qd-mark no">sai ' + dem[id] + ' lần</span>' : '') +
        (q.topic_tag ? '<span class="stat-lab">' + esc(q.topic_tag) + '</span>' : '') +
      '</div>' +
      (q.question_text ? '<p class="qd-q">' + esc(q.question_text) + '</p>' : '') +
      opts +
      (q.explanation ? '<p class="qd-why">' + esc(q.explanation) + '</p>' : '') +
    '</div>';
  }).join('');

  panelBox('Câu sai', '<p class="ex-p">' + ds.length + ' câu bạn từng làm sai, câu sai nhiều lần xếp lên trước.</p>' + html);
}

// ---------- Sổ ghi chú ----------

async function panelGhiChu() {
  panelBox('Sổ ghi chú', '<p class="empty">Đang tải…</p>');

  const { data } = await db.from('exam_notes')
    .select('content').eq('user_id', me.id).eq('exam_set_id', examSet.id).maybeSingle();

  panelBox('Sổ ghi chú',
    '<p class="ex-p">Ghi lại từ mới, bẫy hay dính, mẹo của riêng bạn cho bộ đề này. ' +
    'Chỉ mình bạn đọc được.</p>' +
    '<textarea id="note-text" class="ex-note" placeholder="Ví dụ: câu 132 bẫy chỗ although với despite…">' +
      esc((data && data.content) || '') + '</textarea>' +
    '<div class="ex-note-bar">' +
      '<button class="btn btn-ink" id="btn-note-save">Lưu ghi chú</button>' +
      '<span class="stat-lab" id="note-msg"></span>' +
    '</div>');

  $('btn-note-save').addEventListener('click', async function () {
    this.disabled = true;
    const { error } = await db.from('exam_notes').upsert({
      user_id: me.id,
      exam_set_id: examSet.id,
      content: $('note-text').value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,exam_set_id' });
    this.disabled = false;

    if (error) { toast('Không lưu được: ' + error.message, 'bad'); return; }
    toast('Đã lưu ghi chú.', 'good');
    $('note-msg').textContent = 'Đã lưu lúc ' + new Date().toLocaleTimeString('vi-VN').slice(0, 5);
  });
}

// ---------- Vào bài ----------

function begin(lt) {
  luyenTap = !!lt;
  cur = 0;
  picked = {};
  marked = {};
  reviewMode = false;
  startAt = Date.now();
  deadline = startAt + SECONDS_TOTAL * 1000;

  $('view-start').classList.add('hidden');
  $('view-test').classList.remove('hidden');
  $('link-out').classList.add('hidden');

  // Luyện tập thì bỏ đồng hồ và bỏ luôn lời cảnh báo rời trang
  $('timer').classList.toggle('hidden', luyenTap);

  if (!luyenTap) {
    window.onbeforeunload = function () { return 'Bài thi đang làm dở. Rời trang là mất bài.'; };
  }

  drawTabs();
  openScreen(0);

  if (luyenTap) return;

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

function enterReview() {
  reviewMode = true;
  $('view-done').classList.add('hidden');
  $('view-test').classList.remove('hidden');
  $('btn-exit-review').classList.remove('hidden');
  openScreen(0);
}

$('btn-exit-review').addEventListener('click', function () {
  reviewMode = false;
  $('view-test').classList.add('hidden');
  $('btn-exit-review').classList.add('hidden');
  $('view-done').classList.remove('hidden');
  window.scrollTo(0, 0);
});

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
  const nMarked = Object.keys(marked).filter(function (id) { return marked[id]; }).length;

  if (reviewMode) {
    const rightN = s.questions.filter(function (q) { return picked[q.id] === q.correct_answer; }).length;
    $('pos-label').textContent =
      'Xem lại · Part ' + s.part + ' · màn ' + (cur + 1) + '/' + screens.length +
      ' · đúng ' + rightN + '/' + s.questions.length + ' câu ở màn này';
  } else {
    $('pos-label').textContent =
      'Part ' + s.part + ' · màn ' + (cur + 1) + '/' + screens.length +
      ' · đã làm ' + done + '/' + allQuestions().length + ' câu' +
      (nMarked ? ' · đã đánh dấu ' + nMarked + ' câu' : '');
  }

  $('btn-prev').disabled = cur === 0;
  $('btn-next').classList.toggle('hidden', cur === screens.length - 1);
  $('btn-submit').classList.toggle('hidden', reviewMode || cur !== screens.length - 1);

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
  // bảng biểu Part 3-4 vẽ từ dữ liệu, không phải ảnh
  if (s.graphic && typeof DoHoa !== 'undefined') html += DoHoa.ve(s.graphic);
  if (s.audio_url) html += '<audio controls preload="none" style="width:100%;margin:10px 0"><source src="' + esc(s.audio_url) + '"></audio>';
  s.questions.forEach(function (q, i) { html += qBlock(q, s.questions.length > 1 ? i + 1 : null); });
  html += '</div>';
  $('screen').innerHTML = html;
  bindPick();
}

let readVi = false;
let readFontPct = 100;

function drawReading(s) {
  const raw = readVi && s.passage_vi ? s.passage_vi : s.passage_text;
  let text = (reviewMode && !readVi) ? highlightEvidence(raw, s.questions) : esc(raw);
  text = text.replace(/---\s*(\d+)\s*---/g, function (m, n) {
    return '<span class="blank">' + n + '</span>';
  });
  const docs = text.split(/\n?===+\n?/).map(function (d) {
    return '<div class="doc">' + d.replace(/\n/g, '<br>') + '</div>';
  }).join('');

  let qHtml = '';
  if (s.questions.length > 1) {
    qHtml += '<span class="group-label">Nhóm ' + s.questions.length + ' câu hỏi</span>';
  }
  s.questions.forEach(function (q, i) { qHtml += qBlock(q, i + 1); });

  if (reviewMode && s.vocab && s.vocab.length) {
    qHtml += '<div class="tbox" style="border-color:var(--gold);margin-top:14px">' +
      '<h3>📖 Từ vựng trong bài</h3>' +
      s.vocab.map(function (v) {
        return '<p class="ww" style="margin:4px 0"><b>' + esc(v.term) + '</b>: ' + esc(v.meaning_vi) + '</p>';
      }).join('') +
      '</div>';
  }

  $('screen').innerHTML =
    '<div class="exam-split">' +
      '<div class="exam-passage">' +
        '<p class="rq-head">' + esc(s.title) +
          (s.doc_type ? ' <span class="stat-lab">' + esc(s.doc_type) + '</span>' : '') + '</p>' +
        '<div class="read-toolbar">' +
          '<button class="btn-sm' + (readVi ? ' on' : '') + '" id="btn-read-vi">🌐 Song ngữ</button>' +
          '<span class="font-ctrl">' +
            '<button class="btn-sm" id="btn-read-font-minus">T−</button>' +
            '<button class="btn-sm" id="btn-read-font-plus">T+</button>' +
          '</span>' +
        '</div>' +
        '<div id="read-doc" style="font-size:' + readFontPct + '%">' + docs + '</div>' +
      '</div>' +
      '<div class="exam-questions">' + qHtml + '</div>' +
    '</div>';
  bindPick();

  $('btn-read-vi').addEventListener('click', function () {
    if (!s.passage_vi) { toast('Đoạn này chưa có bản dịch.', 'bad'); return; }
    readVi = !readVi;
    drawReading(s);
  });
  $('btn-read-font-minus').addEventListener('click', function () {
    readFontPct = Math.max(80, readFontPct - 10);
    $('read-doc').style.fontSize = readFontPct + '%';
  });
  $('btn-read-font-plus').addEventListener('click', function () {
    readFontPct = Math.min(150, readFontPct + 10);
    $('read-doc').style.fontSize = readFontPct + '%';
  });
}

function qBlock(q, no) {
  const o = q.options || {};
  const isMarked = !!marked[q.id];
  const my = picked[q.id];

  let html = '<div class="rq" data-q="' + q.id + '">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">' +
      '<p class="rq-head">' + (no ? no + '. ' : '') + esc(q.question_text || '') + '</p>' +
      (reviewMode ? '' :
        '<button class="mark-btn' + (isMarked ? ' on' : '') + '" data-mark="' + q.id + '" title="Đánh dấu xem lại">🚩</button>') +
    '</div>' +
    '<div class="opts-radio">' +
    ['A', 'B', 'C', 'D'].map(function (L) {
      if (!o[L]) return '';
      const on = my === L;
      let cls = on ? ' on' : '';
      let mark = '';
      if (reviewMode) {
        cls += ' disabled';
        if (L === q.correct_answer) { cls += ' right'; mark = '<span class="verdict-mark">✓</span>'; }
        else if (on) { cls += ' wrong'; mark = '<span class="verdict-mark">✗</span>'; }
      }
      return '<label class="opt-radio' + cls + '" data-pick="' + q.id + '" data-l="' + L + '">' +
        '<span class="radio-dot"></span><span class="letter">' + L + '</span><span class="say">' + esc(o[L]) + '</span>' +
        mark + '</label>';
    }).join('') + '</div>';

  if (reviewMode) {
    const ok = my === q.correct_answer;
    const qvi = q.question_vi || {};
    const hasVi = qvi.q || qvi.A;

    let exp = '<div class="rq-exp">' +
      '<p class="exp-verdict ' + (ok ? 'ok' : 'no') + '">' +
        (ok ? '✓ Bạn trả lời đúng' : '✗ Đáp án đúng là ' + q.correct_answer) +
        (q.topic_tag ? ' <span class="q-tag">' + esc(q.topic_tag) + '</span>' : '') +
      '</p>';

    // Dịch câu hỏi và 4 đáp án — chỉ hiện khi đề có sẵn bản dịch
    if (hasVi) {
      exp += '<div class="vi-block">' +
        '<p class="vi-head">🈯 Dịch câu hỏi</p>' +
        (qvi.q ? '<p class="vi-q">' + esc(qvi.q) + '</p>' : '') +
        ['A', 'B', 'C', 'D'].map(function (L) {
          if (!qvi[L]) return '';
          const isRight = L === q.correct_answer;
          return '<p class="vi-opt' + (isRight ? ' right' : '') + '">' + L + '. ' + esc(qvi[L]) + '</p>';
        }).join('') +
      '</div>';
    }

    (q.evidence || []).forEach(function (ev, i) {
      const evVi = (q.evidence_vi || [])[i];
      exp += '<p class="exp-line"><span class="exp-badge badge-ev">Dẫn chứng</span> ' +
             '<i>' + esc(ev) + '</i></p>';
      if (evVi) exp += '<p class="exp-line exp-sub">(' + esc(evVi) + ')</p>';
    });

    if (q.explanation) {
      exp += '<p class="exp-line"><span class="exp-badge badge-why">Giải thích</span> ' +
             esc(q.explanation) + '</p>';
    }

    html += exp + '</div>';
  }

  return html + '</div>';
}

function bindPick() {
  if (reviewMode) return; // xem lại chỉ để đọc, không cho đổi đáp án nữa

  $('screen').querySelectorAll('label[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      const id = b.dataset.pick;
      picked[id] = b.dataset.l;
      openScreen(cur);
    });
  });

  $('screen').querySelectorAll('button[data-mark]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = b.dataset.mark;
      marked[id] = !marked[id];
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

  // Điểm TOEIC ước lượng — quy đổi qua bảng tham khảo, không phải điểm ETS thật
  let scoreNote = '<p class="review-note">Đề này chưa đủ 200 câu như đề thật nên chưa quy ra điểm TOEIC được.</p>';
  if (lN && rN) {
    const [lRes, rRes] = await Promise.all([
      db.rpc('toeic_estimate', { p_section: 'listening', p_correct: lOk, p_total: lN }),
      db.rpc('toeic_estimate', { p_section: 'reading', p_correct: rOk, p_total: rN })
    ]);
    const lScore = lRes.data, rScore = rRes.data;
    if (lScore != null && rScore != null) {
      statCards.push(stat(lScore + rScore, 'Điểm TOEIC ước lượng'));
      scoreNote = '<p class="review-note">Điểm TOEIC ước lượng: Nghe ' + lScore + ' · Đọc ' + rScore +
        ' · Tổng ' + (lScore + rScore) +
        '. Đây là điểm quy đổi tham khảo, không phải điểm thi thật — mỗi đề ETS có bảng quy đổi riêng, ' +
        'chênh nhau vài chục điểm ở hai đầu thang.</p>';
    }
  }

  $('result').innerHTML =
    '<div class="greet"><h1>' + (auto ? 'Hết giờ, bài đã tự nộp'
                                      : (luyenTap ? 'Xong buổi luyện tập' : 'Đã nộp bài')) + '</h1>' +
    '<p>' + esc(examSet.name) + ' · làm hết ' + Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây' +
    (left ? ', bỏ trống ' + left + ' câu' : '') + '.</p></div>' +
    '<section class="stats">' + statCards.join('') + '</section>' +
    scoreNote +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0">' +
      '<button class="btn btn-ink" id="btn-review">🔍 Xem lại từng câu</button>' +
      '<a class="btn btn-line" href="app.html">Về trang học</a>' +
    '</div>';

  $('btn-review').addEventListener('click', enterReview);

  // Luyện tập không tính vào Lịch sử thi
  const { error: mockErr } = luyenTap ? { error: null } : await db.from('mock_tests').insert({
    user_id: me.id, exam_set_id: examSet.id,
    started_at: new Date(startAt).toISOString(),
    submitted_at: new Date().toISOString(),
    seconds_used: secs, listening_correct: lOk, reading_correct: rOk,
    total_questions: all.length,
    payload: { parts: byPart, listening_total: lN, reading_total: rN }
  });

  if (mockErr) toast('Không lưu được kết quả thi thử: ' + mockErr.message, 'bad');

  const { data: att, error: attErr } = await db.from('attempts').insert({
    user_id: me.id, mode: luyenTap ? 'practice' : 'mock', total_questions: all.length,
    correct_count: lOk + rOk, seconds_used: secs, submitted_at: new Date().toISOString()
  }).select('id').single();

  if (attErr) toast('Không lưu được nhật ký thi thử: ' + attErr.message, 'bad');

  if (att) {
    // exam_question_id trỏ vào bảng exam_questions; cột question_id cũ
    // chỉ nhận câu của ngân hàng luyện đề nên để trống.
    const rows = all.map(function (q) {
      return { attempt_id: att.id, question_id: null, exam_question_id: q.id,
        selected: picked[q.id] || null,
        is_correct: picked[q.id] === q.correct_answer };
    });
    for (let i = 0; i < rows.length; i += 100) {
      const { error: ansErr } = await db.from('attempt_answers').insert(rows.slice(i, i + 100));
      if (ansErr) { toast('Không lưu được một phần câu trả lời: ' + ansErr.message, 'bad'); break; }
    }
  }
}

function stat(num, lab) {
  return '<div class="stat"><span class="stat-num">' + num + '</span><span class="stat-lab">' + lab + '</span></div>';
}

function highlightEvidence(text, qs) {
  const ranges = [];
  qs.forEach(function (q, qi) {
    (q.evidence || []).forEach(function (quote) {
      if (!quote) return;
      const idx = text.indexOf(quote);
      if (idx === -1) return;
      ranges.push({ start: idx, end: idx + quote.length, no: qi + 1 });
    });
  });
  if (!ranges.length) return esc(text);

  ranges.sort(function (a, b) { return a.start - b.start; });
  const clean = [];
  let lastEnd = -1;
  ranges.forEach(function (r) { if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; } });

  let out = '', pos = 0;
  clean.forEach(function (r) {
    out += esc(text.slice(pos, r.start));
    out += '<mark class="ev ev-' + (r.no % 6) + '">' + esc(text.slice(r.start, r.end)) +
           '<sup class="ev-tag">' + r.no + '</sup></mark>';
    pos = r.end;
  });
  out += esc(text.slice(pos));
  return out;
}

function showReview() {
  const all = allQuestions();
  const wrongIds = {};
  all.forEach(function (q) { if (picked[q.id] !== q.correct_answer) wrongIds[q.id] = true; });

  const wrongScreens = screens.filter(function (s) {
    return s.questions.some(function (q) { return wrongIds[q.id]; });
  });

  if (!wrongScreens.length) { $('review').innerHTML = '<p class="empty">Bạn làm đúng hết.</p>'; return; }

  const totalWrong = all.filter(function (q) { return wrongIds[q.id]; }).length;
  let html = '<div class="section-head"><h2>' + totalWrong + ' câu cần xem lại</h2></div>';

  wrongScreens.forEach(function (s) {
    if (s.kind === 'reading') {
      const text = highlightEvidence(s.passage_text, s.questions).replace(/---\s*(\d+)\s*---/g, function (m, n) {
        return '<span class="blank">' + n + '</span>';
      });
      const docs = text.split(/\n?===+\n?/).map(function (d) {
        return '<div class="doc">' + d.replace(/\n/g, '<br>') + '</div>';
      }).join('');

      html +=
        '<div class="tbox" style="margin-bottom:20px">' +
          '<p class="rq-head">Part ' + s.part + ' · ' + esc(s.title) + '</p>' +
          '<div class="passage">' + docs + '</div>';

      s.questions.forEach(function (q, i) {
        if (!wrongIds[q.id]) return;
        const o = q.options || {};
        const my = picked[q.id];
        html += '<div class="wrong-q" style="margin-top:14px">' +
          '<p class="wq">' + (i + 1) + '. ' + esc(q.question_text || '') + '</p>' +
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

      if (s.vocab && s.vocab.length) {
        html += '<div class="tbox" style="border-color:var(--gold);margin-top:14px">' +
          '<h3>📖 Từ vựng trong bài</h3>' +
          s.vocab.map(function (v) {
            return '<p class="ww" style="margin:4px 0"><b>' + esc(v.term) + '</b>: ' + esc(v.meaning_vi) + '</p>';
          }).join('') +
          '</div>';
      }

      html += '</div>';
      return;
    }

    // Part 1-4 và Part 5 — không có đoạn văn để gắn dẫn chứng, giữ dạng thẻ như cũ
    s.questions.forEach(function (q) {
      if (!wrongIds[q.id]) return;
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
  });

  $('review').innerHTML = html;
  $('btn-review').classList.add('hidden');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
