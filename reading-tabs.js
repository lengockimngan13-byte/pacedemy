// ============================================================
// Pacedemy — chuyển tab Part 5 / 6 / 7 trên trang Luyện đọc
// ============================================================

(function () {
  const tabs = document.getElementById('read-tabs');
  if (!tabs) return;

  function open(p) {
    ['5', '6', '7'].forEach(function (n) {
      document.getElementById('panel-' + n).classList.toggle('hidden', n !== p);
    });
    tabs.querySelectorAll('button[data-tab]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tab === p);
    });

    if (p === '6' && typeof readingPanel6 !== 'undefined') readingPanel6.ensureLoaded();
    if (p === '7' && typeof readingPanel7 !== 'undefined') readingPanel7.ensureLoaded();
  }

  tabs.querySelectorAll('button[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () { open(b.dataset.tab); });
  });

  // Cho phép vào thẳng một tab qua đường dẫn, ví dụ part5.html?tab=6
  const wanted = new URLSearchParams(location.search).get('tab');
  if (wanted && ['5', '6', '7'].indexOf(wanted) !== -1) open(wanted);
})();
