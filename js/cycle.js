// Vòng lặp Learn → Practice → Review → Repeat
// Đánh dấu lần lượt từng nhịp. Tôn trọng thiết lập giảm chuyển động của người dùng.

(function () {
  const cycle = document.getElementById('cycle');
  if (!cycle) return;

  const beats = cycle.querySelectorAll('.beat');
  if (!beats.length) return;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) return;

  let i = 0;
  setInterval(function () {
    beats[i].classList.remove('on');
    i = (i + 1) % beats.length;
    beats[i].classList.add('on');
  }, 1500);
})();
