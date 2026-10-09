// ============================================================
// Pacedemy — thỏ linh vật, vẽ bằng SVG
//
// Thỏ con lông be vàng, ngực và mõm trắng, theo ảnh mẫu chị Ngân chọn.
//
// Bản này vẽ bằng đường bezier chứ không xếp hình tròn lại với nhau,
// vì đó mới là chỗ quyết định nhìn ra con thỏ hay ra cục bông:
//   - đầu có má phính, trán hẹp hơn má, không phải hình tròn
//   - tai hình lá, có chóp nhọn và gốc dày
//   - thân hình quả lê, dưới to trên nhỏ
//   - mép lông gợn nhẹ, không nhẵn thín
//   - mắt to, có mí trên, phản quang lớn và vệt sáng viền dưới
//
//   Tho.ngoi(x, y, co)   — ngồi, dùng trong các cảnh Thỏ hỏi
//   Tho.mung(x, y, co)   — ngồi, hai chân trước giơ lên ăn mừng
//   Tho.song(x, y, co)   — ngồi, có thở và chớp mắt (cần css)
//   Tho.dung(...)        — tên cũ, vẫn chạy, gọi sang ngoi()
// ============================================================

const Tho = (function () {

  const HONG   = '#E9A49C';   // tai trong, mũi
  const HONG_D = '#D98B84';   // viền mũi
  const NAU    = '#43332A';   // miệng, nét mảnh
  const VIEN   = '#C2A179';   // viền lông be
  const VIEN_T = '#DED4C4';   // viền mảng trắng

  let demId = 0;

  function defs(p) {
    return '<defs>' +
      // Lông be: sáng trên trái, nâu dần xuống phải dưới
      '<linearGradient id="' + p + 'long" x1="18%" y1="6%" x2="86%" y2="96%">' +
        '<stop offset="0%"   stop-color="#F7E9D2"/>' +
        '<stop offset="42%"  stop-color="#E7D1AD"/>' +
        '<stop offset="100%" stop-color="#C3A077"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'dau" x1="16%" y1="4%" x2="84%" y2="92%">' +
        '<stop offset="0%"   stop-color="#FAEEDB"/>' +
        '<stop offset="46%"  stop-color="#EAD5B3"/>' +
        '<stop offset="100%" stop-color="#C8A77D"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'tai" x1="20%" y1="0%" x2="80%" y2="100%">' +
        '<stop offset="0%"   stop-color="#F3E3C8"/>' +
        '<stop offset="100%" stop-color="#CDAC83"/>' +
      '</linearGradient>' +
      // Mảng trắng: ngực, mõm, bàn chân
      '<linearGradient id="' + p + 'trang" x1="24%" y1="4%" x2="76%" y2="96%">' +
        '<stop offset="0%"   stop-color="#FFFFFF"/>' +
        '<stop offset="55%"  stop-color="#FCF6EB"/>' +
        '<stop offset="100%" stop-color="#EADFCD"/>' +
      '</linearGradient>' +
      // Mắt: đen nâu ở giữa, hơi sáng ở rìa cho ra khối cầu
      '<radialGradient id="' + p + 'mat" cx="36%" cy="30%" r="78%">' +
        '<stop offset="0%"   stop-color="#5E4435"/>' +
        '<stop offset="62%"  stop-color="#33251D"/>' +
        '<stop offset="100%" stop-color="#211711"/>' +
      '</radialGradient>' +
      '<filter id="' + p + 'mo" x="-50%" y="-50%" width="200%" height="200%">' +
        '<feGaussianBlur stdDeviation="2.6"/>' +
      '</filter>' +
      '<filter id="' + p + 'mo2" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feGaussianBlur stdDeviation="4.6"/>' +
      '</filter>' +
      '<filter id="' + p + 'mo3" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feGaussianBlur stdDeviation="1.2"/>' +
      '</filter>' +
    '</defs>';
  }

  // ---------- Tai ----------
  // Hình lá: gốc dày, bụng phình, chóp nhọn. ben = -1 trái, 1 phải.
  function tai(p, ben) {
    const x = 9.5 * ben;
    const goc = -74, dai = 42, w = 8.6;
    const chop = goc - dai;
    const xoay = ben < 0 ? -11 : 27;

    const ngoai =
      'M' + (x - w) + ' ' + goc +
      ' C' + (x - w - 2.4) + ' ' + (goc - dai * 0.42) +
      ' '  + (x - w * 0.62) + ' ' + (chop + 10) +
      ' '  + x + ' ' + chop +
      ' C' + (x + w * 0.62) + ' ' + (chop + 10) +
      ' '  + (x + w + 2.4) + ' ' + (goc - dai * 0.42) +
      ' '  + (x + w) + ' ' + goc + ' Z';

    const iw = w * 0.52, igoc = goc - 5, ichop = chop + 9;
    const trong =
      'M' + (x - iw) + ' ' + igoc +
      ' C' + (x - iw - 1.2) + ' ' + (igoc - dai * 0.38) +
      ' '  + (x - iw * 0.6) + ' ' + (ichop + 7) +
      ' '  + x + ' ' + ichop +
      ' C' + (x + iw * 0.6) + ' ' + (ichop + 7) +
      ' '  + (x + iw + 1.2) + ' ' + (igoc - dai * 0.38) +
      ' '  + (x + iw) + ' ' + igoc + ' Z';

    // Lớp ngoài chỉ để CSS vẫy tai được, không đổi hình. Trang nào
    // không có css cho nó thì nó nằm im, y như trước.
    return '<g class="tho-tai tho-tai-' + (ben < 0 ? 't' : 'p') + '">' +
      '<g transform="rotate(' + xoay + ' ' + x + ' ' + goc + ')">' +
        '<path d="' + ngoai + '" fill="url(#' + p + 'tai)" stroke="' + VIEN + '" stroke-width="0.9"/>' +
        '<path d="' + trong + '" fill="' + HONG + '" opacity=".5"/>' +
        // vệt sáng dọc mép ngoài, cho tai có bề dày
        '<path d="M' + (x - w + 1.4) + ' ' + (goc - 4) +
          ' C' + (x - w - 0.4) + ' ' + (goc - dai * 0.42) +
          ' '  + (x - w * 0.6) + ' ' + (chop + 12) +
          ' '  + (x - 0.6) + ' ' + (chop + 3.5) + '" ' +
          'stroke="#FBF1DE" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>' +
      '</g>' +
    '</g>';
  }

  // ---------- Thân ----------
  // Quả lê: dưới to, trên thu lại chỗ đỡ đầu.
  function than(p) {
    return (
      // bàn chân sau trắng, hơi chìa ra hai bên
      '<path d="M-26 -5 C-26 -11 -20 -13 -15 -11 C-10 -9.4 -8 -6 -9 -3 ' +
        'C-10 -0.6 -22 0.4 -25 -1.6 C-26.4 -2.6 -26 -4 -26 -5 Z" ' +
        'fill="url(#' + p + 'trang)" stroke="' + VIEN_T + '" stroke-width="0.8"/>' +
      '<path d="M26 -5 C26 -11 20 -13 15 -11 C10 -9.4 8 -6 9 -3 ' +
        'C10 -0.6 22 0.4 25 -1.6 C26.4 -2.6 26 -4 26 -5 Z" ' +
        'fill="url(#' + p + 'trang)" stroke="' + VIEN_T + '" stroke-width="0.8"/>' +

      // thân
      '<path d="M0 -50 C-12.5 -50 -19.5 -43.5 -22 -33 ' +
        'C-24.6 -22 -25.6 -12.5 -18 -6.5 C-11 -1.2 11 -1.2 18 -6.5 ' +
        'C25.6 -12.5 24.6 -22 22 -33 C19.5 -43.5 12.5 -50 0 -50 Z" ' +
        'fill="url(#' + p + 'long)" stroke="' + VIEN + '" stroke-width="0.9"/>' +

      // mép lông gợn: vài múi mờ nhô ra khỏi đường bao
      '<g filter="url(#' + p + 'mo)" opacity=".8">' +
        '<ellipse cx="-22.6" cy="-36" rx="3.6" ry="5.4" fill="#F0DCBD"/>' +
        '<ellipse cx="-24.4" cy="-24" rx="3.6" ry="5.4" fill="#F0DCBD"/>' +
        '<ellipse cx="-23"   cy="-13" rx="3.4" ry="4.6" fill="#EBD5B4"/>' +
        '<ellipse cx="22.8"  cy="-36" rx="3.4" ry="5.2" fill="#D2B48C"/>' +
        '<ellipse cx="24.6"  cy="-24" rx="3.4" ry="5.2" fill="#D2B48C"/>' +
        '<ellipse cx="23.2"  cy="-13" rx="3.2" ry="4.4" fill="#CDAE86"/>' +
      '</g>' +

      // khối tối bên phải
      '<path d="M22 -33 C24.6 -22 25.6 -12.5 18 -6.5 C14 -4 10 -3.2 8 -3.4 ' +
        'C16 -9 19 -22 17 -36 Z" fill="#B79468" opacity=".42" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // yếm trắng trước ngực, mép dưới loe ra
      '<path d="M0 -40 C-9 -40 -14.5 -33 -14.5 -24 C-14.5 -14 -8 -8 0 -8 ' +
        'C8 -8 14.5 -14 14.5 -24 C14.5 -33 9 -40 0 -40 Z" ' +
        'fill="url(#' + p + 'trang)" filter="url(#' + p + 'mo3)" opacity=".96"/>' +
      '<ellipse cx="-3" cy="-26" rx="7.5" ry="9" fill="#FFFFFF" opacity=".8" ' +
        'filter="url(#' + p + 'mo)"/>'
    );
  }

  // ---------- Mắt ----------
  let kieuMat = 'hien';

  function mat(p) {
    const X = 8.4, Y = -63, R = 6.3;

    if (kieuMat === 'cuoi') {
      return [-X, X].map(function (cx) {
        return '<path d="M' + (cx - 5.4) + ' ' + (Y + 1.6) +
                 ' Q' + cx + ' ' + (Y - 6.4) + ' ' + (cx + 5.4) + ' ' + (Y + 1.6) + '" ' +
                 'stroke="' + NAU + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>';
      }).join('');
    }

    const r = kieuMat === 'tron' ? R + 0.7 : R;
    // Mí trên chỉ che một lát mỏng ở đỉnh mắt. Cắt sâu là mắt lừ đừ ngay.
    const cat = Y - r * 0.78;

    return [-X, X].map(function (cx, i) {
      const g = p + 'cm' + i;
      return '<g>' +
        '<clipPath id="' + g + '">' +
          '<rect x="' + (cx - r - 1) + '" y="' + cat + '" width="' + ((r + 1) * 2) + '" height="' + (r * 2 + 2) + '"/>' +
        '</clipPath>' +
        '<g clip-path="url(#' + g + ')">' +
          '<circle cx="' + cx + '" cy="' + Y + '" r="' + r + '" fill="url(#' + p + 'mat)"/>' +
          // vệt sáng viền dưới — chỗ làm mắt ra khối cầu ướt
          '<path d="M' + (cx - r * 0.72) + ' ' + (Y + r * 0.52) +
            ' A' + r + ' ' + r + ' 0 0 0 ' + (cx + r * 0.72) + ' ' + (Y + r * 0.52) + '" ' +
            'stroke="#9C7C63" stroke-width="1.4" fill="none" opacity=".35" stroke-linecap="round"/>' +
        '</g>' +
        // nét mí trên, mảnh thôi
        '<path d="M' + (cx - r * 0.96) + ' ' + (cat + 0.6) + ' Q' + cx + ' ' + (cat - 1.1) + ' ' + (cx + r * 0.96) + ' ' + (cat + 0.6) + '" ' +
          'stroke="#9A7B5A" stroke-width="1" fill="none" opacity=".5" stroke-linecap="round"/>' +
        // phản quang lớn và chấm phụ
        '<circle cx="' + (cx - r * 0.34) + '" cy="' + (Y - r * 0.22) + '" r="' + (r * 0.36) + '" fill="#fff"/>' +
        '<circle cx="' + (cx + r * 0.42) + '" cy="' + (Y + r * 0.3) + '" r="' + (r * 0.17) + '" fill="#fff" opacity=".8"/>' +
      '</g>';
    }).join('');
  }

  // ---------- Đầu ----------
  function dau(p) {
    return (
      tai(p, -1) + tai(p, 1) +

      // sọ: trán hẹp, má phình ra hai bên dưới
      '<path d="M0 -86 C-13.5 -86 -21.5 -77.5 -22.6 -66 ' +
        'C-23.6 -55.5 -18.5 -46 -10.5 -42.8 C-4.2 -40.4 4.2 -40.4 10.5 -42.8 ' +
        'C18.5 -46 23.6 -55.5 22.6 -66 C21.5 -77.5 13.5 -86 0 -86 Z" ' +
        'fill="url(#' + p + 'dau)" stroke="' + VIEN + '" stroke-width="0.9"/>' +

      // má phính: hai múi lông nhô ra khỏi đường bao đầu
      '<g filter="url(#' + p + 'mo)" opacity=".85">' +
        '<ellipse cx="-22" cy="-56" rx="4.2" ry="6" fill="#F2DFC1"/>' +
        '<ellipse cx="22"  cy="-56" rx="4"   ry="5.8" fill="#D4B68E"/>' +
        '<ellipse cx="0"   cy="-86" rx="9"   ry="3.4" fill="#F7E9D2"/>' +
      '</g>' +

      // khối tối bên phải mặt
      '<path d="M22.6 -66 C23.6 -55.5 18.5 -46 10.5 -42.8 C8 -42 6 -41.6 5 -41.6 ' +
        'C14 -47 18 -57 17.4 -68 Z" fill="#B79468" opacity=".38" ' +
        'filter="url(#' + p + 'mo)"/>' +
      // trán sáng
      '<ellipse cx="-6" cy="-75" rx="10" ry="6.4" fill="#FBF0DC" opacity=".85" ' +
        'filter="url(#' + p + 'mo)"/>' +

      // mõm trắng hình đám mây, trùm cả mũi và miệng
      '<path d="M0 -58.5 C-4.4 -63.6 -13 -62 -14.6 -55.6 C-16 -49.6 -10 -43.6 0 -44.6 ' +
        'C10 -43.6 16 -49.6 14.6 -55.6 C13 -62 4.4 -63.6 0 -58.5 Z" ' +
        'fill="url(#' + p + 'trang)" filter="url(#' + p + 'mo3)"/>' +

      // má ửng hồng
      '<ellipse cx="-16.5" cy="-54" rx="5.4" ry="3.4" fill="' + HONG + '" opacity=".4" ' +
        'filter="url(#' + p + 'mo)"/>' +
      '<ellipse cx="16.5"  cy="-54" rx="5.4" ry="3.4" fill="' + HONG + '" opacity=".4" ' +
        'filter="url(#' + p + 'mo)"/>' +

      mat(p) +

      // mũi: tam giác bo tròn, có chấm sáng
      '<path d="M-3.4 -55.6 C-3.4 -57.4 3.4 -57.4 3.4 -55.6 ' +
        'C3.4 -53.6 1.4 -52.2 0 -52.2 C-1.4 -52.2 -3.4 -53.6 -3.4 -55.6 Z" ' +
        'fill="' + HONG + '" stroke="' + HONG_D + '" stroke-width="0.5"/>' +
      '<ellipse cx="-1.1" cy="-56" rx="1.1" ry="0.7" fill="#fff" opacity=".7"/>' +

      // miệng chữ w
      '<path d="M0 -52.2 v1.9 M0 -50.3 Q-3.6 -47.4 -6.6 -49.6 M0 -50.3 Q3.6 -47.4 6.6 -49.6" ' +
        'stroke="' + NAU + '" stroke-width="1.5" fill="none" stroke-linecap="round" ' +
        'stroke-linejoin="round" opacity=".82"/>' +

      // râu
      '<path d="M-12.5 -53 Q-17 -54 -21.5 -55 M-12.5 -50.8 Q-17 -50.6 -21.5 -49.8 ' +
             'M12.5 -53 Q17 -54 21.5 -55 M12.5 -50.8 Q17 -50.6 21.5 -49.8" ' +
        'stroke="#DCCDB4" stroke-width="0.8" fill="none" stroke-linecap="round" opacity=".55"/>'
    );
  }

  function bong(p) {
    return '<ellipse cx="1" cy="0.5" rx="28" ry="5.4" fill="#8A7859" opacity=".32" ' +
           'filter="url(#' + p + 'mo2)"/>';
  }

  function boc(x, y, co, ruot) {
    const p = 'th' + (++demId);
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (co || 1) + ')">' +
        defs(p) + bong(p) + ruot(p) +
      '</g>';
  }

  // Chân trước: giọt nước, chụm trước yếm
  function chanTruoc(p, ben) {
    const x = 6.4 * ben;
    return '<path d="M' + x + ' -19 C' + (x + 4.6 * ben) + ' -18 ' + (x + 5 * ben) + ' -12 ' +
             (x + 3.4 * ben) + ' -8.6 C' + (x + 1.6 * ben) + ' -5.6 ' + (x - 3 * ben) + ' -5.6 ' +
             (x - 4.2 * ben) + ' -8.8 C' + (x - 5.2 * ben) + ' -12 ' + (x - 4 * ben) + ' -18 ' +
             x + ' -19 Z" fill="url(#' + p + 'trang)" stroke="' + VIEN_T + '" stroke-width="0.8"/>';
  }

  function ngoi(x, y, co) {
    return boc(x, y, co, function (p) {
      return than(p) + chanTruoc(p, -1) + chanTruoc(p, 1) + dau(p);
    });
  }

  // Chân trước giơ lên ăn mừng. ben = -1 trái, 1 phải.
  function tayMung(p, ben) {
    const x = 20 * ben, vai = -38;   // khớp vai, chỗ rotate lấy làm tâm
    const d = ben < 0
      ? 'M-20 -48 C-15 -47 -14.4 -39 -16 -34 C-17.6 -29.6 -23.4 -29.6 -24.8 -34 ' +
        'C-26.2 -39 -25 -47 -20 -48 Z'
      : 'M20 -48 C15 -47 14.4 -39 16 -34 C17.6 -29.6 23.4 -29.6 24.8 -34 ' +
        'C26.2 -39 25 -47 20 -48 Z';

    // Hai lớp: lớp trong giữ nguyên dáng giơ tay như cũ, lớp ngoài để
    // CSS vung qua vung lại quanh khớp vai.
    return '<g class="tho-tay tho-tay-' + (ben < 0 ? 't' : 'p') + '">' +
        '<g transform="rotate(' + (46 * ben) + ' ' + x + ' ' + vai + ')">' +
          '<path d="' + d + '" fill="url(#' + p + 'long)" ' +
            'stroke="' + VIEN + '" stroke-width="0.9"/>' +
        '</g>' +
      '</g>';
  }

  // ---------- Thỏ ăn mừng ----------
  //
  // Chia lớp giống song(): mỗi lớp lo một việc, CSS vào được từng lớp
  // mà hình vẽ không đổi một nét nào.
  //
  //   tho-nhay   nhún lên xuống — cú nhảy
  //   tho-lac    nghiêng trái phải
  //   tho-ep     bẹt xuống lúc chạm đất, vươn ra lúc bật lên
  //   tho-dau    đầu gật trễ hơn thân một nhịp
  //   tho-tai    tai vẫy theo, trễ hơn đầu
  //   tho-bong   bóng dưới đất co lại khi thỏ bay lên
  //
  // Bóng nằm NGOÀI lớp nhảy: bóng phải ở yên dưới đất, chỉ nhỏ lại.
  // Cho nó nhảy theo là mất hẳn cảm giác nhấc chân khỏi mặt đất.
  //
  // Chưa có css thì mọi lớp nằm im và ra đúng con thỏ giơ tay như cũ.
  function mung(x, y, co) {
    const p = 'th' + (++demId);

    return '<g class="tho-mung" transform="translate(' + x + ' ' + y + ') scale(' + (co || 1) + ')">' +
        defs(p) +
        '<g class="tho-bong">' + bong(p) + '</g>' +
        '<g class="tho-nhay">' +
          '<g class="tho-lac">' +
            '<g class="tho-ep">' +
              than(p) +
              tayMung(p, -1) + tayMung(p, 1) +
              '<g class="tho-dau">' + dau(p) + '</g>' +
            '</g>' +
          '</g>' +
        '</g>' +
      '</g>';
  }


  // ---------- Thỏ sống ----------
  //
  // Cùng con thỏ đó, nhưng chia thành mấy lớp lồng nhau để CSS động
  // vào được từng lớp: lớp ngoài nghiêng đầu, lớp trong thở. Vẽ
  // không đổi một nét nào, nên mấy trang đang dùng Tho.ngoi() không
  // bị ảnh hưởng.
  //
  // Mí mắt là hai ô chữ nhật tô đúng màu lông đầu, bình thường dẹp
  // bằng 0 nên không thấy; lúc chớp thì cao lên che mắt một nhịp.
  // Làm vậy để khỏi phải sửa hàm vẽ mắt — chỗ đó đã chỉnh rất lâu
  // mới ra được ánh mắt không lừ đừ.
  function song(x, y, co) {
    const p = 'th' + (++demId);
    const X = 8.4, Y = -63, R = 6.3;

    // Mí vẽ bằng hình bầu dục chứ không phải ô vuông: ô vuông sập
    // xuống nhìn ra ngay là miếng vá. Tô màu đặc lấy đúng sắc lông ở
    // quanh mắt — dùng lại dải màu của đầu thì ra một mảng phẳng,
    // vì dải đó trải trên cả con thỏ chứ không riêng chỗ này.
    // Mắt phải tối hơn mắt trái, theo đúng hướng sáng của đầu.
    const mi = [[-X, '#F0E1C6'], [X, '#E7D4B1']].map(function (o) {
      return '<ellipse class="tho-mi" cx="' + o[0] + '" cy="' + (Y - R - 0.6) + '" ' +
        'rx="' + (R + 1.1) + '" ry="' + (R + 1.9) + '" fill="' + o[1] + '"/>';
    }).join('');

    return '<g class="tho-song" transform="translate(' + x + ' ' + y + ') scale(' + (co || 1) + ')">' +
        defs(p) + bong(p) +
        '<g class="tho-nghieng">' +
          '<g class="tho-nhip">' +
            than(p) + chanTruoc(p, -1) + chanTruoc(p, 1) + dau(p) + mi +
          '</g>' +
        '</g>' +
      '</g>';
  }

  function doiMat(k) {
    if (k === 'hien' || k === 'cuoi' || k === 'tron') kieuMat = k;
  }

  return { ngoi: ngoi, mung: mung, song: song, dung: ngoi, doiMat: doiMat, HONG: HONG };
})();
