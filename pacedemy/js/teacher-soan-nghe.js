// ============================================================
// Pacedemy — soạn bài nghe thẳng trong Teacher Studio
//
// Trang teacher-listen.html cũ bắt cô Ngân copy câu nhắc, sang chỗ khác,
// rồi dán JSON về. Mỗi lần sửa một chữ là làm lại cả vòng đó.
// Trang này điền form là ra bài, và bảng biểu Part 3-4 làm luôn tại chỗ
// chứ không phải đi dựng ảnh ở công cụ khác.
//
// Trang cũ vẫn giữ, dùng khi nhập nhiều bài một lúc.
// ============================================================

let me = null;
let doHoa = null;          // dữ liệu bảng biểu đang soạn, null là không có
let audioUrl = '';
let anhUrl = '';

const $ = function (id) { return document.getElementById(id); };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function say(msg, ok) {
  const n = $('note');
  n.className = 'note' + (ok ? ' ok' : '');
  n.textContent = msg;
  n.classList.remove('hidden');
  n.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function anNote() { $('note').classList.add('hidden'); }

// ---------- Nhãn dạng câu, giống hệt trang nhập hàng loạt ----------

const TAGS = {
  1: ['Tranh tả người', 'Tranh tả vật', 'Tranh tả cả người và vật'],
  2: ['Câu hỏi WHAT', 'Câu hỏi WHO', 'Câu hỏi WHEN', 'Câu hỏi WHERE', 'Câu hỏi HOW',
      'Câu hỏi WHY', 'Câu hỏi YES/NO', 'Câu hỏi đuôi', 'Câu hỏi lựa chọn',
      'Câu yêu cầu, đề nghị', 'Câu trần thuật'],
  3: ['Câu hỏi về chủ đề, mục đích', 'Câu hỏi về danh tính người nói',
      'Câu hỏi về địa điểm', 'Câu hỏi về chi tiết', 'Câu hỏi về yêu cầu, gợi ý',
      'Câu hỏi về việc sẽ làm tiếp', 'Câu hỏi về hàm ý câu nói', 'Câu hỏi nhìn bảng biểu'],
  4: ['Câu hỏi về chủ đề, mục đích', 'Câu hỏi về danh tính người nói',
      'Câu hỏi về địa điểm', 'Câu hỏi về chi tiết', 'Câu hỏi về yêu cầu, gợi ý',
      'Câu hỏi về việc sẽ làm tiếp', 'Câu hỏi về hàm ý câu nói', 'Câu hỏi nhìn bảng biểu']
};

function part() { return parseInt($('f-part').value, 10) || 3; }

// Part 1 và 2 chỉ có 3 phương án và không in đề lên màn hình
function soPhuongAn() { return part() <= 2 ? 3 : 4; }
function coDeIn()     { return part() >= 3; }

// ============================================================
// Bảng biểu
// ============================================================

function veChipKieu() {
  $('dh-kieu').innerHTML = DoHoa.KIEU.map(function (k) {
    const on = doHoa && doHoa.kieu === k.ma;
    return '<button type="button" class="sn-chip' + (on ? ' on' : '') + '" data-kieu="' + k.ma + '">' +
             '<b>' + esc(k.ten) + '</b><span>' + esc(k.vd) + '</span>' +
           '</button>';
  }).join('');
}

$('dh-kieu').addEventListener('click', function (e) {
  const b = e.target.closest('[data-kieu]');
  if (!b) return;
  const ma = b.dataset.kieu;
  if (doHoa && doHoa.kieu === ma) return;
  doHoa = DoHoa.mau(ma);
  veChipKieu();
  veSoanDoHoa();
});

$('dh-xoa').addEventListener('click', function () {
  doHoa = null;
  veChipKieu();
  veSoanDoHoa();
});

function veSoanDoHoa() {
  const soan = $('dh-soan');
  if (!doHoa) {
    soan.classList.add('hidden');
    $('dh-xem').innerHTML = '';
    return;
  }
  soan.classList.remove('hidden');
  $('dh-tieude').value = doHoa.tieu_de || '';
  $('dh-ghichu').value = doHoa.ghi_chu || '';
  $('dh-than').innerHTML = thanDoHoa();
  xemDoHoa();
}

function thanDoHoa() {
  const k = doHoa.kieu;

  if (k === 'bang') {
    const cot = doHoa.cot || [];
    const head = cot.map(function (c, i) {
      return '<th><input type="text" data-dh="cot" data-i="' + i + '" value="' + esc(c) +
             '" placeholder="Tên cột"></th>';
    }).join('');
    const body = (doHoa.hang || []).map(function (h, r) {
      const td = cot.map(function (_, c) {
        return '<td><input type="text" data-dh="o" data-r="' + r + '" data-c="' + c +
               '" value="' + esc((h || [])[c] || '') + '"></td>';
      }).join('');
      return '<tr>' + td + '<td class="sn-bo"><button type="button" class="sn-x" data-dh="xoa-hang" ' +
             'data-r="' + r + '" title="Xoá dòng">×</button></td></tr>';
    }).join('');

    return '<div class="sn-cuon"><table class="sn-bang">' +
             '<thead><tr>' + head + '<th class="sn-bo"></th></tr></thead>' +
             '<tbody>' + body + '</tbody></table></div>' +
           '<div class="sn-nut">' +
             '<button type="button" class="btn-sm" data-dh="them-hang">+ Dòng</button>' +
             '<button type="button" class="btn-sm" data-dh="them-cot">+ Cột</button>' +
             '<button type="button" class="btn-sm" data-dh="bot-cot">− Cột</button>' +
           '</div>';
  }

  if (k === 'cot' || k === 'duong' || k === 'tron') {
    const donVi = k === 'tron' ? '' :
      '<label class="sn-o sn-rong"><span>Đơn vị</span>' +
      '<input type="text" data-dh="donvi" value="' + esc(doHoa.don_vi || '') +
      '" placeholder="vd nghìn USD"></label>';
    const hang = (doHoa.muc || []).map(function (m, i) {
      return '<div class="sn-dong">' +
               '<input type="text" data-dh="muc-ten" data-i="' + i + '" value="' + esc(m.ten) +
                 '" placeholder="Nhãn, vd Q1">' +
               '<input type="number" step="any" data-dh="muc-gt" data-i="' + i + '" value="' +
                 esc(m.gia_tri) + '" placeholder="Số">' +
               '<button type="button" class="sn-x" data-dh="xoa-muc" data-i="' + i + '">×</button>' +
             '</div>';
    }).join('');
    return (donVi ? '<div class="sn-hang">' + donVi + '</div>' : '') +
           '<div class="sn-dongs">' + hang + '</div>' +
           '<div class="sn-nut"><button type="button" class="btn-sm" data-dh="them-muc">+ Mục</button></div>';
  }

  if (k === 'so-do') {
    const o = (doHoa.o || []).map(function (x, i) {
      return '<div class="sn-dong">' +
               '<input type="text" data-dh="o-ten" data-i="' + i + '" value="' + esc(x.ten) +
                 '" placeholder="Tên ô, vd Room A">' +
               '<input type="text" data-dh="o-nhan" data-i="' + i + '" value="' + esc(x.nhan) +
                 '" placeholder="Chú thích, vd Sales">' +
               '<button type="button" class="sn-x" data-dh="xoa-o" data-i="' + i + '">×</button>' +
             '</div>';
    }).join('');
    return '<div class="sn-hang"><label class="sn-o"><span>Số ô mỗi hàng</span>' +
             '<input type="number" min="1" max="5" data-dh="socot" value="' +
             (doHoa.so_cot || 3) + '"></label></div>' +
           '<div class="sn-dongs">' + o + '</div>' +
           '<div class="sn-nut"><button type="button" class="btn-sm" data-dh="them-o">+ Ô</button></div>';
  }

  if (k === 'phieu') {
    const d = (doHoa.dong || []).map(function (x, i) {
      return '<div class="sn-dong">' +
               '<input type="text" data-dh="p-nhan" data-i="' + i + '" value="' + esc(x.nhan) +
                 '" placeholder="vd Discount">' +
               '<input type="text" data-dh="p-gt" data-i="' + i + '" value="' + esc(x.gia_tri) +
                 '" placeholder="vd 25% OFF">' +
               '<button type="button" class="sn-x" data-dh="xoa-p" data-i="' + i + '">×</button>' +
             '</div>';
    }).join('');
    return '<div class="sn-dongs">' + d + '</div>' +
           '<div class="sn-nut"><button type="button" class="btn-sm" data-dh="them-p">+ Dòng</button></div>';
  }

  return '';
}

// Gõ tới đâu hình đổi tới đó
$('dh-than').addEventListener('input', function (e) {
  const t = e.target, v = t.value, k = t.dataset.dh;
  if (!k || !doHoa) return;
  const i = parseInt(t.dataset.i, 10);

  if (k === 'cot')      doHoa.cot[i] = v;
  else if (k === 'o')   {
    const r = parseInt(t.dataset.r, 10), c = parseInt(t.dataset.c, 10);
    doHoa.hang[r] = doHoa.hang[r] || [];
    doHoa.hang[r][c] = v;
  }
  else if (k === 'donvi')   doHoa.don_vi = v;
  else if (k === 'muc-ten') doHoa.muc[i].ten = v;
  else if (k === 'muc-gt')  doHoa.muc[i].gia_tri = v;
  else if (k === 'o-ten')   doHoa.o[i].ten = v;
  else if (k === 'o-nhan')  doHoa.o[i].nhan = v;
  else if (k === 'socot')   doHoa.so_cot = parseInt(v, 10) || 3;
  else if (k === 'p-nhan')  doHoa.dong[i].nhan = v;
  else if (k === 'p-gt')    doHoa.dong[i].gia_tri = v;

  xemDoHoa();
});

$('dh-than').addEventListener('click', function (e) {
  const b = e.target.closest('[data-dh]');
  if (!b || b.tagName === 'INPUT' || !doHoa) return;
  const k = b.dataset.dh, i = parseInt(b.dataset.i, 10);

  if (k === 'them-hang')      doHoa.hang.push(doHoa.cot.map(function () { return ''; }));
  else if (k === 'xoa-hang')  doHoa.hang.splice(parseInt(b.dataset.r, 10), 1);
  else if (k === 'them-cot')  {
    doHoa.cot.push('');
    doHoa.hang.forEach(function (h) { h.push(''); });
  }
  else if (k === 'bot-cot')   {
    if (doHoa.cot.length <= 1) return;
    doHoa.cot.pop();
    doHoa.hang.forEach(function (h) { h.pop(); });
  }
  else if (k === 'them-muc')  doHoa.muc.push({ ten: '', gia_tri: '' });
  else if (k === 'xoa-muc')   doHoa.muc.splice(i, 1);
  else if (k === 'them-o')    doHoa.o.push({ ten: '', nhan: '' });
  else if (k === 'xoa-o')     doHoa.o.splice(i, 1);
  else if (k === 'them-p')    doHoa.dong.push({ nhan: '', gia_tri: '' });
  else if (k === 'xoa-p')     doHoa.dong.splice(i, 1);
  else return;

  $('dh-than').innerHTML = thanDoHoa();
  xemDoHoa();
});

$('dh-tieude').addEventListener('input', function () { doHoa.tieu_de = this.value; xemDoHoa(); });
$('dh-ghichu').addEventListener('input', function () { doHoa.ghi_chu = this.value; xemDoHoa(); });

function xemDoHoa() {
  $('dh-xem').innerHTML = doHoa && DoHoa.coGi(doHoa)
    ? '<p class="sn-xem-lab">Học viên sẽ thấy thế này</p>' + DoHoa.ve(doHoa)
    : '';
}

// ============================================================
// Từ vựng
// ============================================================

let tuS = [];

function veTu() {
  $('tu-list').innerHTML = tuS.map(function (t, i) {
    return '<div class="sn-dong sn-dong-4">' +
             '<input type="text" data-tu="term" data-i="' + i + '" value="' + esc(t.term) +
               '" placeholder="Từ tiếng Anh">' +
             '<input type="text" data-tu="pos" data-i="' + i + '" value="' + esc(t.pos) +
               '" placeholder="n / v / adj">' +
             '<input type="text" data-tu="meaning_vi" data-i="' + i + '" value="' + esc(t.meaning_vi) +
               '" placeholder="Nghĩa tiếng Việt">' +
             '<button type="button" class="sn-x" data-tu="xoa" data-i="' + i + '">×</button>' +
           '</div>';
  }).join('');
}

$('tu-them').addEventListener('click', function () {
  tuS.push({ term: '', pos: '', meaning_vi: '' });
  veTu();
});

$('tu-list').addEventListener('input', function (e) {
  const k = e.target.dataset.tu;
  if (!k || k === 'xoa') return;
  tuS[parseInt(e.target.dataset.i, 10)][k] = e.target.value;
});

$('tu-list').addEventListener('click', function (e) {
  const b = e.target.closest('[data-tu="xoa"]');
  if (!b) return;
  tuS.splice(parseInt(b.dataset.i, 10), 1);
  veTu();
});

// ============================================================
// Câu hỏi
// ============================================================

let cauS = [];

function cauMoi() {
  return {
    question_text: '', options: ['', '', '', ''], correct_answer: 'A',
    explanation: '', translation_vi: '', key_point: '', topic_tag: '',
    question_vi: { q: '', A: '', B: '', C: '', D: '' }
  };
}

function veCau() {
  const n = soPhuongAn();
  const chu = ['A', 'B', 'C', 'D'];

  $('cau-n').textContent = cauS.length + ' câu';

  $('cau-list').innerHTML = cauS.map(function (c, i) {
    const pa = chu.slice(0, n).map(function (ch, j) {
      return '<div class="sn-pa' + (c.correct_answer === ch ? ' on' : '') + '">' +
               '<button type="button" class="sn-dap" data-c="' + i + '" data-dap="' + ch + '" ' +
                 'title="Đặt làm đáp án đúng">' + ch + '</button>' +
               '<input type="text" data-c="' + i + '" data-f="opt" data-j="' + j + '" ' +
                 'value="' + esc(c.options[j] || '') + '" placeholder="Phương án ' + ch + '">' +
               '<input type="text" data-c="' + i + '" data-f="opt-vi" data-ch="' + ch + '" ' +
                 'value="' + esc(c.question_vi[ch] || '') + '" placeholder="Dịch ' + ch + '">' +
             '</div>';
    }).join('');

    const tags = (TAGS[part()] || []).map(function (t) {
      return '<option value="' + esc(t) + '"' + (c.topic_tag === t ? ' selected' : '') + '>' +
             esc(t) + '</option>';
    }).join('');

    return '<div class="tbox sn-cau">' +
      '<div class="sn-cau-dau">' +
        '<h3>Câu ' + (i + 1) + '</h3>' +
        '<button type="button" class="sn-x" data-c="' + i + '" data-f="xoa-cau">×</button>' +
      '</div>' +

      (coDeIn()
        ? '<div class="sn-doi">' +
            '<div class="field"><label>Đề bài</label>' +
              '<input type="text" data-c="' + i + '" data-f="qt" value="' + esc(c.question_text) +
              '" placeholder="What does the man ask the woman to do?"></div>' +
            '<div class="field"><label>Dịch đề</label>' +
              '<input type="text" data-c="' + i + '" data-f="qvi" value="' + esc(c.question_vi.q) +
              '" placeholder="Người đàn ông nhờ người phụ nữ làm gì?"></div>' +
          '</div>'
        : '<p class="sn-dan">Part này không in đề lên màn hình, học viên chỉ nghe rồi chọn.</p>') +

      '<div class="sn-pas">' + pa + '</div>' +

      '<div class="field"><label>Giải thích bằng tiếng Việt</label>' +
        '<textarea data-c="' + i + '" data-f="gt" class="sn-ta-nho" ' +
        'placeholder="Chỗ nào trong bài cho ra đáp án, và vì sao mấy phương án kia sai hoặc là bẫy">' +
        esc(c.explanation) + '</textarea></div>' +

      '<div class="sn-hang">' +
        '<label class="sn-o sn-rong"><span>Cụm cần nghe bắt được</span>' +
          '<input type="text" data-c="' + i + '" data-f="kp" value="' + esc(c.key_point) +
          '" placeholder="reschedule the delivery = dời lịch giao hàng"></label>' +
        '<label class="sn-o sn-rong"><span>Dạng câu</span>' +
          '<select data-c="' + i + '" data-f="tag"><option value="">— chọn dạng —</option>' + tags +
          '</select></label>' +
      '</div>' +
    '</div>';
  }).join('');
}

$('cau-them').addEventListener('click', function () { cauS.push(cauMoi()); veCau(); });

$('cau-list').addEventListener('input', function (e) {
  const t = e.target, f = t.dataset.f;
  if (!f) return;
  const c = cauS[parseInt(t.dataset.c, 10)];
  if (!c) return;

  if (f === 'qt')            c.question_text = t.value;
  else if (f === 'qvi')      c.question_vi.q = t.value;
  else if (f === 'opt')      c.options[parseInt(t.dataset.j, 10)] = t.value;
  else if (f === 'opt-vi')   c.question_vi[t.dataset.ch] = t.value;
  else if (f === 'gt')       c.explanation = t.value;
  else if (f === 'kp')       c.key_point = t.value;
});

$('cau-list').addEventListener('change', function (e) {
  if (e.target.dataset.f !== 'tag') return;
  cauS[parseInt(e.target.dataset.c, 10)].topic_tag = e.target.value;
});

$('cau-list').addEventListener('click', function (e) {
  const dap = e.target.closest('[data-dap]');
  if (dap) {
    cauS[parseInt(dap.dataset.c, 10)].correct_answer = dap.dataset.dap;
    veCau();
    return;
  }
  const xoa = e.target.closest('[data-f="xoa-cau"]');
  if (xoa) {
    cauS.splice(parseInt(xoa.dataset.c, 10), 1);
    veCau();
  }
});

// ============================================================
// Tải file
// ============================================================

function slug(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const clean = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (clean || 'file') + '-' + Date.now().toString(36) + ext;
}

async function taiLen(file, xem, dat) {
  xem.innerHTML = '<p class="sn-dan">Đang tải lên…</p>';
  const { error, url } = await uploadMedia('listen/' + slug(file.name), file);
  if (error) {
    xem.innerHTML = '<p class="sn-loi">Không tải lên được: ' + esc(error.message) + '</p>';
    return;
  }
  dat(url);
  xem.innerHTML = '<p class="sn-ok">Đã tải lên</p>' +
    (file.type.indexOf('image') === 0
      ? '<img src="' + esc(url) + '" alt="" class="sn-anh">'
      : '<audio controls src="' + esc(url) + '" class="sn-audio"></audio>');
}

$('f-audio').addEventListener('change', function () {
  if (this.files[0]) taiLen(this.files[0], $('audio-xem'), function (u) { audioUrl = u; });
});

$('f-anh').addEventListener('change', function () {
  if (this.files[0]) taiLen(this.files[0], $('anh-xem'), function (u) { anhUrl = u; });
});

// ============================================================
// Đổi Part thì đổi giao diện
// ============================================================

$('f-part').addEventListener('change', function () {
  const p = part();
  $('khoi-anh').classList.toggle('hidden', p !== 1);
  $('khoi-dohoa').classList.toggle('hidden', p < 3);
  if (p < 3) doHoa = null;

  // Part 1 và 2 mỗi bài một câu, Part 3 và 4 mỗi bài ba câu
  const can = p <= 2 ? 1 : 3;
  while (cauS.length < can) cauS.push(cauMoi());
  if (cauS.length > can && cauS.every(function (c) { return !c.options.some(Boolean); })) {
    cauS = cauS.slice(0, can);
  }

  // số phương án đổi theo Part
  const n = soPhuongAn();
  cauS.forEach(function (c) {
    while (c.options.length < n) c.options.push('');
    c.options.length = n;
    if (['A', 'B', 'C', 'D'].indexOf(c.correct_answer) >= n) c.correct_answer = 'A';
  });

  veChipKieu();
  veSoanDoHoa();
  veCau();
});

// ============================================================
// Lưu
// ============================================================

function kiem() {
  const loi = [];
  if (!$('f-title').value.trim()) loi.push('chưa đặt tên bài');
  if (!audioUrl) loi.push('chưa có file âm thanh');
  if (part() === 1 && !anhUrl) loi.push('Part 1 phải có ảnh');
  if (!cauS.length) loi.push('chưa có câu hỏi nào');

  const n = soPhuongAn();
  cauS.forEach(function (c, i) {
    const thieu = c.options.slice(0, n).filter(function (o) { return !String(o).trim(); }).length;
    if (thieu) loi.push('câu ' + (i + 1) + ' còn ' + thieu + ' phương án trống');
    if (coDeIn() && !c.question_text.trim()) loi.push('câu ' + (i + 1) + ' chưa có đề');
  });

  if (doHoa && !DoHoa.coGi(doHoa)) loi.push('bảng biểu đang để trống, điền vào hoặc bỏ nó đi');
  return loi;
}

$('btn-luu').addEventListener('click', async function () {
  anNote();
  const loi = kiem();
  if (loi.length) return say('Còn thiếu: ' + loi.join('; ') + '.');

  this.disabled = true;
  const chu = this.textContent;
  this.textContent = 'Đang lưu…';

  const p = part();
  const kho = parseInt($('f-kho').value, 10) || 2;
  const testNo = parseInt($('f-test').value, 10) || null;

  const { data: row, error } = await db.from('listening_sets').insert({
    part: p,
    title: $('f-title').value.trim(),
    audio_url: audioUrl,
    image_url: p === 1 ? anhUrl : null,
    graphic: doHoa && DoHoa.coGi(doHoa) ? doHoa : null,
    transcript: $('f-script').value.trim() || null,
    transcript_vi: $('f-script-vi').value.trim() || null,
    difficulty: kho,
    vocab: tuS.filter(function (t) { return t.term.trim(); }),
    test_no: testNo,
    is_active: true
  }).select('id').single();

  if (error || !row) {
    this.disabled = false;
    this.textContent = chu;
    return say('Không lưu được bài: ' + (error ? error.message : 'lỗi không rõ'));
  }

  const n = soPhuongAn();
  const payload = cauS.map(function (c, j) {
    return {
      part: p,
      set_id: row.id,
      order_index: j + 1,
      question_text: coDeIn() ? c.question_text.trim() : null,
      options: c.options.slice(0, n),
      correct_answer: c.correct_answer,
      explanation: c.explanation.trim() || null,
      translation_vi: c.translation_vi || null,
      key_point: c.key_point.trim() || null,
      topic_tag: c.topic_tag || null,
      question_vi: c.question_vi,
      difficulty: kho,
      is_active: true
    };
  });

  const { error: e2 } = await db.from('questions').insert(payload);

  this.disabled = false;
  this.textContent = chu;

  if (e2) {
    await db.from('listening_sets').delete().eq('id', row.id);
    return say('Lưu câu hỏi không được nên đã huỷ cả bài: ' + e2.message);
  }

  say('Đã lưu bài "' + $('f-title').value.trim() + '" với ' + payload.length + ' câu.', true);
  if (typeof toast === 'function') toast('Đã lưu bài nghe');
});

$('btn-moi').addEventListener('click', function () {
  if (!confirm('Xoá hết nội dung đang soạn để bắt đầu bài mới?')) return;
  lamMoi();
});

function lamMoi() {
  anNote();
  $('f-title').value = '';
  $('f-script').value = '';
  $('f-script-vi').value = '';
  $('f-audio').value = '';
  $('f-anh').value = '';
  $('audio-xem').innerHTML = '';
  $('anh-xem').innerHTML = '';
  audioUrl = '';
  anhUrl = '';
  doHoa = null;
  tuS = [];
  cauS = [];
  const can = part() <= 2 ? 1 : 3;
  for (let i = 0; i < can; i++) cauS.push(cauMoi());
  const n = soPhuongAn();
  cauS.forEach(function (c) { c.options.length = n; });
  veChipKieu();
  veSoanDoHoa();
  veTu();
  veCau();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// Khởi động
// ============================================================

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-main').classList.remove('hidden');
  lamMoi();
})();
