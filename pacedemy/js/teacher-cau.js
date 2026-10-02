// ============================================================
// Pacedemy — soạn bài Thỏ hỏi trong Teacher Studio
//
// Mỗi bài là một câu hỏi của thỏ cùng ba câu đáp, câu đúng có chứa từ
// đang học. Soạn tay thì lâu, nên ở đây đi theo lối cô đã quen: chép
// lời nhắc, nhờ AI viết, dán JSON vào, web kiểm rồi lưu.
//
// Web kiểm được: đủ ba câu đáp, đúng một câu được đánh dấu, câu đúng
// có chứa từ, bối cảnh hợp lệ, không trùng từ đã có. Còn câu có tự
// nhiên hay không thì cô đọc, máy không nói thay được.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

const CANH_HOP_LE = ['van-phong', 'kho-hang', 'phong-hop', 'san-bay', 'le-tan', 'nha-may'];

const LOI_NHAC =
'Viết bài tập TOEIC Part 2 dạng ĐỌC cho người Việt học tiếng Anh thương mại.\n' +
'Mỗi từ tôi đưa, viết một bài theo mẫu JSON dưới đây.\n\n' +
'Yêu cầu:\n' +
'- cau_hoi: một câu hỏi tiếng Anh tự nhiên trong bối cảnh công sở, ngắn gọn như đề Part 2 thật.\n' +
'- dap_an: đúng ba câu. Một câu đánh dấu "ok": true và PHẢI chứa từ đang học.\n' +
'- Hai câu còn lại là bẫy kiểu đề thật: một câu dùng từ nghe gần giống nhưng nghĩa khác\n' +
'  (ví dụ call off / call on), một câu trả lời lạc kiểu câu hỏi (hỏi "có không" mà đáp\n' +
'  bằng địa điểm hay thời gian).\n' +
'- giai_thich: một hai câu tiếng Việt, nói nghĩa của từ và vì sao hai câu kia sai.\n' +
'- boi_canh: chọn một trong: van-phong, kho-hang, phong-hop, san-bay, le-tan, nha-may.\n' +
'- Tiếng Anh phải tự nhiên, đúng ngữ pháp, dùng từ của môi trường công sở.\n' +
'- Trả về DUY NHẤT một mảng JSON, không giải thích gì thêm.\n\n' +
'Mẫu:\n' +
'[{"tu":"call off","boi_canh":"phong-hop",\n' +
'  "cau_hoi":"Is the product launch still happening on Friday?",\n' +
'  "dap_an":[{"t":"No, it was called off because of the typhoon.","ok":true},\n' +
'            {"t":"Yes, I called him on Friday morning."},\n' +
'            {"t":"The launch is on the fourth floor."}],\n' +
'  "giai_thich":"call off = huỷ bỏ. Bẫy called him on nghe gần giống nhưng nghĩa khác hẳn."}]\n\n' +
'Danh sách từ: ';

let me = null;
let ds = [];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data: prof } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!prof || prof.role !== 'teacher') {
    $('tc-list').innerHTML = '<p class="empty">Trang này dành cho giáo viên.</p>';
    return;
  }

  $('tc-prompt').value = LOI_NHAC;

  $('tc-chep').addEventListener('click', function () {
    $('tc-prompt').select();
    try {
      navigator.clipboard.writeText(LOI_NHAC);
      toast('Đã chép lời nhắc.', 'good');
    } catch (e) {
      toast('Máy không cho chép tự động, cô bôi đen rồi chép tay nhé.', 'bad');
    }
  });

  $('tc-luu').addEventListener('click', luu);

  nap();
})();

// ---------- Kiểm trước khi lưu ----------

function kiem(r, daCo) {
  const tu = String(r.tu || '').trim();
  if (!tu) return 'thiếu trường "tu"';
  if (daCo[tu.toLowerCase()]) return 'từ «' + tu + '» đã có bài rồi';

  if (CANH_HOP_LE.indexOf(r.boi_canh) === -1) {
    return 'bối cảnh «' + r.boi_canh + '» không hợp lệ';
  }
  if (!String(r.cau_hoi || '').trim()) return 'thiếu câu hỏi';

  const da = r.dap_an;
  if (!Array.isArray(da) || da.length !== 3) return 'phải đúng ba câu đáp';

  const dung = da.filter(function (d) { return d && d.ok; });
  if (dung.length !== 1) return 'phải có đúng một câu đánh dấu ok';

  for (const d of da) {
    if (!d || !String(d.t || '').trim()) return 'có câu đáp để trống';
  }

  // Câu đúng phải chứa từ, nếu không thì bài mất ý nghĩa.
  // Cụm động từ hay bị tách ra giữa câu — "hand in" thành "handed it in" —
  // nên chỉ đòi các phần xuất hiện đúng thứ tự, cho phép chen chữ ở giữa.
  if (!coTu(dung[0].t, tu)) return 'câu đúng không chứa từ «' + tu + '»';

  return null;
}

function coTu(cau, tu) {
  const phan = String(tu).trim().split(/\s+/).filter(Boolean)
    .map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });

  if (!phan.length) return false;

  const mau = phan.map(function (x, i) {
    return (i ? '[\\s\\S]{0,30}?' : '') + '\\b' + x + '\\w*';
  }).join('');

  return new RegExp(mau, 'i').test(String(cau));

  return null;
}

async function luu() {
  const bao = $('tc-bao');
  const raw = $('tc-json').value.trim();

  function noi(t, xau) {
    bao.textContent = t;
    bao.className = 'tc-bao' + (xau ? ' tc-bao-xau' : ' tc-bao-tot');
  }

  if (!raw) { noi('Cô chưa dán gì cả.', true); return; }

  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    noi('JSON hỏng: ' + e.message, true);
    return;
  }

  if (!Array.isArray(arr) || !arr.length) { noi('Cần một mảng JSON có ít nhất một bài.', true); return; }

  const daCo = {};
  for (const r of ds) daCo[String(r.tu).toLowerCase()] = true;

  const tot = [];
  const hong = [];

  arr.forEach(function (r, i) {
    const loi = kiem(r, daCo);
    if (loi) { hong.push('bài ' + (i + 1) + ': ' + loi); return; }
    daCo[String(r.tu).toLowerCase()] = true;
    tot.push({
      tu: String(r.tu).trim(),
      boi_canh: r.boi_canh,
      cau_hoi: String(r.cau_hoi).trim(),
      dap_an: r.dap_an,
      giai_thich: r.giai_thich ? String(r.giai_thich).trim() : null,
      is_active: true
    });
  });

  if (!tot.length) { noi('Không bài nào qua được:\n' + hong.join('\n'), true); return; }

  $('tc-luu').disabled = true;
  const { error } = await db.from('cau_hoi_tho').insert(tot);
  $('tc-luu').disabled = false;

  if (error) { noi('Không lưu được: ' + error.message, true); return; }

  noi('Đã lưu ' + tot.length + ' bài.' + (hong.length ? ' Bỏ qua ' + hong.length + ' bài:\n' + hong.join('\n') : ''), false);
  $('tc-json').value = '';
  nap();
}

// ---------- Danh sách ----------

async function nap() {
  const { data, error } = await db.from('cau_hoi_tho')
    .select('id, tu, boi_canh, cau_hoi, dap_an, giai_thich')
    .order('id', { ascending: false });

  if (error) {
    $('tc-list').innerHTML = '<p class="empty">Không tải được: ' + esc(error.message) + '</p>';
    return;
  }

  ds = data || [];
  $('tc-dem').textContent = ds.length + ' bài';

  if (!ds.length) {
    $('tc-list').innerHTML = '<p class="empty">Chưa có bài nào.</p>';
    return;
  }

  $('tc-list').innerHTML = ds.map(the).join('');

  document.querySelectorAll('[data-xoa]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Xoá bài Thỏ hỏi này?')) return;
      const { error } = await db.from('cau_hoi_tho').delete().eq('id', parseInt(b.dataset.xoa, 10));
      if (error) { toast('Không xoá được: ' + error.message, 'bad'); return; }
      toast('Đã xoá.', 'good');
      nap();
    });
  });
}

function the(r) {
  const canh = (ThoHoi.CANH[r.boi_canh] || {}).ten || r.boi_canh;

  return '<div class="tc-the">' +
    '<div class="tc-dau">' +
      '<span class="tc-tu">' + esc(r.tu) + '</span>' +
      '<span class="tc-canh">' + esc(canh) + '</span>' +
      '<button class="st-xoa" type="button" data-xoa="' + r.id + '" title="Xoá bài">×</button>' +
    '</div>' +
    '<p class="tc-cau">' + esc(r.cau_hoi) + '</p>' +
    '<div class="tc-dapan">' +
      (r.dap_an || []).map(function (d) {
        return '<p class="tc-da' + (d.ok ? ' is-ok' : '') + '">' + esc(d.t) +
               (d.ok ? '<span>đúng</span>' : '') + '</p>';
      }).join('') +
    '</div>' +
    (r.giai_thich ? '<p class="tc-dagopy">' + esc(r.giai_thich) + '</p>' : '') +
  '</div>';
}
