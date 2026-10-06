// ============================================================
// Pacedemy — soạn lộ trình học
//
// Bên trái là danh sách lộ trình, bên phải là nội dung lộ trình đang
// chọn: phần đầu (tên, mục tiêu, số tuần) rồi tới từng tuần với các
// việc trong tuần đó.
//
// Sửa mẫu không đụng tới em nào đang theo: tiến độ đếm lại từ dữ liệu
// thật mỗi lần mở, nên thêm hay bớt việc là tuần đó tính lại ngay.
// Riêng việc cô lồng thêm cho một em nằm ở bảng khác, sửa mẫu không
// mất.
//
// "Ngừng dùng" chỉ tắt cờ is_active, không xoá. Em nào đang theo thì
// lộ trình vẫn chạy tiếp, chỉ là không gắn cho em mới nữa.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

let me = null;
let ds = [];        // danh sách lộ trình
let dang = null;    // lộ trình đang mở
let tuanDs = [];    // các tuần của lộ trình đang mở
let viecDs = {};    // tuan_id -> [việc]
let tuanDangThem = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data: mine } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!mine || mine.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-main').classList.remove('hidden');
  await LoTrinh.napChon();
  noi();
  await napDs();
})();

// ---------- danh sách ----------

async function napDs() {
  const { data, error } = await db.from('lo_trinh')
    .select('id, ten, mo_ta, muc_tieu, ky_nang, so_tuan, is_active')
    .order('is_active', { ascending: false })
    .order('id');

  if (error) {
    $('lt-ds').innerHTML = '<p class="empty">Không đọc được: ' + esc(error.message) + '</p>';
    return;
  }

  ds = data || [];

  // Đếm xem mỗi lộ trình đang có bao nhiêu em theo
  const { data: hv } = await db.from('hoc_vien_lo_trinh')
    .select('lo_trinh_id').eq('is_active', true);
  const dem = {};
  (hv || []).forEach(function (x) { dem[x.lo_trinh_id] = (dem[x.lo_trinh_id] || 0) + 1; });

  if (!ds.length) {
    $('lt-ds').innerHTML = '<p class="empty">Chưa có lộ trình nào.</p>';
    return;
  }

  $('lt-ds').innerHTML = ds.map(function (l) {
    const n = dem[l.id] || 0;
    return '<button class="lt-muc' + (dang && dang.id === l.id ? ' on' : '') +
             (l.is_active ? '' : ' tat') + '" type="button" data-id="' + l.id + '">' +
      '<b>' + esc(l.ten) + '</b>' +
      '<span>' + l.so_tuan + ' tuần' +
        (l.muc_tieu ? ' · nhắm ' + l.muc_tieu : '') +
        (n ? ' · ' + n + ' em đang theo' : '') +
        (l.is_active ? '' : ' · đã ngừng') +
      '</span>' +
    '</button>';
  }).join('');
}

// ---------- mở một lộ trình ----------

async function mo(id) {
  dang = ds.find(function (x) { return x.id === id; });
  if (!dang) return;

  $('lt-chua').classList.add('hidden');
  $('lt-soan').classList.remove('hidden');
  $('lt-ten-hien').textContent = dang.ten;
  $('f-ten').value = dang.ten;
  $('f-muc').value = dang.muc_tieu || '';
  $('f-ky').value = dang.ky_nang;
  $('f-tuan').value = dang.so_tuan;
  $('f-mo').value = dang.mo_ta || '';
  $('lt-xoa').textContent = dang.is_active ? 'Ngừng dùng' : 'Dùng lại';

  await napTuan();
  napDs();
}

async function napTuan() {
  const { data: ts } = await db.from('lo_trinh_tuan')
    .select('id, tuan, tieu_de, ghi_chu').eq('lo_trinh_id', dang.id).order('tuan');

  tuanDs = ts || [];
  viecDs = {};

  if (tuanDs.length) {
    const { data: vs } = await db.from('lo_trinh_viec')
      .select('id, tuan_id, kind, target, label, amount, order_index')
      .in('tuan_id', tuanDs.map(function (t) { return t.id; }))
      .order('order_index');

    (vs || []).forEach(function (v) {
      (viecDs[v.tuan_id] = viecDs[v.tuan_id] || []).push(v);
    });
  }

  veTuan();
}

function veTuan() {
  if (!tuanDs.length) {
    $('lt-tuan').innerHTML = '<p class="empty">Chưa có tuần nào. Bấm "Thêm tuần" bên dưới.</p>';
    return;
  }

  $('lt-tuan').innerHTML = tuanDs.map(function (t) {
    const vs = viecDs[t.id] || [];
    return '<div class="lt-stuan" data-tuan-id="' + t.id + '">' +
      '<div class="lt-stuan-dau">' +
        '<b>Tuần ' + t.tuan + '</b>' +
        '<input type="text" class="lt-tieu" data-f="tieu_de" value="' + esc(t.tieu_de) + '" ' +
          'placeholder="tên tuần, ví dụ: Chắc lại từ loại">' +
        '<button class="btn-sm" type="button" data-bo-tuan>Bỏ tuần</button>' +
      '</div>' +
      '<textarea class="lt-ghi-o" rows="2" data-f="ghi_chu" ' +
        'placeholder="ghi chú cho em đó đọc: tuần này tập trung vào đâu, vì sao">' +
        esc(t.ghi_chu || '') + '</textarea>' +

      (vs.length
        ? vs.map(function (v) {
            return '<div class="lt-sviec" data-viec="' + v.id + '">' +
              '<span>' + esc(v.label) + '</span>' +
              '<span class="lt-sso">' + v.amount + ' ' + (LoTrinh.DON_VI[v.kind] || '') + '</span>' +
              '<button class="btn-sm" type="button" data-bo-viec>Bỏ</button>' +
            '</div>';
          }).join('')
        : '<p class="lt-trong">Tuần này chưa có việc nào.</p>') +

      '<button class="btn-sm test" type="button" data-them-viec>+ Thêm việc</button>' +
    '</div>';
  }).join('');
}

// ---------- lưu ----------

async function luuDau() {
  if (!dang) return;
  const ten = $('f-ten').value.trim();
  if (!ten) return toast('Lộ trình phải có tên.', 'bad');

  const o = {
    ten: ten,
    muc_tieu: $('f-muc').value ? parseInt($('f-muc').value, 10) : null,
    ky_nang: $('f-ky').value,
    so_tuan: Math.max(1, parseInt($('f-tuan').value, 10) || 4),
    mo_ta: $('f-mo').value.trim() || null
  };

  const { error } = await db.from('lo_trinh').update(o).eq('id', dang.id);
  if (error) return toast('Không lưu được: ' + error.message, 'bad');

  Object.assign(dang, o);
  $('lt-ten-hien').textContent = ten;
  toast('Đã lưu');
  napDs();
}

async function luuTuanMot(el) {
  const id = parseInt(el.dataset.tuanId, 10);
  const o = {};
  el.querySelectorAll('[data-f]').forEach(function (x) {
    o[x.dataset.f] = x.value.trim() || (x.dataset.f === 'tieu_de' ? 'Chưa đặt tên' : null);
  });
  await db.from('lo_trinh_tuan').update(o).eq('id', id);
  const t = tuanDs.find(function (x) { return x.id === id; });
  if (t) Object.assign(t, o);
}

async function themTuan() {
  if (!dang) return;
  const tiep = tuanDs.length ? tuanDs[tuanDs.length - 1].tuan + 1 : 1;

  const { error } = await db.from('lo_trinh_tuan').insert({
    lo_trinh_id: dang.id, tuan: tiep, tieu_de: 'Tuần ' + tiep
  });
  if (error) return toast('Không thêm được: ' + error.message, 'bad');

  // Số tuần của lộ trình phải theo kịp, nếu không tuần vừa thêm nằm
  // ngoài tầm và học viên không bao giờ thấy.
  if (tiep > dang.so_tuan) {
    await db.from('lo_trinh').update({ so_tuan: tiep }).eq('id', dang.id);
    dang.so_tuan = tiep;
    $('f-tuan').value = tiep;
  }

  await napTuan();
}

async function boTuan(id) {
  const t = tuanDs.find(function (x) { return x.id === id; });
  if (!t) return;
  if (!confirm('Bỏ hẳn tuần ' + t.tuan + ' và các việc trong đó?')) return;

  const { error } = await db.from('lo_trinh_tuan').delete().eq('id', id);
  if (error) return toast('Không bỏ được: ' + error.message, 'bad');
  await napTuan();
}

async function boViec(id) {
  const { error } = await db.from('lo_trinh_viec').delete().eq('id', id);
  if (error) return toast('Không bỏ được: ' + error.message, 'bad');
  await napTuan();
}

// ---------- hộp thêm việc ----------

function moViec(tuanId) {
  tuanDangThem = tuanId;
  $('v-kind').value = 'part5';
  doiKind();
  $('v-label').value = '';
  $('viec-che').hidden = false;
  document.body.classList.add('nen-dang-mo');
}

function dongViec() {
  $('viec-che').hidden = true;
  document.body.classList.remove('nen-dang-mo');
}

function doiKind() {
  const k = $('v-kind').value;
  const ds2 = (LoTrinh.chon() || {})[k] || [];
  $('v-target').innerHTML = ds2.map(function (o) {
    return '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>';
  }).join('');
  $('v-target').disabled = ds2.length <= 1;
  $('v-dv').textContent = LoTrinh.DON_VI[k] || 'câu';
  $('v-amount').value = k === 'mock' ? 1 : (k === 'vocab' ? 25 : 25);
}

async function themViec() {
  if (!tuanDangThem) return;

  const kind = $('v-kind').value;
  const target = $('v-target').value || null;
  const label = $('v-label').value.trim() || LoTrinh.tenViec(kind, target);
  const amount = Math.max(1, parseInt($('v-amount').value, 10) || 1);

  const co = (viecDs[tuanDangThem] || []).length;

  const { error } = await db.from('lo_trinh_viec').insert({
    tuan_id: tuanDangThem, kind: kind, target: target,
    label: label, amount: amount, order_index: co + 1
  });

  if (error) return toast('Không thêm được: ' + error.message, 'bad');

  dongViec();
  await napTuan();
}

// ---------- nối sự kiện ----------

function noi() {
  $('lt-ds').addEventListener('click', function (e) {
    const b = e.target.closest('[data-id]');
    if (b) mo(parseInt(b.dataset.id, 10));
  });

  $('lt-moi').addEventListener('click', async function () {
    const ten = prompt('Tên lộ trình mới:', 'Lộ trình ');
    if (!ten || !ten.trim()) return;

    const { data, error } = await db.from('lo_trinh')
      .insert({ ten: ten.trim(), so_tuan: 4 }).select('id').single();
    if (error) return toast('Không tạo được: ' + error.message, 'bad');

    await napDs();
    mo(data.id);
  });

  $('f-luu').addEventListener('click', luuDau);

  $('lt-xoa').addEventListener('click', async function () {
    if (!dang) return;
    const bat = !dang.is_active;
    await db.from('lo_trinh').update({ is_active: bat }).eq('id', dang.id);
    dang.is_active = bat;
    $('lt-xoa').textContent = bat ? 'Ngừng dùng' : 'Dùng lại';
    toast(bat ? 'Đã dùng lại' : 'Đã ngừng dùng');
    napDs();
  });

  $('lt-them-tuan').addEventListener('click', themTuan);

  $('lt-tuan').addEventListener('click', function (e) {
    const el = e.target.closest('.lt-stuan');
    if (!el) return;

    if (e.target.closest('[data-them-viec]')) return moViec(parseInt(el.dataset.tuanId, 10));
    if (e.target.closest('[data-bo-tuan]'))   return boTuan(parseInt(el.dataset.tuanId, 10));

    const bv = e.target.closest('[data-bo-viec]');
    if (bv) return boViec(parseInt(bv.closest('[data-viec]').dataset.viec, 10));
  });

  // Gõ xong rời ô thì lưu luôn, khỏi phải bấm nút cho từng tuần
  $('lt-tuan').addEventListener('focusout', function (e) {
    if (!e.target.matches('[data-f]')) return;
    luuTuanMot(e.target.closest('.lt-stuan'));
  });

  $('v-kind').addEventListener('change', doiKind);
  $('v-ok').addEventListener('click', themViec);
  $('v-huy').addEventListener('click', dongViec);
  $('viec-dong').addEventListener('click', dongViec);
  $('viec-che').addEventListener('click', function (e) {
    if (e.target === $('viec-che')) dongViec();
  });
}
