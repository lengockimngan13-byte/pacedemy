// ============================================================
// Pacedemy — gom các thẻ tiến độ trên trang học thành một thẻ có tab
//
// Trang học trước đây xếp bốn thẻ lớn cạnh nhau: trí nhớ, chuỗi ngày,
// thống kê, mục tiêu. Cả bốn cùng trả lời một câu hỏi nên gom lại,
// mỗi cái thành một tab.
//
// Các file cũ (forget-curve.js, app.js) vẫn đổ nội dung vào đúng id
// như trước, file này chỉ lo phần khung và chuyển tab.
// ============================================================

(function () {
  const khung = document.getElementById('tiendo');
  if (!khung) return;

  // kiem: khối dùng để biết đã có số liệu hay chưa. Khung thống kê luôn
  // chứa sẵn mấy nút lọc nên phải soi vào lưới số bên trong, không soi cả khung.
  const TABS = [
    { id: 'curve-box',      ten: 'Trí nhớ' },
    { id: 'streak-box',     ten: 'Chuỗi ngày' },
    { id: 'tstats-section', ten: 'Thống kê', kiem: 'tstats-grid' },
    { id: 'goal-box',       ten: 'Mục tiêu' }
  ];

  const thanh = document.getElementById('tiendo-tabs');
  let dangMo = null;

  // Khối nào chưa có nội dung thì chưa hiện tab của nó
  function coND(t) {
    const e = document.getElementById(t.kiem || t.id);
    return !!(e && e.innerHTML.trim());
  }

  function mo(id) {
    dangMo = id;
    TABS.forEach(function (t) {
      const e = document.getElementById(t.id);
      if (e) e.classList.toggle('td-an', t.id !== id);
    });
    thanh.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.id === id);
    });
    try { localStorage.setItem('pacedemy-tiendo', id); } catch (e) {}
  }

  function veTabs() {
    const co = TABS.filter(coND);

    if (!co.length) { khung.classList.add('td-an'); return; }
    khung.classList.remove('td-an');

    // Chỉ vẽ lại khi số tab đổi, tránh nhấp nháy
    if (thanh.querySelectorAll('button').length !== co.length) {
      thanh.innerHTML = co.map(function (t) {
        return '<button class="test-tab" data-id="' + t.id + '">' + t.ten + '</button>';
      }).join('');

      thanh.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { mo(b.dataset.id); });
      });
    }

    // Giữ tab lần trước học viên xem, không có thì lấy tab đầu
    let chon = dangMo;
    if (!chon || !co.some(function (t) { return t.id === chon; })) {
      let luu = null;
      try { luu = localStorage.getItem('pacedemy-tiendo'); } catch (e) {}
      chon = (luu && co.some(function (t) { return t.id === luu; })) ? luu : co[0].id;
    }
    mo(chon);
  }

  // Các khối được đổ nội dung sau khi gọi mạng xong, nên theo dõi
  // thay vì vẽ một lần rồi thôi.
  const theoDoi = new MutationObserver(veTabs);
  TABS.forEach(function (t) {
    const e = document.getElementById(t.id);
    if (e) theoDoi.observe(e, { childList: true, subtree: true });
  });

  veTabs();
})();
