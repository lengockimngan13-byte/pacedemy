// ============================================================
// Pacedemy — nhập đề vào ngân hàng câu hỏi
// Nhận hai định dạng: JSON, hoặc mỗi dòng một câu ngăn bằng dấu |
// ============================================================

let me = null;
let rows = [];
let tags = [];

const $ = function (id) { return document.getElementById(id); };

const PROMPT =
'Mình gửi file đề TOEIC. Hãy tách toàn bộ câu hỏi trong file và trả về DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'Mỗi phần tử có đúng các trường sau:\n' +
'{\n' +
'  "part": 5,\n' +
'  "question_text": "câu hỏi, chỗ trống viết bằng 4 dấu gạch dưới ____",\n' +
'  "A": "phương án A", "B": "...", "C": "...", "D": "...",\n' +
'  "correct_answer": "A",\n' +
'  "explanation": "giải thích bằng tiếng Việt, nói rõ quy tắc chứ không chỉ nêu đáp án",\n' +
'  "translation_vi": "nghĩa tiếng Việt của cả câu sau khi đã điền đáp án đúng",\n' +
'  "key_point": "cấu trúc hoặc cụm từ cần nhớ, viết ngắn dạng: cụm tiếng Anh = nghĩa tiếng Việt",\n' +
'  "topic_tag": "một trong các dạng: Chia từ loại | Danh từ | Tính từ | Trạng từ | ' +
'Động từ - thì và thể | Chủ động - bị động | Hoà hợp chủ ngữ động từ | Danh động từ và nguyên mẫu | ' +
'Câu mệnh lệnh | Mệnh đề quan hệ | Rút gọn mệnh đề quan hệ | Mệnh đề phân từ | Mệnh đề trạng ngữ | ' +
'Đại từ | Mạo từ và lượng từ | So sánh | Câu điều kiện và giả định | Đảo ngữ | Liên từ và mệnh đề | ' +
'Giới từ | Từ nối | Chọn từ đúng nghĩa | Cụm từ cố định | Cụm động từ",\n' +
'Chọn Danh từ, Tính từ hoặc Trạng từ khi bốn phương án là các dạng của cùng một họ từ và ' +
'chỗ trống chỉ nhận đúng một loại. Dùng "Chia từ loại" khi câu trộn nhiều loại từ khác nhau.\n' +
'  "difficulty": 2\n' +
'}\n\n' +
'Lưu ý quan trọng: ba phương án sai phải hợp lý nhưng chỉ có đúng một đáp án dùng được. ' +
'Nếu trong file có câu mà hai phương án đều đúng ngữ pháp, hãy sửa lại phương án nhiễu.';

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

  const { data: t } = await db.from('question_tags').select('tag').eq('part', 5);
  tags = (t || []).map(function (x) { return x.tag; });

  const chonDang = $('de-dang');
  if (chonDang) {
    chonDang.innerHTML = '<option value="">— không gắn —</option>' +
      tags.map(function (x) {
        return '<option value="' + esc(x) + '">' + esc(x) + '</option>';
      }).join('');
  }

  loadHave();
})();

// ---------- Câu nhắc ----------

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPT).then(function () {
    $('prompt-ok').textContent = 'Đã copy. Dán vào chat kèm file đề.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 4000);
  });
});

// ---------- Đọc dữ liệu ----------

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

$('btn-parse').addEventListener('click', function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    if (raw.charAt(0) === '[' || raw.charAt(0) === '{') {
      rows = readJson(raw);
    } else {
      // Thử kiểu "mỗi dòng ngăn bằng dấu |" trước vì nó chắc chắn.
      // Không ra câu nào thì coi như đây là đề copy thẳng từ PDF hay
      // Word, đưa cho bộ bóc đề.
      rows = readLines(raw);
      if (!rows.length && typeof DocDe !== 'undefined') {
        const r = DocDe.doc(raw, $('de-dang') ? $('de-dang').value : '');
        rows = r.cau;
        if (rows.length) {
          nhacBoc(r);
        }
      }
    }
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!rows.length) {
    return say('Không tìm thấy câu hỏi nào. Đề phải có số câu đầu dòng và đủ bốn ' +
               'phương án A B C D thì máy mới tách được.');
  }

  const bad = check(rows);
  preview(bad);
});

function readJson(raw) {
  const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const arr = JSON.parse(clean);
  const list = Array.isArray(arr) ? arr : [arr];

  return list.map(function (o) {
    return {
      part: parseInt(o.part || 5, 10),
      question_text: (o.question_text || '').trim(),
      A: (o.A || '').trim(), B: (o.B || '').trim(),
      C: (o.C || '').trim(), D: (o.D || '').trim(),
      correct_answer: (o.correct_answer || '').trim().toUpperCase(),
      explanation: (o.explanation || '').trim(),
      translation_vi: (o.translation_vi || '').trim(),
      key_point: (o.key_point || '').trim(),
      topic_tag: (o.topic_tag || '').trim(),
      difficulty: parseInt(o.difficulty || 2, 10)
    };
  });
}

// Mỗi dòng: câu | A | B | C | D | đáp án | giải thích | dịch | cụm từ | dạng | độ khó
function readLines(raw) {
  const out = [];
  const lines = raw.split('\n');

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const c = t.split(/\s*\|\s*/);
    if (c.length < 6) continue;

    out.push({
      part: 5,
      question_text: c[0], A: c[1], B: c[2], C: c[3], D: c[4],
      correct_answer: (c[5] || '').toUpperCase(),
      explanation: c[6] || '', translation_vi: c[7] || '',
      key_point: c[8] || '', topic_tag: c[9] || '',
      difficulty: parseInt(c[10] || 2, 10)
    });
  }
  return out;
}

// Nói rõ bóc được bao nhiêu, thiếu đáp án bao nhiêu. Thiếu đáp án là
// chuyện phải cho cô thấy ngay: máy KHÔNG đoán đáp án, nên câu thiếu
// sẽ bị loại lúc lưu nếu cô không điền.
function nhacBoc(r) {
  const o = $('de-trang-thai');
  if (!o) return;
  o.textContent = 'Tách được ' + r.cau.length + ' câu' +
    (r.so_dap_an ? ' · đọc được bảng đáp án ' + r.so_dap_an + ' câu' : ' · KHÔNG thấy bảng đáp án') +
    (r.thieu_dap_an ? ' · ' + r.thieu_dap_an + ' câu chưa có đáp án, em điền tay giúp' : '');
  o.style.color = r.thieu_dap_an ? '#B4442F' : 'var(--teal)';
}

// ---------- Kiểm lỗi trước khi lưu ----------

let nhac = {};   // lời nhắc: vẫn lưu được, chỉ là chưa đầy đủ

function check(list) {
  const problems = {};
  nhac = {};

  list.forEach(function (r, i) {
    const p = [];

    if (!r.question_text) p.push('thiếu câu hỏi');
    if (!r.A || !r.B || !r.C || !r.D) p.push('thiếu phương án');
    if (['A','B','C','D'].indexOf(r.correct_answer) === -1) p.push('đáp án phải là A, B, C hoặc D');
    if (r.question_text && r.question_text.indexOf('__') === -1 && r.part === 5) p.push('câu chưa có chỗ trống ____');
    if (r.topic_tag && tags.length && tags.indexOf(r.topic_tag) === -1) p.push('dạng bài chưa có trong danh mục');
    // Chưa có giải thích thì KHÔNG chặn lưu. Đề bóc thẳng từ PDF
    // không bao giờ có sẵn giải thích tiếng Việt, mà phần giải thích
    // bốn phương án ở dưới trang này điền được sau. Chặn ở đây thì
    // nguyên bộ đề vừa bóc bị vứt hết.
    if (!r.explanation) nhac[i] = (nhac[i] || []).concat('chưa có giải thích');

    const set = [r.A, r.B, r.C, r.D].map(function (x) { return x.toLowerCase(); });
    if (new Set(set).size < 4) p.push('có hai phương án trùng nhau');

    if (p.length) problems[i] = p;
  });

  return problems;
}

// ---------- Xem trước ----------

function preview(bad) {
  const nBad = Object.keys(bad).length;

  let html = '<div class="section-head" style="margin-top:26px"><h2>Xem trước ' +
             rows.length + ' câu</h2>' +
             (nBad ? '<span class="tag-cold">' + nBad + ' câu cần sửa</span>'
                   : '<span class="tag-warm">Không có lỗi</span>') + '</div>';

  rows.forEach(function (r, i) {
    const p = bad[i];
    html +=
      '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        (r.topic_tag ? '<span class="q-tag">' + esc(r.topic_tag) + '</span> ' : '') +
        (p ? '<span class="tag-cold" style="font-size:0.82rem">' + esc(p.join(' · ')) + '</span> ' : '') +
        (nhac[i] ? '<span class="tag-warm" style="font-size:0.82rem">' + esc(nhac[i].join(' · ')) + '</span>' : '') +
        '<p class="wq" style="margin-top:8px">' + esc(r.question_text) + '</p>' +
        '<p class="wa">' +
          ['A','B','C','D'].map(function (k) {
            return (k === r.correct_answer ? '<b>' + k + '. ' + esc(r[k]) + '</b>' : k + '. ' + esc(r[k]));
          }).join(' &nbsp; ') +
        '</p>' +
        (r.key_point ? '<p class="key-point" style="margin:8px 0 6px">' + esc(r.key_point) + '</p>' : '') +
        (r.explanation ? '<p class="ww">' + esc(r.explanation) + '</p>' : '') +
        (r.translation_vi ? '<p class="ww" style="color:#6C837E">' + esc(r.translation_vi) + '</p>' : '') +
      '</div>';
  });

  $('preview').innerHTML = html;

  if (nBad) {
    say('Có ' + nBad + ' câu còn lỗi. Bạn sửa trong ô dữ liệu rồi bấm Xem trước lại. ' +
        'Vẫn lưu được nhưng những câu lỗi sẽ bị bỏ qua.');
  } else {
    const chuaGiai = Object.keys(nhac).length;
    say('Dữ liệu hợp lệ. Bấm Lưu để đưa vào ngân hàng đề.' +
        (chuaGiai ? ' (' + chuaGiai + ' câu chưa có giải thích — lưu vẫn được, điền sau ở mục ' +
                    'Giải thích bốn phương án bên dưới.)' : ''), 'good');
  }

  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const bad = new Set(JSON.parse(this.dataset.bad || '[]').map(Number));
  const good = rows.filter(function (r, i) { return !bad.has(i); });

  if (!good.length) return say('Không có câu nào hợp lệ để lưu.');

  this.disabled = true;
  this.textContent = 'Đang lưu…';

  const payload = good.map(function (r) {
    return {
      part: r.part || 5,
      question_text: r.question_text,
      options: { A: r.A, B: r.B, C: r.C, D: r.D },
      correct_answer: r.correct_answer,
      explanation: r.explanation || null,
      translation_vi: r.translation_vi || null,
      key_point: r.key_point || null,
      topic_tag: r.topic_tag || null,
      skill_group: groupOf(r.topic_tag),
      difficulty: r.difficulty || 2,
      test_no: testNo(),
      is_active: true
    };
  });

  const { error } = await db.from('questions').insert(payload);

  this.disabled = false;
  this.textContent = 'Lưu vào ngân hàng đề';

  if (error) return say('Không lưu được: ' + error.message);

  say('Đã lưu ' + good.length + ' câu vào ngân hàng đề.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadHave();
});


// ============================================================
// Câu Part 5 đã có — lọc, chọn hàng loạt, sửa và xoá cả loạt
// ============================================================

let have = [];   // toàn bộ câu Part 5 đã tải về

async function loadHave() {
  $('have').innerHTML = '<p class="empty">Đang tải…</p>';

  const { data, error } = await db.from('questions')
    .select('id, question_text, topic_tag, test_no, is_active, created_at')
    .eq('part', 5)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    $('have').innerHTML = '<p class="empty">Không tải được danh sách: ' + esc(error.message) + '</p>';
    return;
  }

  have = data || [];
  fillFilters();
  drawHave();
}

// Đổ sẵn các dạng và số Test đang có vào hai ô lọc
function fillFilters() {
  const tagList = [...new Set(have.map(function (r) { return r.topic_tag; }).filter(Boolean))].sort();
  const testList = [...new Set(have.map(function (r) { return r.test_no; })
    .filter(function (x) { return x != null; }))].sort(function (a, b) { return a - b; });

  const keepTag = $('f-tag').value;
  const keepTest = $('f-test').value;

  $('f-tag').innerHTML = '<option value="">Tất cả các dạng</option>' +
    tagList.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
  $('f-test').innerHTML = '<option value="">Tất cả số Test</option>' +
    '<option value="none">Chưa gắn số Test</option>' +
    testList.map(function (t) { return '<option value="' + t + '">Test ' + t + '</option>'; }).join('');

  $('f-tag').value = keepTag;
  $('f-test').value = keepTest;
}

function filtered() {
  const tag = $('f-tag').value;
  const test = $('f-test').value;
  const state = $('f-state').value;
  const text = $('f-text').value.trim().toLowerCase();

  return have.filter(function (r) {
    if (tag && r.topic_tag !== tag) return false;
    if (test === 'none' && r.test_no != null) return false;
    if (test && test !== 'none' && String(r.test_no) !== test) return false;
    if (state === 'on' && !r.is_active) return false;
    if (state === 'off' && r.is_active) return false;
    if (text && (r.question_text || '').toLowerCase().indexOf(text) === -1) return false;
    return true;
  });
}

function drawHave() {
  const list = filtered();

  BulkList.render($('have'), {
    noun: 'câu',
    emptyText: have.length
      ? 'Không có câu nào khớp bộ lọc.'
      : 'Chưa có câu Part 5 nào trong ngân hàng đề.',
    items: list.map(function (r) {
      return {
        id: r.id,
        active: r.is_active,
        html:
          '<span class="bulk-title">' + esc(r.question_text || '(không có nội dung)') + '</span>' +
          '<span class="bulk-meta">' +
            (r.topic_tag ? '<span>' + esc(r.topic_tag) + '</span>' : '<span>chưa gắn dạng</span>') +
            (r.test_no != null ? '<span>Test ' + r.test_no + '</span>' : '') +
            (r.is_active ? '' : '<span>đang ẩn</span>') +
          '</span>'
      };
    }),
    onSetActive: async function (ids, active) {
      const { error } = await db.from('questions').update({ is_active: active }).in('id', ids);
      return error ? error.message : null;
    },
    onSetTest: async function (ids, n) {
      const { error } = await db.from('questions').update({ test_no: n }).in('id', ids);
      return error ? error.message : null;
    },
    onDelete: async function (ids) {
      // Xoá theo từng mẻ cho khỏi quá dài khi chọn cả ngàn câu
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await db.from('questions').delete().in('id', ids.slice(i, i + 200));
        if (error) return error.message;
      }
      return null;
    },
    onDone: loadHave
  });
}

['f-tag', 'f-test', 'f-state'].forEach(function (id) {
  const el = $(id);
  if (el) el.addEventListener('change', drawHave);
});

if ($('f-text')) $('f-text').addEventListener('input', drawHave);
if ($('f-reload')) $('f-reload').addEventListener('click', loadHave);

// Số Test giáo viên nhập ở Bước 3 — áp cho mọi câu lưu trong lượt này
function testNo() {
  const el = document.getElementById('test-no');
  const v = parseInt(el ? el.value : '', 10);
  return isNaN(v) ? null : v;
}

const VOCAB_TAGS = ['Giới từ', 'Từ nối', 'Chọn từ đúng nghĩa', 'Cụm từ cố định', 'Cụm động từ'];
const WORD_TAGS  = ['Chia từ loại', 'Danh từ', 'Tính từ', 'Trạng từ'];

function groupOf(tag) {
  if (!tag) return null;
  if (VOCAB_TAGS.indexOf(tag) !== -1) return 'Từ vựng';
  if (WORD_TAGS.indexOf(tag) !== -1) return 'Từ loại';
  return 'Ngữ pháp';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ============================================================
// Thả file PDF vào, đọc chữ ngay trong máy
//
// Dùng pdf.js tải từ CDN. File KHÔNG rời khỏi máy cô: đọc bằng
// FileReader rồi pdf.js bóc chữ tại chỗ, không có lệnh gửi lên đâu
// cả. Nói rõ chỗ này trên màn hình, vì "kéo file vào web" nghe như
// là đang tải file lên.
//
// PDF scan (ảnh chụp trang sách) thì pdf.js không đọc được chữ —
// trong file chỉ có ảnh, không có chữ. Gặp trường hợp đó phải nói
// thẳng, chứ không để cô ngồi đợi một bảng trống.
// ============================================================

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfSan = null;

function napPdfJs() {
  if (pdfSan) return pdfSan;
  pdfSan = new Promise(function (ok, hong) {
    if (window.pdfjsLib) return ok(window.pdfjsLib);
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = function () {
      if (!window.pdfjsLib) return hong(new Error('Không nạp được bộ đọc PDF'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      ok(window.pdfjsLib);
    };
    s.onerror = function () { hong(new Error('Không tải được bộ đọc PDF, kiểm tra lại mạng')); };
    document.head.appendChild(s);
  });
  return pdfSan;
}

// Ghép chữ trong một trang lại. pdf.js trả về từng mẩu kèm toạ độ,
// nên phải tự xuống dòng khi mẩu sau tụt xuống thấp hơn mẩu trước —
// không làm vậy thì cả trang dính thành một dòng dài, mà bộ bóc đề
// lại dựa vào số câu ĐẦU DÒNG để cắt.
function chuTrang(noi_dung) {
  let ra = '';
  let yTruoc = null;

  noi_dung.items.forEach(function (it) {
    const y = it.transform ? Math.round(it.transform[5]) : null;
    if (yTruoc !== null && y !== null && Math.abs(y - yTruoc) > 3) ra += '\n';
    ra += it.str;
    if (it.hasEOL) ra += '\n';
    yTruoc = y;
  });

  return ra;
}

async function docPdf(file) {
  const o = $('de-trang-thai');
  o.style.color = 'var(--ink-soft)';
  o.textContent = 'Đang mở bộ đọc PDF…';

  const pdfjs = await napPdfJs();

  o.textContent = 'Đang đọc file…';
  const buf = await file.arrayBuffer();
  const tap = await pdfjs.getDocument({ data: buf }).promise;

  let chu = '';
  for (let i = 1; i <= tap.numPages; i++) {
    o.textContent = 'Đang đọc trang ' + i + '/' + tap.numPages + '…';
    const trang = await tap.getPage(i);
    chu += chuTrang(await trang.getTextContent()) + '\n';
  }

  return chu;
}

async function nhanFile(file) {
  if (!file) return;

  const o = $('de-trang-thai');

  try {
    const chu = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      ? await docPdf(file)
      : await file.text();

    if (chu.replace(/\s/g, '').length < 40) {
      o.style.color = '#B4442F';
      o.textContent = 'File này không có chữ để lấy — nhiều khả năng là PDF scan ' +
                      '(ảnh chụp trang sách). Em copy chữ từ bản Word, hoặc gửi file ' +
                      'cho Claude theo cách ở mục bên dưới.';
      return;
    }

    $('raw').value = chu;
    o.style.color = 'var(--teal)';
    o.textContent = 'Đã lấy chữ từ "' + file.name + '". Bấm Xem trước để tách thành câu hỏi.';

    $('btn-parse').click();
    $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    o.style.color = '#B4442F';
    o.textContent = 'Không đọc được file: ' + (e.message || e);
  }
}

(function noiOThaFile() {
  const o = $('de-tha');
  if (!o) return;

  const chon = $('de-file');

  o.addEventListener('click', function () { chon.click(); });
  chon.addEventListener('change', function () { nhanFile(chon.files && chon.files[0]); });

  ['dragenter', 'dragover'].forEach(function (e) {
    o.addEventListener(e, function (ev) {
      ev.preventDefault();
      o.classList.add('dang-keo');
    });
  });
  ['dragleave', 'drop'].forEach(function (e) {
    o.addEventListener(e, function (ev) {
      ev.preventDefault();
      o.classList.remove('dang-keo');
    });
  });

  o.addEventListener('drop', function (ev) {
    nhanFile(ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]);
  });
})();
