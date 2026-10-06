// ============================================================
// Pacedemy — lộ trình học, phần dùng chung
//
// Cô soạn lộ trình một lần (ví dụ "650+", "Cải thiện Listening"),
// rồi gắn cho từng em kèm ngày bắt đầu. Tuần 1 tính từ ngày gắn,
// nên mỗi em một khung ngày riêng dù dùng chung một mẫu.
//
// Tiến độ không lưu ở đâu cả, mà đếm thẳng từ việc em đã làm trong
// đúng khung ngày của tuần đó. Nghĩa là không có chuyện đánh dấu
// "đã xong" cho có — làm thật mới lên.
//
// Hàm đếm nằm trong Postgres (lo_trinh_tien_do), vì mỗi tuần phải
// hỏi vài bảng khác nhau; gọi từ trình duyệt thì mỗi tuần một chuyến
// đi về, tám tuần là hai mươi mấy chuyến.
// ============================================================

const LoTrinh = (function () {

  const KIND = {
    vocab:  'Từ vựng',
    part5:  'Part 5',
    listen: 'Nghe',
    read:   'Đọc',
    mock:   'Thi thử'
  };

  const DON_VI = {
    vocab: 'từ', part5: 'câu', listen: 'câu', read: 'câu', mock: 'bài'
  };

  let chon = null;   // danh sách lựa chọn cho ô "nhắm vào", nạp một lần

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- lựa chọn khi soạn việc ----------

  async function napChon() {
    if (chon) return chon;

    const [{ data: ts }, { data: tags }] = await Promise.all([
      db.from('topics').select('id, slug, name_vi').eq('is_active', true).order('order_index'),
      db.from('question_tags').select('tag, part').eq('is_active', true).order('order_index')
    ]);

    const slug = {};
    (ts || []).forEach(function (t) { slug[String(t.id)] = t.slug; });

    chon = {
      slug: slug,
      vocab: [{ v: '', t: 'Tất cả chủ đề' }].concat(
        (ts || []).map(function (t) { return { v: String(t.id), t: t.name_vi }; })),
      part5: [{ v: '', t: 'Tất cả các dạng' }].concat(
        (tags || []).filter(function (x) { return x.part === 5; })
                    .map(function (x) { return { v: x.tag, t: x.tag }; })),
      listen: [
        { v: '',  t: 'Part 1 đến 4' },
        { v: '1', t: 'Part 1 — Mô tả tranh' },
        { v: '2', t: 'Part 2 — Hỏi đáp' },
        { v: '3', t: 'Part 3 — Hội thoại ngắn' },
        { v: '4', t: 'Part 4 — Bài nói ngắn' }
      ],
      read: [
        { v: '',  t: 'Part 6 và 7' },
        { v: '6', t: 'Part 6 — Điền vào đoạn văn' },
        { v: '7', t: 'Part 7 — Đọc hiểu' }
      ],
      mock: [{ v: '', t: 'Thi thử full test' }]
    };

    return chon;
  }

  // Tên việc tự đặt, để cô khỏi phải gõ
  function tenViec(kind, target, danh) {
    const ds = (chon && chon[kind]) || [];
    const o = ds.find(function (x) { return x.v === (target || ''); });
    const duoi = o ? o.t : (target || '');
    if (kind === 'mock') return 'Thi thử full test';
    if (kind === 'vocab') return 'Từ vựng · ' + duoi;
    if (kind === 'part5') return 'Part 5 · ' + duoi;
    return KIND[kind] + ' ' + duoi;
  }

  // ---------- đường dẫn tới đúng bài ----------
  // Bấm vào việc là đi thẳng tới chỗ làm, không phải tự mò trong menu.

  function duongDan(kind, target) {
    if (kind === 'vocab') {
      const s = chon && chon.slug[String(target)];
      return s ? 'topic.html?chu-de=' + encodeURIComponent(s) : 'vocab.html';
    }
    if (kind === 'part5') {
      return target
        ? 'practice.html?part=5&dang=' + encodeURIComponent(target)
        : 'part5.html?tab=5';
    }
    if (kind === 'listen') {
      return target ? 'listen-practice.html?part=' + target : 'listen.html';
    }
    if (kind === 'read') {
      return 'practice.html?part=' + (target || '6');
    }
    return 'fulltest.html';
  }

  // ---------- vẽ ----------

  function phanTram(lam, can) {
    if (!can) return 0;
    return Math.min(100, Math.round((lam / can) * 100));
  }

  function thanh(pct, xong) {
    return '<span class="lt-thanh' + (xong ? ' xong' : '') + '">' +
             '<span style="width:' + pct + '%"></span></span>';
  }

  // Một việc: tên, thanh tiến độ, số đã làm trên số cần
  function veViec(v, choBam) {
    const pct = phanTram(v.lam, v.amount);
    const xong = v.lam >= v.amount;
    const dv = DON_VI[v.kind] || '';

    const ten = choBam
      ? '<a href="' + duongDan(v.kind, v.target) + '">' + esc(v.label) + '</a>'
      : esc(v.label);

    return '<div class="lt-viec' + (xong ? ' xong' : '') + '">' +
      '<span class="lt-ten">' + ten +
        (v.rieng ? '<span class="lt-rieng" title="' +
           esc(v.ly_do || 'cô lồng thêm cho riêng em này') + '">lồng thêm</span>' : '') +
      '</span>' +
      thanh(pct, xong) +
      '<span class="lt-so">' + v.lam + '/' + v.amount + ' ' + dv + '</span>' +
    '</div>';
  }

  // Một tuần
  function veTuan(t, tuanNay, choBam) {
    const tong = t.viec.reduce(function (s, v) { return s + v.amount; }, 0);
    const lam  = t.viec.reduce(function (s, v) { return s + Math.min(v.lam, v.amount); }, 0);
    const pct  = phanTram(lam, tong);

    const trangThai = t.tuan < tuanNay ? 'qua' : (t.tuan === tuanNay ? 'nay' : 'sau');
    const nhan = { qua: 'đã qua', nay: 'tuần này', sau: 'sắp tới' }[trangThai];

    return '<div class="lt-tuan ' + trangThai + '" data-tuan="' + t.tuan + '">' +
      '<div class="lt-dau">' +
        '<b>Tuần ' + t.tuan + ' · ' + esc(t.tieu_de) + '</b>' +
        '<span class="lt-nhan ' + trangThai + '">' + nhan + '</span>' +
        '<span class="lt-ngay">' + ngayVN(t.tu) + ' – ' + ngayVN(t.den) + '</span>' +
        '<span class="lt-pct">' + pct + '%</span>' +
      '</div>' +
      (t.ghi_chu ? '<p class="lt-ghi">' + esc(t.ghi_chu) + '</p>' : '') +
      (t.viec.length
        ? t.viec.map(function (v) { return veViec(v, choBam); }).join('')
        : '<p class="lt-trong">Tuần này chưa có việc nào.</p>') +
    '</div>';
  }

  function ngayVN(d) {
    const x = String(d || '').split('-');
    return x.length === 3 ? x[2] + '/' + x[1] : d;
  }

  // ---------- em có theo đều không ----------
  // Đếm số NGÀY có học, không đếm số bài. Làm dồn một hôm rồi nghỉ
  // cả tuần thì không gọi là theo lộ trình được.

  function veDeu(deu, can) {
    if (!deu) return '';

    const tuan = deu.tuan || [];
    const nay = tuan.length ? tuan[tuan.length - 1].so_ngay : 0;
    const truoc = tuan.length > 1 ? tuan[tuan.length - 2].so_ngay : 0;

    const cot = tuan.map(function (w, i) {
      const cao = Math.max(6, Math.round((w.so_ngay / 7) * 46));
      const du = w.so_ngay >= can;
      return '<span class="lt-cot' + (du ? ' du' : '') + (i === tuan.length - 1 ? ' nay' : '') +
        '" style="height:' + cao + 'px" title="Tuần từ ' + ngayVN(w.tu) + ': học ' +
        w.so_ngay + ' ngày"></span>';
    }).join('');

    let loi;
    if (!deu.gan_nhat) loi = 'Em này chưa học buổi nào.';
    else if (deu.ngay_7 === 0) loi = 'Bảy ngày nay chưa vào học. Lần gần nhất: ' + ngayVN(deu.gan_nhat) + '.';
    else if (nay >= can) loi = 'Tuần này đã đủ nhịp.';
    else if (nay > truoc) loi = 'Chưa đủ nhịp nhưng đang khá hơn tuần trước.';
    else if (nay < truoc) loi = 'Đang thưa dần so với tuần trước.';
    else loi = 'Chưa đủ nhịp tuần này.';

    return '<div class="lt-deu">' +
      '<div class="lt-deu-so">' +
        o(deu.ngay_7, '/7', 'ngày gần đây', deu.ngay_7 >= Math.round(can)) +
        o(deu.ngay_30, '/30', 'trong tháng', deu.ngay_30 >= can * 4) +
        o(can, ' ngày', 'nhịp cô đặt', true) +
      '</div>' +
      '<div class="lt-bieu">' + cot + '</div>' +
      '<p class="lt-deu-loi">' + esc(loi) + ' Cột là 8 tuần gần nhất, cột xanh là tuần đủ nhịp.</p>' +
    '</div>';
  }

  function o(so, duoi, nhan, dat) {
    return '<div class="lt-o' + (dat ? ' dat' : '') + '">' +
      '<b>' + so + '<small>' + duoi + '</small></b><span>' + nhan + '</span></div>';
  }

  // ---------- gọi máy chủ ----------

  async function tienDo(hvltId) {
    const { data, error } = await db.rpc('lo_trinh_tien_do', { p_hv_lt: hvltId });
    if (error) throw error;
    return data;
  }

  async function cuaEm(sid) {
    const { data } = await db.from('hoc_vien_lo_trinh')
      .select('id, lo_trinh_id, bat_dau, buoi_moi_tuan, ghi_chu, is_active, lo_trinh(ten, mo_ta, ky_nang, so_tuan, muc_tieu)')
      .eq('student_id', sid).eq('is_active', true)
      .order('created_at', { ascending: false });
    return data || [];
  }

  return {
    KIND: KIND, DON_VI: DON_VI,
    napChon: napChon, chon: function () { return chon; },
    tenViec: tenViec, duongDan: duongDan,
    veViec: veViec, veTuan: veTuan, veDeu: veDeu,
    phanTram: phanTram, ngayVN: ngayVN,
    tienDo: tienDo, cuaEm: cuaEm
  };
})();
