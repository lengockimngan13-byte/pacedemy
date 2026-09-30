// ============================================================
// Pacedemy — thanh tiến độ dùng chung cho các trang làm bài
//
// Thay cho thanh cũ chỉ có một vạch chạy. Ở đây học viên thấy rõ
// đang ở câu mấy, còn mấy câu, và những câu đã làm đúng sai ra sao.
//
// Cách dùng:
//   QuizProgress.draw({
//     at: 0,                  // chỉ số câu đang làm, đếm từ 0
//     total: 10,              // tổng số câu
//     marks: ['ok','no'],     // kết quả từng câu đã làm, thiếu thì coi như chưa làm
//     onJump: function (i) {} // bỏ qua nếu không cho nhảy câu
//   });
//
// Trang nào có sẵn #counter và #progress thì tự nhận, không cần sửa HTML.
// ============================================================

const QuizProgress = (function () {

  // Nhiều câu quá thì vẽ từng ô sẽ mảnh như sợi chỉ, lúc đó quay về thanh liền
  const MAX_O = 40;

  function el(id) { return document.getElementById(id); }

  function draw(opts) {
    const at = opts.at || 0;
    const total = opts.total || 0;
    const marks = opts.marks || [];
    if (!total) return;

    const daLam = marks.filter(function (m) { return m; }).length;
    const dung = marks.filter(function (m) { return m === 'ok'; }).length;
    const conLai = total - at - 1;

    // ---------- Dòng chữ ----------
    const dem = el('counter');
    if (dem) {
      dem.innerHTML =
        '<b>Câu ' + (at + 1) + '</b> / ' + total +
        '<span class="qp-left">' +
          (conLai > 0 ? ' · còn ' + conLai + ' câu' : ' · câu cuối') +
        '</span>' +
        (daLam ? '<span class="qp-score"> · đúng ' + dung + '/' + daLam + '</span>' : '');
    }

    // ---------- Thanh ----------
    // Bám vào khung .study-bar chứ không bám vào thẻ #progress, vì thẻ đó
    // bị thay khi chuyển sang kiểu chia ô, bám vào nó sẽ mất dấu.
    const cu = el('progress');
    const khung = cu ? cu.parentElement : document.querySelector('.study-bar');
    if (!khung) return;

    if (total > MAX_O) {
      // Bài dài thì ô sẽ mảnh như sợi chỉ, quay về thanh liền cho dễ nhìn
      khung.classList.remove('qp-o');
      let thanh = el('progress');
      if (!thanh) {
        khung.innerHTML = '<span id="progress"></span>';
        thanh = el('progress');
      }
      thanh.style.width = Math.round((at + 1) / total * 100) + '%';
      return;
    }

    khung.classList.add('qp-o');

    // Vẽ lại từ đầu khi số ô đổi, còn lại chỉ đổi lớp cho đỡ giật
    if (khung.querySelectorAll('.qp-item').length !== total) {
      let html = '';
      for (let i = 0; i < total; i++) {
        html += '<span class="qp-item" data-i="' + i + '"></span>';
      }
      khung.innerHTML = html;

      if (opts.onJump) {
        khung.querySelectorAll('.qp-item').forEach(function (o) {
          o.classList.add('is-click');
          o.addEventListener('click', function () { opts.onJump(+o.dataset.i); });
        });
      }
    }

    khung.querySelectorAll('.qp-item').forEach(function (o, i) {
      o.className = 'qp-item' +
        (opts.onJump ? ' is-click' : '') +
        (marks[i] === 'ok' ? ' is-ok' : '') +
        (marks[i] === 'no' ? ' is-no' : '') +
        (i === at ? ' is-now' : '');
      o.title = 'Câu ' + (i + 1) +
        (marks[i] === 'ok' ? ' · đúng' : (marks[i] === 'no' ? ' · sai' : ' · chưa làm'));
    });
  }

  return { draw: draw };
})();
