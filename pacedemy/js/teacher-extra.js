// ============================================================
// Pacedemy — nhập câu hỏi cho "Ôn tổng hợp".
// Mỗi câu độc lập, có thể là từ vựng / đọc / nghe, không liên
// quan tới kho Từ vựng, Luyện đọc, Luyện nghe đang dùng — nguồn
// tự do, Ngân đưa từ đâu cũng được.
// ============================================================

let me = null;
let packs = [];
let haveSelected = new Set();

const BUCKET = 'audio'; // dùng chung bucket đã có sẵn quyền, không cần tạo mới

const $ = function (id) { return document.getElementById(id); };

const PROMPT =
'Mình có một web học TOEIC, đang cần soạn câu hỏi cho mục "Ôn tổng hợp" — trộn lẫn ' +
'từ vựng, câu đọc kiểu điền từ vào chỗ trống, và câu nghe. Từ tài liệu mình gửi kèm, ' +
'hãy chuyển thành DUY NHẤT một khối JSON, không thêm lời dẫn, không thêm dấu ```.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT câu hỏi:\n' +
'{\n' +
'  "kind": "vocab",\n' +
'  "prompt": "nội dung chính hiển thị — với vocab là 1 từ tiếng Anh, với read là 1 câu có chỗ trống ' +
'(viết chỗ trống bằng 3 dấu gạch dưới ___), với listen để trống vì câu nghe không in chữ",\n' +
'  "sub": "phụ đề nhỏ, ví dụ loại từ + phiên âm cho vocab — để chuỗi rỗng nếu không có",\n' +
'  "audio_file": "chỉ kind=listen mới cần, ví dụ extra-01.mp3, còn lại để chuỗi rỗng",\n' +
'  "image_file": "chỉ cần nếu có ảnh minh hoạ, để chuỗi rỗng nếu không",\n' +
'  "options": {"A": "phương án A", "B": "...", "C": "...", "D": "..."},\n' +
'  "correct_answer": "B",\n' +
'  "explanation": "giải thích ngắn bằng tiếng Việt vì sao đáp án đó đúng",\n' +
'  "translation_vi": "nghĩa tiếng Việt của đáp án đúng, hoặc bản dịch câu",\n' +
'  "key_point": "ghi chú ngắn nếu có, để chuỗi rỗng nếu không",\n' +
'  "difficulty": 2\n' +
'}\n\n' +
'Quy ước bắt buộc:\n' +
'- kind chỉ được là "vocab", "read", hoặc "listen".\n' +
'- Luôn có đúng 4 phương án A B C D.\n' +
'- difficulty là 1 dễ, 2 vừa, 3 khó.\n' +
'- Đáp án đúng rải đều A B C D giữa các câu, không dồn vào một chữ cái.\n' +
'- kind=listen bắt buộc phải có audio_file, các kind khác để chuỗi rỗng.';

const SAMPLE = JSON.stringify([
  {
    kind: 'vocab',
    prompt: 'reimburse',
    sub: 'v  /ˌriːɪmˈbɜːrs/',
    audio_file: '',
    image_file: '',
    options: { A: 'hoàn trả (chi phí)', B: 'từ chối', C: 'trì hoãn', D: 'thông báo' },
    correct_answer: 'A',
    explanation: 'Reimburse nghĩa là hoàn lại tiền cho ai đó, thường dùng khi công ty trả lại chi phí nhân viên đã ứng trước.',
    translation_vi: 'hoàn trả (chi phí)',
    key_point: '',
    difficulty: 2
  },
  {
    kind: 'read',
    prompt: 'The manager asked employees to ___ their expense reports by Friday.',
    sub: '',
    audio_file: '',
    image_file: '',
    options: { A: 'submit', B: 'submits', C: 'submitted', D: 'submission' },
    correct_answer: 'A',
    explanation: 'Sau "asked employees to" cần động từ nguyên mẫu không "to", nên chọn submit.',
    translation_vi: 'Quản lý yêu cầu nhân viên nộp báo cáo chi phí trước thứ Sáu.',
    key_point: 'ask someone to + V nguyên mẫu',
    difficulty: 1
  },
  {
    kind: 'listen',
    prompt: '',
    sub: '',
    audio_file: 'extra-01.mp3',
    image_file: '',
    options: { A: 'At the airport.', B: 'At a hotel.', C: 'At a restaurant.', D: 'At a bank.' },
    correct_answer: 'B',
    explanation: 'Người nói nhắc tới "check-in time" và "your room", đây là ngữ cảnh khách sạn.',
    translation_vi: 'Tại một khách sạn.',
    key_point: 'check-in, room = khách sạn',
    difficulty: 2
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

// ---------- Bước 1: tải file ----------

$('btn-upload').addEventListener('click', async function () {
  const files = $('file-input').files;
  if (!files.length) { toast('Chọn ít nhất một file đã.', 'bad'); return; }

  this.disabled = true;
  let ok = 0;

  for (const f of files) {
    const key = slug(f.name);
    const { error } = await db.storage.from(BUCKET).upload(key, f, { upsert: true });
    if (!error) ok++;
  }

  this.disabled = false;
  this.value = '';
  $('file-input').value = '';

  toast(ok === files.length ? 'Đã tải lên ' + ok + ' file.' : 'Tải lên ' + ok + '/' + files.length + ' file, kiểm tra lại phần lỗi.',
        ok === files.length ? 'good' : 'bad');
});

function slug(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return base.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + ext.toLowerCase();
}

function urlOf(name) {
  if (!name) return null;
  if (/^https?:\/\//i.test(name)) return name;
  const { data } = db.storage.from(BUCKET).getPublicUrl(slug(name));
  return data ? data.publicUrl : null;
}

// ---------- Bước 2: câu nhắc ----------

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPT);
  toast('Đã copy câu nhắc.', 'good');
});

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLE;
  toast('Đã dán ví dụ mẫu vào ô dữ liệu.', 'good');
});

// ---------- Bước 3: đọc, kiểm tra, xem trước ----------

$('btn-parse').addEventListener('click', function () {
  let data;
  try {
    data = JSON.parse($('raw').value);
  } catch (e) {
    say('Dữ liệu chưa đúng định dạng JSON: ' + e.message, 'bad');
    return;
  }

  if (!Array.isArray(data) || !data.length) {
    say('Cần một mảng có ít nhất một câu hỏi.', 'bad');
    return;
  }

  packs = data.map(function (o) {
    return {
      kind: (o.kind || '').trim(),
      prompt: (o.prompt || '').trim(),
      sub: (o.sub || '').trim(),
      audio_file: (o.audio_file || '').trim(),
      image_file: (o.image_file || '').trim(),
      options: o.options || {},
      correct_answer: (o.correct_answer || '').trim().toUpperCase(),
      explanation: (o.explanation || '').trim(),
      translation_vi: (o.translation_vi || '').trim(),
      key_point: (o.key_point || '').trim(),
      difficulty: o.difficulty || 2
    };
  });

  preview();
});

function checkOne(p) {
  const problems = [];

  if (!['vocab', 'read', 'listen'].includes(p.kind)) problems.push('kind phải là vocab/read/listen');
  if (p.kind === 'listen' && !p.audio_file) problems.push('kind=listen thiếu audio_file');
  if (p.kind !== 'listen' && !p.prompt) problems.push('thiếu prompt');

  const keys = Object.keys(p.options).filter(function (k) { return p.options[k] != null && p.options[k] !== ''; });
  if (keys.length < 2) problems.push('cần ít nhất 2 phương án');
  if (!p.correct_answer || !p.options[p.correct_answer]) problems.push('correct_answer không khớp phương án nào');

  return problems;
}

function preview() {
  let html = '';
  const bad = {};

  packs.forEach(function (p, i) {
    const problems = checkOne(p);
    if (problems.length) bad[i] = problems;

    html +=
      '<div class="tbox" style="border-color:' + (problems.length ? 'var(--danger)' : 'var(--line)') + '">' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' +
          '<span class="q-tag">' + esc(p.kind || '?') + '</span>' +
          (problems.length ? '<span class="tag-cold" style="color:var(--danger)">' + esc(problems.join('; ')) + '</span>' : '') +
        '</div>' +
        '<p class="ww">' + esc(p.prompt || '(không có prompt — kind=listen dùng audio)') + '</p>' +
        (p.audio_file ? '<p class="stat-lab">Âm thanh: ' + esc(p.audio_file) + '</p>' : '') +
        '<p class="rp">' + Object.keys(p.options).map(function (k) {
          return (k === p.correct_answer ? '<b>' : '') + k + '. ' + esc(p.options[k]) + (k === p.correct_answer ? '</b>' : '');
        }).join(' &nbsp; ') + '</p>' +
      '</div>';
  });

  $('preview').innerHTML = html;
  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const bad = JSON.parse(this.dataset.bad || '[]').map(Number);
  const good = packs.filter(function (p, i) { return bad.indexOf(i) === -1; });

  if (!good.length) { toast('Không có câu nào hợp lệ để lưu.', 'bad'); return; }

  this.disabled = true;

  const rows = good.map(function (p) {
    return {
      kind: p.kind,
      prompt: p.prompt || '',
      sub: p.sub || null,
      audio_url: p.audio_file ? urlOf(p.audio_file) : null,
      image_url: p.image_file ? urlOf(p.image_file) : null,
      options: p.options,
      correct_answer: p.correct_answer,
      explanation: p.explanation || null,
      translation_vi: p.translation_vi || null,
      key_point: p.key_point || null,
      difficulty: p.difficulty || 2
    };
  });

  const { error } = await db.from('extra_items').insert(rows);

  this.disabled = false;

  if (error) { toast('Không lưu được: ' + error.message, 'bad'); return; }

  toast('Đã thêm ' + rows.length + ' câu vào kho Ôn tổng hợp.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadHave();
});

// ---------- Câu đã có ----------

async function loadHave() {
  haveSelected = new Set();

  const { data: rows } = await db
    .from('extra_items')
    .select('id, kind, prompt, is_active')
    .order('id', { ascending: false });

  if (!rows || !rows.length) {
    $('have').innerHTML = '<p class="empty">Chưa có câu nào.</p>';
    $('have-n').textContent = '';
    $('have-select-all').checked = false;
    updateBulkBar();
    return;
  }

  $('have-n').textContent = rows.length + ' câu';

  const KIND_VI = { vocab: 'Từ vựng', read: 'Đọc', listen: 'Nghe' };

  let html = '';
  for (const r of rows) {
    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<input type="checkbox" class="have-check" data-id="' + r.id + '" style="width:18px;height:18px;accent-color:var(--teal)">' +
        '<span class="q-tag">' + esc(KIND_VI[r.kind] || r.kind) + '</span>' +
        '<span style="flex:1;min-width:180px">' + esc(r.prompt || '(câu nghe không in chữ)') + '</span>' +
        (r.is_active ? '' : '<span class="tag-cold" style="font-size:0.78rem">đang ẩn</span>') +
        '<button class="btn-sm" data-act="toggle" data-id="' + r.id + '">' +
          (r.is_active ? 'Ẩn' : 'Hiện lại') + '</button>' +
        '<button class="btn-sm" data-act="del" data-id="' + r.id + '">Xoá</button>' +
      '</div>';
  }

  $('have').innerHTML = html;

  $('have').querySelectorAll('button[data-act]').forEach(function (b) {
    b.addEventListener('click', function () { act(b.dataset.act, b.dataset.id, b); });
  });

  $('have').querySelectorAll('.have-check').forEach(function (c) {
    c.addEventListener('change', function () {
      if (c.checked) haveSelected.add(c.dataset.id);
      else haveSelected.delete(c.dataset.id);
      $('have-select-all').checked = haveSelected.size === rows.length;
      updateBulkBar();
    });
  });

  $('have-select-all').checked = false;
  updateBulkBar();
}

$('have-select-all').addEventListener('change', function () {
  const on = this.checked;
  $('have').querySelectorAll('.have-check').forEach(function (c) {
    c.checked = on;
    if (on) haveSelected.add(c.dataset.id);
    else haveSelected.delete(c.dataset.id);
  });
  updateBulkBar();
});

function updateBulkBar() {
  const bar = $('have-bulk-bar');
  if (haveSelected.size) {
    bar.classList.remove('hidden');
    $('have-bulk-count').textContent = 'Đã chọn ' + haveSelected.size + ' câu';
  } else {
    bar.classList.add('hidden');
  }
}

$('have-bulk-hide').addEventListener('click', async function () {
  const ids = Array.from(haveSelected);
  if (!ids.length) return;
  const { error } = await db.from('extra_items').update({ is_active: false }).in('id', ids);
  toast(error ? 'Không ẩn được: ' + error.message : 'Đã ẩn ' + ids.length + ' câu.', error ? 'bad' : 'good');
  loadHave();
});

$('have-bulk-show').addEventListener('click', async function () {
  const ids = Array.from(haveSelected);
  if (!ids.length) return;
  const { error } = await db.from('extra_items').update({ is_active: true }).in('id', ids);
  toast(error ? 'Không hiện được: ' + error.message : 'Đã hiện lại ' + ids.length + ' câu.', error ? 'bad' : 'good');
  loadHave();
});

$('have-bulk-del').addEventListener('click', async function () {
  const ids = Array.from(haveSelected);
  if (!ids.length) return;
  if (!confirm('Xoá hẳn ' + ids.length + ' câu đã chọn? Không hoàn tác được.')) return;
  const { error } = await db.from('extra_items').delete().in('id', ids);
  toast(error ? 'Không xoá hết được: ' + error.message : 'Đã xoá ' + ids.length + ' câu.', error ? 'bad' : 'good');
  loadHave();
});

async function act(what, id, btn) {
  if (what === 'toggle') {
    const on = btn.textContent.indexOf('Ẩn') === 0;
    await db.from('extra_items').update({ is_active: !on }).eq('id', id);
    loadHave();
    return;
  }
  if (what === 'del') {
    if (!confirm('Xoá hẳn câu này?')) return;
    await db.from('extra_items').delete().eq('id', id);
    loadHave();
  }
}

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
