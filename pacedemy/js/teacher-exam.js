// ============================================================
// Pacedemy — quản lý bộ đề thi thử, tách khỏi ngân hàng luyện đề
// ============================================================

let me = null;
let sets = [];
let curSet = null;
let curPart = 'listen';   // 'listen' | '5' | '6' | '7'
let parsed = [];
let uploaded = {};        // tên file gốc -> đường dẫn trong kho

const $ = function (id) { return document.getElementById(id); };
const BUCKET = 'audio';

const PART_NAME = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3', 4: 'Part 4' };

// ---------- Câu nhắc theo từng tab ----------

const PROMPTS = {
  listen:
    'Mình gửi script bài nghe TOEIC cho một BỘ ĐỀ THI THỬ. Trả về DUY NHẤT một khối JSON, ' +
    'không thêm lời dẫn, không thêm dấu ```.\n\n' +
    'JSON là mảng, mỗi phần tử là MỘT bài nghe:\n' +
    '{\n  "part": 3,\n  "title": "tên ngắn gọn tiếng Việt",\n' +
    '  "audio_file": "tên file mp3, ví dụ p3-01.mp3",\n' +
    '  "image_file": "chỉ Part 1 mới cần, còn lại để rỗng",\n' +
    '  "transcript": "lời thoại tiếng Anh",\n  "transcript_vi": "bản dịch",\n' +
    '  "questions": [{\n    "question_text": "câu hỏi in trên đề, Part 1-2 để rỗng",\n' +
    '    "A": "..", "B": "..", "C": "..", "D": "..",\n    "correct_answer": "B",\n' +
    '    "explanation": "giải thích tiếng Việt",\n    "topic_tag": "dạng câu hỏi"\n  }]\n}\n\n' +
    'Quy ước: Part 1 và 2 đúng 1 câu (Part 2 chỉ 3 phương án A B C, bỏ D). ' +
    'Part 3, 4 mỗi bài đúng 3 câu, 4 phương án. Đáp án rải đều A B C D.\n\n' +
    'Việc cần làm: [ghi rõ số bài và part]',

  5:
    'Mình soạn đề Part 5 cho một BỘ ĐỀ THI THỬ. Trả về DUY NHẤT một khối JSON.\n\n' +
    'Mảng các câu:\n{\n  "question_text": "câu tiếng Anh có chỗ trống ________",\n' +
    '  "A": "..", "B": "..", "C": "..", "D": "..",\n  "correct_answer": "C",\n' +
    '  "explanation": "giải thích tiếng Việt",\n  "topic_tag": "dạng ngữ pháp"\n}\n\n' +
    'Đáp án rải đều A B C D. Bối cảnh công sở, văn phong TOEIC thật.\n\n' +
    'Việc cần làm: [ghi rõ số câu, ví dụ 30 câu]',

  6:
    'Mình soạn đề Part 6 cho một BỘ ĐỀ THI THỬ. Trả về DUY NHẤT một khối JSON.\n\n' +
    'Mảng các đoạn:\n{\n  "title": "tên ngắn gọn", "doc_type": "email, thông báo...",\n' +
    '  "passage_text": "đoạn văn có 4 chỗ trống dạng ---131---, ---132---, ---133---, ---134---",\n' +
    '  "passage_vi": "bản dịch",\n  "questions": [{\n    "number": 131,\n' +
    '    "A": "..", "B": "..", "C": "..", "D": "..",\n    "correct_answer": "A",\n' +
    '    "explanation": "giải thích tiếng Việt",\n    "topic_tag": "dạng câu hỏi"\n  }]\n}\n\n' +
    'Đúng 4 câu mỗi đoạn, ít nhất 1 câu chọn câu hoàn chỉnh điền vào đoạn.\n\n' +
    'Việc cần làm: [ghi rõ số đoạn]',

  7:
    'Mình soạn đề Part 7 cho một BỘ ĐỀ THI THỬ. Trả về DUY NHẤT một khối JSON.\n\n' +
    'Mảng các bài đọc:\n{\n  "title": "tên ngắn gọn", "doc_type": "email, thông báo...",\n' +
    '  "passage_text": "văn bản. Nếu nhiều văn bản thì ngăn bằng dòng chỉ có ===",\n' +
    '  "passage_vi": "bản dịch",\n  "questions": [{\n    "number": 147,\n' +
    '    "question_text": "câu hỏi tiếng Anh",\n    "A": "..", "B": "..", "C": "..", "D": "..",\n' +
    '    "correct_answer": "B",\n    "explanation": "giải thích tiếng Việt",\n' +
    '    "topic_tag": "dạng câu hỏi"\n  }]\n}\n\n' +
    'Mỗi bài 2 đến 5 câu. Bài nhiều văn bản phải có ít nhất 1 câu cần đọc cả hai văn bản.\n\n' +
    'Việc cần làm: [ghi rõ số bài]'
};

const SAMPLES = {
  listen: JSON.stringify([{
    part: 2, title: 'Hỏi giờ họp', audio_file: 'p2-01.mp3', image_file: '',
    transcript: 'W: When does the meeting start?\nM: At two thirty.',
    transcript_vi: 'Nữ: Cuộc họp bắt đầu lúc mấy giờ?\nNam: Hai giờ rưỡi.',
    questions: [{ question_text: '', A: 'At two thirty.', B: 'In room B.', C: 'Yes, it does.',
      correct_answer: 'A', explanation: 'Câu hỏi When cần trả lời thời gian.', topic_tag: 'Hỏi thời gian' }]
  }], null, 2),
  5: JSON.stringify([{
    question_text: 'The manager ________ the report before the meeting.',
    A: 'review', B: 'reviews', C: 'reviewed', D: 'reviewing', correct_answer: 'C',
    explanation: 'Có mốc thời gian quá khứ "before the meeting" nên chia động từ ở thì quá khứ.',
    topic_tag: 'Thì động từ'
  }], null, 2),
  6: JSON.stringify([{
    title: 'Thông báo nghỉ lễ', doc_type: 'thông báo',
    passage_text: 'The office will be ---131--- on Monday for the public holiday.',
    passage_vi: 'Văn phòng sẽ đóng cửa vào thứ Hai nhân ngày lễ.',
    questions: [{ number: 131, A: 'closed', B: 'closing', C: 'close', D: 'closes',
      correct_answer: 'A', explanation: 'Sau "will be" cần tính từ/quá khứ phân từ.', topic_tag: 'Từ loại' }]
  }], null, 2),
  7: JSON.stringify([{
    title: 'Email đặt phòng', doc_type: 'email',
    passage_text: 'Dear Ms. Tran, I would like to confirm our meeting room booking for Friday.',
    passage_vi: 'Kính gửi chị Trân, tôi muốn xác nhận việc đặt phòng họp vào thứ Sáu.',
    questions: [{ number: 147, question_text: 'What is the purpose of the email?',
      A: 'To cancel a booking', B: 'To confirm a booking', C: 'To request a refund', D: 'To ask for directions',
      correct_answer: 'B', explanation: 'Câu đầu nêu rõ mục đích là xác nhận đặt phòng.', topic_tag: 'Câu hỏi ý chính' }]
  }], null, 2)
};

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') { $('view-deny').classList.remove('hidden'); return; }

  $('view-main').classList.remove('hidden');
  loadSets();
})();

$('btn-new').addEventListener('click', async function () {
  const name = $('new-name').value.trim();
  if (!name) return;
  this.disabled = true;

  const { error } = await db.from('exam_sets').insert({ name: name, order_index: sets.length });
  this.disabled = false;
  if (error) return alert('Không tạo được: ' + error.message);

  $('new-name').value = '';
  loadSets();
});

async function loadSets() {
  const { data } = await db.from('exam_sets').select('*').order('order_index');
  sets = data || [];

  if (!sets.length) {
    $('set-list').innerHTML = '<p class="empty">Chưa có bộ đề nào. Tạo bộ đầu tiên ở trên.</p>';
    return;
  }

  const setIds = sets.map(function (s) { return s.id; });

  const { data: qs } = await db.from('exam_questions').select('exam_set_id, part').in('exam_set_id', setIds);
  const n = {};
  for (const q of (qs || [])) {
    n[q.exam_set_id] = n[q.exam_set_id] || { l: 0, r5: 0, r67: 0 };
    if (q.part <= 4) n[q.exam_set_id].l++;
    else if (q.part === 5) n[q.exam_set_id].r5++;
    else n[q.exam_set_id].r67++;
  }

  $('set-list').innerHTML = sets.map(function (s) {
    const c = n[s.id] || { l: 0, r5: 0, r67: 0 };
    return '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap' +
      (s.is_active ? '' : ';opacity:0.55') + '">' +
        '<span style="flex:1;min-width:150px;font-weight:600">' + esc(s.name) + '</span>' +
        '<span class="stat-lab">Nghe ' + c.l + '</span>' +
        '<span class="stat-lab">Part 5: ' + c.r5 + '</span>' +
        '<span class="stat-lab">Part 6-7: ' + c.r67 + '</span>' +
        '<button class="btn-sm test" data-open="' + s.id + '">Mở</button>' +
        '<button class="btn-sm" data-tog="' + s.id + '" data-on="' + s.is_active + '">' +
          (s.is_active ? 'Tạm ẩn' : 'Mở lại') + '</button>' +
        '<button class="btn-sm" data-del="' + s.id + '">Xoá</button>' +
      '</div>';
  }).join('');

  $('set-list').querySelectorAll('button[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { openSet(b.dataset.open); });
  });
  $('set-list').querySelectorAll('button[data-tog]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('exam_sets').update({ is_active: b.dataset.on !== 'true' }).eq('id', b.dataset.tog);
      loadSets();
    });
  });
  $('set-list').querySelectorAll('button[data-del]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Xoá hẳn bộ đề này và mọi câu hỏi bên trong?')) return;
      await db.from('exam_sets').delete().eq('id', b.dataset.del);
      loadSets();
    });
  });
}

// ---------- Mở một bộ đề ----------

async function openSet(id) {
  curSet = sets.filter(function (s) { return String(s.id) === String(id); })[0];
  if (!curSet) return;

  $('view-sets').classList.add('hidden');
  $('view-inside').classList.remove('hidden');
  $('set-title').textContent = curSet.name;
  uploaded = {};

  switchTab('listen');
  loadHave();
}

$('btn-back-sets').addEventListener('click', function () {
  $('view-inside').classList.add('hidden');
  $('view-sets').classList.remove('hidden');
  curSet = null;
  loadSets();
});

async function loadHave() {
  const { data: l } = await db.from('exam_listening').select('id, part, title').eq('exam_set_id', curSet.id).order('order_index');
  const { data: r } = await db.from('exam_reading').select('id, part, title').eq('exam_set_id', curSet.id).order('order_index');
  const { data: q5 } = await db.from('exam_questions').select('id').eq('exam_set_id', curSet.id).eq('part', 5);

  let html = '<div class="tbox"><h3>Đã có trong bộ đề này</h3>';

  [1, 2, 3, 4].forEach(function (p) {
    const items = (l || []).filter(function (x) { return x.part === p; });
    html += row(PART_NAME[p], items.length + ' bài');
  });
  html += row('Part 5', (q5 || []).length + ' câu');
  [6, 7].forEach(function (p) {
    const items = (r || []).filter(function (x) { return x.part === p; });
    html += row('Part ' + p, items.length + ' đoạn');
  });

  html += '</div>';
  $('have-box').innerHTML = html;
}

function row(a, b) {
  return '<div class="fold-row"><span style="flex:1">' + a + '</span><span class="stat-lab">' + b + '</span></div>';
}

// ---------- Chuyển tab ----------

$('part-tabs').querySelectorAll('button[data-p]').forEach(function (b) {
  b.addEventListener('click', function () { switchTab(b.dataset.p); });
});

function switchTab(p) {
  curPart = p;
  $('part-tabs').querySelectorAll('button').forEach(function (b) {
    b.classList.toggle('on', b.dataset.p === p);
  });

  $('upload-box').classList.toggle('hidden', p !== 'listen');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('note').classList.add('hidden');
  $('btn-save').classList.add('hidden');
  $('upload-list').innerHTML = '';
  uploaded = {};
}

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPTS[curPart]).then(function () {
    $('prompt-ok').textContent = 'Đã copy. Viết thêm số lượng cần soạn rồi gửi ChatGPT.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 4000);
  });
});

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLES[curPart];
});

// ---------- Tải file cho phần Nghe ----------

$('file-input').addEventListener('change', async function () {
  for (const f of this.files) {
    const key = 'exam/' + curSet.id + '/' + f.name;
    const { error } = await db.storage.from(BUCKET).upload(key, f, { upsert: true });

    const div = document.createElement('div');
    div.className = 'ww';
    div.textContent = (error ? 'Lỗi: ' : 'Đã tải lên: ') + f.name;
    $('upload-list').appendChild(div);

    if (!error) uploaded[f.name] = key;
  }
  this.value = '';
});

function urlOf(name) {
  if (!name) return null;
  const key = uploaded[name] || ('exam/' + curSet.id + '/' + name);
  const { data } = db.storage.from(BUCKET).getPublicUrl(key);
  return data ? data.publicUrl : null;
}

// ---------- Đọc và kiểm tra dữ liệu ----------

$('btn-parse').addEventListener('click', function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) parsed = [parsed];
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!parsed.length) return say('Không tìm thấy gì trong dữ liệu.');

  const bad = curPart === 'listen' ? checkListen(parsed)
            : curPart === '5' ? checkP5(parsed)
            : checkReading(parsed);

  preview(bad);
});

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

function checkListen(list) {
  const bad = {};
  list.forEach(function (s, i) {
    const p = [];
    if (!s.title) p.push('thiếu tên bài');
    if (!s.audio_file) p.push('thiếu tên file âm thanh');
    else if (!uploaded[s.audio_file] && !urlOf(s.audio_file)) p.push('file "' + s.audio_file + '" chưa tải lên ở Bước 2');
    if ([1, 2, 3, 4].indexOf(s.part) === -1) p.push('part phải từ 1 đến 4');
    if (!s.questions || !s.questions.length) p.push('chưa có câu hỏi');
    (s.questions || []).forEach(function (q, j) {
      if (!q.A || !q.B || (s.part !== 2 && !q.D)) p.push('câu ' + (j + 1) + ' thiếu phương án');
      if (['A', 'B', 'C', 'D'].indexOf((q.correct_answer || '').toUpperCase()) === -1) p.push('câu ' + (j + 1) + ' thiếu đáp án đúng');
    });
    if (p.length) bad[i] = p;
  });
  return bad;
}

function checkP5(list) {
  const bad = {};
  list.forEach(function (q, i) {
    const p = [];
    if (!q.question_text) p.push('thiếu câu hỏi');
    if (!q.A || !q.B || !q.C || !q.D) p.push('thiếu phương án');
    if (['A', 'B', 'C', 'D'].indexOf((q.correct_answer || '').toUpperCase()) === -1) p.push('thiếu đáp án đúng');
    if (p.length) bad[i] = p;
  });
  return bad;
}

function checkReading(list) {
  const bad = {};
  const part = parseInt(curPart, 10);
  list.forEach(function (s, i) {
    const p = [];
    if (!s.title) p.push('thiếu tên đoạn');
    if (!s.passage_text) p.push('thiếu nội dung đoạn đọc');
    if (!s.questions || !s.questions.length) p.push('chưa có câu hỏi');

    if (part === 6 && s.passage_text) {
      const holes = (s.passage_text.match(/---\s*\d+\s*---/g) || []).length;
      if (holes !== (s.questions || []).length) p.push('số chỗ trống và số câu hỏi không khớp');
    }

    (s.questions || []).forEach(function (q, j) {
      if (!q.A || !q.B || !q.C || !q.D) p.push('câu ' + (j + 1) + ' thiếu phương án');
      if (['A', 'B', 'C', 'D'].indexOf((q.correct_answer || '').toUpperCase()) === -1) p.push('câu ' + (j + 1) + ' thiếu đáp án đúng');
      if (part === 7 && !q.question_text) p.push('câu ' + (j + 1) + ' Part 7 phải có câu hỏi');
    });
    if (p.length) bad[i] = p;
  });
  return bad;
}

// ---------- Xem trước ----------

function preview(bad) {
  const nBad = Object.keys(bad).length;
  let html = '<div class="section-head" style="margin-top:24px"><h2>Xem trước ' + parsed.length +
    (curPart === '5' ? ' câu' : ' mục') + '</h2>' +
    (nBad ? '<span class="tag-cold">' + nBad + ' chỗ cần sửa</span>' : '<span class="tag-warm">Không có lỗi</span>') +
    '</div>';

  if (curPart === '5') {
    parsed.forEach(function (q, i) {
      const p = bad[i];
      html += '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        (p ? '<p class="ww" style="color:var(--danger)">' + esc(p.join(' · ')) + '</p>' : '') +
        '<p class="wq">' + esc(q.question_text || '') + '</p>' +
        ['A', 'B', 'C', 'D'].map(function (L) {
          const on = (q.correct_answer || '').toUpperCase() === L;
          return '<p class="ww" style="margin:3px 0' + (on ? ';color:var(--teal);font-weight:600' : '') +
            '">' + L + '. ' + esc(q[L] || '') + (on ? '  ✓' : '') + '</p>';
        }).join('') + '</div>';
    });
  } else {
    parsed.forEach(function (s, i) {
      const p = bad[i];
      html += '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        '<b>' + esc(s.title || '(chưa đặt tên)') + '</b>' +
        (p ? '<p class="ww" style="color:var(--danger)">' + esc(p.join(' · ')) + '</p>' : '') +
        '<pre class="passage-preview">' + esc(s.transcript || s.passage_text || '') + '</pre>';

      (s.questions || []).forEach(function (q) {
        html += '<div style="margin-top:8px;padding-left:12px;border-left:2px solid var(--line)">' +
          '<p class="wq" style="margin:0">' + esc(q.question_text || '(không có đề in)') + '</p>' +
          ['A', 'B', 'C', 'D'].map(function (L) {
            if (!q[L]) return '';
            const on = (q.correct_answer || '').toUpperCase() === L;
            return '<p class="ww" style="margin:2px 0' + (on ? ';color:var(--teal);font-weight:600' : '') +
              '">' + L + '. ' + esc(q[L]) + (on ? '  ✓' : '') + '</p>';
          }).join('') + '</div>';
      });
      html += '</div>';
    });
  }

  $('preview').innerHTML = html;
  say(nBad ? 'Có ' + nBad + ' chỗ còn lỗi, sẽ bị bỏ qua khi lưu.' : 'Dữ liệu hợp lệ, bấm Lưu.', nBad ? '' : 'good');
  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const btn = this;
  const bad = new Set(JSON.parse(btn.dataset.bad || '[]').map(Number));
  const good = parsed.filter(function (x, i) { return !bad.has(i); });
  if (!good.length) return say('Không có gì hợp lệ để lưu.');

  btn.disabled = true;
  btn.textContent = 'Đang lưu…';

  function fail(msg) {
    btn.disabled = false;
    btn.textContent = 'Lưu vào bộ đề';
    say('Không lưu được: ' + msg);
  }

  let saved = 0;

  if (curPart === '5') {
    const rows = good.map(function (q, i) {
      return {
        exam_set_id: curSet.id, part: 5, question_text: q.question_text,
        options: { A: q.A, B: q.B, C: q.C, D: q.D },
        correct_answer: q.correct_answer.toUpperCase(),
        explanation: q.explanation || null, topic_tag: q.topic_tag || null, order_index: i
      };
    });
    const { error } = await db.from('exam_questions').insert(rows);
    if (error) return fail(error.message);
    saved = rows.length;

  } else if (curPart === 'listen') {
    for (const s of good) {
      const { data: rowData, error } = await db.from('exam_listening').insert({
        exam_set_id: curSet.id, part: s.part, title: s.title,
        audio_url: urlOf(s.audio_file), image_url: s.image_file ? urlOf(s.image_file) : null,
        transcript: s.transcript || null, transcript_vi: s.transcript_vi || null
      }).select('id').single();
      if (error || !rowData) return fail(error ? error.message : 'lỗi không rõ');

      const qs = (s.questions || []).map(function (q, i) {
        const opts = { A: q.A, B: q.B, C: q.C };
        if (q.D) opts.D = q.D;
        return {
          exam_set_id: curSet.id, part: s.part, listening_id: rowData.id,
          question_text: q.question_text || null, options: opts,
          correct_answer: q.correct_answer.toUpperCase(),
          explanation: q.explanation || null, topic_tag: q.topic_tag || null, order_index: i
        };
      });
      const { error: e2 } = await db.from('exam_questions').insert(qs);
      if (e2) return fail(e2.message);
      saved += qs.length;
    }

  } else {
    const part = parseInt(curPart, 10);
    for (const s of good) {
      const { data: rowData, error } = await db.from('exam_reading').insert({
        exam_set_id: curSet.id, part: part, title: s.title, doc_type: s.doc_type || null,
        passage_text: s.passage_text, passage_vi: s.passage_vi || null
      }).select('id').single();
      if (error || !rowData) return fail(error ? error.message : 'lỗi không rõ');

      const qs = (s.questions || []).map(function (q, i) {
        return {
          exam_set_id: curSet.id, part: part, reading_id: rowData.id,
          question_text: q.question_text || ('Chỗ trống số ' + (q.number || i + 1)),
          options: { A: q.A, B: q.B, C: q.C, D: q.D },
          correct_answer: q.correct_answer.toUpperCase(),
          explanation: q.explanation || null, topic_tag: q.topic_tag || null, order_index: i
        };
      });
      const { error: e2 } = await db.from('exam_questions').insert(qs);
      if (e2) return fail(e2.message);
      saved += qs.length;
    }
  }

  btn.disabled = false;
  btn.textContent = 'Lưu vào bộ đề';
  say('Đã lưu ' + saved + ' câu vào ' + curSet.name + '.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  btn.classList.add('hidden');
  loadHave();
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
