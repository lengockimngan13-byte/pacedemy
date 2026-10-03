// ============================================================
// Pacedemy — màn hoàn thành bài học, dùng chung cho mọi phần luyện
//
// Gắn vào đầu khối #view-done sẵn có của từng trang. Tự ẩn ba dòng
// tiêu đề cũ (done-title, done-score, done-sub) rồi vẽ lại cho đẹp,
// còn hàng nút của trang thì giữ nguyên vì mỗi trang đi một nẻo khác.
//
//   XongBai.ve($('view-done'), {
//     dung: 8, tong: 10,
//     xp: 8,                      // bỏ qua nếu không có
//     giay: 240,                  // bỏ qua nếu không đếm giờ
//     ten: 'Part 5 · Cụm động từ',
//     xemLai: 'wrong-box'         // id khối chữa bài, có thì hiện nút Xem lại
//   });
// ============================================================

const XongBai = (function () {

  // Lời khen theo tỉ lệ đúng. Dưới trung bình thì nói thật nhưng không dìm.
  const BAC = [
    { tu: 1,    ten: 'Đúng hết luôn!',        loi: 'Không trượt câu nào. Giữ phong độ này nhé.' },
    { tu: 0.9,  ten: 'Tuyệt vời!',            loi: 'Gần như trọn vẹn. Xem lại vài câu lỡ tay là xong.' },
    { tu: 0.7,  ten: 'Làm tốt lắm.',          loi: 'Qua được mức này là nền đã chắc. Mấy câu sai đáng xem kỹ.' },
    { tu: 0.5,  ten: 'Xong bài rồi.',         loi: 'Quá nửa rồi. Xem lại câu sai là lần sau khác ngay.' },
    { tu: 0,    ten: 'Sai ở đâu, học ở đó.',  loi: 'Bài này khó với bạn, nhưng đúng mấy câu vừa sai mới là phần học được nhiều nhất.' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Gọn thôi, ô số liệu hẹp: dưới một phút thì tính giây, trên thì làm tròn phút
  function phut(giay) {
    const g = Math.max(0, Math.round(giay || 0));
    if (g < 60) return g + ' giây';
    return Math.round(g / 60) + ' phút';
  }

  // Thỏ Pacedemy giơ tay ăn mừng, kèm mấy mảnh giấy màu bay quanh
  function veTho(vui) {
    const bay = vui
      ? ['#F0A830', '#2A7F76', '#F0A830', '#C9D8D3', '#2A7F76', '#F0A830']
      : ['#C9D8D3', '#C9D8D3', '#E7EDE9'];

    const giay = bay.map(function (mau, i) {
      const x = 18 + i * 28 + (i % 2 ? 8 : 0);
      const y = 10 + (i % 3) * 16;
      const xoay = (i * 47) % 90 - 45;
      return '<rect x="' + x + '" y="' + y + '" width="7" height="11" rx="1.5" fill="' + mau +
             '" transform="rotate(' + xoay + ' ' + (x + 3) + ' ' + (y + 5) + ')" opacity="0.9"/>';
    }).join('');

    return '<svg class="xb-hinh" viewBox="0 0 200 172" role="img" ' +
             'aria-label="Thỏ Pacedemy giơ tay ăn mừng">' +
             giay + Tho.mung(100, 158, 1.2) +
           '</svg>';
  }

  function o(nhan, giaTri, lon) {
    return '<div class="xb-o' + (lon ? ' xb-o-lon' : '') + '">' +
             '<span class="xb-nhan">' + esc(nhan) + '</span>' +
             '<b>' + esc(giaTri) + '</b>' +
           '</div>';
  }

  function ve(root, opts) {
    if (!root) return;
    opts = opts || {};

    const tong = opts.tong || 0;
    const dung = opts.dung || 0;
    const ty = tong ? dung / tong : 0;
    const bac = BAC.find(function (b) { return ty >= b.tu; }) || BAC[BAC.length - 1];
    const vui = ty >= 0.7;

    // Ba dòng cũ của trang nhường chỗ cho khối này
    ['done-title', 'done-score', 'done-sub'].forEach(function (id) {
      const e = document.getElementById(id);
      if (e) e.classList.add('hidden');
    });

    let cu = document.getElementById('xb');
    if (!cu) {
      cu = document.createElement('div');
      cu.id = 'xb';
      root.insertBefore(cu, root.firstChild);
    }

    const khoiXem = opts.xemLai ? document.getElementById(opts.xemLai) : null;
    const coXem = !!(khoiXem && khoiXem.innerHTML.trim());

    cu.innerHTML =
      '<div class="xb' + (vui ? ' xb-vui' : '') + '">' +
        veTho(vui) +
        (opts.ten ? '<p class="xb-ten">' + esc(opts.ten) + '</p>' : '') +
        '<h2 class="xb-tieu">' + esc(bac.ten) + '</h2>' +
        '<p class="xb-loi">' + esc(bac.loi) + '</p>' +

        '<div class="xb-os">' +
          o('Câu đúng', dung + '/' + tong, true) +
          o('Tỉ lệ đúng', Math.round(ty * 100) + '%') +
          (opts.xp != null ? o('Điểm KN', '+' + opts.xp) : '') +
          (opts.giay != null ? o('Thời gian', phut(opts.giay)) : '') +
        '</div>' +

        (coXem
          ? '<button class="btn btn-line xb-xem" type="button" id="xb-xem">Xem lại bài học</button>'
          : '') +
      '</div>';

    if (coXem) {
      khoiXem.classList.add('xb-an');

      const nut = document.getElementById('xb-xem');
      nut.addEventListener('click', function () {
        const dangAn = khoiXem.classList.toggle('xb-an');
        nut.textContent = dangAn ? 'Xem lại bài học' : 'Ẩn phần xem lại';
        if (!dangAn) khoiXem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }

  return { ve: ve, phut: phut };
})();
