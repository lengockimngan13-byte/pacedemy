// ============================================================
// Pacedemy — thanh điều hướng dùng chung
// Máy tính: nằm ngang dưới tên thương hiệu.
// Điện thoại: cố định dưới đáy màn hình cho dễ bấm bằng ngón cái.
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
    { href: 'leaderboard.html', label: 'Xếp hạng',
      icon: '<path d="M4 20h4v-7H4zm6 0h4V4h-4zm6 0h4V9h-4z"/>' },
    { href: 'account.html',     label: 'Tài khoản',
      icon: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"/>' }
  ];

  const here = (location.pathname.split('/').pop() || 'app.html').toLowerCase();

  // Trang con vẫn sáng đúng mục cha
  const parent = {
    'topic.html': 'vocab.html',
    'flashcard.html': 'vocab.html',
    'study.html': 'vocab.html',
    'practice.html': 'part5.html',
    'listen-practice.html': 'listen.html'
  };
  const active = parent[here] || here;

  let html = '<nav class="mainnav" aria-label="Điều hướng chính"><div class="wrap mainnav-in">';

  for (const it of ITEMS) {
    const on = (it.href === active);
    html +=
      '<a class="navlink' + (on ? ' on' : '') + '" href="' + it.href + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + it.icon + '</svg>' +
        '<span>' + it.label + '</span>' +
      '</a>';
  }

  html += '</div></nav>';

  const bar = document.querySelector('.app-bar');
  if (bar) bar.insertAdjacentHTML('afterend', html);
  else document.body.insertAdjacentHTML('afterbegin', html);

  document.body.classList.add('has-nav');

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

      const link = document.querySelector('.navlink[href="leaderboard.html"]');
      if (!link) return;

      link.setAttribute('href', 'class.html');
      link.querySelector('span').textContent = 'Lớp học';
      link.querySelector('svg').innerHTML =
        '<path d="M12 3 2 8l10 5 8-4v6h2V8zM6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5l-6 3z"/>';

      const here = (location.pathname.split('/').pop() || '').toLowerCase();
      if (here === 'class.html') {
        document.querySelectorAll('.navlink.on').forEach(function (a) {
          a.classList.remove('on');
          a.removeAttribute('aria-current');
        });
        link.classList.add('on');
        link.setAttribute('aria-current', 'page');
      }
    } catch (e) { /* lỗi mạng thì để nguyên thanh menu */ }
  })();
})();
