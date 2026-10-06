// ============================================================
// Pacedemy — ghi âm rồi đổi sang WAV 16kHz mono
//
// Vì sao phải đổi: trình duyệt ghi ra định dạng nào là tuỳ máy —
// Chrome ra webm/opus, Safari ra mp4/aac. Azure chỉ nhận WAV PCM
// 16kHz mono hoặc OGG Opus. Nên mình giải mã đoạn vừa ghi rồi tự
// đóng gói lại thành WAV.
//
// Đổi ngay trong trình duyệt chứ không gửi file gốc lên để máy chủ
// đổi: file WAV 16k nhẹ hơn hẳn, và máy chủ Worker không có sẵn thư
// viện giải mã âm thanh.
//
// Chỗ này cũng là lý do phần luyện nói chạy được trên iPhone, khác
// với cách cũ dùng Web Speech API — Safari trên iOS không hỗ trợ
// Web Speech API, nhưng ghi âm thì có.
//
//   GhiAm.batDau()  → xin micro, bắt đầu ghi
//   GhiAm.dungLai() → trả về { wav: Blob, nghe: Blob, giay: số giây }
//   GhiAm.dangGhi() → có đang ghi không
//   GhiAm.huy()     → bỏ, tắt micro
// ============================================================

const GhiAm = (function () {

  const MAU = 16000;        // Azure cần đúng 16kHz
  const TOI_DA = 30;        // Azure chấm phát âm tối đa 30 giây

  let mr = null;
  let stream = null;
  let manh = [];
  let batDauLuc = 0;

  function dangGhi() { return !!mr && mr.state === 'recording'; }

  async function batDau() {
    if (dangGhi()) return;

    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    manh = [];
    // Để trình duyệt tự chọn định dạng nó ghi tốt nhất; mình đổi sau.
    mr = new MediaRecorder(stream);
    mr.ondataavailable = function (e) { if (e.data && e.data.size) manh.push(e.data); };
    mr.start();
    batDauLuc = Date.now();
  }

  function tatMicro() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
  }

  function huy() {
    try { if (dangGhi()) mr.stop(); } catch (e) {}
    mr = null; manh = [];
    tatMicro();
  }

  function dungLai() {
    return new Promise(function (xong, hong) {
      if (!mr) return hong(new Error('Chưa ghi âm'));

      mr.onstop = async function () {
        tatMicro();
        const giay = (Date.now() - batDauLuc) / 1000;
        const nghe = new Blob(manh, { type: mr.mimeType || 'audio/webm' });
        mr = null;

        if (!nghe.size) return hong(new Error('Không ghi được tiếng nào'));

        let wav;
        try { wav = await sangWav(nghe); }
        catch (e) { return hong(new Error('Không đổi được định dạng ghi âm')); }

        xong({ wav: wav, nghe: nghe, giay: Math.min(giay, TOI_DA) });
      };

      try { mr.stop(); } catch (e) { hong(e); }
    });
  }

  // ---------- đổi sang WAV ----------

  async function sangWav(blob) {
    const buf = await blob.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();

    let am;
    try { am = await ctx.decodeAudioData(buf); }
    finally { /* đóng sau, còn dùng ở dưới */ }

    // Gộp về một kênh. Thu bằng hai micro thì hai kênh gần giống nhau,
    // cộng lại rồi chia đôi cho khỏi vỡ tiếng.
    const n = am.length;
    const kenh = am.numberOfChannels;
    const mot = new Float32Array(n);

    for (let c = 0; c < kenh; c++) {
      const d = am.getChannelData(c);
      for (let i = 0; i < n; i++) mot[i] += d[i] / kenh;
    }

    const nho = doiTanSo(mot, am.sampleRate, MAU);
    try { ctx.close(); } catch (e) {}

    return dongGoiWav(nho, MAU);
  }

  // Hạ tần số lấy mẫu. Lấy trung bình cả khoảng thay vì nhặt một mẫu,
  // nếu không tiếng sẽ rè vì mất mẫu ở giữa.
  function doiTanSo(vao, tuMau, denMau) {
    if (tuMau === denMau) return vao;

    const ti = tuMau / denMau;
    const ra = new Float32Array(Math.round(vao.length / ti));

    for (let i = 0; i < ra.length; i++) {
      const dau = Math.round(i * ti);
      const cuoi = Math.min(Math.round((i + 1) * ti), vao.length);
      let tong = 0, dem = 0;
      for (let j = dau; j < cuoi; j++) { tong += vao[j]; dem++; }
      ra[i] = dem ? tong / dem : 0;
    }

    return ra;
  }

  function dongGoiWav(mau, tanSo) {
    const n = mau.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);

    const chu = function (vt, s) {
      for (let i = 0; i < s.length; i++) v.setUint8(vt + i, s.charCodeAt(i));
    };

    chu(0, 'RIFF');
    v.setUint32(4, 36 + n * 2, true);
    chu(8, 'WAVE');
    chu(12, 'fmt ');
    v.setUint32(16, 16, true);          // độ dài khối fmt
    v.setUint16(20, 1, true);           // PCM
    v.setUint16(22, 1, true);           // một kênh
    v.setUint32(24, tanSo, true);
    v.setUint32(28, tanSo * 2, true);   // byte mỗi giây
    v.setUint16(32, 2, true);           // byte mỗi mẫu
    v.setUint16(34, 16, true);          // bit mỗi mẫu
    chu(36, 'data');
    v.setUint32(40, n * 2, true);

    for (let i = 0; i < n; i++) {
      // Kẹp lại trước khi đổi sang số nguyên, tiếng to quá sẽ vỡ
      const x = Math.max(-1, Math.min(1, mau[i]));
      v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
    }

    return new Blob([buf], { type: 'audio/wav' });
  }

  function co() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
              window.MediaRecorder);
  }

  return {
    co: co, batDau: batDau, dungLai: dungLai, huy: huy,
    dangGhi: dangGhi, TOI_DA: TOI_DA
  };
})();
