// ============================================================
// Pacedemy — nhập đề Part 6 và Part 7
// Một phần tử JSON = một đoạn đọc kèm các câu hỏi của nó.
// ============================================================

let me = null;
let sets = [];

const $ = function (id) { return document.getElementById(id); };

const P6 =
'Mình có một web học TOEIC. Hãy soạn đề Part 6 và trả về DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT đoạn văn:\n' +
'{\n' +
'  "part": 6,\n' +
'  "title": "tên ngắn gọn bằng tiếng Việt để giáo viên dễ tìm",\n' +
'  "doc_type": "loại văn bản, ví dụ: email, thông báo, thư ngỏ, quảng cáo",\n' +
'  "passage_text": "toàn bộ đoạn văn tiếng Anh. Bốn chỗ trống viết đúng dạng ---131---, ' +
'---132---, ---133---, ---134---",\n' +
'  "passage_vi": "bản dịch tiếng Việt của cả đoạn",\n' +
'  "vocab": [{"term": "từ hoặc cụm tiếng Anh đáng chú ý trong đoạn", "meaning_vi": "nghĩa tiếng Việt"}],\n' +
'  "questions": [\n' +
'    {\n' +
'      "number": 131,\n' +
'      "A": "phương án A", "B": "phương án B", "C": "phương án C", "D": "phương án D",\n' +
'      "correct_answer": "A",\n' +
'      "explanation": "giải thích bằng tiếng Việt, nói rõ vì sao đáp án đúng và ' +
'vì sao ba phương án kia sai",\n' +
'      "topic_tag": "đúng MỘT nhãn lấy nguyên văn từ danh sách bên dưới, không tự đặt nhãn mới",\n' +
'      "evidence": ["chép NGUYÊN VĂN 1-2 cụm/câu trong passage_text chứng minh đáp án, ' +
'để mảng rỗng [] nếu câu này không có chỗ trích cụ thể (như câu ngữ pháp thuần)"],\n' +
'      "evidence_vi": ["bản dịch tiếng Việt của từng câu dẫn chứng, khớp đúng thứ tự mảng evidence"],\n' +
'      "question_vi": {"q": "bản dịch tiếng Việt của câu hỏi", "A": "dịch phương án A", ' +
'"B": "dịch phương án B", "C": "dịch phương án C", "D": "dịch phương án D"}\n' +
'    }\n' +
'  ]\n' +
'}\n\n' +
'Quy ước bắt buộc:\n' +
'- Đúng 4 câu mỗi đoạn, đánh số 131 đến 134.\n' +
'- Trong 4 câu phải có ít nhất 1 câu chọn câu hoàn chỉnh điền vào đoạn, ' +
'đây là dạng đặc trưng của Part 6.\n' +
'- Đáp án đúng rải đều A, B, C, D giữa các đoạn, không dồn hết vào một chữ.\n' +
'- Đoạn văn dài khoảng 90 đến 130 từ, bối cảnh công sở thật, văn phong TOEIC.\n' +
'- Giải thích viết bằng tiếng Việt, mỗi câu 2 đến 3 dòng.\n' +
'- evidence PHẢI chép đúng nguyên văn từ passage_text (không diễn giải lại), ' +
'để hệ thống tô màu đúng chỗ trong bài — chép sai một chữ là sẽ không tô được.\n' +
'- vocab chọn khoảng 4 đến 8 từ/cụm khó hoặc đáng học trong đoạn, không trùng các từ đã quá cơ bản.\n\n' +
'Danh sách nhãn hợp lệ cho Part 6:\n' +
'Câu hỏi từ loại | Câu hỏi ngữ pháp | Câu hỏi từ vựng | Câu hỏi điền câu vào đoạn văn | ' +
'Hình thức: Thư điện tử/ thư tay (Email/ Letter) | Hình thức: Bài báo (Article/ Review) | ' +
'Hình thức: Quảng cáo (Advertisement) | [Grammar] Tính từ | [Grammar] Thì | [Grammar] Trạng từ | ' +
'[Grammar] Động từ nguyên mẫu có to | [Grammar] Giới từ\n\n' +
'Việc cần làm lần này:\n[ghi rõ ở đây, ví dụ: soạn 3 đoạn Part 6 chủ đề tuyển dụng và nội quy công ty]';

const P7 =
'Mình có một web học TOEIC. Hãy soạn đề Part 7 và trả về DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT bài đọc:\n' +
'{\n' +
'  "part": 7,\n' +
'  "title": "tên ngắn gọn bằng tiếng Việt",\n' +
'  "doc_type": "email, thông báo, bài báo, tin nhắn, lịch trình, hoá đơn...",\n' +
'  "passage_text": "toàn bộ văn bản tiếng Anh. Nếu bài có nhiều văn bản thì ngăn nhau ' +
'bằng một dòng chỉ có ba dấu === và đặt tiêu đề nhỏ cho từng văn bản",\n' +
'  "passage_vi": "bản dịch tiếng Việt",\n' +
'  "vocab": [{"term": "từ hoặc cụm tiếng Anh đáng chú ý trong bài", "meaning_vi": "nghĩa tiếng Việt"}],\n' +
'  "questions": [\n' +
'    {\n' +
'      "number": 147,\n' +
'      "question_text": "câu hỏi bằng tiếng Anh",\n' +
'      "A": "phương án A", "B": "phương án B", "C": "phương án C", "D": "phương án D",\n' +
'      "correct_answer": "B",\n' +
'      "explanation": "giải thích bằng tiếng Việt, chỉ rõ thông tin nằm ở câu nào ' +
'trong bài và vì sao ba phương án kia sai",\n' +
'      "topic_tag": "đúng MỘT nhãn lấy nguyên văn từ danh sách bên dưới, không tự đặt nhãn mới",\n' +
'      "evidence": ["chép NGUYÊN VĂN câu hoặc cụm trong passage_text trả lời cho câu hỏi này, ' +
'có thể ghi nhiều đoạn nếu câu hỏi cần gộp thông tin từ nhiều chỗ"],\n' +
'      "evidence_vi": ["bản dịch tiếng Việt của từng câu dẫn chứng, khớp đúng thứ tự mảng evidence"],\n' +
'      "question_vi": {"q": "bản dịch tiếng Việt của câu hỏi", "A": "dịch phương án A", ' +
'"B": "dịch phương án B", "C": "dịch phương án C", "D": "dịch phương án D"}\n' +
'    }\n' +
'  ]\n' +
'}\n\n' +
'Quy ước bắt buộc:\n' +
'- Mỗi bài từ 2 đến 5 câu hỏi, đánh số liên tục.\n' +
'- Mỗi bài phải có ít nhất một câu hỏi ý chính hoặc mục đích, ' +
'và ít nhất một câu hỏi chi tiết.\n' +
'- Bài một văn bản dài 150 đến 250 từ. Bài nhiều văn bản thì mỗi văn bản 100 đến 150 từ ' +
'và phải có ít nhất một câu hỏi bắt buộc đọc cả hai văn bản mới trả lời được.\n' +
'- Đáp án đúng rải đều A, B, C, D.\n' +
'- Giải thích viết bằng tiếng Việt.\n' +
'- evidence PHẢI chép đúng nguyên văn từ passage_text, không diễn giải lại — chép sai dù một chữ ' +
'cũng khiến hệ thống không tô màu được chỗ đó.\n' +
'- vocab chọn khoảng 4 đến 8 từ/cụm khó hoặc đáng học trong bài.\n\n' +
'Danh sách nhãn hợp lệ cho Part 7:\n' +
'Câu hỏi tìm thông tin | Câu hỏi tìm chi tiết sai | Câu hỏi về chủ đề, mục đích | Câu hỏi suy luận | ' +
'Câu hỏi điền câu | Câu hỏi tìm từ đồng nghĩa | Câu hỏi về hàm ý câu nói | ' +
'Cấu trúc: một đoạn | Cấu trúc: nhiều đoạn | ' +
'Dạng bài: Email/ Letter: Thư điện tử/ Thư tay | Dạng bài: Form - Đơn từ, biểu mẫu | ' +
'Dạng bài: Article/ Review: Bài báo/ Bài đánh giá | Dạng bài: Advertisement - Quảng cáo | ' +
'Dạng bài: Announcement/ Notice: Thông báo | Dạng bài: Text message chain - Chuỗi tin nhắn | ' +
'Dạng bài: Instructions: Văn bản hướng dẫn | Dạng bài: List/ Menu: Danh sách/ Thực đơn\n\n' +
'Việc cần làm lần này:\n[ghi rõ ở đây, ví dụ: soạn 2 bài Part 7 một văn bản và 1 bài hai văn bản]';

const SAMPLE_6 = JSON.stringify([
  {
    part: 6,
    title: 'Thông báo bảo trì thang máy',
    doc_type: 'thông báo',
    passage_text:
      'To all staff,\n\nThe elevators in the north wing will be ---131--- for routine maintenance ' +
      'from Monday through Wednesday. During this period, please use the south stairwell. ' +
      '---132--- We apologize for any inconvenience this may cause. Employees who require ' +
      'assistance should contact the facilities desk ---133---. Normal service will ---134--- ' +
      'on Thursday morning.',
    passage_vi:
      'Gửi toàn thể nhân viên,\n\nThang máy ở cánh bắc sẽ ngừng hoạt động để bảo trì định kỳ ' +
      'từ thứ Hai đến thứ Tư. Trong thời gian này, xin dùng cầu thang bộ cánh nam. ' +
      'Chúng tôi xin lỗi vì sự bất tiện. Nhân viên cần hỗ trợ xin liên hệ quầy cơ sở vật chất ' +
      'trước. Thang máy hoạt động lại bình thường vào sáng thứ Năm.',
    vocab: [
      { term: 'routine maintenance', meaning_vi: 'bảo trì định kỳ' },
      { term: 'stairwell', meaning_vi: 'lồng cầu thang bộ' },
      { term: 'facilities desk', meaning_vi: 'quầy cơ sở vật chất' }
    ],
    questions: [
      {
        number: 131, A: 'unavailable', B: 'unavailably', C: 'unavailability', D: 'unavailed',
        correct_answer: 'A',
        explanation: 'Sau động từ to be cần tính từ làm bổ ngữ. B là trạng từ, C là danh từ, D không tồn tại.',
        topic_tag: 'Câu hỏi từ loại',
        evidence: []
      },
      {
        number: 132,
        A: 'Signs will be posted at each entrance.',
        B: 'The cafeteria menu has been updated.',
        C: 'Parking permits expire next month.',
        D: 'Our sales figures exceeded expectations.',
        correct_answer: 'A',
        explanation: 'Câu chèn phải nối ý với việc dùng cầu thang bộ. Ba phương án kia lạc chủ đề.',
        topic_tag: 'Câu hỏi điền câu vào đoạn văn',
        evidence: ['During this period, please use the south stairwell.']
      },
      {
        number: 133, A: 'promptly', B: 'in advance', C: 'as usual', D: 'once again',
        correct_answer: 'B',
        explanation: 'Nhân viên cần hỗ trợ nên liên hệ trước (in advance) để được sắp xếp, hợp ngữ cảnh thông báo trước sự việc.',
        topic_tag: 'Câu hỏi từ vựng',
        evidence: []
      },
      {
        number: 134, A: 'resume', B: 'resumed', C: 'resuming', D: 'resumes',
        correct_answer: 'D',
        explanation: 'Chủ ngữ "Normal service" số ít, thì hiện tại đơn diễn tả việc sẽ trở lại đúng lịch, nên chia "resumes".',
        topic_tag: 'Câu hỏi ngữ pháp',
        evidence: []
      }
    ]
  }
], null, 2);

const SAMPLE_7 = JSON.stringify([
  {
    part: 7,
    title: 'Bản ghi nhớ về dự án năng lượng mặt trời',
    doc_type: 'memo',
    passage_text:
      'To: Ravi Berg and 11 others\nFrom: Beatriz Janssen, External Communications Specialist\n' +
      'Date: November 12\nSubject: Sunnyhill solar facility\n\n' +
      'In advance of Friday\'s press briefing on the project\'s progress, I would like to issue the following ' +
      'reminder to members of the Clean Energy Group and Public Relations Department. Since Mr. Nakamura ' +
      'has designated me as our official spokesperson on the Sunnyhill solar facility, I must be the one to ' +
      'handle press inquiries on the subject. Please pass this detail on to any journalists who contact you. ' +
      'As you all know, the project continues to face some amount of resistance from members of the community ' +
      'for its possible impact on agriculture. For that reason, it is crucial that our company avoid making ' +
      'any remarks that are not informed by both expertise on the project and sensitivity to public sentiment.',
    passage_vi:
      'Gửi: Ravi Berg và 11 người khác\nTừ: Beatriz Janssen, Chuyên viên Truyền thông Đối ngoại\n' +
      'Ngày: 12 tháng 11\nChủ đề: Cơ sở năng lượng mặt trời Sunnyhill\n\n' +
      'Trước buổi họp báo thứ Sáu về tiến độ dự án, tôi xin nhắc lại điều sau tới các thành viên của Nhóm ' +
      'Năng lượng Sạch và Phòng Quan hệ Công chúng. Vì ông Nakamura đã chỉ định tôi là người phát ngôn chính ' +
      'thức về cơ sở năng lượng mặt trời Sunnyhill, tôi phải là người xử lý các câu hỏi của báo chí về chủ đề ' +
      'này. Xin chuyển thông tin này tới bất kỳ nhà báo nào liên hệ với các bạn. Như tất cả đã biết, dự án vẫn ' +
      'đang vấp phải một số phản đối từ cộng đồng vì tác động tiềm ẩn tới nông nghiệp. Vì vậy, công ty cần ' +
      'tránh mọi phát ngôn thiếu chuyên môn về dự án hoặc thiếu nhạy cảm với dư luận.',
    vocab: [
      { term: 'spokesperson', meaning_vi: 'người phát ngôn' },
      { term: 'press inquiries', meaning_vi: 'câu hỏi từ báo chí' },
      { term: 'public sentiment', meaning_vi: 'dư luận, cảm nhận của công chúng' }
    ],
    questions: [
      {
        number: 147, question_text: 'What is the purpose of the memo?',
        A: 'To invite residents to a meeting on May 3',
        B: 'To request feedback about parking facilities',
        C: 'To inform staff who should handle press questions',
        D: 'To announce an increase in project funding',
        correct_answer: 'C',
        explanation: 'Bản ghi nhớ nêu rõ Beatriz Janssen là người phát ngôn chính thức, mọi câu hỏi báo chí phải chuyển cho cô.',
        topic_tag: 'Câu hỏi về chủ đề, mục đích',
        evidence: ['Since Mr. Nakamura has designated me as our official spokesperson on the Sunnyhill solar facility, I must be the one to handle press inquiries on the subject.']
      },
      {
        number: 148, question_text: 'What is mentioned about the solar facility?',
        A: 'It was proposed by a conservation group',
        B: 'It is controversial among some local residents',
        C: 'It will soon be toured by a team of journalists',
        D: 'Its completion will be announced on Friday',
        correct_answer: 'B',
        explanation: 'Đoạn văn nói dự án đang gặp phản đối từ cộng đồng vì ảnh hưởng tới nông nghiệp, cho thấy nó đang gây tranh cãi.',
        topic_tag: 'Câu hỏi tìm thông tin',
        evidence: ['the project continues to face some amount of resistance from members of the community for its possible impact on agriculture']
      }
    ]
  }
], null, 2);

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
  loadHave();
})();

$('btn-p6').addEventListener('click', function () { copyPrompt(P6, 'Part 6'); });
$('btn-p7').addEventListener('click', function () { copyPrompt(P7, 'Part 7'); });

function copyPrompt(text, name) {
  navigator.clipboard.writeText(text).then(function () {
    $('prompt-ok').textContent =
      'Đã copy câu nhắc ' + name + '. Nhớ viết rõ cần bao nhiêu đoạn và chủ đề gì.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 5000);
  });
}

$('btn-sample-6').addEventListener('click', function () {
  $('raw').value = SAMPLE_6;
  say('Đây là một đoạn Part 6 làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

$('btn-sample-7').addEventListener('click', function () {
  $('raw').value = SAMPLE_7;
  say('Đây là một bài Part 7 làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

// Số Test giáo viên nhập ở Bước 3 — áp cho mọi đoạn lưu trong lượt này
function testNo() {
  const v = parseInt(($('test-no') || {}).value, 10);
  return isNaN(v) ? null : v;
}

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

// ---------- Đọc dữ liệu ----------

$('btn-parse').addEventListener('click', function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    sets = readJson(raw);
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!sets.length) return say('Không tìm thấy đoạn đọc nào.');
  preview(check(sets));
});

function readJson(raw) {
  const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const arr = JSON.parse(clean);
  const list = Array.isArray(arr) ? arr : [arr];

  return list.map(function (o) {
    const qs = Array.isArray(o.questions) ? o.questions : [];

    return {
      part: parseInt(o.part || 7, 10),
      title: (o.title || '').trim(),
      doc_type: (o.doc_type || '').trim(),
      passage_text: (o.passage_text || '').trim(),
      passage_vi: (o.passage_vi || '').trim(),
      vocab: Array.isArray(o.vocab) ? o.vocab.map(function (v) {
        return { term: (v.term || '').trim(), meaning_vi: (v.meaning_vi || '').trim() };
      }).filter(function (v) { return v.term; }) : [],
      difficulty: parseInt(o.difficulty || 2, 10),
      questions: qs.map(function (q, i) {
        return {
          number: q.number || null,
          question_text: (q.question_text || '').trim(),
          A: (q.A || '').trim(), B: (q.B || '').trim(),
          C: (q.C || '').trim(), D: (q.D || '').trim(),
          correct_answer: (q.correct_answer || '').trim().toUpperCase(),
          explanation: (q.explanation || '').trim(),
          topic_tag: (q.topic_tag || '').trim(),
          evidence: Array.isArray(q.evidence) ? q.evidence.map(function (e) { return String(e).trim(); }).filter(Boolean) : [],
          evidence_vi: Array.isArray(q.evidence_vi) ? q.evidence_vi.map(function (e) { return String(e).trim(); }) : [],
          question_vi: (q.question_vi && typeof q.question_vi === 'object') ? q.question_vi : {},
          order_index: i + 1
        };
      })
    };
  });
}

function check(list) {
  const bad = {};

  list.forEach(function (s, i) {
    const p = [];

    if ([6, 7].indexOf(s.part) === -1) p.push('part phải là 6 hoặc 7');
    if (!s.title) p.push('thiếu tên đoạn');
    if (!s.passage_text) p.push('thiếu nội dung đoạn đọc');
    if (!s.questions.length) p.push('đoạn này chưa có câu hỏi nào');

    if (s.part === 6) {
      const holes = (s.passage_text.match(/---\s*\d+\s*---/g) || []).length;
      if (holes !== s.questions.length) {
        p.push('đoạn có ' + holes + ' chỗ trống nhưng lại có ' +
               s.questions.length + ' câu hỏi, hai số này phải bằng nhau');
      }
    }

    s.questions.forEach(function (q, j) {
      const no = 'câu ' + (q.number || (j + 1)) + ': ';
      if (!q.A || !q.B || !q.C || !q.D) p.push(no + 'thiếu phương án');
      if (['A', 'B', 'C', 'D'].indexOf(q.correct_answer) === -1) p.push(no + 'đáp án phải là A, B, C hoặc D');
      if (s.part === 7 && !q.question_text) p.push(no + 'Part 7 phải có câu hỏi');
    });

    if (p.length) bad[i] = p;
  });

  return bad;
}

// ---------- Xem trước ----------

function preview(bad) {
  const nBad = Object.keys(bad).length;
  const nQ = sets.reduce(function (m, s) { return m + s.questions.length; }, 0);

  let html =
    '<div class="section-head" style="margin-top:26px">' +
      '<h2>Xem trước ' + sets.length + ' đoạn · ' + nQ + ' câu</h2>' +
      (nBad ? '<span class="tag-cold">' + nBad + ' đoạn cần sửa</span>'
            : '<span class="tag-warm">Không có lỗi</span>') +
    '</div>';

  sets.forEach(function (s, i) {
    const p = bad[i];

    html +=
      '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        '<span class="q-tag">Part ' + s.part + '</span> ' +
        '<b>' + esc(s.title) + '</b>' +
        (s.doc_type ? ' <span class="stat-lab">' + esc(s.doc_type) + '</span>' : '') +
        (p ? '<p class="ww" style="color:var(--danger)">' + esc(p.join(' · ')) + '</p>' : '') +
        '<pre class="passage-preview">' + esc(s.passage_text) + '</pre>';

    for (const q of s.questions) {
      html +=
        '<div style="margin-top:10px;padding-left:12px;border-left:2px solid var(--line)">' +
          '<p class="wq" style="margin:0">' +
            (q.number ? '<b>' + q.number + '.</b> ' : '') +
            esc(q.question_text || '(câu điền vào chỗ trống)') + '</p>' +
          ['A', 'B', 'C', 'D'].map(function (L) {
            const on = q.correct_answer === L;
            return '<p class="ww" style="margin:3px 0' + (on ? ';color:var(--teal);font-weight:600' : '') +
                   '">' + L + '. ' + esc(q[L]) + (on ? '  ✓' : '') + '</p>';
          }).join('') +
          (q.explanation ? '<p class="key-point" style="margin:6px 0 0">' +
            esc(q.explanation) + '</p>' : '') +
        '</div>';
    }

    html += '</div>';
  });

  $('preview').innerHTML = html;

  say(nBad
    ? 'Có ' + nBad + ' đoạn còn lỗi, những đoạn đó sẽ bị bỏ qua khi lưu.'
    : 'Dữ liệu hợp lệ, bấm Lưu để đưa vào ngân hàng đề.', nBad ? '' : 'good');

  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const bad = new Set(JSON.parse(this.dataset.bad || '[]').map(Number));
  const good = sets.filter(function (s, i) { return !bad.has(i); });

  if (!good.length) return say('Không có đoạn nào hợp lệ để lưu.');

  this.disabled = true;
  this.textContent = 'Đang lưu…';

  let nS = 0, nQ = 0;

  for (const s of good) {
    const { data: row, error } = await db.from('reading_sets').insert({
      part: s.part,
      title: s.title,
      passage_text: s.passage_text,
      passage_vi: s.passage_vi || null,
      doc_type: s.doc_type || null,
      difficulty: s.difficulty || 2,
      vocab: s.vocab || [],
      test_no: testNo(),
      is_active: true
    }).select('id').single();

    if (error || !row) {
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được đoạn "' + s.title + '": ' +
                 (error ? error.message : 'lỗi không rõ'));
    }

    const payload = s.questions.map(function (q) {
      return {
        part: s.part,
        rset_id: row.id,
        order_index: q.order_index,
        question_text: q.question_text ||
          ('Chỗ trống số ' + (q.number || q.order_index)),
        options: { A: q.A, B: q.B, C: q.C, D: q.D },
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        topic_tag: q.topic_tag || null,
        evidence: q.evidence || [],
        evidence_vi: q.evidence_vi || [],
        question_vi: q.question_vi || {},
        difficulty: s.difficulty || 2,
        is_active: true
      };
    });

    const { error: e2 } = await db.from('questions').insert(payload);

    if (e2) {
      await db.from('reading_sets').delete().eq('id', row.id);
      this.disabled = false;
      this.textContent = 'Lưu vào ngân hàng đề';
      return say('Không lưu được câu hỏi của đoạn "' + s.title + '": ' + e2.message);
    }

    nS++; nQ += payload.length;
  }

  this.disabled = false;
  this.textContent = 'Lưu vào ngân hàng đề';

  say('Đã lưu ' + nS + ' đoạn và ' + nQ + ' câu hỏi.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadHave();
});

// ---------- Đoạn đọc đã có ----------

async function loadHave() {
  const { data: rs } = await db
    .from('reading_sets').select('id, part, title, doc_type, is_active, created_at')
    .order('created_at', { ascending: false }).limit(60);

  if (!rs || !rs.length) {
    $('have').innerHTML = '<p class="empty">Chưa có đoạn đọc nào.</p>';
    return;
  }

  const { data: qs } = await db
    .from('questions').select('rset_id')
    .in('rset_id', rs.map(function (r) { return r.id; }));

  const n = {};
  for (const q of (qs || [])) n[q.rset_id] = (n[q.rset_id] || 0) + 1;

  let html = '';

  for (const r of rs) {
    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap' +
        (r.is_active ? '' : ';opacity:0.55') + '">' +
        '<span class="q-tag" style="margin:0">Part ' + r.part + '</span>' +
        '<span style="flex:1;min-width:170px;font-weight:600">' + esc(r.title) + '</span>' +
        (r.doc_type ? '<span class="stat-lab">' + esc(r.doc_type) + '</span>' : '') +
        '<span class="stat-lab">' + (n[r.id] || 0) + ' câu</span>' +
        '<button class="btn-sm" data-tog="' + r.id + '" data-on="' + r.is_active + '">' +
          (r.is_active ? 'Tạm ẩn' : 'Mở lại') + '</button>' +
        '<button class="btn-sm" data-del="' + r.id + '">Xoá</button>' +
      '</div>';
  }

  $('have').innerHTML = html;

  $('have').querySelectorAll('button[data-tog]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('reading_sets')
        .update({ is_active: b.dataset.on !== 'true' }).eq('id', b.dataset.tog);
      loadHave();
    });
  });

  $('have').querySelectorAll('button[data-del]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Xoá hẳn đoạn này và toàn bộ câu hỏi của nó?')) return;
      await db.from('reading_sets').delete().eq('id', b.dataset.del);
      loadHave();
    });
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
