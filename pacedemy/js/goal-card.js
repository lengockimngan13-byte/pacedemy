// ============================================================
// Pacedemy — chặng đường tới mục tiêu, trên trang học
//
// Một thẻ gọn trả lời ba câu học viên hay hỏi nhất:
//   đang bao nhiêu điểm · còn thiếu bao nhiêu · còn mấy ngày nữa thi.
//
// Khác chỗ: điểm hiện tại không bắt học viên tự khai, mà lấy thẳng từ
// bài thi thử gần nhất (mock_tests + hàm toeic_estimate). Mốc xuất phát
// lấy từ bài thi thử đầu tiên, nên thanh ở giữa đo quãng đường đã đi
// được thật, không phải tỉ lệ điểm hiện tại trên mục tiêu.
//
// Chỉ khi chưa thi thử lần nào mới cho tự nhập điểm, và nhắc đi làm
// một đề để có số thật.
// ============================================================

(function () {
  const box = document.getElementById('muctieu-box');
  if (!box) return;

  const MOC = [500, 600, 650, 700, 750, 800, 900];

  let uid = null;
  let prof = null;     // { target_score, current_score, exam_date }
  let diemDau = null;  // điểm bài thi thử đầu tiên
  let diemNay = null;  // điểm bài thi thử gần nhất
  let ngayNay = null;  // ngày của bài thi thử gần nhất
  let soDe = 0;        // số bài thi thử đã làm
  let moSua = false;

  // ---------- Tiện ích ----------

  function ngay(d) {
    return d.getDate() + '/' + (d.getMonth() + 1);
  }

  // Số ngày còn lại tính theo mốc 0h, để "ngày mai" luôn ra đúng 1
  function conMayNgay(iso) {
    const t = new Date(iso + 'T00:00:00');
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return Math.round((t - h) / 86400000);
  }

  function hnIso() {
    const d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  async function luu(patch) {
    const { error } = await db.from('profiles').update(patch).eq('id', uid);
    if (error) { toast('Không lưu được: ' + error.message, 'bad'); return false; }
    Object.assign(prof, patch);
    return true;
  }

  // ---------- Vẽ ----------

  function ve() {
    const mt = prof.target_score || null;
    const nay = diemNay != null ? diemNay : (prof.current_score || null);
    const dau = diemDau != null ? diemDau : nay;

    // Chưa có gì cả — mời đặt mục tiêu trước, đó là việc nhẹ nhất
    if (!mt && nay == null) { veTrong(); return; }

    const thieu = (mt && nay != null) ? Math.max(0, mt - nay) : null;
    const xong  = mt && nay != null && nay >= mt;

    // ----- Ba con số trên cùng -----
    let o = '';

    o += '<div class="mt-o">' +
           '<span class="mt-lab">Điểm hiện tại</span>' +
           (nay != null
             ? '<b class="mt-big">' + nay + '</b>' +
               '<span class="mt-sub">' +
                 (ngayNay
                   ? 'thi thử ' + ngay(ngayNay) + (soDe > 1 ? ' · đề thứ ' + soDe : '')
                   : 'bạn tự nhập') +
               '</span>'
             : '<b class="mt-big mt-mo">—</b><span class="mt-sub">chưa có bài thi thử</span>') +
         '</div>';

    o += '<div class="mt-o">' +
           '<span class="mt-lab">' + (thieu != null && !xong ? 'Còn thiếu' : 'Mục tiêu') + '</span>' +
           (mt == null
             ? '<b class="mt-big mt-mo">—</b><span class="mt-sub">chưa đặt mục tiêu</span>'
             : xong
               ? '<b class="mt-big mt-dat">' + mt + '</b><span class="mt-sub">đã đạt rồi</span>'
               : thieu == null
                 ? '<b class="mt-big mt-mo">' + mt + '</b><span class="mt-sub">mục tiêu của bạn</span>'
                 : '<b class="mt-big">+' + thieu + '</b>' +
                   '<span class="mt-sub">điểm nữa là tới ' + mt + '</span>') +
         '</div>';

    const con = prof.exam_date ? conMayNgay(prof.exam_date) : null;
    const dThi = prof.exam_date ? new Date(prof.exam_date + 'T00:00:00') : null;

    o += '<div class="mt-o">' +
           '<span class="mt-lab">Ngày thi</span>' +
           (con == null
             ? '<b class="mt-big mt-mo">—</b><span class="mt-sub">chưa đặt ngày thi</span>'
             : con > 0
               ? '<b class="mt-big">' + con + '</b>' +
                 '<span class="mt-sub">ngày nữa · ' + ngay(dThi) + '</span>'
               : con === 0
                 ? '<b class="mt-big mt-dat">Hôm nay</b><span class="mt-sub">chúc bạn thi tốt</span>'
                 : '<b class="mt-big mt-mo">Đã qua</b>' +
                   '<span class="mt-sub">' + ngay(dThi) + ' · đặt lại ngày mới</span>') +
         '</div>';

    // ----- Thanh quãng đường -----
    let thanh = '';
    if (mt && nay != null && dau != null) {
      if (xong) {
        thanh =
          '<div class="mt-duong is-xong">' +
            '<div class="mt-track"><span style="width:100%"></span></div>' +
            '<div class="mt-moc"><span>Xuất phát ' + dau + '</span>' +
              '<span>Đã vượt mục tiêu ' + mt + '</span></div>' +
          '</div>';
      } else {
        const quang = Math.max(1, mt - dau);
        const pct = Math.max(0, Math.min(100, Math.round((nay - dau) / quang * 100)));

        thanh =
          '<div class="mt-duong">' +
            '<div class="mt-track">' +
              '<span style="width:' + pct + '%"></span>' +
              '<i class="mt-cham" style="left:' + pct + '%"></i>' +
            '</div>' +
            '<div class="mt-moc">' +
              '<span>Xuất phát ' + dau + '</span>' +
              '<span>' + (soDe > 1
                 ? 'Đã đi được ' + pct + '% quãng đường'
                 : 'Đây là mốc xuất phát của bạn') + '</span>' +
              '<span>Mục tiêu ' + mt + '</span>' +
            '</div>' +
          '</div>';
      }
    }

    // ----- Câu gợi ý nhịp học -----
    let nhip = '';
    if (!nay && mt) {
      nhip = 'Làm một <a href="fulltest.html">đề thi thử</a> để Pacedemy biết bạn đang ở đâu, ' +
             'rồi tự theo dõi giúp bạn.';
    } else if (xong) {
      nhip = 'Bạn đã chạm mục tiêu. Nâng mục tiêu lên một bậc nữa, hay giữ nhịp này tới ngày thi?';
    } else if (thieu && con && con > 0) {
      const tuan = Math.max(1, con / 7);
      const moiTuan = Math.ceil(thieu / tuan / 5) * 5;
      nhip = 'Còn <b>' + thieu + ' điểm</b> trong <b>' + con + ' ngày</b> — khoảng <b>' +
             moiTuan + ' điểm mỗi tuần</b>. Mỗi tuần một đề thi thử là đủ để biết mình có theo kịp không.';
    } else if (thieu) {
      nhip = 'Đặt ngày thi để Pacedemy chia nhỏ ' + thieu + ' điểm này ra theo tuần cho bạn.';
    }

    // ----- Phần sửa -----
    const sua =
      '<div class="mt-sua' + (moSua ? '' : ' hidden') + '">' +
        '<div class="mt-hang">' +
          '<span class="mt-lab2">Mục tiêu</span>' +
          '<div class="mt-chips">' +
            MOC.map(function (n) {
              return '<button class="btn-sm' + (n === mt ? ' test' : ' learn') +
                     '" data-mt="' + n + '">' + n + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="mt-hang">' +
          '<span class="mt-lab2">Ngày thi</span>' +
          '<input type="date" id="mt-ngay" min="' + hnIso() + '"' +
            (prof.exam_date ? ' value="' + prof.exam_date + '"' : '') + '>' +
          (prof.exam_date ? '<button class="btn-sm learn" data-xoa="1">Gỡ ngày</button>' : '') +
        '</div>' +
        (diemNay == null
          ? '<div class="mt-hang">' +
              '<span class="mt-lab2">Điểm hiện tại</span>' +
              '<input type="number" id="mt-diem" min="10" max="990" step="5" placeholder="ví dụ 450"' +
                (prof.current_score ? ' value="' + prof.current_score + '"' : '') + '>' +
              '<button class="btn-sm learn" data-diem="1">Lưu</button>' +
              '<span class="mt-ghi">Có bài thi thử rồi thì Pacedemy tự lấy, khỏi nhập.</span>' +
            '</div>'
          : '') +
      '</div>';

    box.innerHTML =
      '<div class="tbox mt">' +
        '<div class="mt-head">' +
          '<h3>Chặng đường tới mục tiêu</h3>' +
          '<button class="mt-nut" data-sua="1">' + (moSua ? 'Xong' : 'Sửa') + '</button>' +
        '</div>' +
        '<div class="mt-cot">' + o + '</div>' +
        thanh +
        (nhip ? '<p class="mt-nhip">' + nhip + '</p>' : '') +
        sua +
      '</div>';

    gan();
  }

  function veTrong() {
    box.innerHTML =
      '<div class="tbox mt">' +
        '<div class="mt-head"><h3>Chặng đường tới mục tiêu</h3></div>' +
        '<p class="mt-nhip">Đặt mục tiêu điểm, Pacedemy sẽ theo dõi giúp bạn còn thiếu bao nhiêu ' +
          'và mỗi tuần cần tiến bao nhiêu điểm.</p>' +
        '<div class="mt-chips">' +
          MOC.map(function (n) {
            return '<button class="btn-sm learn" data-mt="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    gan();
  }

  function gan() {
    const nut = box.querySelector('[data-sua]');
    if (nut) nut.addEventListener('click', function () { moSua = !moSua; ve(); });

    box.querySelectorAll('[data-mt]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (await luu({ target_score: parseInt(b.dataset.mt, 10) })) {
          toast('Đã đặt mục tiêu ' + b.dataset.mt + ' điểm.', 'good');
          ve();
        }
      });
    });

    const ipNgay = box.querySelector('#mt-ngay');
    if (ipNgay) ipNgay.addEventListener('change', async function () {
      if (!ipNgay.value) return;
      if (await luu({ exam_date: ipNgay.value })) {
        toast('Đã đặt ngày thi.', 'good');
        ve();
      }
    });

    const xoa = box.querySelector('[data-xoa]');
    if (xoa) xoa.addEventListener('click', async function () {
      if (await luu({ exam_date: null })) { toast('Đã gỡ ngày thi.', 'good'); ve(); }
    });

    const nutDiem = box.querySelector('[data-diem]');
    if (nutDiem) nutDiem.addEventListener('click', async function () {
      const v = parseInt((box.querySelector('#mt-diem') || {}).value, 10);
      if (isNaN(v) || v < 10 || v > 990) { toast('Điểm TOEIC nằm trong khoảng 10–990.', 'bad'); return; }
      if (await luu({ current_score: v })) { toast('Đã lưu điểm hiện tại.', 'good'); ve(); }
    });
  }

  // ---------- Nạp số liệu ----------

  // Đổi một bài thi thử ra điểm TOEIC bằng đúng hàm mà trang Tiến độ dùng
  async function diemCuaDe(m) {
    if (!m || !m.payload || !m.payload.listening_total || !m.payload.reading_total) return null;
    const [{ data: l }, { data: r }] = await Promise.all([
      db.rpc('toeic_estimate', { p_section: 'listening', p_correct: m.listening_correct, p_total: m.payload.listening_total }),
      db.rpc('toeic_estimate', { p_section: 'reading',   p_correct: m.reading_correct,   p_total: m.payload.reading_total })
    ]);
    return (l == null || r == null) ? null : l + r;
  }

  (async function () {
    try {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      uid = user.id;

      const { data } = await db.from('profiles')
        .select('target_score, current_score, exam_date').eq('id', uid).single();
      prof = data || {};

      const { data: mocks } = await db.from('mock_tests')
        .select('submitted_at, listening_correct, reading_correct, payload')
        .eq('user_id', uid).not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true });

      const ds = mocks || [];
      soDe = ds.length;

      if (soDe) {
        diemNay = await diemCuaDe(ds[soDe - 1]);
        diemDau = soDe > 1 ? await diemCuaDe(ds[0]) : diemNay;
        if (diemNay != null) ngayNay = new Date(ds[soDe - 1].submitted_at);

        // Ghi lại để trang của cô cũng thấy đúng điểm mới nhất
        if (diemNay != null && diemNay !== prof.current_score) {
          db.from('profiles').update({ current_score: diemNay }).eq('id', uid);
          prof.current_score = diemNay;
        }
      }
    } catch (e) {
      return;   // mạng lỗi thì bỏ thẻ này, trang vẫn chạy bình thường
    }

    ve();
  })();
})();
