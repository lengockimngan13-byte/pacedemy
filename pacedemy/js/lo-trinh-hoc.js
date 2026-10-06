// ============================================================
// Pacedemy — lộ trình, phía học viên
//
// Hiện ngay trên trang học: tuần này cô giao gì, còn thiếu bao nhiêu,
// bấm vào là đi thẳng tới chỗ làm.
//
// Chỉ hiện tuần đang học, không trải cả tám tuần ra: em mở trang để
// bắt tay vào làm, không phải để đọc kế hoạch. Muốn xem cả lộ trình
// thì bấm mở phần bên dưới.
//
// Không có lộ trình thì khối này không hiện gì cả, trang y như cũ.
// ============================================================

(async function () {
  const box = document.getElementById('lo-trinh-box');
  if (!box || typeof LoTrinh === 'undefined') return;

  let me;
  try {
    const { data } = await db.auth.getUser();
    me = data && data.user;
  } catch (e) { return; }
  if (!me) return;

  let ds;
  try { ds = await LoTrinh.cuaEm(me.id); } catch (e) { return; }
  if (!ds || !ds.length) return;

  await LoTrinh.napChon();

  let html = '';

  for (const t of ds) {
    let d;
    try { d = await LoTrinh.tienDo(t.id); } catch (e) { continue; }
    if (!d) continue;

    const nay = (d.tuan || []).find(function (x) { return x.tuan === d.tuan_nay; });
    if (!nay) continue;

    const can = nay.viec.reduce(function (s, v) { return s + v.amount; }, 0);
    const lam = nay.viec.reduce(function (s, v) { return s + Math.min(v.lam, v.amount); }, 0);
    const pct = LoTrinh.phanTram(lam, can);

    html += '<section class="tbox lt-hoc">' +
      '<div class="lt-soan-dau">' +
        '<h3 style="margin:0">Lộ trình của bạn · ' + esc(d.ten) + '</h3>' +
        '<span class="lt-nhan nay">tuần ' + d.tuan_nay + '/' + d.so_tuan + '</span>' +
      '</div>' +

      '<p class="lt-hoc-loi">' + loiNhan(pct, d) + '</p>' +

      LoTrinh.veTuan(nay, d.tuan_nay, true) +

      '<details class="lt-xem"><summary>Xem cả lộ trình ' + d.so_tuan + ' tuần</summary>' +
        (d.tuan || []).map(function (w) {
          return LoTrinh.veTuan(w, d.tuan_nay, true);
        }).join('') +
      '</details>' +
    '</section>';
  }

  box.innerHTML = html;

  function loiNhan(pct, d) {
    const deu = d.deu || {};
    const can = d.buoi_moi_tuan || 5;
    const tuan = deu.tuan || [];
    const soNgay = tuan.length ? tuan[tuan.length - 1].so_ngay : 0;

    if (pct >= 100) return 'Tuần này xong hết rồi. Làm thêm được thì càng tốt.';
    if (!deu.hom_nay) return 'Hôm nay chưa học buổi nào. Tuần này mới xong ' + pct + '%.';
    if (soNgay < can) return 'Tuần này đã học ' + soNgay + '/' + can +
      ' buổi, bài vở xong ' + pct + '%.';
    return 'Đã đủ nhịp tuần này. Bài vở xong ' + pct + '%.';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
