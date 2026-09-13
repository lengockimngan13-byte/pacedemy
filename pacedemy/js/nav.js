// ============================================================
// Pacedemy — thanh menu bên trái cho học viên
// Máy tính: cố định bên trái, luôn hiện.
// Điện thoại: thu gọn thành nút mở, trượt ra khi bấm.
// ============================================================

(function () {
  const ITEMS = [
    { href: 'app.html',         label: 'Trang học',
      icon: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
    { href: 'vocab.html',       label: 'Từ vựng',
      icon: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zm16 0h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>' },
    { href: 'listen.html',      label: 'Luyện nghe',
      icon: '<path d="M12 3a8 8 0 0 0-8 8v6a2 2 0 0 0 2 2h2v-7H6v-1a6 6 0 0 1 12 0v1h-2v7h2a2 2 0 0 0 2-2v-6a8 8 0 0 0-8-8z"/>' },
    { href: 'part5.html',       label: 'Luyện đọc',
      icon: '<path d="M5 3h11l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 9h8v2H8zm0 4h6v2H8z"/>' },
    { href: 'read.html',        label: 'Part 6 và 7',
      icon: '<path d="M4 5h8v15H4zm16 0h-8v15h8z"/>' },
    { href: 'fulltest.html',    label: 'Thi thử',
      icon: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/>' },
    { href: 'leaderboard.html', label: 'Xếp hạng',
      icon: '<path d="M4 20h4v-7H4zm6 0h4V4h-4zm6 0h4V9h-4z"/>' },
    { href: 'account.html',     label: 'Tài khoản',
      icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"/>' }
  ];

  // So khớp không phân biệt có hay không đuôi .html
  const strip = function (s) {
    return (s || '').toLowerCase().replace(/\.html$/, '').replace(/^\//, '');
  };
  const here = strip(location.pathname.split('/').pop() || 'app.html');

  // Trang con vẫn sáng đúng mục cha
  const parent = {
    'topic': 'vocab', 'flashcard': 'vocab', 'study': 'vocab',
    'practice': 'part5', 'listen-practice': 'listen'
  };
  const active = parent[here] || here;

  let html =
    '<button class="side-toggle" id="u-toggle" aria-label="Mở menu">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
    '</button>' +
    '<div class="side-veil" id="u-veil"></div>' +
    '<nav class="side-nav" id="u-nav" aria-label="Điều hướng chính">' +
      '<a class="side-brand" href="app.html">Pac<span class="brand-e">e</span>demy</a>' +
      '<div class="side-links">';

  for (const it of ITEMS) {
    const on = strip(it.href) === active;
    html +=
      '<a class="side-link' + (on ? ' on' : '') + '" href="' + it.href + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + it.icon + '</svg>' +
        '<span>' + it.label + '</span>' +
      '</a>';
  }

  html += '</div></nav>';

  document.body.insertAdjacentHTML('afterbegin', html);
  document.body.classList.add('has-side-nav', 'side-nav-user');

  const nav = document.getElementById('u-nav');
  const veil = document.getElementById('u-veil');

  document.getElementById('u-toggle').addEventListener('click', function () {
    nav.classList.toggle('open');
    veil.classList.toggle('open');
  });
  veil.addEventListener('click', function () {
    nav.classList.remove('open');
    veil.classList.remove('open');
  });

  // Học viên đã được duyệt vào lớp thì mục Xếp hạng đổi thành Lớp học.
  // Bảng xếp hạng chung vẫn xem được từ bên trong trang lớp.
  (async function () {
    try {
      if (typeof db === 'undefined') return;

      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      const { data: mem } = await db
        .from('class_members').select('class_id')
        .eq('student_id', user.id).eq('status', 'active').limit(1);

      if (!mem || !mem.length) return;

      const link = document.querySelector('.side-link[href="leaderboard.html"]');
      if (!link) return;

      link.setAttribute('href', 'class.html');
      link.querySelector('span').textContent = 'Lớp học';
      link.querySelector('svg').innerHTML =
        '<path d="M12 3 2 8l10 5 8-4v6h2V8zM6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5l-6 3z"/>';

      if (here === 'class') {
        document.querySelectorAll('.side-link.on').forEach(function (a) {
          a.classList.remove('on');
          a.removeAttribute('aria-current');
        });
        link.classList.add('on');
        link.setAttribute('aria-current', 'page');
      }
    } catch (e) { /* lỗi mạng thì để nguyên thanh menu */ }
  })();
})();
