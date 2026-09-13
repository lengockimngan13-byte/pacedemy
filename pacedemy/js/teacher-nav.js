// ============================================================
// Pacedemy — thanh menu bên trái cho Teacher Studio
// Máy tính: cố định bên trái, luôn hiện.
// Điện thoại: thu gọn thành nút mở, trượt ra khi bấm.
// ============================================================

(function () {
  const ITEMS = [
    { href: 'teacher.html',       label: 'Teacher Studio',
      icon: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
    { href: 'teacher-class.html', label: 'Lớp học',
      icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9c0-3 3-5 7-5s7 2 7 5"/>' },
    { href: 'teacher-exam.html',  label: 'Bộ đề thi thử',
      icon: '<path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm2 5h10M7 12h10M7 16h6"/>' },
    { href: 'teacher-vocab.html',   label: 'Nhập từ vựng',
      icon: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zm16 0h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>' },
    { href: 'teacher-import.html',  label: 'Nhập đề Part 5',
      icon: '<path d="M5 3h11l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 9h8v2H8zm0 4h6v2H8z"/>' },
    { href: 'teacher-reading.html', label: 'Nhập đề Part 6-7',
      icon: '<path d="M4 5h8v15H4zm16 0h-8v15h8z"/>' },
    { href: 'teacher-listen.html',  label: 'Nhập bài nghe',
      icon: '<path d="M12 3a8 8 0 0 0-8 8v6a2 2 0 0 0 2 2h2v-7H6v-1a6 6 0 0 1 12 0v1h-2v7h2a2 2 0 0 0 2-2v-6a8 8 0 0 0-8-8z"/>' }
  ];

  // So khớp không phân biệt có hay không đuôi .html, phòng khi
  // máy chủ phục vụ đường dẫn sạch kiểu /teacher thay vì /teacher.html.
  const strip = function (s) { return (s || '').toLowerCase().replace(/\.html$/, '').replace(/^\//, ''); };
  const here = strip(location.pathname.split('/').pop());

  let html =
    '<button class="side-toggle" id="side-toggle" aria-label="Mở menu">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
    '</button>' +
    '<div class="side-veil" id="side-veil"></div>' +
    '<nav class="side-nav" id="side-nav" aria-label="Điều hướng Teacher Studio">' +
      '<a class="side-brand" href="app.html">Pac<span class="brand-e">e</span>demy</a>' +
      '<div class="side-links">';

  for (const it of ITEMS) {
    const on = strip(it.href) === here;
    html +=
      '<a class="side-link' + (on ? ' on' : '') + '" href="' + it.href + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round">' + it.icon + '</svg>' +
        '<span>' + it.label + '</span>' +
      '</a>';
  }

  html +=
      '</div>' +
      '<div class="side-foot">' +
        '<a class="side-back" href="app.html">← Về trang học</a>' +
        '<button class="side-back" id="side-logout" type="button">Đăng xuất</button>' +
      '</div>' +
    '</nav>';

  document.body.insertAdjacentHTML('afterbegin', html);
  document.body.classList.add('has-side-nav');

  const nav = document.getElementById('side-nav');
  const veil = document.getElementById('side-veil');
  const toggle = document.getElementById('side-toggle');

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    veil.classList.toggle('open');
  });
  function close() {
    nav.classList.remove('open');
    veil.classList.remove('open');
  }

  veil.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  document.getElementById('side-logout').addEventListener('click', async function () {
    if (typeof db === 'undefined') { location.replace('index.html'); return; }
    await db.auth.signOut();
    location.replace('index.html');
  });
})();
