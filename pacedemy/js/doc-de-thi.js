// ============================================================
// Pacedemy — đọc đề thi dạng văn bản thô
//
// Bóc thẳng từ chữ copy trong PDF hoặc Word ra thành câu hỏi, không
// qua ChatGPT, không qua ai cả. Chạy hẳn trong trình duyệt, tốn 0đ,
// không cần khoá AI.
//
// Đề TOEIC in ra giấy chỗ nào cũng gần giống nhau:
//
//     101. The company will ______ a new director next month.
//     (A) take on   (B) take off   (C) take up   (D) take after
//
// rồi cuối tập là bảng đáp án:
//
//     101. A   102. C   103. B ...
//
// Chỗ khó không phải là tách chữ, mà là BẢNG ĐÁP ÁN. Lệch một dòng
// thôi là cả trăm câu sai đáp án mà nhìn vào vẫn thấy bình thường —
// học viên làm đúng bị báo sai, cô không biết đường nào mà lần. Nên
// ở đây đáp án luôn ghép theo SỐ CÂU, không bao giờ ghép theo thứ
// tự. Câu nào không tìm thấy số tương ứng thì để trống cho cô điền,
// chứ không đoán.
// ============================================================

const DocDe = (function () {

  // Gạch chân trong PDF ra đủ kiểu: _____, ....., -----, hay khoảng
  // trắng dài. Quy hết về một dạng cho khớp với kho đang có.
  function chuanCho(s) {
    return s
      .replace(/[   ]/g, ' ')          // khoảng trắng dính
      .replace(/[‘’]/g, "'")                 // nháy cong
      .replace(/[“”]/g, '"')
      .replace(/[_—–-]{3,}/g, '______')      // gạch dài
      .replace(/\.{4,}/g, '______');                   // chấm dài
  }

  // ---------- bảng đáp án ----------
  //
  // Nhận: "101. A" · "101-A" · "101 A" · "101) A" · "101：A"
  // Một dòng có thể chứa nhiều cặp.

  function docDapAn(chu) {
    const o = {};
    const re = /\b(\d{1,3})\s*[.):\-–—]?\s*([A-Da-d])\b/g;
    let m;
    while ((m = re.exec(chu))) {
      const so = parseInt(m[1], 10);
      // Không chặn ở 200 như đề TOEIC thật: đề cô tự đánh số kiểu gì cũng được
      if (so >= 1 && so <= 999) o[so] = m[2].toUpperCase();
    }
    return o;
  }

  // Tìm xem từ đâu trở đi là bảng đáp án. Hai dấu hiệu: có chữ "đáp
  // án"/"answer key", hoặc gặp một vùng mà gần như dòng nào cũng chỉ
  // là "số + chữ cái" chứ không có câu chữ gì.
  function cheoDapAn(dong) {
    for (let i = 0; i < dong.length; i++) {
      if (/^\s*(đáp\s*án|dap\s*an|answer\s*keys?|answers?)\b/i.test(dong[i])) return i;
    }

    // Không có tiêu đề thì soi từ CUỐI tập ngược lên: mấy dòng cuối
    // mà không còn chữ nghĩa gì, chỉ toàn "số + chữ cái", thì đó là
    // bảng đáp án. Nhiều tập đề in bảng đáp án trần như vậy, không
    // ghi tiêu đề gì cả.
    const thuanCap = /^(\s*\d{1,3}\s*[.):\-–—]?\s*[A-Da-d]\s*[,;]?)+$/;

    let dau = -1;
    for (let i = dong.length - 1; i >= 0; i--) {
      const t = dong[i].trim();
      if (!t) continue;                 // dòng trống thì bỏ qua, đi tiếp
      if (thuanCap.test(t)) { dau = i; continue; }
      break;                            // gặp dòng có chữ là hết vùng đáp án
    }

    return dau;
  }

  // ---------- phương án ----------
  //
  // Nhận: "(A) chữ" · "A. chữ" · "A) chữ" · "A chữ" (chỉ khi đứng đầu
  // dòng). Bốn phương án có thể nằm chung một dòng hoặc mỗi cái một
  // dòng, nên cắt theo vị trí nhãn chứ không cắt theo dòng.

  const NHAN = /(?:^|[\s\n])[\(\[]?([A-Da-d])[\)\].]\s+/g;

  function tachPhuongAn(chu) {
    const moc = [];
    let m;
    NHAN.lastIndex = 0;
    while ((m = NHAN.exec(chu))) {
      moc.push({ chu_cai: m[1].toUpperCase(), dau: m.index, sau: NHAN.lastIndex });
    }

    // Phải thấy đủ A B C D theo đúng thứ tự thì mới chắc đây là bốn
    // phương án, chứ không phải chữ "A." nào đó lạc trong câu.
    const can = ['A', 'B', 'C', 'D'];
    const chon = [];
    let k = 0;
    for (const x of moc) {
      if (x.chu_cai === can[k]) { chon.push(x); k++; }
      if (k === 4) break;
    }
    if (chon.length < 4) return null;

    const pa = {};
    for (let i = 0; i < 4; i++) {
      const het = i < 3 ? chon[i + 1].dau : chu.length;
      pa[can[i]] = chu.slice(chon[i].sau, het).trim().replace(/\s+/g, ' ');
    }

    return { pa: pa, dau: chon[0].dau };
  }

  // ---------- đọc cả tập ----------

  function doc(raw, macDinh) {
    const chu = chuanCho(String(raw || '').replace(/\r\n?/g, '\n'));
    const dong = chu.split('\n');

    const cheo = cheoDapAn(dong);
    const phanDe = (cheo >= 0 ? dong.slice(0, cheo) : dong).join('\n');
    const dapAn = cheo >= 0 ? docDapAn(dong.slice(cheo).join('\n')) : {};

    // Cắt theo số câu đứng đầu dòng
    const khuc = [];
    const reSo = /^[ \t]*(\d{1,3})[.)]\s*/gm;
    let m, truoc = null;
    while ((m = reSo.exec(phanDe))) {
      if (truoc) truoc.het = m.index;
      truoc = { so: parseInt(m[1], 10), dau: reSo.lastIndex, het: phanDe.length };
      khuc.push(truoc);
    }

    const ra = [];
    for (const k of khuc) {
      const than = phanDe.slice(k.dau, k.het).trim();
      if (!than) continue;

      const t = tachPhuongAn(than);
      if (!t) continue;                       // không đủ bốn phương án thì bỏ

      const cauHoi = than.slice(0, t.dau).trim().replace(/\s+/g, ' ');
      if (!cauHoi) continue;

      ra.push({
        so: k.so,
        part: 5,
        question_text: cauHoi,
        A: t.pa.A, B: t.pa.B, C: t.pa.C, D: t.pa.D,
        correct_answer: dapAn[k.so] || '',    // không có thì để trống, KHÔNG đoán
        explanation: '',
        translation_vi: '',
        key_point: '',
        topic_tag: macDinh || '',
        difficulty: 2
      });
    }

    return {
      cau: ra,
      so_dap_an: Object.keys(dapAn).length,
      thieu_dap_an: ra.filter(function (x) { return !x.correct_answer; }).length
    };
  }

  return { doc: doc, docDapAn: docDapAn, chuanCho: chuanCho };
})();
