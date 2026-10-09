// ============================================================
// Pacedemy — âm hiệu ứng
//
// KHÔNG tải file nhạc nào. Mọi tiếng ở đây do trình duyệt tự tạo
// bằng Web Audio API. Ba lý do, cái nào cũng đủ để quyết:
//
//   1. Học viên Việt Nam phần lớn học bằng 3G/4G. Mỗi file tiếng
//      "ting" là vài chục KB phải tải, nhân với mỗi câu trả lời.
//      Tạo tại chỗ thì tốn 0 byte.
//   2. Tiếng tải trên mạng về hầu hết có bản quyền. Nghe thì giống
//      đồ miễn phí, nhưng web của cô là web thu tiền.
//   3. Không có file thì không có file hỏng, không có 404, không
//      phải lo R2 hay đường dẫn.
//
// ---- Vì sao mấy tiếng này nghe êm chứ không chói ----
//
// Sóng tam giác chứ không phải sóng vuông: sóng vuông nghe ra tiếng
// máy chơi game 8-bit, chói tai khi nghe cả trăm lần một buổi học.
// Qua thêm một bộ lọc cắt tần cao cho bớt gắt.
//
// Tiếng SAI cố ý KHÔNG phải tiếng "é" báo lỗi. Hai nốt trầm đi
// xuống, nhẹ thôi. Học viên sai một câu không phải là làm hỏng cái
// gì — tiếng chói mỗi lần sai chỉ làm người ta ngại bấm.
//
// ---- Mấy chỗ bắt buộc phải lo ----
//
// Trình duyệt không cho phát tiếng trước khi người dùng chạm vào
// trang. Nên AudioContext chỉ dựng lên ở lần chạm đầu tiên.
//
// Đang có audio chạy (bài nghe, giọng đọc) thì im, đừng chen vào.
//
// Bật tắt lưu trong máy từng người chứ không lưu lên server: một em
// học ở nhà mở loa, lên thư viện lại muốn tắt.
// ============================================================

const Am = (function () {

  const KHOA = 'pacedemy-am';

  let ctx = null;
  let loc = null;
  let chinh = null;
  let bat = true;

  try {
    const d = localStorage.getItem(KHOA);
    if (d === '0') bat = false;
  } catch (e) { /* chế độ ẩn danh thì coi như bật */ }

  // ---------- dựng máy phát ----------

  function may() {
    if (ctx) return ctx;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    try { ctx = new AC(); } catch (e) { return null; }

    // Cắt tần cao cho tiếng bớt gắt, rồi hạ âm lượng chung xuống thấp.
    // 0.16 nghe như tiếng báo của điện thoại chứ không phải tiếng game.
    loc = ctx.createBiquadFilter();
    loc.type = 'lowpass';
    loc.frequency.value = 3600;

    chinh = ctx.createGain();
    chinh.gain.value = 0.16;

    loc.connect(chinh);
    chinh.connect(ctx.destination);
    return ctx;
  }

  // Trình duyệt treo AudioContext khi chưa có thao tác của người dùng.
  // Mở lại ở lần chạm đầu tiên rồi gỡ luôn bộ lắng nghe.
  function danhThuc() {
    const c = may();
    if (c && c.state === 'suspended') c.resume().catch(function () {});
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
    document.addEventListener(e, danhThuc, { once: true, passive: true });
  });

  // ---------- đang có tiếng khác thì nhường ----------

  function dangNghe() {
    const ds = document.querySelectorAll('audio, video');
    for (let i = 0; i < ds.length; i++) {
      if (!ds[i].paused && !ds[i].ended) return true;
    }
    // Giọng máy đọc của trình duyệt cũng tính
    return !!(window.speechSynthesis && window.speechSynthesis.speaking);
  }

  // ---------- một nốt ----------
  //
  // Lên xuống âm lượng bằng đường cong mũ, và không bao giờ về đúng 0
  // — về 0 là nghe "tách" ở cuối mỗi nốt.

  function not(f, tre, dai, truot) {
    const c = may();
    if (!c) return;

    const t = c.currentTime + tre;

    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    if (truot) o.frequency.exponentialRampToValueAtTime(truot, t + dai);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dai);

    o.connect(g);
    g.connect(loc);
    o.start(t);
    o.stop(t + dai + 0.02);
  }

  function choiDuoc() {
    if (!bat) return false;
    if (dangNghe()) return false;
    const c = may();
    if (!c) return false;
    if (c.state === 'suspended') { c.resume().catch(function () {}); }
    return c.state !== 'closed';
  }

  // ---------- mấy tiếng dùng được ----------

  // Đúng: hai nốt đi lên, gọn. La5 rồi Rê6.
  //
  // Đúng liên tiếp thì cao dần lên — nghe là biết mình đang có đà, mà
  // không cần hiện thêm chữ nào lên màn hình. Chặn ở bảy bậc, chứ câu
  // thứ ba mươi mà vẫn cao thêm là chói tai.
  //
  // Chuỗi đếm ngay trong này, không bắt từng trang phải tự đếm rồi
  // nhớ gọi cho đúng.
  let chuoi = 0;

  function dung() {
    chuoi++;
    if (!choiDuoc()) return;

    const len = Math.pow(2, Math.min(chuoi - 1, 7) / 12);
    not(880 * len, 0, 0.11);
    not(1174.7 * len, 0.075, 0.17);
  }

  // Sai: hai nốt trầm đi xuống, nhẹ. Không phải tiếng còi báo lỗi.
  function sai() {
    chuoi = 0;
    if (!choiDuoc()) return;
    not(311.1, 0, 0.14);
    not(261.6, 0.1, 0.24);
  }

  // Sang bài mới thì chuỗi tính lại từ đầu
  function moi() { chuoi = 0; }

  // Xong bài. ty là tỉ lệ đúng, 0 tới 1.
  // Làm tốt thì có nốt cao chốt lại; làm chưa tốt thì dừng ở hợp âm
  // phẳng, không hụt hẫng mà cũng không tung hô quá lời.
  function xong(ty) {
    chuoi = 0;
    if (!choiDuoc()) return;

    const vui = (ty == null ? 1 : ty) >= 0.7;
    const n = [523.3, 659.3, 784];        // Đô5 Mi5 Sol5

    n.forEach(function (f, i) { not(f, i * 0.1, 0.22); });
    if (vui) not(1046.5, 0.3, 0.5);       // Đô6 chốt lại
  }

  // Mở một thứ gì đó ra — dùng cho lật thẻ, mở đáp án
  function nhe() {
    if (!choiDuoc()) return;
    not(740, 0, 0.07);
  }

  // ---------- bật tắt ----------

  function dat(v) {
    bat = !!v;
    try { localStorage.setItem(KHOA, bat ? '1' : '0'); } catch (e) {}
    veNut();
    // Bật lên thì cho nghe thử ngay một tiếng, để biết nó kêu thế nào
    if (bat) { chuoi = 0; danhThuc(); setTimeout(function () { dung(); }, 60); }
  }

  function co() { return bat; }

  // ---------- nút trong thanh menu ----------

  function veNut() {
    const b = document.getElementById('nut-am');
    if (!b) return;
    b.textContent = bat ? 'Âm thanh: bật' : 'Âm thanh: tắt';
    b.setAttribute('aria-pressed', bat ? 'true' : 'false');
  }

  // Thanh menu do nav.js dựng. Nếu am.js chạy trước thì chưa có chỗ
  // để gắn nút — thử lại vài nhịp rồi thôi, chứ không chờ mãi.
  let dem = 0;
  function ganNut() {
    if (document.getElementById('nut-am')) return;

    const chan = document.querySelector('.side-foot');
    if (!chan) {
      if (++dem < 20) setTimeout(ganNut, 120);
      return;
    }

    const b = document.createElement('button');
    b.className = 'side-back';
    b.id = 'nut-am';
    b.type = 'button';
    b.addEventListener('click', function () { dat(!bat); });

    chan.insertBefore(b, document.getElementById('nut-nen') ||
                         document.getElementById('btn-logout') || null);
    veNut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ganNut);
  } else {
    ganNut();
  }

  return {
    dung: dung, sai: sai, xong: xong, moi: moi, nhe: nhe,
    dat: dat, co: co
  };
})();
