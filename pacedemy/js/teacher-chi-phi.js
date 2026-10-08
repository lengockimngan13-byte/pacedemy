// ============================================================
// Pacedemy — chi phí AI: xem và đặt trần
//
// Hạn mức cũ là mỗi người mỗi ngày, chặn được một em bấm phá nhưng
// không chặn được một nghìn em cùng dùng trong một tuần web đông
// khách. Trần ở đây tính theo TIỀN cho cả hệ thống.
//
// Tính theo tiền chứ không theo số lượt, vì mỗi loại việc một giá:
// soạn một lộ trình đắt gấp sáu lần chấm một câu nói. Đếm lượt thì
// hai ngày cùng 100 lượt có thể lệch nhau sáu lần tiền.
//
// Con số ở đây là ƯỚC TÍNH theo đơn giá cô đặt, không phải hoá đơn
// thật. Nói rõ chỗ này trên màn hình luôn, để cô không tưởng đây là
// số tiền đã bị trừ.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

const TEN_VIEC = {
  'cham-noi':    'Chấm bài nói (AI)',
  'phat-am':     'Chấm phát âm (Azure)',
  'tu-dien':     'Dựng mục từ điển mới',
  'lo-trinh':    'Soạn lộ trình',
  'de-noi':      'Soạn đề nói',
  'giai-dap-an': 'Giải thích bốn phương án'
};

let me = null;
let soLieu = null;

function tien(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + 'đ';
}

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
  noi();
  await nap();
})();

async function nap() {
  const { data, error } = await db.rpc('ai_chi_tieu', { p_ngay: 30 });
  if (error || !data) {
    $('cp-ngay-so').textContent = 'Không đọc được';
    return;
  }

  soLieu = data;
  veDong('ngay', data.hom_nay, data.tran_ngay, 'hôm nay');
  veDong('thang', data.thang_nay, data.tran_thang, 'tháng này');
  veViec(data.hom_nay_viec || {});
  veBieu(data.theo_ngay || []);

  $('cp-tran-ngay').value = data.tran_ngay;
  $('cp-tran-thang').value = data.tran_thang;

  await veGia();
}

// ---------- hai ô lớn ----------

function veDong(ten, da, tran, nhan) {
  const pct = tran ? Math.min(100, Math.round(da / tran * 100)) : 0;
  const con = Math.max(0, tran - da);

  $('cp-' + ten + '-so').textContent = tien(da);
  $('cp-' + ten + '-thanh').style.width = pct + '%';

  const o = $('cp-' + ten);
  o.classList.toggle('gan', pct >= 75 && pct < 100);
  o.classList.toggle('het', pct >= 100);

  $('cp-' + ten + '-phu').textContent = pct >= 100
    ? 'Đã chạm trần. Mấy việc tốn tiền đang tạm nghỉ.'
    : 'Trên trần ' + tien(tran) + ' · còn ' + tien(con) + ' cho ' + nhan;
}

// ---------- hôm nay tiêu vào đâu ----------

function veViec(o) {
  const ds = Object.keys(o)
    .map(function (k) { return { viec: k, so_lan: o[k].so_lan, tien: o[k].tien }; })
    .filter(function (x) { return x.so_lan > 0; })
    .sort(function (a, b) { return b.tien - a.tien; });

  if (!ds.length) {
    $('cp-viec').innerHTML = '<p class="empty">Hôm nay chưa dùng lượt nào.</p>';
    return;
  }

  const tong = ds.reduce(function (s, x) { return s + x.tien; }, 0);

  $('cp-viec').innerHTML = ds.map(function (x) {
    const pct = tong ? Math.round(x.tien / tong * 100) : 0;
    return '<div class="cp-hang">' +
      '<span class="cp-ten">' + esc(TEN_VIEC[x.viec] || x.viec) + '</span>' +
      '<span class="cp-thanh nho"><span style="width:' + pct + '%"></span></span>' +
      '<span class="cp-lan">' + x.so_lan + ' lượt</span>' +
      '<span class="cp-tien">' + tien(x.tien) + '</span>' +
    '</div>';
  }).join('');
}

// ---------- biểu đồ ba mươi ngày ----------

function veBieu(ds) {
  if (!ds.length) {
    $('cp-bieu').innerHTML = '<p class="empty" style="margin:0">Chưa có ngày nào dùng tới AI.</p>';
    $('cp-bieu-phu').textContent = '';
    return;
  }

  const max = Math.max.apply(null, ds.map(function (x) { return x.tien; })) || 1;
  const tran = (soLieu && soLieu.tran_ngay) || 0;

  $('cp-bieu').innerHTML = ds.map(function (x) {
    const cao = Math.max(3, Math.round(x.tien / max * 92));
    const ng = String(x.ngay).split('-');
    return '<span class="cp-cot' + (tran && x.tien >= tran ? ' het' : '') +
      '" style="height:' + cao + 'px" title="' + ng[2] + '/' + ng[1] + ': ' +
      tien(x.tien) + ' · ' + x.so_lan + ' lượt"></span>';
  }).join('');

  const tong = ds.reduce(function (s, x) { return s + x.tien; }, 0);
  const tb = Math.round(tong / ds.length);

  $('cp-bieu-phu').textContent =
    'Tổng ' + tien(tong) + ' trong ' + ds.length + ' ngày có dùng · ' +
    'trung bình ' + tien(tb) + ' một ngày · ngày cao nhất ' + tien(max) + '.';
}

// ---------- đơn giá ----------

async function veGia() {
  const { data } = await db.from('site_settings')
    .select('value').eq('key', 'don_gia_ai').maybeSingle();

  const dat = (data && data.value) || {};
  const macDinh = {
    'cham-noi': 60, 'phat-am': 47, 'tu-dien': 70,
    'lo-trinh': 350, 'de-noi': 200, 'giai-dap-an': 150
  };

  $('cp-gia').innerHTML = Object.keys(TEN_VIEC).map(function (k) {
    return '<label class="cp-gia-o">' +
      '<span>' + esc(TEN_VIEC[k]) + '</span>' +
      '<input type="number" min="0" data-viec="' + k + '" ' +
        'value="' + (dat[k] != null ? dat[k] : macDinh[k]) + '">' +
      '<i>đồng mỗi lượt</i>' +
    '</label>';
  }).join('');
}

// ---------- lưu ----------

async function luuTran() {
  const o = {
    tien_ngay: Math.max(0, parseInt($('cp-tran-ngay').value, 10) || 0),
    tien_thang: Math.max(0, parseInt($('cp-tran-thang').value, 10) || 0)
  };

  if (o.tien_thang && o.tien_ngay > o.tien_thang) {
    return bao('Trần ngày đang lớn hơn trần tháng. Đặt vậy thì trần tháng chặn trước.', true);
  }

  const { error } = await db.from('site_settings')
    .upsert({ key: 'tran_ai', value: o }, { onConflict: 'key' });

  if (error) return bao('Không lưu được: ' + error.message, true);

  bao('Đã lưu. Trần mới có hiệu lực ngay, không cần deploy.', false);
  await nap();
}

async function luuGia() {
  const o = {};
  $('cp-gia').querySelectorAll('[data-viec]').forEach(function (x) {
    o[x.dataset.viec] = Math.max(0, parseInt(x.value, 10) || 0);
  });

  const { error } = await db.from('site_settings')
    .upsert({ key: 'don_gia_ai', value: o }, { onConflict: 'key' });

  if (error) return toast('Không lưu được: ' + error.message, 'bad');
  toast('Đã lưu đơn giá');
  await nap();
}

function bao(msg, xau) {
  const p = $('cp-bao');
  p.textContent = msg;
  p.style.color = xau ? '#B4442F' : 'var(--teal)';
}

function noi() {
  $('cp-luu').addEventListener('click', luuTran);
  $('cp-gia-luu').addEventListener('click', luuGia);
}
