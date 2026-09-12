// ============================================================
// Pacedemy — nhập bài nghe Part 1 đến 4
// Bước 1 tải file lên kho, bước 3 dán dữ liệu câu hỏi.
// Một phần tử JSON = một bài nghe (một file âm thanh) kèm các câu hỏi của bài đó.
// ============================================================

const BUCKET = 'audio';

let me = null;
let sets = [];          // dữ liệu đã đọc từ ô dán
let uploaded = [];      // tên file vừa tải lên trong phiên này

const $ = function (id) { return document.getElementById(id); };

const PART_NAME = {
  1: 'Part 1 — Mô tả tranh',
  2: 'Part 2 — Hỏi đáp',
  3: 'Part 3 — Hội thoại ngắn',
  4: 'Part 4 — Bài nói ngắn'
};

// ---------- Câu nhắc gửi cho Claude ----------

const PROMPT =
'Mình gửi script bài nghe TOEIC. Hãy chuyển thành DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT bài nghe gắn với MỘT file âm thanh:\n' +
'{\n' +
'  "part": 3,\n' +
'  "title": "tên ngắn gọn bằng tiếng Việt để cô dễ nhận ra bài này",\n' +
'  "audio_file": "tên file âm thanh, ví dụ p3-01.mp3",\n' +
'  "image_file": "chỉ Part 1 mới cần, ví dụ p1-01.jpg, các part khác để chuỗi rỗng",\n' +
'  "difficulty": 2,\n' +
'  "transcript": "toàn bộ lời thoại tiếng Anh, xuống dòng giữa các lượt nói",\n' +
'  "transcript_vi": "bản dịch tiếng Việt của lời thoại, xuống dòng tương ứng",\n' +
'  "questions": [\n' +
'    {\n' +
'      "question_text": "câu hỏi in trên đề. Part 1 và Part 2 không có đề in nên để chuỗi rỗng",\n' +
'      "A": "phương án A", "B": "...", "C": "...", "D": "...",\n' +
'      "correct_answer": "B",\n' +
'      "explanation": "giải thích bằng tiếng Việt: chỗ nào trong bài nghe cho ra đáp án, ' +
'và vì sao các phương án còn lại sai hoặc là bẫy đồng âm",\n' +
'      "translation_vi": "nghĩa tiếng Việt của phương án đúng",\n' +
'      "key_point": "từ hoặc cụm cần nghe bắt được, viết dạng: cụm tiếng Anh = nghĩa tiếng Việt"\n' +
'    }\n' +
'  ]\n' +
'}\n\n' +
'Quy ước bắt buộc:\n' +
'- Part 1 có đúng 1 câu hỏi, 4 phương án A B C D, question_text để rỗng.\n' +
'- Part 2 có đúng 1 câu hỏi, chỉ 3 phương án A B C, bỏ hẳn trường D, question_text để rỗng.\n' +
'- Part 3 và Part 4 mỗi bài có đúng 3 câu hỏi, mỗi câu 4 phương án, question_text ghi đầy đủ.\n' +
'- difficulty là 1 dễ, 2 vừa, 3 khó.\n' +
'- Đáp án đúng phải rải đều A B C D giữa các câu, không dồn vào một chữ cái.';

const SAMPLE = JSON.stringify([
  {
    part: 2,
    title: 'Hỏi về phòng họp',
    audio_file: 'p2-01.mp3',
    image_file: '',
    difficulty: 1,
    transcript: 'W: Where is the quarterly review being held?\nM: In the conference room on the third floor.',
    transcript_vi: 'Nữ: Buổi tổng kết quý được tổ chức ở đâu vậy?\nNam: Ở phòng họp trên tầng ba.',
    questions: [
      {
        question_text: '',
        A: 'In the conference room on the third floor.',
        B: 'Yes, it was a long review.',
        C: 'Every three months.',
        correct_answer: 'A',
        explanation: 'Câu hỏi bắt đầu bằng Where nên phải trả lời về nơi chốn. ' +
          'Phương án B trả lời Yes cho câu hỏi Wh nên loại ngay. ' +
          'Phương án C trả lời về tần suất, hợp với How often chứ không hợp với Where.',
        translation_vi: 'Ở phòng họp trên tầng ba.',
        key_point: 'quarterly review = buổi tổng kết quý'
      }
    ]
  }
], null, 2);

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-main').classList.remove('hidden');
  loadHave();
})();

// ---------- Bước 1 · Tải file lên kho ----------

function slug(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';

  const clean = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (clean || 'file') + ext;
}

$('btn-upload').addEventListener('click', async function () {
  const input = $('files');
  const list = input.files ? Array.from(input.files) : [];

  if (!list.length) {
    $('up-note').textContent = 'Bạn chọn file trước đã nhé.';
    return;
  }

  this.disabled = true;
  $('up-note').textContent = 'Đang tải ' + list.length + ' file…';

  const rows = [];

  for (const f of list) {
    const key = slug(f.name);
    const { error } = await db.storage.from(BUCKET).upload(key, f, {
      upsert: true,
      contentType: f.type || undefined
    });

    rows.push({ key: key, ok: !error, msg: error ? error.message : '' });
    if (!error && uploaded.indexOf(key) === -1) uploaded.push(key);
  }

  this.disabled = false;
  const good = rows.filter(function (r) { return r.ok; }).length;
  $('up-note').textContent = 'Xong. Tải lên được ' + good + '/' + rows.length + ' file.';
  input.value = '';

  showUploaded(rows);
});

function showUploaded(rows) {
  let html = '<p style="font-size:0.9rem;margin:0 0 10px">' +
             'Tên file dùng trong dữ liệu ở bước 3 chính là tên bên dưới. ' +
             'Dấu tiếng Việt và khoảng trắng đã được tự động bỏ đi.</p>';

  for (const r of rows) {
    html +=
      '<div class="wrong-q" style="padding:10px 14px;' +
        (r.ok ? '' : 'border-color:var(--danger);') + '">' +
        '<code style="font-size:0.88rem">' + esc(r.key) + '</code>' +
        (r.ok ? '<span class="tag-warm" style="margin-left:10px;font-size:0.78rem">đã lên kho</span>'
              : '<span class="tag-cold" style="margin-left:10px;font-size:0.78rem">' +
                esc(r.msg) + '</span>') +
      '</div>';
  }

  $('up-list').innerHTML = html;
}

// ---------- Bước 2 · Câu nhắc ----------

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPT).then(function () {
    $('prompt-ok').textContent = 'Đã copy. Dán vào chat kèm file script bài nghe.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 4000);
  });
});

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLE;
  say('Đây là một bài Part 2 làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

// ---------- Bước 3 · Đọc dữ liệu ----------

function say(msg, kind) {
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

$('btn-parse').addEventListener('click', function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    sets = readJson(raw);
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!sets.length) return say('Không tìm thấy bài nghe nào trong dữ liệu.');

  preview(check(sets));
});

function readJson(raw) {
  const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const arr = JSON.parse(clean);
  const list = Array.isArray(arr) ? arr : [arr];

  return list.map(function (o) {
    const qs = Array.isArray(o.questions) ? o.questions : [];

    return {
      part: parseInt(o.part || 0, 10),
      title: (o.title || '').trim(),
      audio_file: (o.audio_file || o.audio_url || '').trim(),
      image_file: (o.image_file || o.image_url || '').trim(),
      difficulty: parseInt(o.difficulty || 2, 10),
      transcript: (o.transcript || '').trim(),
      transcript_vi: (o.transcript_vi || '').trim(),
      questions: qs.map(function (q) {
        const opts = {};
        for (const k of ['A', 'B', 'C', 'D']) {
          const v = (q[k] == null ? '' : String(q[k])).trim();
          if (v) opts[k] = v;
        }
        return {
          question_text: (q.question_text || '').trim(),
          options: opts,
          correct_answer: (q.correct_answer || '').trim().toUpperCase(),
          explanation: (q.explanation || '').trim(),
          translation_vi: (q.translation_vi || '').trim(),
          key_point: (q.key_point || '').trim()
        };
      })
    };
  });
}

// ---------- Kiểm lỗi ----------

function check(list) {
  const problems = {};

  list.forEach(function (s, i) {
    const p = [];

    if ([1, 2, 3, 4].indexOf(s.part) === -1) p.push('part phải là 1, 2, 3 hoặc 4');
    if (!s.title) p.push('chưa đặt tên bài nghe');
    if (!s.audio_file) p.push('chưa ghi tên file âm thanh');
    if (s.part === 1 && !s.image_file) p.push('Part 1 phải có file ảnh');
    if (!s.questions.length) p.push('bài này chưa có câu hỏi nào');

    if ((s.part === 1 || s.part === 2) && s.questions.length > 1) {
      p.push('Part 1 và Part 2 chỉ có một câu mỗi bài');
    }
    if ((s.part === 3 || s.part === 4) && s.questions.length !== 3 && s.questions.length) {
      p.push('Part 3 và Part 4 nên có đúng ba câu, bài này có ' + s.questions.length);
    }

    s.questions.forEach(function (q, j) {
      const no = 'câu ' + (j + 1) + ': ';
      const keys = Object.keys(q.options);

      if (keys.length < 3) p.push(no + 'phải có ít nhất ba phương án');
      if (s.part !== 2 && keys.length < 4) p.push(no + 'part này cần đủ bốn phương án');
      if (keys.indexOf(q.correct_answer) === -1) p.push(no + 'đáp án không nằm trong các phương án');
      if (!q.explanation) p.push(no + 'chưa có giải thích');
      if ((s.part === 3 || s.part === 4) && !q.question_text) p.push(no + 'thiếu câu hỏi in trên đề');

      const vals = keys.map(function (k) { return q.options[k].toLowerCase(); });
      if (new Set(vals).size < keys.length) p.push(no + 'có hai phương án trùng nhau');
    });

    if (p.length) problems[i] = p;
  });

  return problems;
}

// ---------- Xem trước ----------

function preview(bad) {
  const nBad = Object.keys(bad).length;
  const nq = sets.reduce(function (a, s) { return a + s.questions.length; }, 0);

  let html = '<div class="section-head" style="margin-top:26px">' +
             '<h2>Xem trước ' + sets.length + ' bài nghe · ' + nq + ' câu</h2>' +
             (nBad ? '<span class="tag-cold">' + nBad + ' bài cần sửa</span>'
                   : '<span class="tag-warm">Không có lỗi</span>') + '</div>';

  sets.forEach(function (s, i) {
    const p = bad[i];

    html +=
      '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        '<span class="q-tag">' + esc(PART_NAME[s.part] || 'Part ?') + '</span> ' +
        (p ? '<span class="tag-cold" style="font-size:0.82rem">' + esc(p.join(' · ')) + '</span>' : '') +
        '<p class="wq" style="margin-top:8px;font-weight:600">' + esc(s.title) + '</p>' +
        '<p class="ww">Âm thanh: ' + esc(s.audio_file) +
          (s.image_file ? ' · Ảnh: ' + esc(s.image_file) : '') +
          ' · ' + s.questions.length + ' câu</p>';

    s.questions.forEach(function (q, j) {
      html +=
        '<div style="margin-top:10px;padding-left:12px;border-left:2px solid var(--line)">' +
          '<p class="wq">' + (j + 1) + '. ' + esc(q.question_text || '(không in đề)') + '</p>' +
          '<p class="wa">' +
            Object.keys(q.options).map(function (k) {
              return k === q.correct_answer
                ? '<b>' + k + '. ' + esc(q.options[k]) + '</b>'
                : k + '. ' + esc(q.options[k]);
            }).join(' &nbsp; ') +
          '</p>' +
          (q.key_point ? '<p class="key-point" style="margin:6px 0">' + esc(q.key_point) + '</p>' : '') +
          (q.explanation ? '<p class="ww">' + esc(q.explanation) + '</p>' : '') +
        '</div>';
    });

    if (s.transcript) {
      html += '<p class="ww" style="margin-top:10px;color:#6C837E">Lời thoại: ' +
              esc(s.transcript.slice(0, 140)) + (s.transcript.length > 140 ? '…' : '') + '</p>';
    }

    html += '</div>';
  });

  $('preview').innerHTML = html;

  if (nBad) {
    say('Có ' + nBad + ' bài còn lỗi. Bạn sửa trong ô dữ liệu rồi bấm Xem trước lại. ' +
        'Vẫn lưu được nhưng những bài lỗi sẽ bị bỏ qua.');
  } else {
    say('Dữ liệu hợp lệ. Bấm Lưu để đưa vào ngân hàng đề.', 'good');
  }

  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

function urlOf(name) {
  if (!name) return null;
  if (/^https?:\/\//i.test(name)) return name;
  const { data } = db.storage.from(BUCKET).getPublicUrl(name);
  return data ? data.publicUrl : null;
}

$('btn-save').addEventListener('click', async function () {
  const bad = new Set(JSON.parse(this.dataset.bad || '[]').map(Number));
  const good = sets.filter(function (s, i) { return !bad.has(i); });

  if (!good.length) return say('Không có bài nào hợp lệ để lưu.');

  this.disabled = true;
  this.textContent = 'Đang lưu…';

  let nSet = 0, nQ = 0;

  for (const s of good) {
    const { data: row, error } = await db.from('listening_sets').insert({
      part: s.part,
      title: s.title,
      audio_url: urlOf(s.audio_file),
      image_url: urlOf(s.image_file),
      transcript: s.transcript || null,
      transcript_vi: s.transcript_vi || null,
      difficulty: s.difficulty || 2,
      is_active: true
    }).select('id').single();

    if (error || !row) {
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được bài "' + s.title + '": ' + (error ? error.message : 'lỗi không rõ'));
    }

    const payload = s.questions.map(function (q, j) {
      return {
        part: s.part,
        set_id: row.id,
        order_index: j + 1,
        question_text: q.question_text || null,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        translation_vi: q.translation_vi || null,
        key_point: q.key_point || null,
        difficulty: s.difficulty || 2,
        is_active: true
      };
    });

    const { error: e2 } = await db.from('questions').insert(payload);

    if (e2) {
      await db.from('listening_sets').delete().eq('id', row.id);
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được câu hỏi của bài "' + s.title + '": ' + e2.message);
    }

    nSet++;
    nQ += payload.length;
  }

  this.disabled = false;
  this.textContent = 'Lưu vào ngân hàng đề';

  say('Đã lưu ' + nSet + ' bài nghe với ' + nQ + ' câu hỏi.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadHave();
});

// ---------- Bài nghe đã có ----------

async function loadHave() {
  const { data: rows } = await db
    .from('listening_sets')
    .select('id, part, title, is_active, audio_url')
    .order('part').order('id');

  if (!rows || !rows.length) {
    $('have').innerHTML = '<p class="empty">Chưa có bài nghe nào.</p>';
    $('have-n').textContent = '';
    return;
  }

  const { data: qs } = await db
    .from('questions')
    .select('set_id')
    .in('set_id', rows.map(function (r) { return r.id; }));

  const count = {};
  for (const q of (qs || [])) count[q.set_id] = (count[q.set_id] || 0) + 1;

  $('have-n').textContent = rows.length + ' bài · ' + (qs ? qs.length : 0) + ' câu';

  let html = '';
  let lastPart = null;

  for (const r of rows) {
    if (r.part !== lastPart) {
      lastPart = r.part;
      html += '<h3 style="font-family:var(--disp);font-size:1rem;margin:20px 0 10px">' +
              esc(PART_NAME[r.part] || 'Part ' + r.part) + '</h3>';
    }

    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span style="flex:1;min-width:180px;font-weight:600">' + esc(r.title) + '</span>' +
        '<span class="stat-lab">' + (count[r.id] || 0) + ' câu</span>' +
        (r.is_active ? '' : '<span class="tag-cold" style="font-size:0.78rem">đang ẩn</span>') +
        '<button class="btn-sm" data-act="toggle" data-id="' + r.id + '">' +
          (r.is_active ? 'Ẩn bài' : 'Hiện lại') + '</button>' +
        '<button class="btn-sm" data-act="del" data-id="' + r.id + '">Xoá</button>' +
      '</div>';
  }

  $('have').innerHTML = html;

  $('have').querySelectorAll('button[data-act]').forEach(function (b) {
    b.addEventListener('click', function () { act(b.dataset.act, b.dataset.id, b); });
  });
}

async function act(what, id, btn) {
  if (what === 'toggle') {
    const on = btn.textContent.indexOf('Ẩn') === 0;
    await db.from('listening_sets').update({ is_active: !on }).eq('id', id);
    loadHave();
    return;
  }

  if (what === 'del') {
    if (!confirm('Xoá hẳn bài nghe này cùng toàn bộ câu hỏi của nó?')) return;
    await db.from('questions').delete().eq('set_id', id);
    await db.from('listening_sets').delete().eq('id', id);
    loadHave();
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
