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
  let showVi = false;
  let showEvidence = false;
  let fontPct = 100;
  let submitted = false;

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
      .from('reading_sets').select('id, part, title, doc_type, difficulty, test_no')
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

    // Gom các đoạn vào đúng Test của nó; đoạn chưa gán test xếp riêng cuối trang
    const groups = {};
    const order = [];
    rs.forEach(function (r) {
      const key = r.test_no == null ? 'x' : String(r.test_no);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });
    order.sort(function (a, b) {
      if (a === 'x') return 1;
      if (b === 'x') return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });

    let html = '';

    order.forEach(function (key) {
      const list = groups[key];
      let totalQ = 0;
      list.forEach(function (r) { totalQ += (n[r.id] || 0); });

      html += '<div class="test-group">' +
        '<div class="test-group-head">' +
          '<h3>' + (key === 'x' ? 'Bài lẻ chưa xếp test' : 'Test ' + key) + '</h3>' +
          '<span class="stat-lab">' + list.length + ' bài · ' + totalQ + ' câu</span>' +
        '</div>' +
        '<div class="set-grid">';

      list.forEach(function (r, i) {
        html +=
          '<div class="set">' +
            '<div class="set-head">' +
              '<span class="set-name">Bài ' + (i + 1) + '</span>' +
            '</div>' +
            '<p class="set-sub">' + esc(r.title) + '</p>' +
            '<p class="set-meta">' + (n[r.id] || 0) + ' câu' +
              (r.doc_type ? ' · ' + esc(r.doc_type) : '') + '</p>' +
            '<div class="topic-actions">' +
              '<button class="btn-sm test" data-go="' + r.id + '">Làm bài</button>' +
            '</div>' +
          '</div>';
      });

      html += '</div></div>';
    });
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
      .select('id, question_text, options, correct_answer, explanation, topic_tag, evidence, evidence_vi, question_vi, order_index')
      .eq('rset_id', id).order('order_index');

    cur = r;
    qs = list || [];
    picked = {};
    startAt = Date.now();
    showVi = false;
    showEvidence = false;
    fontPct = 100;
    submitted = false;

    $('view-pick').classList.add('hidden');
    $('view-do').classList.remove('hidden');
    const hdr = document.getElementById('read-header');
    if (hdr) hdr.classList.add('hidden');
    $('d-result').innerHTML = '';
    $('d-vocab').innerHTML = '';
    $('btn-submit').classList.remove('hidden');
    $('btn-evidence').classList.add('hidden');
    $('btn-vi').textContent = '🌐 Song ngữ';
    window.scrollTo(0, 0);

    $('d-title').textContent = r.title;
    $('d-sub').textContent =
      'Part ' + r.part + (r.doc_type ? ' · ' + r.doc_type : '') + ' · ' + qs.length + ' câu';

    drawPassage();
    drawQuestions();
  }

  // Tô màu đúng những cụm/câu chứng minh đáp án (evidence), mỗi câu
  // một màu riêng, đánh số nhỏ để biết dẫn chứng đó của câu nào.
  function highlightEvidence(text) {
    const ranges = [];

    qs.forEach(function (q, qi) {
      (q.evidence || []).forEach(function (quote) {
        if (!quote) return;
        const idx = text.indexOf(quote);
        if (idx === -1) return;
        ranges.push({ start: idx, end: idx + quote.length, no: q.order_index || (qi + 1) });
      });
    });

    if (!ranges.length) return esc(text);

    ranges.sort(function (a, b) { return a.start - b.start; });
    const clean = [];
    let lastEnd = -1;
    ranges.forEach(function (r) {
      if (r.start >= lastEnd) { clean.push(r); lastEnd = r.end; }
    });

    let out = '';
    let pos = 0;
    clean.forEach(function (r) {
      out += esc(text.slice(pos, r.start));
      out += '<mark class="ev ev-' + (r.no % 6) + '">' + esc(text.slice(r.start, r.end)) +
             '<sup class="ev-tag">' + r.no + '</sup></mark>';
      pos = r.end;
    });
    out += esc(text.slice(pos));
    return out;
  }

  function drawPassage() {
    const raw = showVi && cur.passage_vi ? cur.passage_vi : cur.passage_text;
    let text = showEvidence && !showVi ? highlightEvidence(raw) : esc(raw);

    if (!showVi) {
      text = text.replace(/---\s*(\d+)\s*---/g, function (m, n) {
        return '<span class="blank">' + n + '</span>';
      });
    }

    const parts = text.split(/\n?===+\n?/);
    $('d-passage').innerHTML = parts.map(function (p) {
      return '<div class="doc">' + p.replace(/\n/g, '<br>') + '</div>';
    }).join('');
    $('d-passage').style.fontSize = fontPct + '%';
  }

  $('btn-vi').addEventListener('click', function () {
    if (!cur || !cur.passage_vi) { toast('Đoạn này chưa có bản dịch.', 'bad'); return; }
    showVi = !showVi;
    $('btn-vi').textContent = showVi ? '🌐 Xem tiếng Anh' : '🌐 Song ngữ';
    drawPassage();
  });

  $('btn-evidence').addEventListener('click', function () {
    showEvidence = !showEvidence;
    $('btn-evidence').classList.toggle('on', showEvidence);
    if (showVi) { showVi = false; $('btn-vi').textContent = '🌐 Song ngữ'; }
    drawPassage();
  });

  $('btn-font-minus').addEventListener('click', function () {
    fontPct = Math.max(80, fontPct - 10);
    $('d-passage').style.fontSize = fontPct + '%';
  });

  $('btn-font-plus').addEventListener('click', function () {
    fontPct = Math.min(150, fontPct + 10);
    $('d-passage').style.fontSize = fontPct + '%';
  });

  function drawQuestions() {
    let html = '';

    qs.forEach(function (q, i) {
      const o = q.options || {};
      html +=
        '<div class="rq" data-q="' + q.id + '">' +
          '<p class="rq-head">' + (i + 1) + '. ' + esc(q.question_text) + '</p>' +
          '<div class="opts-radio">' +
          ['A', 'B', 'C', 'D'].map(function (L) {
            if (!o[L]) return '';
            return '<label class="opt-radio" data-pick="' + q.id + '" data-l="' + L + '">' +
                     '<span class="radio-dot"></span><span class="letter">' + L + '</span>' +
                     '<span class="say">' + esc(o[L]) + '</span>' +
                   '</label>';
          }).join('') +
          '</div>' +
          '<div class="rq-exp hidden"></div>' +
        '</div>';
    });

    $('d-questions').innerHTML = html;

    $('d-questions').querySelectorAll('label[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.dataset.pick;
        picked[id] = b.dataset.l;
        $('d-questions').querySelectorAll('label[data-pick="' + id + '"]')
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

      realBox.querySelectorAll('label[data-pick]').forEach(function (b) {
        b.classList.add('disabled');
        const L = b.dataset.l;
        if (L === q.correct_answer) b.classList.add('right');
        else if (L === my) b.classList.add('wrong');
      });

      const exp = realBox.querySelector('.rq-exp');
      exp.classList.remove('hidden');

      const qvi = q.question_vi || {};
      const hasVi = qvi.q || qvi.A;

      let expHtml =
        '<p class="exp-verdict ' + (right ? 'ok' : 'no') + '">' +
          (right ? '✓ Bạn trả lời đúng' : '✗ Đáp án đúng là ' + q.correct_answer) +
          (q.topic_tag ? ' <span class="q-tag">' + esc(q.topic_tag) + '</span>' : '') +
        '</p>';

      if (hasVi) {
        expHtml += '<div class="vi-block">' +
          '<p class="vi-head">🈯 Dịch câu hỏi</p>' +
          (qvi.q ? '<p class="vi-q">' + esc(qvi.q) + '</p>' : '') +
          ['A', 'B', 'C', 'D'].map(function (L) {
            if (!qvi[L]) return '';
            return '<p class="vi-opt' + (L === q.correct_answer ? ' right' : '') + '">' + L + '. ' + esc(qvi[L]) + '</p>';
          }).join('') +
        '</div>';
      }

      (q.evidence || []).forEach(function (ev, i) {
        const evVi = (q.evidence_vi || [])[i];
        expHtml += '<p class="exp-line"><span class="exp-badge badge-ev">Dẫn chứng</span> <i>' + esc(ev) + '</i></p>';
        if (evVi) expHtml += '<p class="exp-line exp-sub">(' + esc(evVi) + ')</p>';
      });

      if (q.explanation) {
        expHtml += '<p class="exp-line"><span class="exp-badge badge-why">Giải thích</span> ' + esc(q.explanation) + '</p>';
      }

      exp.innerHTML = expHtml;
    }

    $('btn-submit').classList.add('hidden');
    submitted = true;
    if (qs.some(function (q) { return (q.evidence || []).length; })) {
      $('btn-evidence').classList.remove('hidden');
    }

    if (cur.vocab && cur.vocab.length) {
      $('d-vocab').innerHTML =
        '<div class="tbox" style="border-color:var(--gold);margin-top:16px">' +
          '<h3>📖 Từ vựng trong bài</h3>' +
          cur.vocab.map(function (v) {
            return '<p class="ww" style="margin:4px 0"><b>' + esc(v.term) + '</b>: ' + esc(v.meaning_vi) + '</p>';
          }).join('') +
        '</div>';
    }

    const secs = Math.round((Date.now() - startAt) / 1000);

    $('d-result').innerHTML =
      '<div class="tbox" style="border-color:var(--teal)">' +
        '<h3>Kết quả: ' + ok + '/' + qs.length + ' câu đúng</h3>' +
        '<p style="margin:0;font-size:0.94rem">Bạn làm hết ' +
          Math.floor(secs / 60) + ' phút ' + (secs % 60) + ' giây. ' +
          'Bấm "🌐 Song ngữ" hoặc "🔎 Dẫn chứng" ở trên để xem lại đoạn văn kỹ hơn.' +
        '</p>' +
      '</div>';


    const { data: att, error: attErr } = await db.from('attempts').insert({
      user_id: me.id, mode: 'practice', part: cur.part,
      total_questions: qs.length, correct_count: ok, seconds_used: secs,
      submitted_at: new Date().toISOString()
    }).select('id').single();

    if (attErr) toast('Không lưu được kết quả bài đọc: ' + attErr.message, 'bad');

    if (att) {
      const rows = qs.map(function (q) {
        return {
          attempt_id: att.id, question_id: q.id,
          selected: picked[q.id] || null, is_correct: picked[q.id] === q.correct_answer
        };
      });
      const { error: ansErr } = await db.from('attempt_answers').insert(rows);
      if (ansErr) toast('Không lưu được câu trả lời: ' + ansErr.message, 'bad');
    }

    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  const btnSubmit = $('btn-submit');
  if (btnSubmit) btnSubmit.addEventListener('click', submit);

  const btnBack = $('btn-back');
  if (btnBack) btnBack.addEventListener('click', function () {
    $('view-do').classList.add('hidden');
    $('view-pick').classList.remove('hidden');
    const hdr = document.getElementById('read-header');
    if (hdr) hdr.classList.remove('hidden');
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
