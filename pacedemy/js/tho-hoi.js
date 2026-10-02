// ============================================================
// Pacedemy — Thỏ hỏi, mình đáp
//
// Bài tập kiểu Part 2 nhưng đọc thay vì nghe: thỏ đứng trong một bối
// cảnh công sở, hỏi một câu, học viên chọn câu đáp lại đúng. Câu đúng
// luôn chứa từ đang học.
//
// Khác bài điền chỗ trống ở chỗ: điền chỗ trống chỉ cần biết nghĩa,
// còn đáp một câu hỏi thì phải hiểu người ta đang hỏi gì — đúng việc
// Part 2 kiểm tra. Mấy câu nhiễu cũng bắt chước bẫy thật của đề: từ
// nghe gần giống, hoặc trả lời lạc kiểu câu hỏi.
//
//   ThoHoi.ve(root, item, function (dung) { ... });
// ============================================================

const ThoHoi = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- Sáu bối cảnh ----------
  // Vẽ bằng hình khối phẳng, cùng bảng màu thương hiệu, không dùng ảnh.

  const NEN = '#E7EDE9', SAN = '#CFE1DB', DAM = '#0C2422', XANH = '#2A7F76', VANG = '#F0A830';

  // Thỏ đứng ở góc trái dưới, nên mọi đồ vật đều nằm từ x = 76 trở sang
  // phải, không cái nào che mất nó.
  const CANH = {
    'van-phong': {
      ten: 'Văn phòng',
      ve: '<rect x="112" y="18" width="56" height="40" rx="2" fill="#fff" stroke="' + DAM + '" stroke-width="2"/>' +
          '<path d="M112 38h56M140 18v40" stroke="' + DAM + '" stroke-width="1.5" opacity=".3"/>' +
          '<rect x="86" y="66" width="52" height="32" rx="2" fill="' + XANH + '"/>' +
          '<rect x="92" y="72" width="40" height="20" rx="1" fill="#fff" opacity=".85"/>' +
          '<rect x="82" y="98" width="60" height="5" rx="1.5" fill="' + DAM + '"/>' +
          '<rect x="90" y="103" width="5" height="18" fill="' + DAM + '"/>' +
          '<rect x="129" y="103" width="5" height="18" fill="' + DAM + '"/>' +
          '<path d="M156 108c0-11 5-17 10-17s10 6 10 17z" fill="' + XANH + '"/>' +
          '<rect x="160" y="108" width="12" height="13" rx="2" fill="' + VANG + '"/>'
    },
    'phong-hop': {
      ten: 'Phòng họp',
      ve: '<rect x="92" y="16" width="86" height="46" rx="2" fill="#fff" stroke="' + DAM + '" stroke-width="2"/>' +
          '<path d="M102 50l16-20 12 14 9-9 15 15" stroke="' + XANH + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
          '<rect x="84" y="94" width="92" height="7" rx="2" fill="' + DAM + '"/>' +
          '<rect x="94" y="101" width="5" height="20" fill="' + DAM + '"/>' +
          '<rect x="161" y="101" width="5" height="20" fill="' + DAM + '"/>' +
          '<circle cx="104" cy="86" r="7" fill="' + VANG + '"/>' +
          '<rect x="120" y="80" width="22" height="14" rx="2" fill="' + XANH + '"/>' +
          '<rect x="150" y="84" width="18" height="10" rx="2" fill="#fff" stroke="' + DAM + '" stroke-width="1.5"/>'
    },
    'kho-hang': {
      ten: 'Kho hàng',
      ve: '<rect x="84" y="18" width="92" height="8" fill="' + DAM + '"/>' +
          '<rect x="84" y="58" width="92" height="8" fill="' + DAM + '"/>' +
          '<rect x="86" y="26" width="7" height="32" fill="' + DAM + '" opacity=".5"/>' +
          '<rect x="167" y="26" width="7" height="32" fill="' + DAM + '" opacity=".5"/>' +
          '<rect x="98" y="32" width="24" height="26" rx="1.5" fill="' + VANG + '"/>' +
          '<rect x="130" y="38" width="22" height="20" rx="1.5" fill="' + XANH + '"/>' +
          '<rect x="104" y="84" width="38" height="32" rx="2" fill="' + VANG + '"/>' +
          '<path d="M104 97h38" stroke="' + DAM + '" stroke-width="2"/>' +
          '<rect x="96" y="116" width="54" height="5" rx="1.5" fill="' + DAM + '"/>'
    },
    'san-bay': {
      ten: 'Sân bay',
      ve: '<rect x="90" y="14" width="88" height="36" rx="2" fill="' + DAM + '"/>' +
          '<rect x="96" y="21" width="34" height="4" rx="1" fill="' + VANG + '"/>' +
          '<rect x="134" y="21" width="36" height="4" rx="1" fill="#fff" opacity=".6"/>' +
          '<rect x="96" y="30" width="42" height="4" rx="1" fill="#fff" opacity=".6"/>' +
          '<rect x="142" y="30" width="28" height="4" rx="1" fill="' + XANH + '"/>' +
          '<rect x="96" y="39" width="30" height="4" rx="1" fill="#fff" opacity=".6"/>' +
          '<path d="M100 72l32-10-5 13 15 4-17 7 2 12-11-9-14 6 5-13z" fill="' + XANH + '" opacity=".45"/>' +
          '<rect x="140" y="92" width="32" height="29" rx="3" fill="' + VANG + '"/>' +
          '<path d="M148 92v-7h16v7" stroke="' + DAM + '" stroke-width="3" fill="none"/>' +
          '<path d="M140 104h32" stroke="' + DAM + '" stroke-width="2"/>'
    },
    'le-tan': {
      ten: 'Quầy lễ tân',
      ve: '<rect x="94" y="16" width="82" height="28" rx="2" fill="' + XANH + '"/>' +
          '<rect x="102" y="25" width="44" height="4" rx="1" fill="#fff" opacity=".8"/>' +
          '<rect x="102" y="34" width="28" height="3" rx="1" fill="#fff" opacity=".55"/>' +
          '<rect x="88" y="78" width="88" height="10" rx="2" fill="' + DAM + '"/>' +
          '<rect x="94" y="88" width="76" height="33" fill="' + XANH + '" opacity=".8"/>' +
          '<circle cx="158" cy="72" r="7" fill="' + VANG + '"/>' +
          '<rect x="151" y="76" width="14" height="3" rx="1.5" fill="' + DAM + '"/>' +
          '<rect x="100" y="64" width="20" height="14" rx="2" fill="#fff" stroke="' + DAM + '" stroke-width="1.5"/>'
    },
    'nha-may': {
      ten: 'Nhà máy',
      ve: '<circle cx="124" cy="38" r="20" fill="none" stroke="' + DAM + '" stroke-width="7"/>' +
          '<circle cx="124" cy="38" r="6" fill="' + DAM + '"/>' +
          '<circle cx="158" cy="56" r="12" fill="none" stroke="' + DAM + '" stroke-width="5" opacity=".55"/>' +
          '<rect x="88" y="94" width="88" height="9" rx="2" fill="' + DAM + '"/>' +
          '<circle cx="102" cy="109" r="7" fill="none" stroke="' + DAM + '" stroke-width="3"/>' +
          '<circle cx="132" cy="109" r="7" fill="none" stroke="' + DAM + '" stroke-width="3"/>' +
          '<circle cx="162" cy="109" r="7" fill="none" stroke="' + DAM + '" stroke-width="3"/>' +
          '<rect x="96" y="76" width="22" height="18" rx="2" fill="' + VANG + '"/>' +
          '<rect x="130" y="70" width="26" height="24" rx="2" fill="' + XANH + '"/>'
    }
  };

  function veCanh(ten) {
    const c = CANH[ten] || CANH['van-phong'];

    return '<svg class="th-canh" viewBox="0 0 200 130" role="img" aria-label="Bối cảnh ' + esc(c.ten) + '">' +
             '<rect width="200" height="130" fill="' + NEN + '"/>' +
             '<rect y="121" width="200" height="9" fill="' + SAN + '"/>' +
             c.ve +
             Tho.dung(38, 121, 0.95) +
           '</svg>';
  }

  // ---------- Vẽ một câu ----------

  function tron(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  // xong(dung) được gọi sau khi học viên chọn và đã xem đáp án
  function ve(root, item, xong) {
    if (!root || !item) return;

    const ds = tron(item.dap_an || []);
    const chuCai = ['A', 'B', 'C', 'D'];

    root.innerHTML =
      '<div class="th">' +
        '<div class="th-tren">' +
          veCanh(item.boi_canh) +
          '<div class="th-bong">' +
            '<span class="th-nhan">Thỏ hỏi</span>' +
            '<p class="th-hoi">' + esc(item.cau_hoi) + '</p>' +
          '</div>' +
        '</div>' +

        '<p class="th-de">Chọn câu đáp lại đúng</p>' +

        '<div class="opts th-ops">' +
          ds.map(function (d, i) {
            return '<button class="opt" data-i="' + i + '">' +
                     '<span class="letter">' + chuCai[i] + '</span>' + esc(d.t) +
                   '</button>';
          }).join('') +
        '</div>' +

        '<div class="th-giai hidden" id="th-giai"></div>' +
      '</div>';

    let khoa = false;

    root.querySelectorAll('.opt').forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (khoa) return;
        khoa = true;

        const dung = !!ds[i].ok;
        const iDung = ds.findIndex(function (d) { return d.ok; });
        const nut = root.querySelectorAll('.opt');

        nut.forEach(function (x) { x.disabled = true; });
        nut[i].classList.add(dung ? 'right' : 'wrong');
        if (!dung && nut[iDung]) nut[iDung].classList.add('right');

        if (typeof Speak !== 'undefined') {
          Speak.say(dung ? ds[i].t : item.cau_hoi + ' ' + ds[iDung].t);
        }

        const g = root.querySelector('#th-giai');
        g.innerHTML =
          '<p class="th-g-dap"><b>' + esc(item.cau_hoi) + '</b> → ' + esc(ds[iDung].t) + '</p>' +
          (item.giai_thich ? '<p class="th-g-why">' + esc(item.giai_thich) + '</p>' : '');
        g.classList.remove('hidden');

        if (xong) xong(dung);
      });
    });
  }

  return { ve: ve, veCanh: veCanh, CANH: CANH };
})();
