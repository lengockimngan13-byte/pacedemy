// ============================================================
// Pacedemy — ô "Gói" trong hồ sơ học viên
//
// Ba đường để một em có bản đầy đủ:
//   1. Em đang là thành viên active của một lớp → có sẵn, không cần
//      cô bật gì. Học viên đóng tiền học lớp rồi.
//   2. Cô bật gói trả phí cho em, có hoặc không ngày hết hạn.
//   3. Em là giáo viên.
//
// Chỗ này quan trọng với cô: nếu em đang trong lớp, ô gói hiện "free"
// mà em VẪN dùng được bản đầy đủ. Không nói rõ thì cô tưởng web hỏng.
// Nên ô này nói thẳng đường nào đang có hiệu lực.
// ============================================================

const StudentGoi = (function () {
  let sid = null;
  let ho = null;      // { goi, goi_het_han }
  let trongLop = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ngay(d) {
    if (!d) return '';
    const p = String(d).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // KHÔNG dùng toISOString(): nó đổi sang giờ UTC, mà Việt Nam là
  // UTC+7, nên nửa đêm giờ mình rơi về 17h hôm trước bên UTC và ngày
  // bị lùi một hôm. Cô gia hạn 90 ngày mà thành 89 là sai tiền của
  // người ta.
  function ngayISO(d) {
    const th = d.getMonth() + 1, ng = d.getDate();
    return d.getFullYear() + '-' + (th < 10 ? '0' : '') + th + '-' + (ng < 10 ? '0' : '') + ng;
  }

  function homNay() { return ngayISO(new Date()); }

  function conHan() {
    if (ho.goi !== 'tra-phi') return false;
    if (!ho.goi_het_han) return true;
    return ho.goi_het_han >= homNay();
  }

  async function nap(id) {
    sid = id;

    const { data: p } = await db.from('profiles')
      .select('goi, goi_het_han').eq('id', sid).maybeSingle();
    ho = p || { goi: 'free', goi_het_han: null };

    const { data: m } = await db.from('class_members')
      .select('id').eq('student_id', sid).eq('status', 'active').limit(1);
    trongLop = !!(m && m.length);

    ve();
  }

  function ve() {
    const o = document.getElementById('s-goi');
    if (!o) return;

    const co = trongLop || conHan();
    const hh = ho.goi_het_han || '';

    let vi;
    if (trongLop) {
      vi = 'Em đang học trong lớp của cô, nên <b>có bản đầy đủ</b> suốt thời gian còn ' +
           'trong lớp — không cần bật gói riêng.';
    } else if (conHan()) {
      vi = 'Cô đã bật <b>bản đầy đủ</b> cho em' +
           (ho.goi_het_han ? ', tới ngày <b>' + ngay(ho.goi_het_han) + '</b>' : ', không hạn') + '.';
    } else if (ho.goi === 'tra-phi') {
      vi = 'Gói trả phí của em <b>đã hết hạn</b> ngày ' + ngay(ho.goi_het_han) +
           '. Em đang dùng bản miễn phí.';
    } else {
      vi = 'Em đang dùng <b>bản miễn phí</b>: luyện nói theo câu mẫu không giới hạn, ' +
           'nhưng chưa có phần chấm ngữ pháp / từ vựng / mạch lạc và điểm phát âm.';
    }

    o.innerHTML =
      '<div class="goi-dau">' +
        '<h3>Gói</h3>' +
        '<span class="goi-cho ' + (co ? 'on' : '') + '">' +
          (co ? 'Bản đầy đủ' : 'Bản miễn phí') + '</span>' +
      '</div>' +

      '<p class="goi-vi">' + vi + '</p>' +

      '<div class="goi-hang">' +
        '<label class="goi-o"><span>Gói cô đặt cho em</span>' +
          '<select id="goi-chon">' +
            '<option value="free"' + (ho.goi === 'free' ? ' selected' : '') + '>Miễn phí</option>' +
            '<option value="tra-phi"' + (ho.goi === 'tra-phi' ? ' selected' : '') + '>Trả phí</option>' +
          '</select></label>' +
        '<label class="goi-o"><span>Hết hạn (để trống là không hạn)</span>' +
          '<input type="date" id="goi-han" value="' + esc(hh) + '"></label>' +
      '</div>' +

      '<div class="goi-nut">' +
        '<button class="btn btn-gold" id="goi-luu" type="button">Lưu gói</button>' +
        '<button class="btn btn-line" id="goi-30" type="button">Trả phí 30 ngày</button>' +
        '<button class="btn btn-line" id="goi-90" type="button">Trả phí 90 ngày</button>' +
      '</div>' +
      '<p class="goi-bao" id="goi-bao"></p>';

    document.getElementById('goi-luu').addEventListener('click', function () {
      luu(document.getElementById('goi-chon').value,
          document.getElementById('goi-han').value || null);
    });
    document.getElementById('goi-30').addEventListener('click', function () { them(30); });
    document.getElementById('goi-90').addEventListener('click', function () { them(90); });
  }

  // Cộng thêm ngày. Nếu gói còn hạn thì cộng tiếp từ ngày hết hạn cũ,
  // chứ không tính lại từ hôm nay — nếu không thì cô gia hạn sớm một
  // tuần là em mất một tuần.
  function them(so) {
    const hnay = new Date();
    const moc = (conHan() && ho.goi_het_han) ? new Date(ho.goi_het_han + 'T00:00:00') : hnay;
    const d = new Date(Math.max(moc.getTime(), hnay.getTime()));
    d.setDate(d.getDate() + so);
    luu('tra-phi', ngayISO(d));
  }

  async function luu(goi, han) {
    const bao = document.getElementById('goi-bao');
    bao.style.color = 'var(--ink-soft)';
    bao.textContent = 'Đang lưu…';

    // Để miễn phí thì xoá luôn ngày hết hạn, kẻo lần sau bật lại nó
    // dùng ngày cũ đã qua.
    const o = goi === 'tra-phi'
      ? { goi: 'tra-phi', goi_het_han: han }
      : { goi: 'free', goi_het_han: null };

    const { error } = await db.from('profiles').update(o).eq('id', sid);

    if (error) {
      bao.style.color = '#B4442F';
      bao.textContent = 'Không lưu được: ' + error.message;
      return;
    }

    ho = o;
    ve();
    const b2 = document.getElementById('goi-bao');
    b2.style.color = 'var(--teal)';
    b2.textContent = 'Đã lưu. Em vào lại trang luyện nói là thấy ngay.';
  }

  return { nap: nap };
})();
