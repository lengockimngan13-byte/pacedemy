// ============================================================
// Pacedemy — cô duyệt câu học viên tự đặt trong sổ từ
//
// Web chỉ lọc được phần rác: câu cụt, câu chép lại đề, câu viết bằng
// tiếng Việt. Đúng hay sai thì phải người biết tiếng Anh nói, nên câu
// nào cũng dừng ở đây chờ cô.
//
// Chỉ câu cô bấm "Đạt" mới được đem ra làm đề ôn cho học viên.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

let me = null;
let loc = 'cho';
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

  $('tc-tabs').querySelectorAll('[data-loc]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('tc-tabs').querySelectorAll('[data-loc]').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      loc = b.dataset.loc;
      nap();
    });
  });

  nap();
})();

async function nap() {
  $('tc-list').innerHTML = '<p class="empty">Đang tải…</p>';

  const { data, error } = await db.from('tu_cua_toi')
    .select('id, user_id, tu, cau, cau_vi, cau_cua_toi, cau_trang_thai, cau_gop_y, cau_sua_lai, cau_duyet_luc')
    .eq('cau_trang_thai', loc)
    .not('cau_cua_toi', 'is', null)
    .order('id', { ascending: false })
    .limit(100);

  if (error) {
    $('tc-list').innerHTML = '<p class="empty">Không tải được: ' + esc(error.message) + '</p>';
    return;
  }

  ds = data || [];

  if (!ds.length) {
    $('tc-list').innerHTML = '<p class="empty">' +
      (loc === 'cho' ? 'Không còn câu nào chờ duyệt. Nhẹ cả người.' : 'Chưa có câu nào ở mục này.') +
      '</p>';
    return;
  }

  // Lấy tên học viên cho dễ nhìn
  const ids = Array.from(new Set(ds.map(function (r) { return r.user_id; })));
  const { data: hv } = await db.from('profiles').select('id, full_name').in('id', ids);
  const ten = {};
  for (const h of (hv || [])) ten[h.id] = h.full_name;

  $('tc-list').innerHTML = ds.map(function (r) { return the(r, ten[r.user_id]); }).join('');
  gan();
}

function the(r, tenHV) {
  return '<div class="tc-the" data-id="' + r.id + '">' +
    '<div class="tc-dau">' +
      '<span class="tc-hv">' + esc(tenHV || 'Học viên') + '</span>' +
      '<span class="tc-tu">' + esc(r.tu) + '</span>' +
    '</div>' +

    '<p class="tc-cau">' + esc(r.cau_cua_toi) + '</p>' +

    (r.cau ? '<p class="tc-goc">Câu trong đề: ' + esc(r.cau) + '</p>' : '') +

    (r.cau_sua_lai ? '<p class="tc-dasua">Đã sửa thành: <b>' + esc(r.cau_sua_lai) + '</b></p>' : '') +
    (r.cau_gop_y ? '<p class="tc-dagopy">Đã nhắn: ' + esc(r.cau_gop_y) + '</p>' : '') +

    '<div class="tc-sua">' +
      '<input type="text" data-sualai="' + r.id + '" placeholder="Sửa lại câu cho đúng (để trống nếu câu đã ổn)" ' +
        'value="' + esc(r.cau_sua_lai || '') + '">' +
      '<input type="text" data-gopy="' + r.id + '" placeholder="Nhắn cho học viên một câu (không bắt buộc)" ' +
        'value="' + esc(r.cau_gop_y || '') + '">' +
    '</div>' +

    '<div class="tc-nut">' +
      '<button class="btn-sm test" type="button" data-dat="' + r.id + '">Đạt</button>' +
      '<button class="btn-sm learn" type="button" data-can-sua="' + r.id + '">Cần sửa</button>' +
    '</div>' +
  '</div>';
}

function gan() {
  const chamDiem = async function (id, trangThai) {
    const sua = document.querySelector('[data-sualai="' + id + '"]').value.trim();
    const gop = document.querySelector('[data-gopy="' + id + '"]').value.trim();

    if (trangThai === 'sua' && !sua && !gop) {
      toast('Bấm "Cần sửa" thì nên sửa lại câu hoặc nhắn một dòng, để học viên biết sai ở đâu.', 'bad');
      return;
    }

    const { error } = await db.from('tu_cua_toi').update({
      cau_trang_thai: trangThai,
      cau_sua_lai: sua || null,
      cau_gop_y: gop || null,
      cau_duyet_luc: new Date().toISOString()
    }).eq('id', id);

    if (error) { toast('Không lưu được: ' + error.message, 'bad'); return; }

    toast(trangThai === 'dat' ? 'Đã duyệt đạt. Câu này sẽ được dùng làm đề ôn.' : 'Đã báo học viên sửa lại.', 'good');
    nap();
  };

  document.querySelectorAll('[data-dat]').forEach(function (b) {
    b.addEventListener('click', function () { chamDiem(parseInt(b.dataset.dat, 10), 'dat'); });
  });

  document.querySelectorAll('[data-can-sua]').forEach(function (b) {
    b.addEventListener('click', function () { chamDiem(parseInt(b.dataset.canSua, 10), 'sua'); });
  });
}
