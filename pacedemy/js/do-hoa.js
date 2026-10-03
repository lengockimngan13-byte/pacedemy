// ============================================================
// Pacedemy — bộ vẽ bảng biểu cho Part 3 và Part 4
//
// Đề thật của Part 3 và Part 4 hay kèm một bảng lịch, bảng giá, biểu đồ
// hay sơ đồ, rồi hỏi "Look at the graphic...". Nếu bắt cô Ngân đi làm ảnh
// ở chỗ khác rồi tải lên thì vừa mất công vừa không sửa lại được.
//
// Nên ở đây bảng biểu lưu dưới dạng DỮ LIỆU trong cột listening_sets.graphic,
// còn hình thì web tự vẽ. Được ba cái: soạn thẳng trong Teacher Studio,
// sửa một ô không phải làm lại cả ảnh, và trên điện thoại chữ vẫn sắc nét.
//
//   DoHoa.ve(g)       -> chuỗi HTML
//   DoHoa.KIEU        -> danh sách kiểu, dùng cho trình soạn
//   DoHoa.mau(kieu)   -> một mẫu rỗng để bắt đầu điền
//
// Dữ liệu chung: { kieu, tieu_de, ghi_chu }
// ============================================================

const DoHoa = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function so(v) {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  // Màu cho các cột, dải, miếng bánh. Lấy từ bảng màu thương hiệu,
  // đủ khác nhau để nhìn ra nhưng không chói.
  const MAU = ['#2A7F76', '#F0A830', '#5B8FA8', '#9A7FBF', '#C97B5A', '#6B9E78'];

  const KIEU = [
    { ma: 'bang',   ten: 'Bảng',            vd: 'Lịch họp, bảng giá, thực đơn, danh sách phòng ban, hoá đơn' },
    { ma: 'cot',    ten: 'Biểu đồ cột',     vd: 'Doanh số theo quý, lượt khách theo tháng' },
    { ma: 'duong',  ten: 'Biểu đồ đường',   vd: 'Xu hướng tăng giảm qua các mốc thời gian' },
    { ma: 'tron',   ten: 'Biểu đồ tròn',    vd: 'Tỉ lệ chi phí, cơ cấu khách hàng' },
    { ma: 'so-do',  ten: 'Sơ đồ mặt bằng',  vd: 'Sơ đồ gian hàng, tầng văn phòng, khu vực kho' },
    { ma: 'phieu',  ten: 'Phiếu giảm giá',  vd: 'Coupon, voucher, thẻ thành viên' }
  ];

  function mau(kieu) {
    if (kieu === 'bang') {
      return { kieu: 'bang', tieu_de: '', ghi_chu: '',
               cot: ['', ''], hang: [['', ''], ['', '']] };
    }
    if (kieu === 'cot' || kieu === 'duong') {
      return { kieu: kieu, tieu_de: '', ghi_chu: '', don_vi: '',
               muc: [{ ten: '', gia_tri: '' }, { ten: '', gia_tri: '' }] };
    }
    if (kieu === 'tron') {
      return { kieu: 'tron', tieu_de: '', ghi_chu: '',
               muc: [{ ten: '', gia_tri: '' }, { ten: '', gia_tri: '' }] };
    }
    if (kieu === 'so-do') {
      return { kieu: 'so-do', tieu_de: '', ghi_chu: '', so_cot: 3,
               o: [{ ten: '', nhan: '' }, { ten: '', nhan: '' },
                   { ten: '', nhan: '' }, { ten: '', nhan: '' }] };
    }
    if (kieu === 'phieu') {
      return { kieu: 'phieu', tieu_de: '', ghi_chu: '',
               dong: [{ nhan: '', gia_tri: '' }] };
    }
    return null;
  }

  // ---------- Bảng ----------
  // Cột đầu luôn là cột "khoá" (giờ, ngày, tên mục) nên in đậm.

  function veBang(g) {
    const cot = g.cot || [];
    const hang = g.hang || [];
    if (!cot.length && !hang.length) return '';

    const th = cot.map(function (c) {
      return '<th>' + esc(c) + '</th>';
    }).join('');

    const tr = hang.map(function (h) {
      const td = (h || []).map(function (o, i) {
        return i === 0 ? '<th scope="row">' + esc(o) + '</th>' : '<td>' + esc(o) + '</td>';
      }).join('');
      return '<tr>' + td + '</tr>';
    }).join('');

    return '<div class="dh-cuon"><table class="dh-bang">' +
             (th ? '<thead><tr>' + th + '</tr></thead>' : '') +
             '<tbody>' + tr + '</tbody>' +
           '</table></div>';
  }

  // ---------- Biểu đồ cột ----------

  function veCot(g) {
    const muc = (g.muc || []).filter(function (m) { return m && m.ten; });
    if (!muc.length) return '';

    const dinh = Math.max.apply(null, muc.map(function (m) { return so(m.gia_tri); })) || 1;
    const W = 320, H = 180, LE_T = 14, LE_D = 30, LE_X = 34;
    const vungW = W - LE_X - 8, vungH = H - LE_T - LE_D;
    const rong = vungW / muc.length;
    const dayCot = Math.min(rong * 0.56, 34);

    // ba vạch ngang cho dễ đọc giá trị
    let luoi = '';
    for (let i = 0; i <= 2; i++) {
      const y = LE_T + vungH * (i / 2);
      const v = Math.round(dinh * (1 - i / 2));
      luoi += '<line x1="' + LE_X + '" y1="' + y + '" x2="' + (W - 8) + '" y2="' + y +
                '" stroke="#DCE6E2" stroke-width="1"/>' +
              '<text x="' + (LE_X - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" ' +
                'class="dh-truc">' + v + '</text>';
    }

    const cot = muc.map(function (m, i) {
      const h = vungH * (so(m.gia_tri) / dinh);
      const x = LE_X + rong * i + (rong - dayCot) / 2;
      const y = LE_T + vungH - h;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + dayCot.toFixed(1) +
               '" height="' + Math.max(h, 1).toFixed(1) + '" rx="2" fill="' + MAU[i % MAU.length] + '"/>' +
             '<text x="' + (x + dayCot / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) +
               '" text-anchor="middle" class="dh-gt">' + esc(m.gia_tri) + '</text>' +
             '<text x="' + (LE_X + rong * i + rong / 2).toFixed(1) + '" y="' + (H - LE_D + 15) +
               '" text-anchor="middle" class="dh-nhan">' + esc(m.ten) + '</text>';
    }).join('');

    return khung(W, H, luoi + cot, g.don_vi);
  }

  // ---------- Biểu đồ đường ----------

  function veDuong(g) {
    const muc = (g.muc || []).filter(function (m) { return m && m.ten; });
    if (muc.length < 2) return veCot(g);

    const gt = muc.map(function (m) { return so(m.gia_tri); });
    // Luôn lấy mốc 0 làm đáy. Cắt đáy lên cho "đẹp" sẽ phóng đại mức
    // chênh lệch, mà đề TOEIC hay hỏi thẳng vào chênh lệch đó.
    const dinh = Math.max.apply(null, gt) || 1;
    const tren = dinh, duoi = Math.min(0, Math.min.apply(null, gt));

    // Chừa thêm chỗ bên trái để nhãn trục không đè lên số của điểm đầu.
    const W = 320, H = 180, LE_T = 14, LE_D = 30, LE_X = 34, DEM = 12;
    const vungW = W - LE_X - DEM - 14, vungH = H - LE_T - LE_D;
    const buoc = vungW / (muc.length - 1);
    const toaDo = function (v) {
      return LE_T + vungH - vungH * ((v - duoi) / ((tren - duoi) || 1));
    };

    let luoi = '';
    for (let i = 0; i <= 2; i++) {
      const y = LE_T + vungH * (i / 2);
      const v = Math.round(duoi + (tren - duoi) * (1 - i / 2));
      luoi += '<line x1="' + LE_X + '" y1="' + y + '" x2="' + (W - 8) + '" y2="' + y +
                '" stroke="#DCE6E2" stroke-width="1"/>' +
              '<text x="' + (LE_X - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" ' +
                'class="dh-truc">' + v + '</text>';
    }

    const diem = gt.map(function (v, i) {
      return [LE_X + DEM + buoc * i, toaDo(v)];
    });

    const duongVe = '<polyline points="' +
      diem.map(function (d) { return d[0].toFixed(1) + ',' + d[1].toFixed(1); }).join(' ') +
      '" fill="none" stroke="' + MAU[0] + '" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>';

    const cham = diem.map(function (d, i) {
      return '<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="3.6" ' +
               'fill="#fff" stroke="' + MAU[0] + '" stroke-width="2.2"/>' +
             '<text x="' + d[0].toFixed(1) + '" y="' + (d[1] - 9).toFixed(1) +
               '" text-anchor="middle" class="dh-gt">' + esc(muc[i].gia_tri) + '</text>' +
             '<text x="' + d[0].toFixed(1) + '" y="' + (H - LE_D + 15) +
               '" text-anchor="middle" class="dh-nhan">' + esc(muc[i].ten) + '</text>';
    }).join('');

    return khung(W, H, luoi + duongVe + cham, g.don_vi);
  }

  // ---------- Biểu đồ tròn ----------

  function veTron(g) {
    const muc = (g.muc || []).filter(function (m) { return m && m.ten; });
    if (!muc.length) return '';

    const gt = muc.map(function (m) { return Math.max(so(m.gia_tri), 0); });
    const tong = gt.reduce(function (a, b) { return a + b; }, 0) || 1;

    const W = 320, H = 180, CX = 88, CY = 90, R = 64;
    let goc = -Math.PI / 2;

    const mieng = gt.map(function (v, i) {
      const quet = (v / tong) * Math.PI * 2;
      const x1 = CX + R * Math.cos(goc), y1 = CY + R * Math.sin(goc);
      goc += quet;
      const x2 = CX + R * Math.cos(goc), y2 = CY + R * Math.sin(goc);
      const lon = quet > Math.PI ? 1 : 0;
      // một miếng chiếm trọn vòng thì cung không vẽ được, phải dùng hình tròn
      if (gt.length === 1 || quet >= Math.PI * 2 - 0.001) {
        return '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="' + MAU[i % MAU.length] + '"/>';
      }
      return '<path d="M' + CX + ' ' + CY + ' L' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
             ' A' + R + ' ' + R + ' 0 ' + lon + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) +
             ' Z" fill="' + MAU[i % MAU.length] + '" stroke="#fff" stroke-width="1.5"/>';
    }).join('');

    const chuThich = muc.map(function (m, i) {
      const y = 28 + i * 21;
      const pt = Math.round((gt[i] / tong) * 100);
      return '<rect x="186" y="' + (y - 9) + '" width="11" height="11" rx="2" ' +
               'fill="' + MAU[i % MAU.length] + '"/>' +
             '<text x="203" y="' + y + '" class="dh-ct">' + esc(m.ten) + ' — ' + pt + '%</text>';
    }).join('');

    return khung(W, H, mieng + chuThich, '');
  }

  // ---------- Sơ đồ mặt bằng ----------
  // Lưới các ô chữ nhật, mỗi ô là một phòng hay gian hàng.

  function veSoDo(g) {
    const o = (g.o || []).filter(function (x) { return x && (x.ten || x.nhan); });
    if (!o.length) return '';

    const nCot = Math.max(1, Math.min(parseInt(g.so_cot, 10) || 3, 5));
    const nHang = Math.ceil(o.length / nCot);
    const W = 320, oW = (W - 16) / nCot, oH = 56, H = nHang * oH + 16;

    const ve = o.map(function (x, i) {
      const c = i % nCot, h = Math.floor(i / nCot);
      const px = 8 + c * oW, py = 8 + h * oH;
      const giua = px + oW / 2;
      return '<rect x="' + (px + 2) + '" y="' + (py + 2) + '" width="' + (oW - 4) +
               '" height="' + (oH - 4) + '" rx="3" fill="#F4F8F6" stroke="#C9D8D3" stroke-width="1.4"/>' +
             '<text x="' + giua.toFixed(1) + '" y="' + (py + oH / 2 - 3) +
               '" text-anchor="middle" class="dh-o-ten">' + esc(x.ten) + '</text>' +
             (x.nhan
               ? '<text x="' + giua.toFixed(1) + '" y="' + (py + oH / 2 + 13) +
                 '" text-anchor="middle" class="dh-o-nhan">' + esc(x.nhan) + '</text>'
               : '');
    }).join('');

    return khung(W, H, ve, '');
  }

  // ---------- Phiếu giảm giá ----------

  function vePhieu(g) {
    const dong = (g.dong || []).filter(function (d) { return d && (d.nhan || d.gia_tri); });
    const ds = dong.map(function (d) {
      return '<div class="dh-phieu-dong">' +
               '<span>' + esc(d.nhan) + '</span><b>' + esc(d.gia_tri) + '</b>' +
             '</div>';
    }).join('');
    return '<div class="dh-phieu">' + ds + '</div>';
  }

  // ---------- Khung chung cho các hình SVG ----------

  function khung(W, H, ruot, donVi) {
    return '<div class="dh-svg">' +
             (donVi ? '<p class="dh-donvi">Đơn vị: ' + esc(donVi) + '</p>' : '') +
             '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
               'preserveAspectRatio="xMidYMid meet">' + ruot + '</svg>' +
           '</div>';
  }

  // ---------- Cửa chính ----------

  function ve(g) {
    if (!g || !g.kieu) return '';

    let than = '';
    if (g.kieu === 'bang')       than = veBang(g);
    else if (g.kieu === 'cot')   than = veCot(g);
    else if (g.kieu === 'duong') than = veDuong(g);
    else if (g.kieu === 'tron')  than = veTron(g);
    else if (g.kieu === 'so-do') than = veSoDo(g);
    else if (g.kieu === 'phieu') than = vePhieu(g);

    if (!than) return '';

    return '<figure class="do-hoa">' +
             (g.tieu_de ? '<figcaption class="dh-tieude">' + esc(g.tieu_de) + '</figcaption>' : '') +
             than +
             (g.ghi_chu ? '<p class="dh-ghichu">' + esc(g.ghi_chu) + '</p>' : '') +
           '</figure>';
  }

  // Có dữ liệu thật hay chỉ là mẫu rỗng
  function coGi(g) {
    if (!g || !g.kieu) return false;
    if (g.kieu === 'bang')  return (g.hang || []).some(function (h) { return (h || []).some(Boolean); });
    if (g.kieu === 'so-do') return (g.o || []).some(function (o) { return o && (o.ten || o.nhan); });
    if (g.kieu === 'phieu') return (g.dong || []).some(function (d) { return d && (d.nhan || d.gia_tri); });
    return (g.muc || []).some(function (m) { return m && m.ten; });
  }

  return { ve: ve, mau: mau, coGi: coGi, KIEU: KIEU, MAU: MAU };
})();
