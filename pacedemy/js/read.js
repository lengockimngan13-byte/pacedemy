// ============================================================
// Pacedemy — luyện đọc Part 6 và Part 7
// Dựng thành hai "khoang" độc lập (Part 6, Part 7) để chạy chung
// một trang với Part 5 mà không giẫm biến lên nhau. Mỗi khoang
// chỉ tải đề khi tab của nó được mở lần đầu.
// ============================================================

function makeReadingPanel(part) {
  const pfx = 'p' + part + '-';
  const $ = function (id) { return document.getElementById(pfx + id); };

  let me = null;
  let cur = null;
  let qs = [];
  let picked = {};
  let startAt = 0;
  let loaded = false;

  async function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    me = await requireLogin();
    if (!me) return;
    loadList();
  }

  async function loadList() {
    $('list').innerHTML = '<p class="empty">Đang tải…</p>';

    const { data: rs } = await db
      .from('reading_sets').select('id, part, title, doc_type, difficulty')
      .eq('part', part).eq('is_active', true).order('created_at');

    if (!rs || !rs.length) {
      $('list').innerHTML =
        '<p class="empty">Chưa có bài Part ' + part + ' nào. Cô sẽ đăng bài sớm.</p>';
      return;
    }

    const { data: cnt } = await db
      .from('questions').select('rset_id')
      .in('rset_id', rs.map(function (r) { return r.id; }));

    const n = {};
    for (const q of (cnt || [])) n[q.rset_id] = (n[q.rset_id] || 0) + 1;

    let html = '<div class="set-grid">';

    for (const r of rs) {
      html +=
        '<div class="set">' +
          '<div class="set-head">' +
            '<span class="set-name">' + esc(r.title) + '</span>' +
            '<span class="set-count">' + (n[r.id] || 0) + ' câu</span>' +
          '</div>' +
          (r.doc_type ? '<p class="ww" style="margin:4px 0 10px;color:#6C837E">' +
            esc(r.doc_type) + '</p>' : '') +
          '<div class="topic-actions">' +
            '<button class="btn-sm test" data-go="' + r.id + '">Làm bài</button>' +
          '</div>' +
        '</div>';
    }

    html += '</div>';
    $('list').innerHTML = html;

    $('list').querySelectorAll('button[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { openSet(b.dataset.go); });
    });
  }

  async function openSet(id) {
    const { data: r } = await db.from('reading_sets').select('*').eq('id', id).single();
    if (!r) return;

    const { data: list } = await db
      .from('questions')
      .select('id, question_text, options, correct_answer, explanation, topic_tag, order_index')
      .eq('rset_id', id).order('order_index');

    cur = r;
    qs = list || [];
    picked = {};
    startAt = Date.now();

    $('view-pick').classList.add('hidden');
    $('view-do').classList.remove('hidden');
    $('d-result').innerHTML = '';
    $('btn-submit').classList.remove('hidden');
    window.scrollTo(0, 0);

    $('d-title').textContent = r.title;
    $('d-sub').textContent =
      'Part ' + r.part + (r.doc_type ? ' · ' + r.doc_type : '') + ' · ' + qs.length + ' câu';

    drawPassage();
    drawQuestions();
  }

  function drawPassage() {
    let text = esc(cur.passage_text);
    text = text.replace(/---\s*(\d+)\s*---/g, function (m, n) {
      return '<span class="blank">' + n + '</span>';
    });
    const parts = text.split(/\n?===+\n?/);
    $('d-passage').innerHTML = parts.map(function (p) {
      return '<div class="doc">' + p.replace(/\n/g, '<br>') + '</div>';
    }).join('');
  }

  function drawQuestions() {
    let html = '';

    qs.forEach(function (q, i) {
      const o = q.options || {};
      html +=
        '<div class="rq" data-q="' + q.id + '">' +
          '<p class="rq-head">' + (i + 1) + '. ' + esc(q.question_text) + '</p>' +
          ['A', 'B', 'C', 'D'].map(function (L) {
            if (!o[L]) return '';
            return '<button class="opt" data-pick="' + q.id + '" data-l="' + L + '">' +
                     '<span class="opt-letter">' + L + '</span>' +
                     '<span>' + esc(o[L]) + '</span>' +
                   '</button>';
          }).join('') +
          '<div class="rq-exp hidden"></div>' +
        '</div>';
    });

    $('d-questions').innerHTML = html;

    $('d-questions').querySelectorAll('button[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.dataset.pick;
        picked[id] = b.dataset.l;
        $('d-questions').querySelectorAll('button[data-pick="' + id + '"]')
          .forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
  }

  async function submit() {
    const missing = qs.filter(function (q) { return !picked[q.id]; });
    if (missing.length && !confirm('Còn ' + missing.length + ' câu chưa chọn. Nộp luôn?')) return;

    let ok = 0;
    const container = $('d-questions');

    for (const q of qs) {
      const my = picked[q.id];
      const right = my === q.correct_answer;
      if (right) ok++;

      const realBox = container.querySelector('.rq[data-q="' + q.id + '"]');
      if (!realBox) continue;

      realBox.querySelectorAll('button[data-pick]').forEach(function (b) {
        b.disabled = true;
        const L = b.dataset.l;
        if (L === q.correct_answer) b.classList.add('right');
        else if (L === my) b.classList.add('wrong');
      });

      const exp = realBox.querySelector('.rq-exp');
      exp.classList.remove('hidden');
      exp.innerHTML =
        '<p class="key-point" style="margin:0 0 6px">' +
          (right ? 'Đúng rồi.' : 'Đáp án đúng là ' + q.correct_answer + '.') +
          (q.topic_tag ? ' <span class="q-tag">' + esc(q.topic_tag) + '</span>' : '') +
        '</p>' +
        (q.explanation ? '<p class="ww" style="margin:0">' + esc(q.explanation) + '</p>' : '');
    }

    $('btn-submit').classList.add('hidden');

    const secs = Math.round((Date.now() - startAt) / 1000);

    $('d-result').innerHTML =
      '<div class="tbox" style="border-color:var(--teal)">' +
        '<h3>Kết quả: ' + ok + '/' + qs.length + ' câu đúng</h3>' +
        '<p style="margin:0 0 12px;font-size:0.94rem">Bạn làm hết ' +
          Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây.</p>' +
        (cur.passage_vi ? '<button class="btn-sm test" data-vi="1">Xem bản dịch đoạn văn</button>' : '') +
      '</div>';

    const btnVi = $('d-result').querySelector('button[data-vi]');
    if (btnVi) {
      btnVi.addEventListener('click', function () {
        this.classList.add('hidden');
        const d = document.createElement('div');
        d.className = 'passage';
        d.style.marginTop = '14px';
        d.innerHTML = '<div class="doc">' + esc(cur.passage_vi).replace(/\n/g, '<br>') + '</div>';
        $('d-result').appendChild(d);
      });
    }

    const { data: att } = await db.from('attempts').insert({
      user_id: me.id, mode: 'practice', part: cur.part,
      total_questions: qs.length, correct_count: ok, seconds_used: secs,
      submitted_at: new Date().toISOString()
    }).select('id').single();

    if (att) {
      const rows = qs.map(function (q) {
        return {
          attempt_id: att.id, question_id: q.id,
          selected: picked[q.id] || null, is_correct: picked[q.id] === q.correct_answer
        };
      });
      await db.from('attempt_answers').insert(rows);
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  const btnSubmit = $('btn-submit');
  if (btnSubmit) btnSubmit.addEventListener('click', submit);

  const btnBack = $('btn-back');
  if (btnBack) btnBack.addEventListener('click', function () {
    $('view-do').classList.add('hidden');
    $('view-pick').classList.remove('hidden');
    window.scrollTo(0, 0);
    loadList();
  });

  return { ensureLoaded: ensureLoaded };
}

const readingPanel6 = makeReadingPanel(6);
const readingPanel7 = makeReadingPanel(7);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
