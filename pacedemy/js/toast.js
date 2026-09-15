// ============================================================
// Pacedemy — thông báo nổi (toast) dùng chung cho mọi trang.
// Gọi toast('Đã lưu.') cho thành công, toast('Lỗi...', 'bad')
// cho thất bại. Luôn hiện cố định trên màn hình, không phụ thuộc
// vị trí cuộn trang.
// ============================================================

let _paceToastTimer = null;

function toast(message, kind) {
  let box = document.getElementById('pace-toast');

  if (!box) {
    box = document.createElement('div');
    box.id = 'pace-toast';
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.className = 'pace-toast ' + (kind === 'bad' ? 'pace-toast-bad' : 'pace-toast-good') + ' show';

  clearTimeout(_paceToastTimer);
  _paceToastTimer = setTimeout(function () {
    box.classList.remove('show');
  }, 3200);
}
