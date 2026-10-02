// ============================================================
// Pacedemy — đọc tiếng Anh bằng giọng có sẵn của máy
//
// Dùng Web Speech API, tức giọng đọc cài sẵn trong điện thoại hay
// trình duyệt của học viên. Không tải file, không tốn dung lượng,
// không tốn tiền, và chạy được cả khi mạng chậm.
//
// Cách dùng:
//   Speak.say('contract');          // giọng Mỹ
//   Speak.say('contract', 'UK');    // giọng Anh
//   Speak.co()                      // máy có đọc được không
//
// Máy nào không có giọng tiếng Anh thì mọi lời gọi đều im lặng
// bỏ qua, không báo lỗi, không làm hỏng trang.
// ============================================================

const Speak = (function () {

  let giong = [];

  function nap() {
    if (!('speechSynthesis' in window)) return;
    giong = window.speechSynthesis.getVoices();
    // Trên Chrome danh sách giọng về chậm hơn trang một nhịp
    window.speechSynthesis.onvoiceschanged = function () {
      giong = window.speechSynthesis.getVoices();
    };
  }

  function co() {
    return ('speechSynthesis' in window);
  }

  function chon(kieu) {
    const muon = kieu === 'UK' ? 'en-GB' : 'en-US';

    let v = giong.find(function (x) {
      return x.lang === muon || x.lang === muon.replace('-', '_');
    });
    if (v) return v;

    // Không có đúng vùng thì lấy giọng tiếng Anh bất kỳ
    v = giong.find(function (x) { return x.lang && x.lang.indexOf('en') === 0; });
    return v || null;
  }

  // Trả về true nếu đã phát, false nếu máy không đọc được
  function say(text, kieu, xong) {
    if (!text || !co()) return false;

    try {
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      const v = chon(kieu);
      if (v) u.voice = v;
      u.lang = kieu === 'UK' ? 'en-GB' : 'en-US';
      // Câu dài đọc chậm hơn một chút cho dễ nghe
      u.rate = text.split(/\s+/).length > 4 ? 0.85 : 0.8;

      if (xong) { u.onend = xong; u.onerror = xong; }

      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  function thoi() {
    if (co()) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  nap();

  return { say: say, co: co, thoi: thoi };
})();
