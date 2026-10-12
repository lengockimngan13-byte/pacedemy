// ============================================================
// Pacedemy — bộ đề có tên, dùng chung
//
// Một "đề" ở đây là một số (test_no) cộng một cái tên. Số thì ba bảng
// questions, reading_sets, listening_sets đã lưu sẵn từ trước; tên nằm
// ở bảng bo_de. Tách ra như vậy để bài đã gán số mà chưa đặt tên đề
// vẫn dùng được bình thường.
//
// Dùng:
//   await BoDe.tai();                  // tải một lần, nhớ lại cho cả trang
//   BoDe.ten(3)                        // → 'ETS 2024 · Test 3'  hoặc 'Đề 3'
//   BoDe.nhan(3)                       // → 'Đề 3 · ETS 2024 · Test 3'
//   BoDe.danhSach()                    // → [{ so, ten, ghi_chu }]
//   BoDe.doOSelect(el, soDangChon)     // điền <select> các đề
//   await BoDe.datTen(3, 'ETS 2024')   // → lỗi hoặc null
// ============================================================

const BoDe = (function () {

  let list = [];
  let daTai = false;

  async function tai(batBuoc) {
    if (daTai && !batBuoc) return list;
    const { data } = await db.from('bo_de').select('so, ten, ghi_chu').order('so');
    list = data || [];
    daTai = true;
    return list;
  }

  function tim(so) {
    if (so == null || so === '') return null;
    const n = parseInt(so, 10);
    for (const d of list) if (d.so === n) return d;
    return null;
  }

  // Tên cô đặt; chưa đặt thì gọi tạm theo số cho khỏi trống trơn
  function ten(so) {
    const d = tim(so);
    if (d && d.ten) return d.ten;
    return so == null || so === '' ? 'Chưa xếp đề' : 'Đề ' + so;
  }

  // Nhãn đầy đủ cho chỗ cần thấy cả số: "Đề 3 · ETS 2024"
  function nhan(so) {
    if (so == null || so === '') return 'Chưa xếp đề';
    const d = tim(so);
    const t = d && d.ten ? d.ten : '';
    // Tên cô đặt mà đã chứa sẵn số thì không nhắc lại số nữa
    if (t && t.indexOf(String(so)) >= 0) return t;
    return 'Đề ' + so + (t ? ' · ' + t : '');
  }

  function danhSach() { return list.slice(); }

  // Điền các đề vào một <select>. Giữ nguyên các <option> đã có sẵn
  // trong HTML (thường là dòng "Tất cả" hay "Chưa xếp đề") rồi thêm
  // tiếp phía dưới.
  function doOSelect(el, soDangChon, opt) {
    if (!el) return;
    opt = opt || {};

    const giu = opt.giuOptionDau == null ? true : opt.giuOptionDau;
    const dauTien = giu ? Array.from(el.querySelectorAll('option')).slice(0, 1) : [];

    el.innerHTML = '';
    dauTien.forEach(function (o) { el.appendChild(o); });

    list.forEach(function (d) {
      const o = document.createElement('option');
      o.value = String(d.so);
      o.textContent = nhan(d.so);
      el.appendChild(o);
    });

    if (soDangChon != null && soDangChon !== '') {
      // Số này chưa có trong bảng tên thì vẫn phải chọn được
      if (!tim(soDangChon)) {
        const o = document.createElement('option');
        o.value = String(soDangChon);
        o.textContent = 'Đề ' + soDangChon;
        el.appendChild(o);
      }
      el.value = String(soDangChon);
    }
  }

  async function datTen(so, tenMoi, ghiChu) {
    const n = parseInt(so, 10);
    if (isNaN(n) || n < 1) return { error: { message: 'Số đề phải là số nguyên từ 1 trở lên.' } };

    const t = String(tenMoi || '').trim();
    if (!t) return { error: { message: 'Đề cần có tên.' } };

    const { error } = await db.from('bo_de')
      .upsert({ so: n, ten: t, ghi_chu: (ghiChu || '').trim() || null }, { onConflict: 'so' });

    if (error) return { error: error };

    await tai(true);
    return { error: null };
  }

  return {
    tai: tai, ten: ten, nhan: nhan, danhSach: danhSach,
    doOSelect: doOSelect, datTen: datTen
  };
})();
