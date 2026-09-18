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
'      "topic_tag": "dạng ngữ pháp hoặc kỹ năng đang kiểm tra, ví dụ: Thì động từ, Từ nối, Từ vựng",\n' +
'      "evidence": ["chép NGUYÊN VĂN 1-2 cụm/câu trong passage_text chứng minh đáp án, ' +
'để mảng rỗng [] nếu câu này không có chỗ trích cụ thể (như câu ngữ pháp thuần)"]\n' +
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
'      "topic_tag": "dạng câu hỏi, ví dụ: Câu hỏi ý chính, Câu hỏi chi tiết, ' +
'Câu hỏi suy luận, Câu hỏi từ vựng, Câu hỏi chèn câu",\n' +
'      "evidence": ["chép NGUYÊN VĂN câu hoặc cụm trong passage_text trả lời cho câu hỏi này, ' +
'có thể ghi nhiều đoạn nếu câu hỏi cần gộp thông tin từ nhiều chỗ"]\n' +
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
'Việc cần làm lần này:\n[ghi rõ ở đây, ví dụ: soạn 2 bài Part 7 một văn bản và 1 bài hai văn bản]';

const SAMPLE = JSON.stringify([
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
        topic_tag: 'Từ loại',
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
        topic_tag: 'Chèn câu',
        evidence: ['During this period, please use the south stairwell.']
      },
      {
        number: 133, A: 'promptly', B: 'in advance', C: 'as usual', D: 'once again',
        correct_answer: 'B',
        explanation: 'Nhân viên cần hỗ trợ nên liên hệ trước (in advance) để được sắp xếp, hợp ngữ cảnh thông báo trước sự việc.',
        topic_tag: 'Từ vựng',
        evidence: []
      },
      {
        number: 134, A: 'resume', B: 'resumed', C: 'resuming', D: 'resumes',
        correct_answer: 'D',
        explanation: 'Chủ ngữ "Normal service" số ít, thì hiện tại đơn diễn tả việc sẽ trở lại đúng lịch, nên chia "resumes".',
        topic_tag: 'Hoà hợp chủ ngữ động từ',
        evidence: []
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

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLE;
  say('Đây là một đoạn làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

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
