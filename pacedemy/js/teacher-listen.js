// ============================================================
// Pacedemy — nhập bài nghe Part 1 đến 4
//
// Trình tự: chọn đề và Part đang soạn → tải file âm thanh, ảnh lên kho
// → dán dữ liệu câu hỏi → lưu. Một phần tử JSON = một bài nghe (một
// file âm thanh) kèm các câu hỏi của bài đó.
//
// Chuyện ngăn kho, nói cho rõ vì đây từng là chỗ dễ mất dữ liệu:
// trước đây mọi file đều đổ chung vào thư mục listen/ với tên đã bỏ
// dấu. Nghĩa là file p1-01.jpg của Đề 1 và p1-01.jpg của Đề 2 là CÙNG
// một đường dẫn — tải cái sau lên là đè mất cái trước, mà không báo
// gì. Giờ mỗi đề mỗi Part có ngăn riêng:
//
//     listen/de-3/p1/p1-01.jpg
//     listen/le/p2/cau-07.mp3      ← bài chưa xếp đề
//
// Lúc lưu, tên file cô ghi trong dữ liệu được dò lần lượt: file vừa
// tải trong phiên này → ngăn của đề và Part đang chọn → các Part khác
// cùng đề → thư mục phẳng kiểu cũ. Dò bằng cách hỏi thẳng kho xem có
// file đó không, nên tên gõ sai là biết ngay ở bước Xem trước, chứ
// không phải đợi học viên mở bài rồi mới phát hiện không có tiếng.
// ============================================================

let me = null;
let sets = [];          // dữ liệu đã đọc từ ô dán
let khoPhien = {};      // tên file cô ghi → key thật trong kho, nhớ trong phiên
let daDo = {};          // key → có trong kho hay không, nhớ cho khỏi hỏi lại

let curPart = 1;
let curDe = null;       // số đề đang nhập, null là chưa xếp đề

const $ = function (id) { return document.getElementById(id); };

const PART_NAME = {
  1: 'Part 1 — Mô tả tranh',
  2: 'Part 2 — Hỏi đáp',
  3: 'Part 3 — Hội thoại ngắn',
  4: 'Part 4 — Bài nói ngắn'
};

// ---------- Câu nhắc gửi cho Claude — tách riêng theo từng Part ----------

const COMMON_SCHEMA_HEAD =
'Mình gửi script bài nghe TOEIC PART {P}. Hãy chuyển thành DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'NẾU tài liệu mình gửi là bảng song ngữ (cột tiếng Anh, cột tiếng Việt) và đã có sẵn bản dịch ' +
'các phương án A/B/C/D, hãy DÙNG LẠI ĐÚNG bản dịch đó cho question_vi, tuyệt đối không tự dịch lại. ' +
'Đáp án đúng trong tài liệu thường được IN ĐẬM — dùng đúng đáp án đó, không tự suy luận lại.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT bài nghe gắn với MỘT file âm thanh:\n' +
'{\n' +
'  "part": {P},\n' +
'  "title": "tên ngắn gọn bằng tiếng Việt để cô dễ nhận ra bài này",\n' +
'  "audio_file": "tên file âm thanh",\n' +
'  "image_file": "{IMG_NOTE}",\n' +
'  "difficulty": 2,\n' +
'  "transcript": "toàn bộ lời thoại tiếng Anh, xuống dòng giữa các lượt nói",\n' +
'  "transcript_vi": "bản dịch tiếng Việt của lời thoại, xuống dòng tương ứng",\n' +
'  "vocab": [{"term": "từ tiếng Anh đáng học trong bài", "pos": "v", "phonetic": "/pʊʃ/", "meaning_vi": "nghĩa tiếng Việt"}],\n' +
'  "questions": [\n' +
'    {\n' +
'      "question_text": "{QTEXT_NOTE}",\n' +
'      {OPTIONS}\n' +
'      "correct_answer": "B",\n' +
'      "explanation": "giải thích bằng tiếng Việt: chỗ nào trong bài nghe cho ra đáp án, ' +
'và vì sao các phương án còn lại sai hoặc là bẫy đồng âm",\n' +
'      "translation_vi": "nghĩa tiếng Việt của phương án đúng",\n' +
'      "key_point": "từ hoặc cụm cần nghe bắt được, viết dạng: cụm tiếng Anh = nghĩa tiếng Việt",\n' +
'      "topic_tag": "đúng MỘT nhãn lấy từ danh sách bên dưới, không tự đặt nhãn mới",\n' +
'      "question_vi": {"q": "dịch câu hỏi (Part 1 và 2 không in đề thì để chuỗi rỗng)", ' +
'"A": "dịch phương án A", "B": "dịch B", "C": "dịch C", "D": "dịch D"}\n' +
'    }\n' +
'  ]\n' +
'}\n\n';

const TAGS = {
  1: 'Tranh tả người | Tranh tả vật | Tranh tả cả người và vật',
  2: 'Câu hỏi WHAT | Câu hỏi WHO | Câu hỏi WHEN | Câu hỏi HOW | Câu hỏi WHY | ' +
     'Câu hỏi YES/NO | Câu hỏi đuôi | Câu hỏi lựa chọn | Câu yêu cầu, đề nghị | Câu trần thuật',
  3: 'Câu hỏi về chủ đề, mục đích | Câu hỏi về danh tính người nói | ' +
     'Câu hỏi về chi tiết cuộc hội thoại | Câu hỏi về hành động tương lai | Câu hỏi kết hợp bảng biểu | ' +
     'Câu hỏi về hàm ý câu nói | Câu hỏi về địa điểm hội thoại | Câu hỏi về yêu cầu, gợi ý | ' +
     'Chủ đề: Company - General Office Work | Chủ đề: Company - Personnel | ' +
     'Chủ đề: Company - Event, Project | Chủ đề: Shopping, Service | Chủ đề: Order, delivery | Chủ đề: Housing',
  4: 'Câu hỏi về chủ đề, mục đích | Câu hỏi về danh tính, địa điểm | Câu hỏi về chi tiết | ' +
     'Câu hỏi về hành động tương lai | Câu hỏi kết hợp bảng biểu | Câu hỏi về hàm ý câu nói | ' +
     'Câu hỏi về yêu cầu, gợi ý | Dạng bài: Telephone message - Tin nhắn thoại | ' +
     'Dạng bài: News report, Broadcast - Bản tin | Dạng bài: Talk - Bài phát biểu, diễn văn | ' +
     'Dạng bài: Excerpt from a meeting - Trích dẫn từ buổi họp'
};

function buildPrompt(part) {
  const imgNote = part === 1
    ? 'bắt buộc phải có, ví dụ p1-01.jpg'
    : (part >= 3 ? 'chỉ cần nếu bài này là dạng graphic (bảng biểu, hoá đơn...), thường thì để chuỗi rỗng' : 'để chuỗi rỗng, Part 2 không có ảnh');

  const qtextNote = part <= 2 ? 'Part này không có đề in trên giấy, để chuỗi rỗng' : 'câu hỏi in trên đề, ghi đầy đủ';

  const options = part === 2
    ? '"A": "phương án A", "B": "...", "C": "...",'
    : '"A": "phương án A", "B": "...", "C": "...", "D": "...",';

  let body = COMMON_SCHEMA_HEAD
    .replace(/{P}/g, part)
    .replace('{IMG_NOTE}', imgNote)
    .replace('{QTEXT_NOTE}', qtextNote)
    .replace('{OPTIONS}', options);

  body += 'Quy ước bắt buộc:\n';

  if (part === 1) {
    body += '- Đúng 1 câu hỏi mỗi bài, 4 phương án A B C D, question_text để rỗng.\n' +
            '- BẮT BUỘC phải có image_file, đây là Part mô tả tranh.\n';
  } else if (part === 2) {
    body += '- Đúng 1 câu hỏi mỗi bài, CHỈ 3 phương án A B C, bỏ hẳn trường D, question_text để rỗng.\n' +
            '- Không có ảnh, image_file luôn để chuỗi rỗng.\n';
  } else {
    body += '- Đúng 3 câu hỏi mỗi bài (mỗi bài là một đoạn ' + (part === 3 ? 'hội thoại giữa 2-3 người' : 'bài nói một người') +
            '), mỗi câu 4 phương án, question_text ghi đầy đủ vì Part này có in đề.\n';
  }

  body += '- vocab: chọn 4 đến 8 từ/cụm đáng học xuất hiện trong bài nghe, ghi kèm loại từ (pos) ' +
          'và phiên âm IPA (phonetic). Ưu tiên từ có trong đáp án hoặc dễ nghe nhầm.\n' +
          '- difficulty là 1 dễ, 2 vừa, 3 khó.\n' +
          '- Đáp án đúng phải rải đều A B C D giữa các câu, không dồn vào một chữ cái.\n' +
          '- topic_tag PHẢI lấy đúng nguyên văn một nhãn trong danh sách dưới đây, không tự đặt nhãn mới. ' +
          'Mỗi câu chỉ chọn 1 nhãn phù hợp nhất.\n\n' +
          'Danh sách nhãn hợp lệ cho Part ' + part + ':\n' + TAGS[part];

  return body;
}

const PROMPT_BY_PART = { 1: buildPrompt(1), 2: buildPrompt(2), 3: buildPrompt(3), 4: buildPrompt(4) };

const SAMPLE_BY_PART = {
  1: JSON.stringify([{
    part: 1, title: 'Người phụ nữ ở bàn làm việc', audio_file: 'p1-01.mp3', image_file: 'p1-01.jpg',
    difficulty: 1,
    transcript: 'A woman is sitting at a desk, typing on a laptop.',
    transcript_vi: 'Một người phụ nữ đang ngồi ở bàn làm việc, gõ máy tính xách tay.',
    questions: [{
      question_text: '', A: 'A woman is sitting at a desk.', B: 'A woman is standing near a window.',
      C: 'A woman is talking on the phone.', D: 'A woman is filing some documents.',
      correct_answer: 'A',
      explanation: 'Tranh mô tả người phụ nữ đang ngồi ở bàn làm việc, khớp đúng phương án A. Các phương án còn lại mô tả hành động không có trong tranh.',
      translation_vi: 'Một người phụ nữ đang ngồi ở bàn làm việc.',
      key_point: 'sit at a desk = ngồi ở bàn làm việc',
      topic_tag: 'Tranh tả người'
    }]
  }], null, 2),
  2: JSON.stringify([{
    part: 2, title: 'Hỏi về phòng họp', audio_file: 'p2-01.mp3', image_file: '', difficulty: 1,
    transcript: 'W: Who is leading the training session tomorrow?\nM: I believe it\'s Mr. Carter from HR.',
    transcript_vi: 'Nữ: Ai sẽ dẫn buổi đào tạo ngày mai vậy?\nNam: Tôi nghĩ là anh Carter bên nhân sự.',
    questions: [{
      question_text: '', A: 'It\'s Mr. Carter from HR.', B: 'Yes, it was very helpful.', C: 'Every Monday morning.',
      correct_answer: 'A',
      explanation: 'Câu hỏi bắt đầu bằng Who nên phải trả lời về người. Phương án B trả lời Yes cho câu hỏi Wh nên loại ngay. Phương án C trả lời về thời gian, không hợp với Who.',
      translation_vi: 'Là anh Carter bên nhân sự.',
      key_point: 'training session = buổi đào tạo',
      topic_tag: 'Câu hỏi WHO'
    }]
  }], null, 2),
  3: JSON.stringify([{
    part: 3, title: 'Đặt lại lịch giao hàng', audio_file: 'p3-01.mp3', image_file: '', difficulty: 2,
    transcript: 'M: Hi, I\'m calling about order number 4521. It was supposed to arrive today.\n' +
      'W: Let me check... I\'m sorry, there\'s been a delay at the warehouse. It should arrive by Thursday instead.\n' +
      'M: That\'s fine, just please send me a confirmation email.',
    transcript_vi: 'Nam: Chào, tôi gọi về đơn hàng số 4521. Đáng lẽ hôm nay phải giao rồi.\n' +
      'Nữ: Để tôi kiểm tra... Xin lỗi anh, kho hàng bị chậm trễ. Đơn sẽ giao vào thứ Năm thay vì hôm nay.\n' +
      'Nam: Vậy cũng được, chị gửi email xác nhận giúp tôi nhé.',
    questions: [
      {
        question_text: 'Why is the man calling?', A: 'To cancel an order', B: 'To ask about a delayed delivery',
        C: 'To request a refund', D: 'To change his address',
        correct_answer: 'B',
        explanation: 'Người nam nói rõ đơn hàng đáng lẽ giao hôm nay nhưng chưa tới, nên gọi hỏi về việc giao hàng bị trễ.',
        translation_vi: 'Để hỏi về việc giao hàng bị trễ.',
        key_point: 'delayed delivery = giao hàng bị trễ',
        topic_tag: 'Câu hỏi về chủ đề, mục đích'
      },
      {
        question_text: 'When will the order likely arrive?', A: 'Today', B: 'Tomorrow', C: 'On Thursday', D: 'Next week',
        correct_answer: 'C',
        explanation: 'Người nữ nói đơn sẽ giao vào thứ Năm thay vì hôm nay.',
        translation_vi: 'Vào thứ Năm.',
        key_point: 'instead = thay vào đó',
        topic_tag: 'Câu hỏi về chi tiết cuộc hội thoại'
      },
      {
        question_text: 'What does the man ask the woman to do?', A: 'Cancel the order', B: 'Call his manager',
        C: 'Send a confirmation email', D: 'Deliver the order in person',
        correct_answer: 'C',
        explanation: 'Người nam yêu cầu gửi email xác nhận ở cuối đoạn hội thoại.',
        translation_vi: 'Gửi email xác nhận.',
        key_point: 'confirmation email = email xác nhận',
        topic_tag: 'Câu hỏi về yêu cầu, gợi ý'
      }
    ]
  }], null, 2),
  4: JSON.stringify([{
    part: 4, title: 'Thông báo nội bộ về hệ thống', audio_file: 'p4-01.mp3', image_file: '', difficulty: 2,
    transcript: 'Attention all staff. The IT department will be updating our email system this weekend. ' +
      'As a result, email service will be unavailable from Saturday evening until Sunday morning. ' +
      'Please save any important documents before Friday at five p.m. If you have questions, contact the IT help desk.',
    transcript_vi: 'Kính gửi toàn thể nhân viên. Bộ phận IT sẽ nâng cấp hệ thống email vào cuối tuần này. ' +
      'Do đó, dịch vụ email sẽ ngừng hoạt động từ tối thứ Bảy đến sáng Chủ nhật. ' +
      'Vui lòng lưu các tài liệu quan trọng trước 5 giờ chiều thứ Sáu. Nếu có thắc mắc, liên hệ bộ phận hỗ trợ IT.',
    questions: [
      {
        question_text: 'What is the purpose of the announcement?', A: 'To announce a new hire',
        B: 'To explain a temporary service interruption', C: 'To promote a new product', D: 'To cancel a meeting',
        correct_answer: 'B',
        explanation: 'Thông báo nói rõ email sẽ ngừng hoạt động tạm thời để nâng cấp hệ thống.',
        translation_vi: 'Để giải thích việc gián đoạn dịch vụ tạm thời.',
        key_point: 'service interruption = gián đoạn dịch vụ',
        topic_tag: 'Câu hỏi về chủ đề, mục đích'
      },
      {
        question_text: 'When will email service be unavailable?', A: 'Friday afternoon',
        B: 'Saturday evening to Sunday morning', C: 'All weekend', D: 'Monday morning',
        correct_answer: 'B',
        explanation: 'Thông báo nêu rõ khung giờ ngừng dịch vụ là từ tối thứ Bảy đến sáng Chủ nhật.',
        translation_vi: 'Từ tối thứ Bảy đến sáng Chủ nhật.',
        key_point: 'unavailable = không dùng được',
        topic_tag: 'Câu hỏi về chi tiết'
      },
      {
        question_text: 'What are employees asked to do before Friday at five p.m.?', A: 'Submit a report',
        B: 'Contact the help desk', C: 'Save important documents', D: 'Attend a training',
        correct_answer: 'C',
        explanation: 'Thông báo yêu cầu lưu tài liệu quan trọng trước 5 giờ chiều thứ Sáu.',
        translation_vi: 'Lưu các tài liệu quan trọng.',
        key_point: 'save documents = lưu tài liệu',
        topic_tag: 'Câu hỏi về yêu cầu, gợi ý'
      }
    ]
  }], null, 2)
};

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-main').classList.remove('hidden');

  await BoDe.tai();
  veOChonDe();
  moTaNgan();
  loadHave();
})();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Đề và Part đang nhập ----------

function veOChonDe() {
  const locCu = $('f-de').value;

  BoDe.doOSelect($('de-chon'), curDe);
  BoDe.doOSelect($('f-de'), null);

  // Thanh lọc cần thêm một mục cho bài chưa xếp đề nào
  const le = document.createElement('option');
  le.value = 'none';
  le.textContent = 'Bài lẻ chưa xếp đề';
  $('f-de').appendChild(le);
  $('f-de').value = locCu;
}

function nganKho() {
  return 'listen/' + (curDe == null ? 'le' : 'de-' + curDe) + '/p' + curPart + '/';
}

function moTaNgan() {
  $('dnh-cho').innerHTML = curDe == null
    ? 'Chưa chọn đề. File vẫn tải lên được, vào ngăn <code>' + esc(nganKho()) +
      '</code> và bài lưu xong xếp vào mục “Bài lẻ chưa xếp đề”. Chọn đề trước thì gọn hơn.'
    : 'File tải lên nằm ở <code>' + esc(nganKho()) + '</code> · bài lưu xong thuộc <b>' +
      esc(BoDe.nhan(curDe)) + '</b>';
}

$('de-chon').addEventListener('change', function () {
  curDe = this.value === '' ? null : parseInt(this.value, 10);
  daDo = {};                      // đổi đề là đổi ngăn, kết quả dò cũ không dùng lại
  moTaNgan();
  $('assign-list').innerHTML = '';
  $('assign-n').textContent = '';
});

document.querySelectorAll('#part-tabs .test-tab').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('#part-tabs .test-tab').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    curPart = parseInt(b.dataset.part, 10);
    moTaNgan();
  });
});

$('de-moi-nut').addEventListener('click', function () {
  // Gợi ý số kế tiếp để cô không phải tự nhớ đã dùng tới số mấy
  const da = BoDe.danhSach().map(function (d) { return d.so; });
  $('de-so').value = da.length ? Math.max.apply(null, da) + 1 : 1;
  $('de-ten').value = '';
  $('de-form').classList.remove('hidden');
  $('de-ten').focus();
});

$('de-sua-nut').addEventListener('click', function () {
  if (curDe == null) { toast('Chọn một đề trước đã nhé.', 'bad'); return; }
  const d = BoDe.danhSach().filter(function (x) { return x.so === curDe; })[0];
  $('de-so').value = curDe;
  $('de-ten').value = d ? d.ten : '';
  $('de-form').classList.remove('hidden');
  $('de-ten').focus();
});

$('de-huy').addEventListener('click', function () {
  $('de-form').classList.add('hidden');
});

$('de-luu').addEventListener('click', async function () {
  const so = parseInt($('de-so').value, 10);
  const ten = $('de-ten').value;

  this.disabled = true;
  const { error } = await BoDe.datTen(so, ten);
  this.disabled = false;

  if (error) { toast(error.message, 'bad'); return; }

  curDe = so;
  veOChonDe();
  $('de-chon').value = String(so);
  moTaNgan();
  $('de-form').classList.add('hidden');
  toast('Đã lưu đề.', 'good');
  loadHave();
});

$('de-ten').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); $('de-luu').click(); }
});

// ---------- Bước 1 · Tải file lên kho ----------

function slug(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';

  const clean = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (clean || 'file') + ext;
}

// Nhớ lại file vừa tải, để lúc lưu khỏi phải dò kho
function nhoFile(tenGoc, key) {
  khoPhien[tenGoc] = key;
  khoPhien[slug(tenGoc)] = key;
  daDo[key] = true;
}

$('btn-upload').addEventListener('click', async function () {
  const input = $('files');
  const list = input.files ? Array.from(input.files) : [];

  if (!list.length) {
    $('up-note').textContent = 'Bạn chọn file trước đã nhé.';
    return;
  }

  this.disabled = true;
  $('up-note').textContent = 'Đang tải ' + list.length + ' file…';

  const ngan = nganKho();
  const rows = [];

  for (const f of list) {
    const ten = slug(f.name);
    const { error } = await uploadMedia(ngan + ten, f);

    rows.push({ ten: ten, ngan: ngan, ok: !error, msg: error ? error.message : '' });
    if (!error) nhoFile(f.name, ngan + ten);
  }

  this.disabled = false;
  const good = rows.filter(function (r) { return r.ok; }).length;
  $('up-note').textContent = 'Xong. Tải lên được ' + good + '/' + rows.length + ' file.';
  input.value = '';

  showUploaded(rows);
});

function showUploaded(rows) {
  let html = '<p style="font-size:0.9rem;margin:0 0 10px">' +
             'Tên file dùng trong dữ liệu ở bước 3 chính là tên bên dưới — chỉ cần tên, ' +
             'không cần ghi đường dẫn. Dấu tiếng Việt và khoảng trắng đã được tự động bỏ đi.</p>';

  for (const r of rows) {
    html +=
      '<div class="wrong-q" style="padding:10px 14px;' +
        (r.ok ? '' : 'border-color:var(--danger);') + '">' +
        '<code style="font-size:0.88rem">' + esc(r.ten) + '</code>' +
        (r.ok ? '<span class="tag-warm" style="margin-left:10px;font-size:0.78rem">đã lên kho</span>' +
                '<span class="stat-lab" style="margin-left:10px">' + esc(r.ngan) + '</span>'
              : '<span class="tag-cold" style="margin-left:10px;font-size:0.78rem">' +
                esc(r.msg) + '</span>') +
      '</div>';
  }

  $('up-list').innerHTML = html;
}

// ---------- Bước 2 · Lấy câu nhắc ----------

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPT_BY_PART[curPart]).then(function () {
    $('prompt-ok').textContent = 'Đã copy câu nhắc Part ' + curPart + '. Dán vào chat kèm file script bài nghe.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 4000);
  });
});

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLE_BY_PART[curPart];
  say('Đây là một bài Part ' + curPart + ' làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

// ---------- Bước 3 · Đọc dữ liệu ----------

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

$('btn-parse').addEventListener('click', async function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    sets = readJson(raw);
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!sets.length) return say('Không tìm thấy bài nghe nào trong dữ liệu.');

  this.disabled = true;
  const chuCu = this.textContent;
  this.textContent = 'Đang dò file trong kho…';

  await giaiFile(sets);

  this.disabled = false;
  this.textContent = chuCu;

  preview(check(sets), nhacFile(sets));
});

function readJson(raw) {
  const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const arr = JSON.parse(clean);
  const list = Array.isArray(arr) ? arr : [arr];

  return list.map(function (o) {
    const qs = Array.isArray(o.questions) ? o.questions : [];

    return {
      part: parseInt(o.part || 0, 10),
      title: (o.title || '').trim(),
      audio_file: (o.audio_file || o.audio_url || '').trim(),
      image_file: (o.image_file || o.image_url || '').trim(),
      difficulty: parseInt(o.difficulty || 2, 10),
      vocab: Array.isArray(o.vocab) ? o.vocab : [],
      transcript: (o.transcript || '').trim(),
      transcript_vi: (o.transcript_vi || '').trim(),
      questions: qs.map(function (q) {
        const opts = {};
        for (const k of ['A', 'B', 'C', 'D']) {
          const v = (q[k] == null ? '' : String(q[k])).trim();
          if (v) opts[k] = v;
        }
        return {
          question_text: (q.question_text || '').trim(),
          options: opts,
          correct_answer: (q.correct_answer || '').trim().toUpperCase(),
          explanation: (q.explanation || '').trim(),
          translation_vi: (q.translation_vi || '').trim(),
          key_point: (q.key_point || '').trim(),
          topic_tag: (q.topic_tag || '').trim(),
          question_vi: (q.question_vi && typeof q.question_vi === 'object') ? q.question_vi : {}
        };
      })
    };
  });
}

// ---------- Dò file trong kho ----------

// Hỏi thẳng kho xem có file này không. Hỏi một lần rồi nhớ, vì một
// tên file hay dùng lại ở nhiều bài.
async function coTrongKho(key) {
  if (daDo[key] != null) return daDo[key];
  try {
    const res = await fetch(mediaUrl(key), { method: 'HEAD' });
    daDo[key] = res.ok;
  } catch (e) {
    daDo[key] = false;
  }
  return daDo[key];
}

// Tìm đường dẫn thật cho một tên file cô ghi trong dữ liệu.
// Thứ tự dò, từ chắc nhất xuống: file vừa tải trong phiên này → ngăn
// của đề và Part này → các Part khác cùng đề → thư mục phẳng kiểu cũ.
async function timFile(ten, part) {
  if (!ten) return { url: null, co: true };
  if (/^https?:\/\//i.test(ten)) return { url: ten, co: true };

  const s = slug(ten);
  const ngan = curDe == null ? 'le' : 'de-' + curDe;
  const thu = [];

  if (khoPhien[ten]) thu.push(khoPhien[ten]);
  if (khoPhien[s] && thu.indexOf(khoPhien[s]) === -1) thu.push(khoPhien[s]);

  thu.push('listen/' + ngan + '/p' + part + '/' + s);
  [1, 2, 3, 4].forEach(function (p) {
    if (p !== part) thu.push('listen/' + ngan + '/p' + p + '/' + s);
  });
  thu.push('listen/' + s);                       // kho cũ, hồi còn để phẳng

  for (const k of thu) {
    if (await coTrongKho(k)) return { url: mediaUrl(k), co: true };
  }

  // Không thấy đâu cả. Vẫn trả về đường dẫn đúng ngăn, để cô tải file
  // lên sau là bài chạy ngay, không phải sửa lại dữ liệu.
  return { url: mediaUrl('listen/' + ngan + '/p' + part + '/' + s), co: false };
}

async function giaiFile(list) {
  for (const s of list) {
    const a = await timFile(s.audio_file, s.part);
    const i = await timFile(s.image_file, s.part);
    s._audio_url = a.url;
    s._image_url = i.url;
    s._thieu = [];
    if (s.audio_file && !a.co) s._thieu.push('chưa thấy file âm thanh ' + s.audio_file + ' trong kho');
    if (s.image_file && !i.co) s._thieu.push('chưa thấy file ảnh ' + s.image_file + ' trong kho');
  }
}

// Nhắc, không phải lỗi: bài vẫn lưu được, tải file lên sau là chạy
function nhacFile(list) {
  const n = {};
  list.forEach(function (s, i) {
    if (s._thieu && s._thieu.length) n[i] = s._thieu.slice();
  });
  return n;
}

// ---------- Kiểm lỗi ----------

function check(list) {
  const problems = {};

  list.forEach(function (s, i) {
    const p = [];

    if ([1, 2, 3, 4].indexOf(s.part) === -1) p.push('part phải là 1, 2, 3 hoặc 4');
    if (!s.title) p.push('chưa đặt tên bài nghe');
    if (!s.audio_file) p.push('chưa ghi tên file âm thanh');
    if (s.part === 1 && !s.image_file) p.push('Part 1 phải có file ảnh');
    if (!s.questions.length) p.push('bài này chưa có câu hỏi nào');

    if ((s.part === 1 || s.part === 2) && s.questions.length > 1) {
      p.push('Part 1 và Part 2 chỉ có một câu mỗi bài');
    }
    if ((s.part === 3 || s.part === 4) && s.questions.length !== 3 && s.questions.length) {
      p.push('Part 3 và Part 4 nên có đúng ba câu, bài này có ' + s.questions.length);
    }

    s.questions.forEach(function (q, j) {
      const no = 'câu ' + (j + 1) + ': ';
      const keys = Object.keys(q.options);

      if (keys.length < 3) p.push(no + 'phải có ít nhất ba phương án');
      if (s.part !== 2 && keys.length < 4) p.push(no + 'part này cần đủ bốn phương án');
      if (keys.indexOf(q.correct_answer) === -1) p.push(no + 'đáp án không nằm trong các phương án');
      if ((s.part === 3 || s.part === 4) && !q.question_text) p.push(no + 'thiếu câu hỏi in trên đề');

      const vals = keys.map(function (k) { return q.options[k].toLowerCase(); });
      if (new Set(vals).size < keys.length) p.push(no + 'có hai phương án trùng nhau');
    });

    if (p.length) problems[i] = p;
  });

  return problems;
}

// ---------- Xem trước ----------

function preview(bad, nhac) {
  const nBad = Object.keys(bad).length;
  const nNhac = Object.keys(nhac || {}).length;
  const nq = sets.reduce(function (a, s) { return a + s.questions.length; }, 0);

  let html = '<div class="section-head" style="margin-top:26px">' +
             '<h2>Xem trước ' + sets.length + ' bài nghe · ' + nq + ' câu</h2>' +
             (nBad ? '<span class="tag-cold">' + nBad + ' bài cần sửa</span>'
                   : '<span class="tag-warm">Không có lỗi</span>') + '</div>';

  html += '<p class="level-note" style="margin:0 0 12px">Lưu vào <b>' +
          esc(BoDe.nhan(curDe)) + '</b></p>';

  sets.forEach(function (s, i) {
    const p = bad[i];
    const n = (nhac || {})[i];

    html +=
      '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        '<span class="q-tag">' + esc(PART_NAME[s.part] || 'Part ?') + '</span> ' +
        (p ? '<span class="tag-cold" style="font-size:0.82rem">' + esc(p.join(' · ')) + '</span>' : '') +
        (n ? ' <span class="tag-warm" style="font-size:0.82rem">' + esc(n.join(' · ')) + '</span>' : '') +
        '<p class="wq" style="margin-top:8px;font-weight:600">' + esc(s.title) + '</p>' +
        '<p class="ww">Âm thanh: ' + esc(s.audio_file) +
          (s.image_file ? ' · Ảnh: ' + esc(s.image_file) : '') +
          ' · ' + s.questions.length + ' câu</p>';

    s.questions.forEach(function (q, j) {
      html +=
        '<div style="margin-top:10px;padding-left:12px;border-left:2px solid var(--line)">' +
          '<p class="wq">' + (j + 1) + '. ' + esc(q.question_text || '(không in đề)') +
            (q.topic_tag ? ' <span class="q-tag">' + esc(q.topic_tag) + '</span>' : ' <span class="tag-cold" style="font-size:0.78rem">chưa gán dạng</span>') +
          '</p>' +
          '<p class="wa">' +
            Object.keys(q.options).map(function (k) {
              return k === q.correct_answer
                ? '<b>' + k + '. ' + esc(q.options[k]) + '</b>'
                : k + '. ' + esc(q.options[k]);
            }).join(' &nbsp; ') +
          '</p>' +
          (q.key_point ? '<p class="key-point" style="margin:6px 0">' + esc(q.key_point) + '</p>' : '') +
          (q.explanation ? '<p class="ww">' + esc(q.explanation) + '</p>'
                         : '<p class="ww" style="color:var(--ink-soft)">chưa có giải thích — lưu được, bổ sung sau ở phần Sửa</p>') +
        '</div>';
    });

    if (s.transcript) {
      html += '<p class="ww" style="margin-top:10px;color:#6C837E">Lời thoại: ' +
              esc(s.transcript.slice(0, 140)) + (s.transcript.length > 140 ? '…' : '') + '</p>';
    }

    html += '</div>';
  });

  $('preview').innerHTML = html;

  if (nBad) {
    say('Có ' + nBad + ' bài còn lỗi. Bạn sửa trong ô dữ liệu rồi bấm Xem trước lại. ' +
        'Vẫn lưu được nhưng những bài lỗi sẽ bị bỏ qua.');
  } else if (nNhac) {
    say('Dữ liệu hợp lệ, nhưng ' + nNhac + ' bài có tên file chưa thấy trong kho. ' +
        'Lưu vẫn được — tải file lên đúng ngăn, hoặc gắn tay ở phần Gán audio & ảnh.', 'good');
  } else {
    say('Dữ liệu hợp lệ, file đã có đủ trong kho. Bấm Lưu để đưa vào ngân hàng đề.', 'good');
  }

  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const bad = new Set(JSON.parse(this.dataset.bad || '[]').map(Number));
  const good = sets.filter(function (s, i) { return !bad.has(i); });

  if (!good.length) return say('Không có bài nào hợp lệ để lưu.');

  this.disabled = true;
  this.textContent = 'Đang lưu…';

  let nSet = 0, nQ = 0;

  for (const s of good) {
    const { data: row, error } = await db.from('listening_sets').insert({
      part: s.part,
      title: s.title,
      audio_url: s._audio_url,
      image_url: s._image_url,
      transcript: s.transcript || null,
      transcript_vi: s.transcript_vi || null,
      difficulty: s.difficulty || 2,
      vocab: s.vocab || [],
      test_no: curDe,
      is_active: true
    }).select('id').single();

    if (error || !row) {
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được bài "' + s.title + '": ' + (error ? error.message : 'lỗi không rõ'));
    }

    const payload = s.questions.map(function (q, j) {
      return {
        part: s.part,
        set_id: row.id,
        order_index: j + 1,
        question_text: q.question_text || null,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        translation_vi: q.translation_vi || null,
        key_point: q.key_point || null,
        topic_tag: q.topic_tag || null,
        question_vi: q.question_vi || {},
        difficulty: s.difficulty || 2,
        test_no: curDe,
        is_active: true
      };
    });

    const { error: e2 } = await db.from('questions').insert(payload);

    if (e2) {
      await db.from('listening_sets').delete().eq('id', row.id);
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được câu hỏi của bài "' + s.title + '": ' + e2.message);
    }

    nSet++;
    nQ += payload.length;
  }

  this.disabled = false;
  this.textContent = 'Lưu vào ngân hàng đề';

  say('Đã lưu ' + nSet + ' bài nghe với ' + nQ + ' câu hỏi vào ' + BoDe.nhan(curDe) + '.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadHave();
});

// ---------- Bài nghe đã có ----------

let have = [];                  // toàn bộ bài, tải một lần rồi lọc tại chỗ
let haveCount = {};             // id bài → số câu
let haveSelected = new Set();

async function loadHave() {
  $('have').innerHTML = '<p class="empty">Đang tải…</p>';

  const { data: rows, error } = await db
    .from('listening_sets')
    .select('id, part, title, test_no, is_active, audio_url, image_url, transcript')
    .order('test_no', { nullsFirst: false }).order('part').order('id');

  if (error) {
    $('have').innerHTML = '<p class="empty">Không tải được danh sách: ' + esc(error.message) + '</p>';
    return;
  }

  have = rows || [];
  haveSelected = new Set();

  if (!have.length) {
    haveCount = {};
    veHave();
    return;
  }

  const { data: qs } = await db
    .from('questions')
    .select('set_id')
    .in('set_id', have.map(function (r) { return r.id; }));

  haveCount = {};
  for (const q of (qs || [])) haveCount[q.set_id] = (haveCount[q.set_id] || 0) + 1;

  veHave();
}

function locHave() {
  const de = $('f-de').value;
  const part = $('f-part').value;
  const state = $('f-state').value;
  const tim = $('f-text').value.trim().toLowerCase();

  return have.filter(function (r) {
    if (de === 'none' && r.test_no != null) return false;
    if (de && de !== 'none' && String(r.test_no) !== de) return false;
    if (part && String(r.part) !== part) return false;
    if (state === 'on' && r.is_active === false) return false;
    if (state === 'off' && r.is_active !== false) return false;
    if (tim) {
      const kho = ((r.title || '') + ' ' + (r.transcript || '')).toLowerCase();
      if (kho.indexOf(tim) === -1) return false;
    }
    return true;
  });
}

function veHave() {
  // Sắp lại tại chỗ: theo đề, trong đề thì theo Part. Bài chưa xếp đề
  // xuống cuối. Không trông chờ vào thứ tự máy chủ trả về, vì danh sách
  // này chia thành từng cụm có tiêu đề — lệch một dòng là tiêu đề lặp
  // lại giữa chừng, nhìn như hỏng.
  const rows = locHave().sort(function (a, b) {
    const da = a.test_no == null ? Infinity : a.test_no;
    const dbb = b.test_no == null ? Infinity : b.test_no;
    if (da !== dbb) return da - dbb;
    if (a.part !== b.part) return a.part - b.part;
    return a.id - b.id;
  });

  $('have-n').textContent = have.length
    ? (rows.length === have.length
        ? have.length + ' bài'
        : rows.length + ' / ' + have.length + ' bài')
    : '';

  if (!rows.length) {
    $('have').innerHTML = '<p class="empty">' +
      (have.length ? 'Không có bài nào khớp với bộ lọc đang chọn.' : 'Chưa có bài nghe nào.') +
      '</p>';
    $('have-select-all').checked = false;
    updateBulkBar();
    return;
  }

  let html = '';
  let dauDe = '\u0000';
  let dauPart = null;

  for (const r of rows) {
    const khoaDe = r.test_no == null ? 'x' : String(r.test_no);
    if (khoaDe !== dauDe) {
      dauDe = khoaDe;
      dauPart = null;
      html += '<h3 class="have-de">' +
              esc(r.test_no == null ? 'Bài lẻ chưa xếp đề' : BoDe.nhan(r.test_no)) + '</h3>';
    }
    if (r.part !== dauPart) {
      dauPart = r.part;
      html += '<h4 class="have-part">' + esc(PART_NAME[r.part] || 'Part ' + r.part) + '</h4>';
    }

    const thieu = [];
    if (!r.audio_url) thieu.push('chưa có audio');
    if (r.part === 1 && !r.image_url) thieu.push('chưa có ảnh');

    html +=
      '<div class="have-row" data-row="' + r.id + '">' +
        '<div class="have-dong">' +
          '<input type="checkbox" class="have-check" data-id="' + r.id + '">' +
          '<span class="have-ten">' + esc(r.title) + '</span>' +
          '<span class="stat-lab">' + (haveCount[r.id] || 0) + ' câu</span>' +
          (r.is_active === false ? '<span class="tag-cold" style="font-size:0.78rem">đang ẩn</span>' : '') +
          (thieu.length ? '<span class="tag-cold" style="font-size:0.78rem">' + esc(thieu.join(', ')) + '</span>' : '') +
          '<button class="btn-sm" data-act="sua" data-id="' + r.id + '">Sửa</button>' +
          '<button class="btn-sm" data-act="toggle" data-id="' + r.id + '">' +
            (r.is_active === false ? 'Hiện lại' : 'Ẩn bài') + '</button>' +
          '<button class="btn-sm" data-act="del" data-id="' + r.id + '">Xoá</button>' +
        '</div>' +
        '<div class="have-sua" data-sua="' + r.id + '"></div>' +
      '</div>';
  }

  $('have').innerHTML = html;

  $('have').querySelectorAll('button[data-act]').forEach(function (b) {
    b.addEventListener('click', function () { act(b.dataset.act, b.dataset.id, b); });
  });

  $('have').querySelectorAll('.have-check').forEach(function (c) {
    c.checked = haveSelected.has(c.dataset.id);
    c.addEventListener('change', function () {
      if (c.checked) haveSelected.add(c.dataset.id);
      else haveSelected.delete(c.dataset.id);
      $('have-select-all').checked = haveSelected.size === rows.length;
      updateBulkBar();
    });
  });

  $('have-select-all').checked = false;
  updateBulkBar();
}

['f-de', 'f-part', 'f-state'].forEach(function (id) {
  $(id).addEventListener('change', function () { haveSelected = new Set(); veHave(); });
});
$('f-text').addEventListener('input', function () { veHave(); });
$('f-reload').addEventListener('click', loadHave);

$('have-select-all').addEventListener('change', function () {
  const on = this.checked;
  $('have').querySelectorAll('.have-check').forEach(function (c) {
    c.checked = on;
    if (on) haveSelected.add(c.dataset.id);
    else haveSelected.delete(c.dataset.id);
  });
  updateBulkBar();
});

function updateBulkBar() {
  const bar = $('have-bulk-bar');
  if (haveSelected.size) {
    bar.classList.remove('hidden');
    $('have-bulk-count').textContent = 'Đã chọn ' + haveSelected.size + ' bài';
  } else {
    bar.classList.add('hidden');
  }
}

async function datHien(ids, hien, btn) {
  btn.disabled = true;
  const { error } = await db.from('listening_sets').update({ is_active: hien }).in('id', ids);
  btn.disabled = false;
  toast(error ? 'Không đổi được: ' + error.message
              : (hien ? 'Đã hiện lại ' : 'Đã ẩn ') + ids.length + ' bài.',
        error ? 'bad' : 'good');
  loadHave();
}

$('have-bulk-hide').addEventListener('click', function () {
  const ids = Array.from(haveSelected);
  if (ids.length) datHien(ids, false, this);
});

$('have-bulk-show').addEventListener('click', function () {
  const ids = Array.from(haveSelected);
  if (ids.length) datHien(ids, true, this);
});

$('have-bulk-de').addEventListener('click', async function () {
  const ids = Array.from(haveSelected);
  if (!ids.length) return;

  const ten = BoDe.danhSach().map(function (d) { return d.so + ' = ' + d.ten; }).join('\n');
  const tra = prompt('Chuyển ' + ids.length + ' bài sang đề số nào?\n' +
    (ten ? '\nCác đề đang có:\n' + ten + '\n' : '') +
    '\nĐể trống rồi bấm OK là bỏ ra khỏi mọi đề.');

  if (tra === null) return;

  const t = tra.trim();
  let so = null;
  if (t !== '') {
    so = parseInt(t, 10);
    if (isNaN(so) || so < 1) { toast('Số đề phải là số nguyên từ 1 trở lên.', 'bad'); return; }
  }

  this.disabled = true;
  const { error } = await db.from('listening_sets').update({ test_no: so }).in('id', ids);
  this.disabled = false;

  if (error) { toast('Không chuyển được: ' + error.message, 'bad'); return; }

  // Câu hỏi của bài cũng ghi số đề riêng, phải đi theo
  await db.from('questions').update({ test_no: so }).in('set_id', ids);

  toast('Đã chuyển ' + ids.length + ' bài sang ' + BoDe.nhan(so) + '.', 'good');
  loadHave();
});

$('have-bulk-del').addEventListener('click', async function () {
  const ids = Array.from(haveSelected);
  if (!ids.length) return;
  if (!confirm('Xoá hẳn ' + ids.length + ' bài nghe đã chọn cùng toàn bộ câu hỏi của chúng? Không hoàn tác được.')) return;

  this.disabled = true;
  await db.from('questions').delete().in('set_id', ids);
  const { error } = await db.from('listening_sets').delete().in('id', ids);
  this.disabled = false;

  toast(error ? 'Không xoá hết được: ' + error.message : 'Đã xoá ' + ids.length + ' bài.', error ? 'bad' : 'good');
  loadHave();
});

async function act(what, id, btn) {
  if (what === 'sua') {
    const o = $('have').querySelector('[data-sua="' + id + '"]');
    if (!o) return;

    // Bấm lại lần nữa là đóng
    if (o.innerHTML.trim()) { o.innerHTML = ''; btn.textContent = 'Sửa'; return; }

    btn.textContent = 'Đóng';
    SuaBaiNghe.mo(o, id, {
      onDoiTen: function (ten) {
        const d = $('have').querySelector('[data-row="' + id + '"] .have-ten');
        if (d) d.textContent = ten;
        const r = have.filter(function (x) { return String(x.id) === String(id); })[0];
        if (r) r.title = ten;
      },
      onDoiDe: loadHave,
      onDoiPart: loadHave,
      onDoiHien: loadHave,
      onXoa: loadHave,
      onDong: function () { btn.textContent = 'Sửa'; }
    });
    return;
  }

  if (what === 'toggle') {
    const dangHien = btn.textContent.indexOf('Ẩn') === 0;
    await db.from('listening_sets').update({ is_active: !dangHien }).eq('id', id);
    loadHave();
    return;
  }

  if (what === 'del') {
    if (!confirm('Xoá hẳn bài nghe này cùng toàn bộ câu hỏi của nó?')) return;
    await db.from('questions').delete().eq('set_id', id);
    await db.from('listening_sets').delete().eq('id', id);
    loadHave();
  }
}

// ============================================================
// Gán audio & ảnh cho từng bài — không cần đặt tên file khớp,
// chọn file nào là tải lên và gắn thẳng vào đúng bài đó.
// ============================================================

$('btn-assign-load').addEventListener('click', loadAssign);

async function loadAssign() {
  $('assign-list').innerHTML = '<p class="empty">Đang tải…</p>';

  let q = db.from('listening_sets').select('id, part, title, audio_url, image_url');
  q = curDe == null ? q.is('test_no', null) : q.eq('test_no', curDe);

  const { data: rows } = await q.order('part').order('id');

  if (!rows || !rows.length) {
    $('assign-list').innerHTML =
      '<p class="empty">' + esc(BoDe.nhan(curDe)) + ' chưa có bài nào. ' +
      'Nhập dữ liệu câu hỏi trước, rồi quay lại gán file.</p>';
    $('assign-n').textContent = '';
    return;
  }

  $('assign-n').textContent = rows.length + ' bài trong ' + BoDe.nhan(curDe);

  let html = '';
  let lastPart = null;

  rows.forEach(function (r) {
    if (r.part !== lastPart) {
      lastPart = r.part;
      html += '<h4 class="have-part">' + esc(PART_NAME[r.part] || 'Part ' + r.part) + '</h4>';
    }

    const needImg = r.part === 1;

    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span style="flex:1;min-width:160px;font-weight:600">' + esc(r.title) + '</span>' +

        '<span class="stat-lab">' +
          (r.audio_url ? '🔊 đã có' : '<span style="color:var(--danger)">chưa có audio</span>') +
        '</span>' +
        '<label class="btn-sm" style="cursor:pointer;margin:0">' +
          (r.audio_url ? 'Đổi audio' : 'Chọn audio') +
          '<input type="file" accept="audio/*" data-set="' + r.id + '" data-part="' + r.part + '" data-kind="audio" style="display:none">' +
        '</label>' +

        (needImg ?
          '<span class="stat-lab">' +
            (r.image_url ? '🖼 đã có' : '<span style="color:var(--danger)">chưa có ảnh</span>') +
          '</span>' +
          '<label class="btn-sm" style="cursor:pointer;margin:0">' +
            (r.image_url ? 'Đổi ảnh' : 'Chọn ảnh') +
            '<input type="file" accept="image/*" data-set="' + r.id + '" data-part="' + r.part + '" data-kind="image" style="display:none">' +
          '</label>'
        : '') +
      '</div>';
  });

  $('assign-list').innerHTML = html;

  $('assign-list').querySelectorAll('input[type=file][data-set]').forEach(function (inp) {
    inp.addEventListener('change', function () { uploadOne(inp); });
  });
}

async function uploadOne(inp) {
  const f = inp.files[0];
  if (!f) return;

  const setId = inp.dataset.set;
  const kind = inp.dataset.kind;
  const part = inp.dataset.part;
  const label = inp.parentElement;
  const oldText = label.childNodes[0].nodeValue;

  label.childNodes[0].nodeValue = 'Đang tải… ';

  // Tên file tự sinh theo id bài, không phụ thuộc tên gốc nên không sợ trùng
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const ngan = 'listen/' + (curDe == null ? 'le' : 'de-' + curDe) + '/p' + part + '/';
  const key = ngan + 'set-' + setId + '-' + kind + '-' + Date.now() + '.' + ext;

  const { error: upErr } = await uploadMedia(key, f);

  if (upErr) {
    label.childNodes[0].nodeValue = oldText;
    toast('Không tải lên được: ' + upErr.message, 'bad');
    return;
  }

  const patch = {};
  patch[kind === 'audio' ? 'audio_url' : 'image_url'] = mediaUrl(key);

  const { error: dbErr } = await db.from('listening_sets').update(patch).eq('id', setId);

  if (dbErr) {
    label.childNodes[0].nodeValue = oldText;
    toast('Tải lên xong nhưng không gắn được vào bài: ' + dbErr.message, 'bad');
    return;
  }

  toast('Đã gắn ' + (kind === 'audio' ? 'audio' : 'ảnh') + ' vào bài.', 'good');
  loadAssign();
  loadHave();
}


// ============================================================
// Tách ảnh thẳng từ file PDF đề
//
// Dùng chung công cụ PdfCrop đã viết cho trang Bộ đề thi thử. Ảnh
// tách ra đi vào đúng ngăn của đề và Part đang chọn, giống hệt file
// tải tay — nên tên file dùng được ngay trong dữ liệu ở bước 3.
// ============================================================

if (typeof PdfCrop !== 'undefined' && document.getElementById('pdf-crop')) {
  PdfCrop.mount(document.getElementById('pdf-crop'), {
    onUpload: async function (ten, blob) {
      const ngan = nganKho();
      const key = slug(ten);
      const { error } = await uploadMedia(ngan + key, blob);
      if (error) return error.message;

      nhoFile(ten, ngan + key);

      // Hiện vào đúng danh sách của bước 1, để cô thấy tên file cần
      // ghi trong dữ liệu ở bước 3.
      const o = document.getElementById('up-list');
      if (o) {
        const d = document.createElement('div');
        d.className = 'wrong-q';
        d.style.padding = '10px 14px';
        d.innerHTML = '<code style="font-size:0.88rem">' + esc(key) + '</code>' +
          '<span class="tag-warm" style="margin-left:10px;font-size:0.78rem">tách từ PDF</span>' +
          '<span class="stat-lab" style="margin-left:10px">' + esc(ngan) + '</span>';
        o.appendChild(d);
      }
      return null;
    }
  });
}
