// ============================================================
// Pacedemy — dựng bài đọc Part 6, 7 ra màn hình
//
// Bài đọc TOEIC phần lớn là chữ, nhưng rất hay có BẢNG: bảng giá
// tour, lịch họp, lịch bay, bảng báo giá, hoá đơn. Và câu hỏi thường
// hỏi thẳng vào bảng — "Tour C giá bao nhiêu", "chuyến nào đi tháng
// Hai". Dán bảng vào dạng chữ thuần thì các cột lệch hết, học viên
// không dò ra được.
//
// Giải pháp: viết bảng theo kiểu gạch đứng, giống Markdown —
//
//     | Option | Dates of Departure | Price         |
//     |---|---|---|
//     | Tour A | January 1-8        | $1,675/person |
//
// rồi dựng ra thẻ <table> thật.
//
// Vì sao không dùng ảnh chụp bảng: bài đọc ở đây là CHỮ, nên tính
// năng tô sáng câu chứng minh đáp án mới chạy được, học viên tìm
// được chữ trong bài, và trên điện thoại chữ tự xuống dòng vừa màn
// hình. Ảnh thì mất cả ba.
//
// Mọi chữ đều đi qua hàm toChu() của trang gọi — hàm đó lo việc
// chống chèn mã và tô sáng chứng cứ. Module này không tự nối chuỗi
// chữ thô vào HTML bao giờ.
// ============================================================

const VanBan = (function () {

  // Một dòng của bảng: bắt đầu và kết thúc bằng gạch đứng
  function laDongBang(d) {
    const t = d.trim();
    return t.length > 2 && t.charAt(0) === '|' && t.charAt(t.length - 1) === '|';
  }

  // Dòng ngăn giữa tiêu đề và thân: |---|---|  hay | :--- | ---: |
  function laDongNgan(d) {
    return /^\|[\s:|-]+\|$/.test(d.trim()) && d.indexOf('-') >= 0;
  }

  function tachO(d) {
    const t = d.trim();
    return t.slice(1, -1).split('|').map(function (x) { return x.trim(); });
  }

  // Gom các dòng liền nhau thành khối: 'bang' hoặc 'chu'
  function chiaKhoi(chu) {
    const dong = String(chu == null ? '' : chu).split('\n');
    const khoi = [];
    let i = 0;

    while (i < dong.length) {
      // Bảng phải có ít nhất hai dòng gạch đứng liền nhau
      if (laDongBang(dong[i]) && i + 1 < dong.length && laDongBang(dong[i + 1])) {
        const hang = [];
        while (i < dong.length && laDongBang(dong[i])) { hang.push(dong[i]); i++; }
        khoi.push({ loai: 'bang', hang: hang });
      } else {
        const chuoi = [];
        while (i < dong.length &&
               !(laDongBang(dong[i]) && i + 1 < dong.length && laDongBang(dong[i + 1]))) {
          chuoi.push(dong[i]); i++;
        }
        khoi.push({ loai: 'chu', dong: chuoi });
      }
    }

    return khoi;
  }

  function veBang(hang, toChu) {
    let cot = hang.map(tachO);

    // Có dòng ngăn thì dòng trên nó là tiêu đề
    let dau = null;
    if (cot.length > 1 && laDongNgan(hang[1])) {
      dau = cot[0];
      cot = cot.slice(2);
    }

    let html = '<div class="vb-bang-cuon"><table class="vb-bang">';

    if (dau) {
      html += '<thead><tr>' + dau.map(function (o) {
        return '<th>' + toChu(o) + '</th>';
      }).join('') + '</tr></thead>';
    }

    html += '<tbody>' + cot.map(function (h) {
      return '<tr>' + h.map(function (o) { return '<td>' + toChu(o) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';

    return html;
  }

  // raw   — chữ gốc của một văn bản (đã tách theo dấu === ở ngoài)
  // toChu — hàm biến chữ thô thành HTML an toàn, kèm tô sáng chứng cứ
  function veMot(raw, toChu) {
    return chiaKhoi(raw).map(function (k) {
      if (k.loai === 'bang') return veBang(k.hang, toChu);
      const t = k.dong.join('\n');
      if (!t.trim()) return '';
      return '<p class="vb-doan">' + toChu(t).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  // Cả bài: nhiều văn bản ngăn nhau bằng dòng chỉ có ===
  function ve(raw, toChu) {
    return String(raw == null ? '' : raw)
      .split(/\n?===+\n?/)
      .map(function (d) { return '<div class="doc">' + veMot(d, toChu) + '</div>'; })
      .join('');
  }

  return { ve: ve, veMot: veMot, laDongBang: laDongBang };
})();
