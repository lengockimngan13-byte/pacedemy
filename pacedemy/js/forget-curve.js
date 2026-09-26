// ============================================================
// Pacedemy — trí nhớ của chính học viên, trên trang học
//
// Tính từ số từ thật trong vocab_progress: mỗi từ nhớ được bao nhiêu
// phần trăm tuỳ lần ôn gần nhất và đang ở hộp mấy. Lấy trung bình ra
// một con số, rồi vẽ con số đó tụt dần trong 14 ngày tới nếu không ôn
// thêm gì.
//
// Mọi số trên hình đều là của riêng em đang đăng nhập, không có đường
// lý thuyết chung chung.
// ============================================================

(function () {
  const box = document.getElementById('curve-box');
  if (!box) return;

  // Giãn cách Leitner, khớp GAP_MINUTES trong js/study.js (đổi ra ngày)
  const GAP = { 1: 10 / 1440, 2: 1, 3: 3, 4: 7, 5: 21 };

  const B = 0.27;      // độ dốc đường quên
  const DICH = 0.85;   // tới đúng hạn ôn thì còn nhớ khoảng ngần này
  const NGAY = 14;     // bề rộng biểu đồ
  const MAU = '#0B9184';

  // Độ bền trí nhớ từng hộp, đặt sao cho tới hạn ôn thì rơi đúng về DICH
  const TAU = {};
  for (const k in GAP) TAU[k] = GAP[k] / (Math.pow(DICH, -1 / B) - 1);

  function ret(dt, tau) {
    return Math.pow(1 + Math.max(0, dt) / tau, -B);
  }

  // ---------- Khung vẽ ----------
  const W = 720, H = 210;
  const HEP = window.matchMedia('(max-width: 620px)').matches;
  const L = HEP ? 66 : 44, R = HEP ? 12 : 16, T = 14, Bt = HEP ? 46 : 36;

  const px = function (d) { return L + (d / NGAY) * (W - L - R); };
  const py = function (r) { return T + (1 - r) * (H - T - Bt); };

  // Trí nhớ trung bình của cả kho từ, sau d ngày nữa
  function trungBinh(tu, d) {
    if (!tu.length) return 0;
    let s = 0;
    for (const w of tu) s += ret(w.tuoi + d, TAU[w.box] || TAU[1]);
    return s / tu.length;
  }

  function ve(tu, denHan, soHop) {
    const tong = tu.length;

    if (!tong) {
      box.innerHTML =
        '<div class="tbox fc">' +
          '<h3>Trí nhớ của bạn</h3>' +
          '<p class="fc-sub">Học xong bộ từ đầu tiên là chỗ này hiện trí nhớ của bạn, ' +
            'kèm những từ sắp quên để ôn lại đúng lúc.</p>' +
          '<a class="btn btn-gold" href="vocab.html">Học bộ từ đầu tiên</a>' +
        '</div>';
      return;
    }

    const nay = trungBinh(tu, 0);
    const cuoi = trungBinh(tu, NGAY);

    // Ôn hết số từ tới hạn hôm nay thì trí nhớ lên lại bao nhiêu
    const sauKhiOn = tu.map(function (w) {
      return w.toiHan ? { tuoi: 0, box: Math.min(5, w.box + 1) } : w;
    });
    const neuOn = trungBinh(sauKhiOn, 0);

    // ---------- Lưới ----------
    let luoi = '';
    for (const r of [0, 0.5, 1]) {
      luoi += '<line x1="' + L + '" y1="' + py(r) + '" x2="' + (W - R) + '" y2="' + py(r) +
              '" stroke="#C9D8D3" stroke-width="1"' + (r === 0 ? '' : ' stroke-dasharray="3 4"') + '/>' +
              '<text x="' + (L - 8) + '" y="' + (py(r) + 4) + '" text-anchor="end" class="fc-tick">' +
              Math.round(r * 100) + '%</text>';
    }
    for (const d of (HEP ? [0, 7, 14] : [0, 3, 7, 10, 14])) {
      const neo = d === 0 ? 'start' : (d === NGAY ? 'end' : 'middle');
      luoi += '<text x="' + px(d) + '" y="' + (H - Bt + 20) + '" text-anchor="' + neo + '" class="fc-tick">' +
              (d === 0 ? 'hôm nay' : d + ' ngày nữa') + '</text>';
    }

    // ---------- Đường và vùng tô ----------
    let duong = '';
    for (let d = 0; d <= NGAY + 0.001; d += 0.5) {
      duong += (duong ? ' L' : 'M') + px(d).toFixed(1) + ' ' + py(trungBinh(tu, d)).toFixed(1);
    }
    const vung = duong + ' L' + px(NGAY).toFixed(1) + ' ' + py(0).toFixed(1) +
                        ' L' + px(0).toFixed(1) + ' ' + py(0).toFixed(1) + ' Z';

    const svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fc-svg" role="img" ' +
           'aria-label="Trí nhớ của bạn hôm nay ' + Math.round(nay * 100) +
           ' phần trăm, sau ' + NGAY + ' ngày không ôn còn ' + Math.round(cuoi * 100) + ' phần trăm">' +
        luoi +
        '<path d="' + vung + '" fill="' + MAU + '" fill-opacity="0.1"/>' +
        '<path d="' + duong + '" fill="none" stroke="' + MAU + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<circle cx="' + px(0) + '" cy="' + py(nay) + '" r="5" fill="' + MAU +
          '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + (px(NGAY) - 4) + '" y="' + (py(cuoi) - 12) + '" text-anchor="end" ' +
          'class="fc-lab" fill="' + MAU + '">còn ' + Math.round(cuoi * 100) + '%</text>' +
      '</svg>';

    // ---------- Các hộp ----------
    let hop = '';
    [1, 2, 3, 4, 5].forEach(function (b) {
      const n = soHop[b] || 0;
      const nhan = b === 1 ? '10 phút' : (GAP[b] + ' ngày');
      hop += '<div class="fc-box' + (n ? '' : ' is-empty') + '">' +
               '<b>' + n + '</b><span>hộp ' + b + '</span><em>ôn lại sau ' + nhan + '</em></div>';
    });

    const thuoc = (soHop[4] || 0) + (soHop[5] || 0);

    const loi = denHan > 0
      ? 'Có <b>' + denHan + ' từ</b> đang tới hạn. Ôn xong hôm nay, trí nhớ lên lại <b>' +
        Math.round(neuOn * 100) + '%</b>.'
      : 'Không có từ nào tới hạn hôm nay. Cứ giữ nhịp này.';

    box.innerHTML =
      '<div class="tbox fc">' +
        '<h3>Trí nhớ của bạn</h3>' +

        '<div class="fc-hero">' +
          '<div class="fc-big"><b>' + Math.round(nay * 100) + '<i>%</i></b>' +
            '<span>nhớ được hôm nay</span></div>' +
          '<div class="fc-bar"><span style="width:' + Math.round(nay * 100) + '%"></span></div>' +
        '</div>' +

        '<p class="fc-sub">Đường dưới đây là trí nhớ của bạn tụt dần nếu từ giờ không ôn thêm gì. ' +
          'Ôn đúng hạn sẽ kéo nó lên lại, và lần sau tụt chậm hơn.</p>' +

        '<div class="fc-wrap">' + svg + '<div class="fc-tip" hidden></div></div>' +

        '<p class="fc-note">' + loi + '</p>' +

        '<div class="fc-boxes">' + hop + '</div>' +
        '<p class="fc-note fc-dim">' + tong + ' từ đang trong vòng ôn · ' + thuoc +
          ' từ đã thuộc. Từ lên tới hộp 4 được tính là thuộc.</p>' +
      '</div>';

    ganHover(tu);
  }

  // Rê chuột: vạch dọc và trí nhớ tại ngày đó
  function ganHover(tu) {
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

    const cham = document.createElementNS(ns, 'circle');
    cham.setAttribute('r', '5');
    cham.setAttribute('fill', MAU);
    cham.setAttribute('stroke', '#fff');
    cham.setAttribute('stroke-width', '2');
    cham.setAttribute('visibility', 'hidden');
    svg.appendChild(cham);

    function roi(e) {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W;
      if (x < L || x > W - R) { thoat(); return; }

      const d = (x - L) / (W - L - R) * NGAY;
      const v = trungBinh(tu, d);

      vach.setAttribute('x1', x); vach.setAttribute('x2', x);
      vach.setAttribute('visibility', 'visible');
      cham.setAttribute('cx', x); cham.setAttribute('cy', py(v));
      cham.setAttribute('visibility', 'visible');

      tip.hidden = false;
      tip.innerHTML = '<b>' + (d < 0.5 ? 'Hôm nay' : 'Sau ' + Math.round(d) + ' ngày') + '</b>' +
                      '<span>Nhớ được ' + Math.round(v * 100) + '%</span>';

      const w = wrap.getBoundingClientRect();
      let left = e.clientX - w.left + 14;
      if (left + 150 > w.width) left = e.clientX - w.left - 164;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = '6px';
    }

    function thoat() {
      vach.setAttribute('visibility', 'hidden');
      cham.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }

    wrap.addEventListener('pointermove', roi);
    wrap.addEventListener('pointerleave', thoat);
  }

  // ---------- Nạp số liệu ----------
  (async function () {
    const tu = [];
    const soHop = {};
    let denHan = 0;

    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      const { data } = await db.from('vocab_progress')
        .select('box, last_reviewed, next_review').eq('user_id', user.id);

      const now = Date.now();

      for (const p of (data || [])) {
        const b = Math.min(5, Math.max(1, p.box || 1));
        soHop[b] = (soHop[b] || 0) + 1;

        const moc = p.last_reviewed ? new Date(p.last_reviewed).getTime() : now;
        const tuoi = Math.max(0, (now - moc) / 86400000);

        const toiHan = !!(p.next_review && new Date(p.next_review).getTime() <= now);
        if (toiHan) denHan++;

        tu.push({ tuoi: tuoi, box: b, toiHan: toiHan });
      }
    } catch (e) {
      return;   // mạng lỗi thì bỏ qua, trang vẫn chạy bình thường
    }

    ve(tu, denHan, soHop);
  })();
})();
