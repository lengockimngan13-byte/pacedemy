// ============================================================
// Pacedemy — thỏ linh vật, vẽ bằng SVG
//
// Logo của Pacedemy là hình thỏ bệt một màu mực, đứng làm dấu hiệu thì
// đẹp, nhưng bê nguyên vào cảnh thì thành một cục đen phẳng. Ở đây thỏ
// được dựng khối: thân màu kem, viền mực, có sáng tối, tai trong màu
// vàng nhạt, khăn quàng vàng thương hiệu.
//
//   Tho.dung(x, y, co)   — đứng, dùng trong các cảnh Thỏ hỏi
//   Tho.mung(x, y, co)   — giơ tay ăn mừng, dùng ở màn hoàn thành bài
//   Tho.defs()           — chuỗi <defs>, phải chèn một lần vào mỗi <svg>
// ============================================================

const Tho = (function () {

  const MUC   = '#0C2422';
  const VANG  = '#F0A830';
  const TAI   = '#FBE6BE';
  const SANG  = '#FFFDF7';

  let demId = 0;   // mỗi svg một bộ id riêng, khỏi đụng nhau trên cùng trang

  function defs(ma) {
    const p = 'th' + ma;
    return '<defs>' +
      '<radialGradient id="' + p + 'da" cx="34%" cy="26%" r="78%">' +
        '<stop offset="0%" stop-color="#FFFDF8"/>' +
        '<stop offset="62%" stop-color="#F4ECDC"/>' +
        '<stop offset="100%" stop-color="#DCCFB8"/>' +
      '</radialGradient>' +
      '<linearGradient id="' + p + 'khan" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#F6BC55"/>' +
        '<stop offset="100%" stop-color="#D98E16"/>' +
      '</linearGradient>' +
    '</defs>';
  }

  // Một bên tai. ben = -1 trái, 1 phải
  function tai(p, ben) {
    const x = 8 * ben;
    const xoay = 15 * ben;
    return '<g transform="rotate(' + xoay + ' ' + x + ' -64)">' +
      '<ellipse cx="' + x + '" cy="-64" rx="6.4" ry="18.5" ' +
        'fill="url(#' + p + 'da)" stroke="' + MUC + '" stroke-width="2"/>' +
      '<ellipse cx="' + x + '" cy="-65" rx="3" ry="12" fill="' + TAI + '"/>' +
    '</g>';
  }

  // Thân mình chung cho mọi dáng. tay = chuỗi SVG hai cánh tay.
  function minh(p, tay) {
    return tai(p, -1) + tai(p, 1) +

      // chân
      '<ellipse cx="-8" cy="-3" rx="7" ry="4.5" fill="url(#' + p + 'da)" ' +
        'stroke="' + MUC + '" stroke-width="1.8"/>' +
      '<ellipse cx="8" cy="-3" rx="7" ry="4.5" fill="url(#' + p + 'da)" ' +
        'stroke="' + MUC + '" stroke-width="1.8"/>' +

      tay +

      // thân
      '<ellipse cx="0" cy="-17" rx="15.5" ry="17" fill="url(#' + p + 'da)" ' +
        'stroke="' + MUC + '" stroke-width="2"/>' +
      // bụng sáng hơn, tạo cảm giác tròn
      '<ellipse cx="-2" cy="-14" rx="9" ry="10" fill="' + SANG + '" opacity=".55"/>' +

      // khăn quàng
      '<path d="M-14 -30 Q0 -24 14 -30 L14 -25 Q0 -19 -14 -25 Z" fill="url(#' + p + 'khan)" ' +
        'stroke="' + MUC + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M7 -25 Q13 -23 14 -19 L11 -8 L5 -10 L8 -19 Z" fill="url(#' + p + 'khan)" ' +
        'stroke="' + MUC + '" stroke-width="1.6" stroke-linejoin="round"/>' +

      // đầu
      '<circle cx="0" cy="-46" r="17" fill="url(#' + p + 'da)" ' +
        'stroke="' + MUC + '" stroke-width="2"/>' +
      // vệt sáng góc trên trái cho ra khối
      '<ellipse cx="-6" cy="-53" rx="7" ry="5" fill="' + SANG + '" opacity=".75" ' +
        'transform="rotate(-25 -6 -53)"/>' +
      // mõm
      '<ellipse cx="0" cy="-40" rx="9.5" ry="7" fill="' + SANG + '" opacity=".9"/>' +

      // má hồng nhạt
      '<ellipse cx="-11" cy="-42" rx="3.6" ry="2.6" fill="#E8A87C" opacity=".45"/>' +
      '<ellipse cx="11" cy="-42" rx="3.6" ry="2.6" fill="#E8A87C" opacity=".45"/>' +

      // mắt, có chấm sáng
      '<circle cx="-5.6" cy="-48" r="3" fill="' + MUC + '"/>' +
      '<circle cx="-4.6" cy="-49.2" r="1.1" fill="#fff"/>' +
      '<circle cx="5.6" cy="-48" r="3" fill="' + MUC + '"/>' +
      '<circle cx="6.6" cy="-49.2" r="1.1" fill="#fff"/>' +

      // mũi và miệng
      '<path d="M-2.4 -42 L2.4 -42 L0 -39.6 Z" fill="#C9826A"/>' +
      '<path d="M0 -39.6 v2.2 M0 -37.4 Q-3 -35.6 -5 -37.4 M0 -37.4 Q3 -35.6 5 -37.4" ' +
        'stroke="' + MUC + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
  }

  function bong() {
    return '<ellipse cx="0" cy="1" rx="20" ry="4.5" fill="' + MUC + '" opacity=".15"/>';
  }

  function boc(x, y, co, ruot) {
    const ma = ++demId;
    return defs(ma) +
      '<g transform="translate(' + x + ' ' + y + ') scale(' + (co || 1) + ')">' +
        bong() + ruot('th' + ma) +
      '</g>';
  }

  // Đứng, hai tay buông xuôi
  function dung(x, y, co) {
    return boc(x, y, co, function (p) {
      const tay =
        '<ellipse cx="-15" cy="-18" rx="4.6" ry="8" fill="url(#' + p + 'da)" ' +
          'stroke="' + MUC + '" stroke-width="1.8" transform="rotate(-10 -15 -18)"/>' +
        '<ellipse cx="15" cy="-18" rx="4.6" ry="8" fill="url(#' + p + 'da)" ' +
          'stroke="' + MUC + '" stroke-width="1.8" transform="rotate(10 15 -18)"/>';
      return minh(p, tay);
    });
  }

  // Giơ hai tay ăn mừng
  function mung(x, y, co) {
    return boc(x, y, co, function (p) {
      const tay =
        '<ellipse cx="-19" cy="-30" rx="4.6" ry="9.5" fill="url(#' + p + 'da)" ' +
          'stroke="' + MUC + '" stroke-width="1.8" transform="rotate(-46 -19 -30)"/>' +
        '<ellipse cx="19" cy="-30" rx="4.6" ry="9.5" fill="url(#' + p + 'da)" ' +
          'stroke="' + MUC + '" stroke-width="1.8" transform="rotate(46 19 -30)"/>';
      return minh(p, tay);
    });
  }

  return { dung: dung, mung: mung, MUC: MUC, VANG: VANG };
})();
