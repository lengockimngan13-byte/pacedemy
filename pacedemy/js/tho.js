// ============================================================
// Pacedemy — thỏ linh vật, vẽ bằng SVG
//
// Dáng và chất liệu theo đúng ảnh mẫu chị Ngân chọn: thỏ trắng ngồi
// dựng, hai tai cao một chiếc hơi nghiêng, lông mềm, mắt to đen bóng,
// tai trong và mũi hồng nhạt. Không có vòng cổ, không có khăn quàng.
//
// Chỗ làm nó bớt phẳng không phải là màu mà là ba thứ:
//   - bỏ nét viền đen đậm, thay bằng khối sáng tối
//   - bóng mờ thật (feGaussianBlur) ở mặt tối và dưới chân
//   - vài túm lông nhô ra ở mép thân cho đường bao không bị nhẵn
//
//   Tho.ngoi(x, y, co)   — ngồi, dùng trong các cảnh Thỏ hỏi
//   Tho.mung(x, y, co)   — ngồi, hai chân trước giơ lên ăn mừng
//   Tho.dung(...)        — tên cũ, vẫn chạy, gọi sang ngoi()
// ============================================================

const Tho = (function () {

  const HONG   = '#E9A7A2';   // tai trong, mũi
  const MAT    = '#241C1A';   // mắt
  const VIEN   = '#C8C4BC';   // nét rất nhạt, chỉ để tách khỏi nền sáng

  let demId = 0;

  function defs(p) {
    return '<defs>' +
      // Lông: sáng ở trên trái, xám nhạt dần xuống dưới phải
      '<radialGradient id="' + p + 'long" cx="36%" cy="24%" r="86%">' +
        '<stop offset="0%" stop-color="#FFFFFF"/>' +
        '<stop offset="55%" stop-color="#FAF8F5"/>' +
        '<stop offset="100%" stop-color="#DAD5CC"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + p + 'dau" cx="34%" cy="26%" r="84%">' +
        '<stop offset="0%" stop-color="#FFFFFF"/>' +
        '<stop offset="58%" stop-color="#FBF9F6"/>' +
        '<stop offset="100%" stop-color="#DFDAD1"/>' +
      '</radialGradient>' +
      // Mắt có chút chuyển sắc cho ra vẻ ướt
      '<radialGradient id="' + p + 'mat" cx="34%" cy="28%" r="80%">' +
        '<stop offset="0%" stop-color="#4A3C38"/>' +
        '<stop offset="100%" stop-color="#1A1413"/>' +
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

  // Một bên tai. ben = -1 trái (dựng thẳng), 1 phải (hơi nghiêng ra)
  function tai(p, ben) {
    const x = 10 * ben;
    const xoay = ben < 0 ? -7 : 17;
    return '<g transform="rotate(' + xoay + ' ' + x + ' -72)">' +
      '<ellipse cx="' + x + '" cy="-96" rx="7.4" ry="25" ' +
        'fill="url(#' + p + 'long)" stroke="' + VIEN + '" stroke-width="0.8"/>' +
      '<ellipse cx="' + x + '" cy="-98" rx="3.6" ry="17" fill="' + HONG + '" opacity=".55"/>' +
      // mép trong hơi tối, cho tai có bề dày
      '<path d="M' + (x - 5.5) + ' -108 Q' + (x - 7.5) + ' -92 ' + (x - 4) + ' -76" ' +
        'stroke="#D7D1C8" stroke-width="1.1" fill="none" opacity=".4" stroke-linecap="round"/>' +
    '</g>';
  }

  // Thân ngồi dựng, hai chân sau đưa ra trước
  function than(p) {
    return (
      // chân sau
      '<ellipse cx="-13" cy="-5" rx="10.5" ry="5.2" fill="url(#' + p + 'long)" ' +
        'stroke="' + VIEN + '" stroke-width="0.8"/>' +
      '<ellipse cx="13" cy="-5" rx="10.5" ry="5.2" fill="url(#' + p + 'long)" ' +
        'stroke="' + VIEN + '" stroke-width="0.8"/>' +

      // thân
      '<path d="M-23 -24 C-23 -9 -14 -5 0 -5 C14 -5 23 -9 23 -24 ' +
        'C23 -43 16 -56 0 -56 C-16 -56 -23 -43 -23 -24 Z" ' +
        'fill="url(#' + p + 'long)" stroke="' + VIEN + '" stroke-width="0.8"/>' +

      // viền lông: vài mảng mờ loang ra khỏi mép thân, nhìn như lông tơ
      // chứ không phải gai nhọn
      '<g filter="url(#' + p + 'mo)" opacity=".75">' +
        '<ellipse cx="-23" cy="-32" rx="4" ry="7" fill="#FBF9F6"/>' +
        '<ellipse cx="-22" cy="-16" rx="4" ry="6" fill="#FBF9F6"/>' +
        '<ellipse cx="23" cy="-36" rx="3.6" ry="7" fill="#F2EFEA"/>' +
        '<ellipse cx="22" cy="-18" rx="3.6" ry="6" fill="#F2EFEA"/>' +
        '<ellipse cx="0" cy="-56" rx="9" ry="3.5" fill="#FBF9F6"/>' +
      '</g>' +

      // mặt tối bên phải
      '<ellipse cx="17" cy="-26" rx="9" ry="20" fill="#CFC9BF" opacity=".55" ' +
        'filter="url(#' + p + 'mo)"/>' +
      // ngực sáng
      '<ellipse cx="-3" cy="-24" rx="13" ry="16" fill="#FFFFFF" opacity=".8" ' +
        'filter="url(#' + p + 'mo)"/>'
    );
  }

  function dau(p) {
    return (
      tai(p, -1) + tai(p, 1) +

      // đầu
      '<circle cx="0" cy="-69" r="18.5" fill="url(#' + p + 'dau)" ' +
        'stroke="' + VIEN + '" stroke-width="0.8"/>' +
      // má phải tối
      '<ellipse cx="11" cy="-66" rx="8" ry="11" fill="#CFC9BF" opacity=".5" ' +
        'filter="url(#' + p + 'mo)"/>' +
      // trán sáng
      '<ellipse cx="-6" cy="-77" rx="9" ry="6" fill="#FFFFFF" opacity=".95" ' +
        'filter="url(#' + p + 'mo)"/>' +
      // túm lông trên đỉnh đầu, mờ nhẹ cho mềm
      '<ellipse cx="0" cy="-86" rx="7" ry="3" fill="#FFFFFF" opacity=".9" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // mõm
      '<ellipse cx="0" cy="-60" rx="10" ry="7.5" fill="#FFFFFF" opacity=".9" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // mắt to, đen bóng
      '<ellipse cx="-7" cy="-71" rx="4.4" ry="5" fill="url(#' + p + 'mat)"/>' +
      '<ellipse cx="7.4" cy="-71" rx="4" ry="4.6" fill="url(#' + p + 'mat)"/>' +
      '<circle cx="-8.4" cy="-73" r="1.6" fill="#fff" opacity=".95"/>' +
      '<circle cx="6.2" cy="-73" r="1.4" fill="#fff" opacity=".95"/>' +
      '<circle cx="-5.6" cy="-68.6" r="0.8" fill="#fff" opacity=".5"/>' +

      // mũi hồng và miệng
      '<path d="M-2.6 -62.4 Q0 -60.4 2.6 -62.4 Q0 -63.8 -2.6 -62.4 Z" fill="' + HONG + '"/>' +
      '<path d="M0 -60.6 v2 M0 -58.6 Q-3 -56.8 -5.2 -58.4 M0 -58.6 Q3 -56.8 5.2 -58.4" ' +
        'stroke="#B9AFA6" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +

      // râu
      '<path d="M-9 -60 L-21 -62 M-9 -58 L-21 -57 M9 -60 L21 -62 M9 -58 L21 -57" ' +
        'stroke="#D8D2C9" stroke-width="0.9" stroke-linecap="round" opacity=".85"/>'
    );
  }

  function bong(p) {
    return '<ellipse cx="1" cy="-1" rx="25" ry="5.5" fill="#8C8578" opacity=".35" ' +
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
        '<ellipse cx="-5.5" cy="-11" rx="5.4" ry="8" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8"/>' +
        '<ellipse cx="5.5" cy="-11" rx="5.4" ry="8" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8"/>' +
        dau(p);
    });
  }

  // Ngồi, hai chân trước giơ lên
  function mung(x, y, co) {
    return boc(x, y, co, function (p) {
      return than(p) +
        '<ellipse cx="-23" cy="-44" rx="5.4" ry="9.5" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8" transform="rotate(-42 -23 -44)"/>' +
        '<ellipse cx="23" cy="-44" rx="5.4" ry="9.5" fill="url(#' + p + 'long)" ' +
          'stroke="' + VIEN + '" stroke-width="0.8" transform="rotate(42 23 -44)"/>' +
        dau(p);
    });
  }

  return { ngoi: ngoi, mung: mung, dung: ngoi, HONG: HONG };
})();
