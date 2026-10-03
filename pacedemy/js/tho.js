// ============================================================
// Pacedemy — thỏ linh vật, vẽ bằng SVG
//
// Dáng và màu theo đúng ảnh mẫu chị Ngân chọn: thỏ con lông be vàng,
// ngực và mõm trắng, người tròn mập, đầu to so với thân, tai ngắn và
// xoè ra hai bên, mặt hơi ngước lên nhìn người xem.
//
// Ba thứ giữ lại từ lần sửa trước, vì chúng mới là lý do hết "creepy":
//   - mỗi mắt có mí trên che một lát, không còn là hòn bi đen
//   - chấm sáng to trong mắt, chấm nhỏ đối diện
//   - miệng cười rõ và má ửng hồng
//
//   Tho.ngoi(x, y, co)   — ngồi, dùng trong các cảnh Thỏ hỏi
//   Tho.mung(x, y, co)   — ngồi, hai chân trước giơ lên ăn mừng
//   Tho.dung(...)        — tên cũ, vẫn chạy, gọi sang ngoi()
// ============================================================

const Tho = (function () {

  const HONG   = '#E7A39C';   // tai trong, mũi
  const NAU    = '#43332A';   // mắt và miệng, nâu ấm chứ không đen tuyền
  const VIEN   = '#C4A784';   // nét rất nhạt, chỉ để tách khỏi nền sáng
  const VIEN_T = '#DCD2C2';   // nét cho mảng trắng (ngực, mõm, chân)

  let demId = 0;

  function defs(p) {
    return '<defs>' +
      // Lông be vàng: sáng ở trên trái, nâu nhạt dần xuống dưới phải
      '<radialGradient id="' + p + 'long" cx="36%" cy="24%" r="88%">' +
        '<stop offset="0%" stop-color="#F3E2C8"/>' +
        '<stop offset="52%" stop-color="#E4CDA8"/>' +
        '<stop offset="100%" stop-color="#C6A77E"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + p + 'dau" cx="34%" cy="24%" r="86%">' +
        '<stop offset="0%" stop-color="#F7E8D1"/>' +
        '<stop offset="55%" stop-color="#E8D2AF"/>' +
        '<stop offset="100%" stop-color="#CBAC83"/>' +
      '</radialGradient>' +
      // Mảng trắng: ngực, mõm, bàn chân
      '<radialGradient id="' + p + 'trang" cx="38%" cy="26%" r="84%">' +
        '<stop offset="0%" stop-color="#FFFFFF"/>' +
        '<stop offset="60%" stop-color="#FDF8EF"/>' +
        '<stop offset="100%" stop-color="#EFE6D7"/>' +
      '</radialGradient>' +
      // Mắt có chút chuyển sắc cho ra vẻ ướt
      '<radialGradient id="' + p + 'mat" cx="34%" cy="28%" r="80%">' +
        '<stop offset="0%" stop-color="#60483A"/>' +
        '<stop offset="100%" stop-color="#2B201A"/>' +
      '</radialGradient>' +
      // Bóng mềm, dùng cho mặt tối và bóng dưới chân
      '<filter id="' + p + 'mo" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feGaussianBlur stdDeviation="3.2"/>' +
      '</filter>' +
      '<filter id="' + p + 'mo2" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feGaussianBlur stdDeviation="5"/>' +
      '</filter>' +
    '</defs>';
  }

  // Một bên tai. Thỏ con tai ngắn và xoè: bên trái hơi nghiêng vào,
  // bên phải ngả hẳn ra ngoài như trong ảnh.
  function tai(p, ben) {
    const x = 11 * ben;
    const xoay = ben < 0 ? -14 : 30;
    return '<g transform="rotate(' + xoay + ' ' + x + ' -64)">' +
      '<ellipse cx="' + x + '" cy="-83" rx="7.6" ry="19" ' +
        'fill="url(#' + p + 'long)" stroke="' + VIEN + '" stroke-width="0.8"/>' +
      '<ellipse cx="' + x + '" cy="-85" rx="3.8" ry="12.5" fill="' + HONG + '" opacity=".5"/>' +
      // mép trong hơi tối, cho tai có bề dày
      '<path d="M' + (x - 5.6) + ' -93 Q' + (x - 7.6) + ' -80 ' + (x - 4) + ' -68" ' +
        'stroke="#BE9F77" stroke-width="1.1" fill="none" opacity=".4" stroke-linecap="round"/>' +
    '</g>';
  }

  // Thân ngồi, tròn mập kiểu thỏ con, hai chân sau đưa ra trước
  function than(p) {
    return (
      // chân sau, bàn chân trắng
      '<ellipse cx="-14" cy="-4" rx="11" ry="5.4" fill="url(#' + p + 'trang)" ' +
        'stroke="' + VIEN_T + '" stroke-width="0.8"/>' +
      '<ellipse cx="14" cy="-4" rx="11" ry="5.4" fill="url(#' + p + 'trang)" ' +
        'stroke="' + VIEN_T + '" stroke-width="0.8"/>' +

      // thân: bề ngang gần bằng chiều cao, không còn thuôn dài
      '<path d="M-25 -22 C-25 -7 -15 -3 0 -3 C15 -3 25 -7 25 -22 ' +
        'C25 -40 17 -50 0 -50 C-17 -50 -25 -40 -25 -22 Z" ' +
        'fill="url(#' + p + 'long)" stroke="' + VIEN + '" stroke-width="0.8"/>' +

      // viền lông: vài mảng mờ loang ra khỏi mép thân, nhìn như lông tơ
      '<g filter="url(#' + p + 'mo)" opacity=".75">' +
        '<ellipse cx="-25" cy="-30" rx="4.2" ry="7" fill="#EDD8B6"/>' +
        '<ellipse cx="-24" cy="-14" rx="4.2" ry="6" fill="#EDD8B6"/>' +
        '<ellipse cx="25" cy="-32" rx="3.8" ry="7" fill="#D9BC94"/>' +
        '<ellipse cx="24" cy="-15" rx="3.8" ry="6" fill="#D9BC94"/>' +
      '</g>' +

      // mặt tối bên phải
      '<ellipse cx="18" cy="-22" rx="9" ry="17" fill="#B99871" opacity=".5" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // ngực trắng — mảng trắng này là nét đặc trưng của con thỏ trong ảnh
      '<ellipse cx="-1" cy="-17" rx="13.5" ry="14" fill="url(#' + p + 'trang)" ' +
        'filter="url(#' + p + 'mo)"/>' +
      '<ellipse cx="-2" cy="-19" rx="9" ry="10" fill="#FFFFFF" opacity=".85" ' +
        'filter="url(#' + p + 'mo)"/>'
    );
  }

  // Ba kiểu mắt. Kiểu nào cũng có mí trên và chấm sáng to, vì đó mới là
  // thứ làm mắt có hồn. Mắt thỏ con to hơn một chút so với bản trước.
  let kieuMat = 'hien';

  function mat(p) {
    const X = 7.2, Y = -64;

    if (kieuMat === 'cuoi') {
      // Mắt cười hình vòng cung, không bao giờ nhìn ra đờ đẫn
      return '<path d="M' + (-X - 4.4) + ' ' + (Y + 1) + ' Q' + (-X) + ' ' + (Y - 6) + ' ' + (-X + 4.4) + ' ' + (Y + 1) + '" ' +
               'stroke="' + NAU + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
             '<path d="M' + (X - 4.4) + ' ' + (Y + 1) + ' Q' + X + ' ' + (Y - 6) + ' ' + (X + 4.4) + ' ' + (Y + 1) + '" ' +
               'stroke="' + NAU + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }

    const r = kieuMat === 'tron' ? 5.4 : 4.9;

    let o = '';
    [[-X, 1], [X, -1]].forEach(function (e) {
      const cx = e[0];

      o += '<circle cx="' + cx + '" cy="' + Y + '" r="' + r + '" fill="url(#' + p + 'mat)"/>';

      // Mí trên: một lát lông đè lên đỉnh mắt. Thiếu nó là mắt thành
      // hòn bi, có nó là mắt biết nhìn.
      if (kieuMat === 'hien') {
        o += '<path d="M' + (cx - r - 0.4) + ' ' + (Y - r * 0.45) + ' ' +
                 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + r + 0.4) + ' ' + (Y - r * 0.45) + ' ' +
                 'L' + (cx + r + 0.4) + ' ' + (Y - r - 1.2) + ' ' +
                 'L' + (cx - r - 0.4) + ' ' + (Y - r - 1.2) + ' Z" fill="url(#' + p + 'dau)"/>';
      }

      // Chấm sáng to ở trên, chấm nhỏ ở dưới đối diện
      o += '<circle cx="' + (cx - r * 0.42) + '" cy="' + (Y - r * 0.36) + '" r="' + (r * 0.42) + '" fill="#fff"/>' +
           '<circle cx="' + (cx + r * 0.44) + '" cy="' + (Y + r * 0.46) + '" r="' + (r * 0.2) + '" fill="#fff" opacity=".65"/>';
    });

    return o;
  }

  function dau(p) {
    return (
      tai(p, -1) + tai(p, 1) +

      // đầu: to so với thân, lún vào thân, không có cổ
      '<circle cx="0" cy="-62" r="21" fill="url(#' + p + 'dau)" ' +
        'stroke="' + VIEN + '" stroke-width="0.8"/>' +
      // má phải tối
      '<ellipse cx="13" cy="-59" rx="8.5" ry="12" fill="#B99871" opacity=".45" ' +
        'filter="url(#' + p + 'mo)"/>' +
      // trán sáng
      '<ellipse cx="-7" cy="-72" rx="10" ry="6.5" fill="#F8EAD3" opacity=".9" ' +
        'filter="url(#' + p + 'mo)"/>' +
      '<ellipse cx="0" cy="-79" rx="7.5" ry="3.2" fill="#FBF2E2" opacity=".85" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // mõm trắng, ăn liền xuống ngực — cũng là nét của con thỏ trong ảnh
      '<ellipse cx="0" cy="-53" rx="12" ry="9" fill="url(#' + p + 'trang)" ' +
        'filter="url(#' + p + 'mo)"/>' +
      '<ellipse cx="0" cy="-54" rx="8.5" ry="6" fill="#FFFFFF" opacity=".9" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // má ửng hồng — thứ rẻ nhất mà làm mặt ấm hẳn lên
      '<ellipse cx="-15" cy="-56" rx="5" ry="3.2" fill="' + HONG + '" opacity=".38" ' +
        'filter="url(#' + p + 'mo)"/>' +
      '<ellipse cx="15" cy="-56" rx="5" ry="3.2" fill="' + HONG + '" opacity=".38" ' +
        'filter="url(#' + p + 'mo)"/>' +

      mat(p) +

      // mũi hồng
      '<path d="M-2.8 -55.4 Q0 -53 2.8 -55.4 Q0 -57.2 -2.8 -55.4 Z" fill="' + HONG + '"/>' +
      // miệng cười rõ, không phải vệt mờ
      '<path d="M0 -53 v1.7 M0 -51.3 Q-3.4 -48.7 -6.2 -50.8 M0 -51.3 Q3.4 -48.7 6.2 -50.8" ' +
        'stroke="' + NAU + '" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".8"/>' +

      // râu, hạ xuống ngang mõm và làm nhạt hơn cho khỏi cắt ngang mặt
      '<path d="M-11 -51.5 L-22 -53 M-11 -49.5 L-22 -48.5 M11 -51.5 L22 -53 M11 -49.5 L22 -48.5" ' +
        'stroke="#D6C7AE" stroke-width="0.85" stroke-linecap="round" opacity=".7"/>'
    );
  }

  function bong(p) {
    return '<ellipse cx="1" cy="0" rx="26" ry="5.5" fill="#8C7B61" opacity=".35" ' +
           'filter="url(#' + p + 'mo2)"/>';
  }

  function boc(x, y, co, ruot) {
    const p = 'th' + (++demId);
    return defs(p) +
      '<g transform="translate(' + x + ' ' + y + ') scale(' + (co || 1) + ')">' +
        bong(p) + ruot(p) +
      '</g>';
  }

  // Ngồi, hai chân trước chụm trước ngực
  function ngoi(x, y, co) {
    return boc(x, y, co, function (p) {
      return than(p) +
        '<ellipse cx="-6" cy="-9" rx="5.6" ry="7.5" fill="url(#' + p + 'trang)" ' +
          'stroke="' + VIEN_T + '" stroke-width="0.8"/>' +
        '<ellipse cx="6" cy="-9" rx="5.6" ry="7.5" fill="url(#' + p + 'trang)" ' +
          'stroke="' + VIEN_T + '" stroke-width="0.8"/>' +
        dau(p);
    });
  }

  // Ngồi, hai chân trước giơ lên
  function mung(x, y, co) {
    return boc(x, y, co, function (p) {
      return than(p) +
        '<ellipse cx="-24" cy="-40" rx="5.6" ry="9.5" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8" transform="rotate(-42 -24 -40)"/>' +
        '<ellipse cx="24" cy="-40" rx="5.6" ry="9.5" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8" transform="rotate(42 24 -40)"/>' +
        dau(p);
    });
  }

  // Đổi kiểu mắt cho cả web: 'hien' (mở, có mí) | 'cuoi' (cười tít) | 'tron' (tròn to)
  function doiMat(k) {
    if (k === 'hien' || k === 'cuoi' || k === 'tron') kieuMat = k;
  }

  return { ngoi: ngoi, mung: mung, dung: ngoi, doiMat: doiMat, HONG: HONG };
})();
