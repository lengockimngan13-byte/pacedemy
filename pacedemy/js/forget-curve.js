// ============================================================
// Pacedemy — đường cong quên lãng trên trang học
//
// Vẽ hai đường trên cùng một trục:
//   · Không ôn lại — trí nhớ rơi theo đường Ebbinghaus
//   · Ôn theo lịch Pacedemy — mỗi lần ôn kéo về 100%, và lần sau
//     rơi chậm hơn lần trước
// Kèm số từ thật của học viên đang nằm ở từng hộp Leitner, để các
// em thấy mình đang đứng ở đâu trên đường cong đó.
//
// Vẽ bằng SVG tay, không dùng thư viện ngoài.
// ============================================================

(function () {
  const box = document.getElementById('curve-box');
  if (!box) return;

  // Giãn cách Leitner, khớp với GAP_MINUTES trong js/study.js
  const BOXES = [
    { box: 1, gap: 10 / 1440, nhan: '10 phút' },
    { box: 2, gap: 1,         nhan: '1 ngày' },
    { box: 3, gap: 3,         nhan: '3 ngày' },
    { box: 4, gap: 7,         nhan: '7 ngày' },
    { box: 5, gap: 21,        nhan: '21 ngày' }
  ];

  const NGAY = 30;          // bề rộng biểu đồ, tính theo ngày
  const B = 0.27;           // độ dốc đường quên
  const TAU = [0.1, 0.6, 2.5, 8, 25];   // trí nhớ bền dần sau mỗi lần ôn

  const MAU_QUEN = '#B4432E';
  const MAU_ON   = '#0B9184';

  // Tỷ lệ nhớ còn lại sau t ngày, tính từ lần ôn gần nhất
  function nho(t, tau) {
    return Math.pow(1 + Math.max(0, t) / tau, -B);
  }

  // Các mốc ôn cộng dồn: học xong, rồi sau 10 phút, 1 ngày, 3 ngày…
  function mocOn() {
    const out = [0];
    let t = 0;
    for (const b of BOXES) {
      t += b.gap;
      if (t <= NGAY) out.push(t);
    }
    return out;
  }

  const MOC = mocOn();

  // Đường có ôn: rơi từ mốc ôn gần nhất, mỗi mốc dùng tau lớn hơn
  function nhoCoOn(t) {
    let i = 0;
    for (let k = 0; k < MOC.length; k++) if (MOC[k] <= t) i = k;
    return nho(t - MOC[i], TAU[Math.min(i, TAU.length - 1)]);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- Khung vẽ ----------
  const W = 720, H = 300;
  const HEP = window.matchMedia('(max-width: 620px)').matches;
  // Màn nhỏ chữ trong SVG phóng to nên lề trái phải rộng ra, không thì cắt mất "100%"
  const L = HEP ? 74 : 44, R = HEP ? 10 : 16, T = 18, Bt = HEP ? 52 : 42;
  const px = function (t) { return L + (t / NGAY) * (W - L - R); };
  const py = function (r) { return T + (1 - r) * (H - T - Bt); };

  function duong(f, buoc) {
    let d = '';
    for (let t = 0; t <= NGAY + 0.0001; t += buoc) {
      d += (d ? ' L' : 'M') + px(t).toFixed(1) + ' ' + py(f(t)).toFixed(1);
    }
    return d;
  }

  // Đường có ôn phải cắt khúc tại mỗi mốc để thấy rõ cú kéo lên
  function duongCoOn() {
    let d = '';
    for (let k = 0; k < MOC.length; k++) {
      const tu = MOC[k];
      const den = (k + 1 < MOC.length) ? MOC[k + 1] : NGAY;
      const tau = TAU[Math.min(k, TAU.length - 1)];
      d += 'M' + px(tu).toFixed(1) + ' ' + py(1).toFixed(1);
      for (let t = tu; t <= den + 0.0001; t += 0.2) {
        d += ' L' + px(Math.min(t, den)).toFixed(1) + ' ' + py(nho(t - tu, tau)).toFixed(1);
      }
      if (k + 1 < MOC.length) {
        // nét đứng nối lên 100% ở lần ôn kế tiếp
        d += ' M' + px(den).toFixed(1) + ' ' + py(nho(den - tu, tau)).toFixed(1) +
             ' L' + px(den).toFixed(1) + ' ' + py(1).toFixed(1);
      }
    }
    return d;
  }

  function ve(soTu, denHan) {
    const mocNhan = ['học xong', '10 phút', '1 ngày', '3 ngày', '7 ngày', '21 ngày'];

    let luoi = '';
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      luoi += '<line x1="' + L + '" y1="' + py(r) + '" x2="' + (W - R) + '" y2="' + py(r) +
              '" stroke="#C9D8D3" stroke-width="1"' + (r === 0 ? '' : ' stroke-dasharray="3 4"') + '/>' +
              '<text x="' + (L - 8) + '" y="' + (py(r) + 4) + '" text-anchor="end" class="fc-tick">' +
              Math.round(r * 100) + '%</text>';
    }
    for (const t of (HEP ? [0, 14, 30] : [0, 7, 14, 21, 30])) {
      const neo = t === 0 ? 'start' : (t === NGAY ? 'end' : 'middle');
      luoi += '<text x="' + px(t) + '" y="' + (H - Bt + 20) + '" text-anchor="' + neo + '" class="fc-tick">' +
              (t === 0 ? 'hôm học' : 'ngày ' + t) + '</text>';
    }

    // Chấm tại mỗi lần ôn
    let cham = '';
    MOC.forEach(function (t, k) {
      cham += '<circle cx="' + px(t) + '" cy="' + py(1) + '" r="5" fill="' + MAU_ON +
              '" stroke="#fff" stroke-width="2"><title>Lần ôn thứ ' + (k + 1) +
              ' · sau ' + esc(mocNhan[k]) + '</title></circle>';
    });

    const svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fc-svg" role="img" ' +
           'aria-label="Đường cong quên lãng: không ôn lại thì trí nhớ rơi nhanh, ôn theo lịch thì giữ được trên 80 phần trăm">' +
        luoi +
        '<path d="' + duong(function (t) { return nho(t, TAU[0]); }, 0.2) + '" fill="none" ' +
              'stroke="' + MAU_QUEN + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="' + duongCoOn() + '" fill="none" ' +
              'stroke="' + MAU_ON + '" stroke-width="2" stroke-linejoin="round"/>' +
        cham +
        '<text x="' + px(HEP ? 17 : 23) + '" y="' + (py(nhoCoOn(HEP ? 17 : 23)) - 12) + '" class="fc-lab" fill="' + MAU_ON + '">Có ôn lại</text>' +
        '<text x="' + px(HEP ? 17 : 23) + '" y="' + (py(nho(HEP ? 17 : 23, TAU[0])) + 20) + '" class="fc-lab" fill="' + MAU_QUEN + '">Không ôn lại</text>' +
      '</svg>';

    // Số từ thật của học viên ở từng hộp
    const tong = soTu.reduce(function (m, n) { return m + n; }, 0);
    let hop = '';
    BOXES.forEach(function (b, i) {
      const n = soTu[i] || 0;
      hop +=
        '<div class="fc-box' + (n ? '' : ' is-empty') + '">' +
          '<b>' + n + '</b>' +
          '<span>hộp ' + b.box + '</span>' +
          '<em>ôn lại sau ' + b.nhan + '</em>' +
        '</div>';
    });

    let loi;
    if (!tong) {
      loi = 'Bạn chưa học từ nào. Học xong bộ từ đầu tiên, các chấm xanh bên trên sẽ là lịch ôn của riêng bạn.';
    } else if (denHan > 0) {
      loi = 'Hôm nay có <b>' + denHan + ' từ</b> tới hạn ôn. Ôn đúng hôm nay thì đường xanh của bạn được kéo lên 100% lần nữa.';
    } else {
      loi = 'Hôm nay không có từ nào tới hạn. Bạn đang đi đúng nhịp.';
    }

    box.innerHTML =
      '<div class="tbox fc">' +
        '<h3>Đường cong quên lãng</h3>' +
        '<p class="fc-sub">Học xong một từ rồi để đó, chỉ sau một ngày bạn quên quá nửa. ' +
          'Gặp lại từ đó đúng lúc sắp quên thì mỗi lần nhớ lại bền hơn lần trước.</p>' +

        '<div class="fc-legend">' +
          '<span><i style="background:' + MAU_ON + '"></i>Ôn theo lịch Pacedemy</span>' +
          '<span><i style="background:' + MAU_QUEN + '"></i>Học xong rồi để đó</span>' +
        '</div>' +

        '<div class="fc-wrap">' + svg + '<div class="fc-tip" hidden></div></div>' +

        '<p class="fc-note">' + loi + '</p>' +

        (tong
          ? '<div class="fc-boxes">' + hop + '</div>' +
            '<p class="fc-note fc-dim">' + tong + ' từ đang trong vòng ôn. ' +
              'Từ lên tới hộp 4 được tính là đã thuộc.</p>'
          : '') +

        '<details class="fc-table"><summary>Xem bằng số</summary>' +
          bangSo() +
        '</details>' +
      '</div>';

    ganHover();
  }

  // Bảng số bám đúng lịch ôn: ngay trước mỗi lần ôn thì còn nhớ bao nhiêu.
  // Lấy theo mốc ngày bất kỳ sẽ rơi vào giữa chu kỳ, con số nhảy lên nhảy xuống khó hiểu.
  function bangSo() {
    const ten = ['sau 10 phút', 'sau 1 ngày', 'sau 3 ngày', 'sau 7 ngày', 'sau 21 ngày'];

    let h = '<p class="fc-dim" style="margin:10px 0 0">Mỗi dòng là thời điểm ngay trước một lần ôn, ' +
            'lúc trí nhớ xuống thấp nhất trong chu kỳ đó.</p>' +
            '<table class="fc-tb"><thead><tr><th>Lần ôn</th><th>Cách lần trước</th>' +
            '<th>Có ôn lại</th><th>Không ôn lại</th></tr></thead><tbody>';

    for (let k = 1; k < MOC.length; k++) {
      const t = MOC[k];
      const truoc = nho(t - MOC[k - 1], TAU[Math.min(k - 1, TAU.length - 1)]);
      h += '<tr><td>lần ' + k + '</td><td>' + esc(ten[k - 1]) + '</td>' +
           '<td>' + Math.round(truoc * 100) + '%</td>' +
           '<td>' + Math.round(nho(t, TAU[0]) * 100) + '%</td></tr>';
    }

    h += '<tr><td>sau cùng</td><td>tới ngày ' + NGAY + '</td>' +
         '<td>' + Math.round(nhoCoOn(NGAY) * 100) + '%</td>' +
         '<td>' + Math.round(nho(NGAY, TAU[0]) * 100) + '%</td></tr>';

    return h + '</tbody></table>';
  }

  // Rê chuột dọc biểu đồ: hiện vạch dọc và số của cả hai đường
  function ganHover() {
    const wrap = box.querySelector('.fc-wrap');
    const svg = box.querySelector('.fc-svg');
    const tip = box.querySelector('.fc-tip');
    if (!wrap || !svg || !tip) return;

    const ns = 'http://www.w3.org/2000/svg';
    const vach = document.createElementNS(ns, 'line');
    vach.setAttribute('stroke', '#6C837E');
    vach.setAttribute('stroke-width', '1');
    vach.setAttribute('stroke-dasharray', '3 3');
    vach.setAttribute('y1', T);
    vach.setAttribute('y2', H - Bt);
    vach.setAttribute('visibility', 'hidden');
    svg.appendChild(vach);

    function roi(e) {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W;
      if (x < L || x > W - R) { thoat(); return; }

      const t = (x - L) / (W - L - R) * NGAY;
      vach.setAttribute('x1', x);
      vach.setAttribute('x2', x);
      vach.setAttribute('visibility', 'visible');

      tip.hidden = false;
      tip.innerHTML =
        '<b>' + (t < 0.5 ? 'Ngay sau buổi học' : 'Sau ' + Math.round(t) + ' ngày') + '</b>' +
        '<span><i style="background:' + MAU_ON + '"></i>Có ôn: ' + Math.round(nhoCoOn(t) * 100) + '%</span>' +
        '<span><i style="background:' + MAU_QUEN + '"></i>Không ôn: ' + Math.round(nho(t, TAU[0]) * 100) + '%</span>';

      const w = wrap.getBoundingClientRect();
      let left = e.clientX - w.left + 14;
      if (left + 170 > w.width) left = e.clientX - w.left - 184;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = '10px';
    }

    function thoat() {
      vach.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }

    wrap.addEventListener('pointermove', roi);
    wrap.addEventListener('pointerleave', thoat);
  }

  // ---------- Nạp số liệu của học viên ----------
  (async function () {
    const soTu = [0, 0, 0, 0, 0];
    let denHan = 0;

    try {
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        const { data } = await db.from('vocab_progress')
          .select('box, next_review').eq('user_id', user.id);

        const now = Date.now();
        for (const p of (data || [])) {
          const i = Math.min(5, Math.max(1, p.box || 1)) - 1;
          soTu[i]++;
          if (p.next_review && new Date(p.next_review).getTime() <= now) denHan++;
        }
      }
    } catch (e) {
      // Mạng lỗi thì vẫn vẽ đường cong, chỉ thiếu phần số từ của riêng em đó
    }

    ve(soTu, denHan);
  })();
})();
