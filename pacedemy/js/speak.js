// ============================================================
// Pacedemy — phát âm tiếng Anh
//
// Hai nguồn, ưu tiên nguồn một:
//
//   1. File ghi âm người thật, nếu từ đó có. Giọng giống hệt nhau
//      trên mọi máy, vì ai cũng nghe cùng một file.
//   2. Giọng máy có sẵn trong điện thoại (Web Speech API).
//
// Ba lỗi của bản cũ, đều làm giọng nghe kỳ và không đồng nhất:
//
//   - Lấy giọng đầu tiên khớp en-US. Một điện thoại có cả chục giọng
//     en-US chất lượng khác nhau, thứ tự lại đổi theo máy và theo
//     lần mở trang, nên mỗi lần nghe một giọng khác.
//   - Đọc ngay cả khi danh sách giọng chưa kịp về. Lúc đó trình duyệt
//     tự chọn theo lang của trang, mà trang để lang="vi", thành ra
//     đọc tiếng Anh bằng giọng tiếng Việt. Đây là lý do nghe kỳ nhất.
//   - Tốc độ 0.8, chậm hơn người nói thật nhiều. Luyện nghe bằng
//     giọng chậm thì ra phòng thi nghe không kịp.
//
// Bản này chấm điểm rồi chọn giọng tốt nhất một lần, nhớ lại trong
// máy, nên từ đó về sau luôn là cùng một giọng.
//
//   Speak.say(text, kieu, xong)   — đọc, kieu: 'US' | 'UK' | 'AU'
//   Speak.phat(url, text, xong)   — có file thì phát file, không thì đọc
//   Speak.co()                    — máy này đọc được không
//   Speak.dsGiong()               — danh sách giọng tiếng Anh để chọn
//   Speak.doiGiong(uri)           — chốt một giọng, nhớ lại
// ============================================================

const Speak = (function () {

  const KHOA = 'pacedemy-giong';

  let giong = [];
  let sanSang = false;
  let doiGoi = [];        // lời gọi tới trước khi danh sách giọng về
  let dangPhat = null;    // thẻ audio đang chạy

  const VUNG = { US: 'en-US', UK: 'en-GB', AU: 'en-AU' };

  // Tên những giọng nghe tự nhiên, gặp nhiều trên máy thật.
  // Có tên trong đây thì cộng điểm, không có cũng không sao.
  const TEN_TOT = [
    'samantha', 'alex', 'aria', 'jenny', 'guy', 'ava', 'allison',
    'google us english', 'google uk english female', 'google uk english male',
    'microsoft aria', 'microsoft guy', 'microsoft sonia', 'microsoft ryan',
    'siri', 'karen', 'daniel', 'moira', 'tessa', 'serena'
  ];

  // Giọng nén, giọng cũ, giọng máy móc — nghe rè và méo
  const TEN_XAU = ['compact', 'eloquence', 'espeak', 'pico', 'novelty', 'fred', 'albert',
                   'bad news', 'good news', 'bubbles', 'bells', 'cellos', 'zarvox',
                   'trinoids', 'whisper', 'organ', 'boing', 'jester', 'wobble'];

  function co() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // ---------- Chấm điểm giọng ----------
  // Chấm rồi sắp xếp, thay vì lấy cái đầu tiên tìm thấy. Nhờ vậy máy
  // nào cũng ra giọng tốt nhất nó có, và lần nào cũng ra đúng giọng đó.

  function diem(v, muon) {
    const ten = (v.name || '').toLowerCase();
    const lang = (v.lang || '').replace('_', '-');
    let d = 0;

    if (lang === muon) d += 100;                       // đúng vùng giọng
    else if (lang.indexOf('en-') === 0) d += 60;       // tiếng Anh vùng khác
    else if (lang.indexOf('en') === 0) d += 50;
    else return -1;                                    // không phải tiếng Anh thì loại hẳn

    // Giọng tải từ mạng thường là bản chất lượng cao
    if (v.localService === false) d += 25;

    for (const t of TEN_TOT) if (ten.indexOf(t) >= 0) { d += 30; break; }
    for (const t of TEN_XAU) if (ten.indexOf(t) >= 0) { d -= 60; break; }

    if (ten.indexOf('enhanced') >= 0 || ten.indexOf('premium') >= 0 ||
        ten.indexOf('neural') >= 0) d += 20;

    if (v.default) d += 5;
    return d;
  }

  function sapXep(muon) {
    return giong
      .map(function (v) { return { v: v, d: diem(v, muon) }; })
      .filter(function (x) { return x.d >= 0; })
      // Hoà điểm thì xếp theo tên, để lần nào cũng ra đúng một giọng
      .sort(function (a, b) { return b.d - a.d || a.v.name.localeCompare(b.v.name); })
      .map(function (x) { return x.v; });
  }

  function chon(kieu) {
    const muon = VUNG[kieu] || VUNG.US;

    // Giọng cô hoặc học viên đã tự chọn thì tôn trọng
    let nho = null;
    try { nho = localStorage.getItem(KHOA); } catch (e) { nho = null; }
    if (nho) {
      const v = giong.find(function (x) { return x.voiceURI === nho; });
      if (v) return v;
    }

    return sapXep(muon)[0] || null;
  }

  // ---------- Nạp danh sách giọng ----------
  // Trên iOS và Chrome danh sách về sau trang một nhịp. Đọc trước lúc
  // đó là trình duyệt tự chọn theo lang của trang — trang để lang="vi"
  // nên nó đọc tiếng Anh bằng giọng Việt. Phải chờ.

  function nap() {
    if (!co()) return;

    const lay = function () {
      const ds = window.speechSynthesis.getVoices();
      if (!ds || !ds.length) return false;
      giong = ds;
      sanSang = true;
      const cho = doiGoi;
      doiGoi = [];
      cho.forEach(function (f) { f(); });
      return true;
    };

    if (lay()) return;

    window.speechSynthesis.addEventListener('voiceschanged', lay);

    // Vài máy không bắn voiceschanged, nên hỏi lại vài lần rồi thôi
    let lan = 0;
    const dongHo = setInterval(function () {
      if (lay() || ++lan > 20) clearInterval(dongHo);
    }, 150);

    // Quá 3 giây vẫn chưa có thì cho chạy, còn hơn im lặng mãi
    setTimeout(function () {
      if (sanSang) return;
      sanSang = true;
      const cho = doiGoi;
      doiGoi = [];
      cho.forEach(function (f) { f(); });
    }, 3000);
  }

  // ---------- Đọc bằng giọng máy ----------

  function docThat(text, kieu, xong) {
    try {
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      const v = chon(kieu);

      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        // Không có giọng tiếng Anh nào. Vẫn phải ghi rõ lang, nếu
        // không trình duyệt lấy lang của trang là tiếng Việt.
        u.lang = VUNG[kieu] || VUNG.US;
      }

      // Gần tốc độ người nói thật. Câu dài thì chậm hơn chút cho dễ bắt.
      const soChu = text.trim().split(/\s+/).length;
      u.rate = soChu > 6 ? 0.92 : 0.98;
      u.pitch = 1;

      if (xong) {
        let daGoi = false;
        const mot = function () { if (!daGoi) { daGoi = true; xong(); } };
        u.onend = mot;
        u.onerror = mot;
      }

      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      if (xong) xong();
      return false;
    }
  }

  function say(text, kieu, xong) {
    if (!text || !co()) { if (xong) xong(); return false; }

    if (!sanSang) {
      doiGoi.push(function () { docThat(text, kieu, xong); });
      return true;
    }
    return docThat(text, kieu, xong);
  }

  // ---------- Phát file ghi âm ----------
  // Có file thì luôn ưu tiên: cùng một giọng trên mọi máy, và là
  // giọng người thật chứ không phải máy đọc.

  // Trong kho còn giá trị 'khong-co' đánh dấu từ đã dò mà không có
  // file. Đem chuỗi đó làm địa chỉ thì trình duyệt đi tải một trang
  // không tồn tại rồi mới chịu báo lỗi — chậm và bẩn log.
  function laFile(url) {
    return typeof url === 'string' &&
      (url.charAt(0) === '/' || /^https?:\/\//i.test(url));
  }

  // File của Pacedemy nằm trong /media/phat-am/<giọng>/. Học viên bấm
  // nút giọng Anh mà mình phát file giọng Mỹ thì nghe sai hẳn, nên
  // trường hợp đó bỏ file, để máy đọc đúng giọng được yêu cầu.
  // Không nói rõ muốn giọng nào thì file nào cũng được.
  function hopGiong(url, kieu) {
    if (!kieu) return true;
    const m = String(url).match(/\/media\/phat-am\/([a-z]+)\//);
    if (!m) return true;                       // file ngoài, không biết giọng
    const cua = m[1] === 'cf' ? 'us' : m[1];   // giọng sẵn của Cloudflare là giọng Mỹ
    return cua === String(kieu).toLowerCase();
  }

  function phat(url, text, kieu, xong) {
    thoi();

    if (!laFile(url) || !hopGiong(url, kieu)) return say(text, kieu, xong);

    try {
      const a = new Audio(url);
      dangPhat = a;

      let daXong = false;
      const mot = function () { if (!daXong) { daXong = true; dangPhat = null; if (xong) xong(); } };

      a.onended = mot;
      // File hỏng hoặc máy chặn thì quay về giọng máy, đừng im lặng
      a.onerror = function () {
        if (daXong) return;
        daXong = true;
        dangPhat = null;
        say(text, kieu, xong);
      };

      const p = a.play();
      if (p && p.catch) p.catch(function () { a.onerror(); });
      return true;
    } catch (e) {
      return say(text, kieu, xong);
    }
  }

  function thoi() {
    if (dangPhat) {
      try { dangPhat.pause(); } catch (e) {}
      dangPhat = null;
    }
    if (co()) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  // ---------- Cho người dùng tự chọn giọng ----------

  function dsGiong() {
    return sapXep(VUNG.US).map(function (v) {
      return { uri: v.voiceURI, ten: v.name, vung: v.lang };
    });
  }

  function doiGiong(uri) {
    try {
      if (uri) localStorage.setItem(KHOA, uri);
      else localStorage.removeItem(KHOA);
    } catch (e) {}
  }

  function giongDangDung() {
    try { return localStorage.getItem(KHOA) || ''; } catch (e) { return ''; }
  }

  nap();

  return {
    say: say, phat: phat, co: co, thoi: thoi,
    dsGiong: dsGiong, doiGiong: doiGiong, giongDangDung: giongDangDung
  };
})();
