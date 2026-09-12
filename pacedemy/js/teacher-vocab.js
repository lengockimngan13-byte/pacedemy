// ============================================================
// Pacedemy — nhập từ vựng vào kho
// Một phần tử JSON = một chủ đề kèm danh sách từ.
// Chủ đề đã có thì dùng lại, từ đã có thì bỏ qua.
// ============================================================

let me = null;
let packs = [];        // dữ liệu đã đọc
let topicsNow = [];    // chủ đề đang có trong kho

const POS = ['n', 'v', 'adj', 'adv', 'phr'];

const $ = function (id) { return document.getElementById(id); };

const PROMPT =
'Mình có một web học TOEIC. Hãy soạn từ vựng và trả về DUY NHẤT một khối JSON, ' +
'không thêm lời dẫn, không thêm dấu ```.\n\n' +
'JSON là một mảng, mỗi phần tử là MỘT chủ đề:\n' +
'{\n' +
'  "topic_slug": "chữ thường không dấu nối bằng gạch ngang, ví dụ du-lich-cong-tac",\n' +
'  "topic_name_vi": "tên chủ đề bằng tiếng Việt",\n' +
'  "topic_name_en": "tên chủ đề bằng tiếng Anh",\n' +
'  "words": [\n' +
'    {\n' +
'      "word": "từ tiếng Anh viết thường",\n' +
'      "phonetic": "phiên âm IPA có hai dấu gạch chéo, ví dụ /kənˈtrækt/",\n' +
'      "pos": "một trong: n, v, adj, adv, phr",\n' +
'      "meaning_vi": "nghĩa tiếng Việt ngắn gọn, không giải thích dài",\n' +
'      "example_en": "một câu ví dụ theo văn phong công sở TOEIC",\n' +
'      "example_vi": "bản dịch tiếng Việt của đúng câu đó",\n' +
'      "synonyms": "các từ đồng nghĩa ngăn nhau bằng dấu phẩy, ví dụ: agreement, deal, pact",\n' +
'      "collocations": "các cụm ngăn nhau bằng dấu chấm phẩy, mỗi cụm viết dạng cụm tiếng Anh — nghĩa tiếng Việt, ' +
'ví dụ: sign a contract — ký hợp đồng; renew a contract — gia hạn hợp đồng",\n' +
'      "level": 1\n' +
'    }\n' +
'  ]\n' +
'}\n\n' +
'Quy ước bắt buộc:\n' +
'- level là 1 cơ bản 400-500, 2 trung cấp 600-700, 3 nâng cao 800+.\n' +
'- Trong collocations phải dùng dấu gạch dài — giữa cụm tiếng Anh và nghĩa tiếng Việt, ' +
'và dấu chấm phẩy giữa các cụm. Mỗi từ cho 2 đến 3 cụm.\n' +
'- synonyms cho 2 đến 4 từ, chỉ ngăn bằng dấu phẩy, không đánh số.\n' +
'- Câu ví dụ phải là bối cảnh công sở, văn phòng, hợp đồng, họp hành, đơn hàng — ' +
'không dùng bối cảnh đời thường.\n' +
'- Không lặp lại một từ hai lần trong cùng một chủ đề.\n\n' +
'Việc cần làm lần này:\n' +
'[ghi rõ ở đây, ví dụ: soạn 30 từ cho chủ đề mới Du lịch công tác, ' +
'chia đều 10 từ mỗi level]';

const SAMPLE = JSON.stringify([
  {
    topic_slug: 'du-lich-cong-tac',
    topic_name_vi: 'Du lịch công tác',
    topic_name_en: 'Business Travel',
    words: [
      {
        word: 'itinerary',
        phonetic: '/aɪˈtɪnərəri/',
        pos: 'n',
        meaning_vi: 'lịch trình chuyến đi',
        example_en: 'Please review the itinerary before the client meeting in Osaka.',
        example_vi: 'Vui lòng xem lại lịch trình trước buổi gặp khách hàng ở Osaka.',
        synonyms: 'schedule, plan, route',
        collocations: 'a detailed itinerary — lịch trình chi tiết; revise an itinerary — chỉnh lại lịch trình',
        level: 2
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
  loadTopics();
})();

async function loadTopics() {
  const { data: ts } = await db
    .from('topics').select('id, slug, name_vi, order_index').order('order_index');

  topicsNow = ts || [];

  if (!topicsNow.length) {
    $('topics-now').innerHTML = '<p class="empty">Kho chưa có chủ đề nào.</p>';
    return;
  }

  const { data: ws } = await db.from('vocabulary').select('topic_id');
  const n = {};
  for (const w of (ws || [])) n[w.topic_id] = (n[w.topic_id] || 0) + 1;

  let html = '<p style="font-size:0.9rem;margin:0 0 10px">Chủ đề đang có trong kho:</p>';

  for (const t of topicsNow) {
    html += '<span class="q-tag" style="margin:0 6px 6px 0">' +
            esc(t.name_vi) + ' · ' + esc(t.slug) + ' · ' + (n[t.id] || 0) + ' từ</span> ';
  }

  $('topics-now').innerHTML = html;
}

// ---------- Câu nhắc ----------

$('btn-prompt').addEventListener('click', function () {
  navigator.clipboard.writeText(PROMPT).then(function () {
    $('prompt-ok').textContent = 'Đã copy. Nhớ viết rõ chủ đề và số từ cần soạn.';
    setTimeout(function () { $('prompt-ok').textContent = ''; }, 4000);
  });
});

$('btn-sample').addEventListener('click', function () {
  $('raw').value = SAMPLE;
  say('Đây là một từ làm mẫu. Bấm Xem trước để thấy cách hệ thống đọc dữ liệu.', 'good');
});

// ---------- Đọc dữ liệu ----------

function say(msg, kind) {
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

$('btn-parse').addEventListener('click', async function () {
  const raw = $('raw').value.trim();
  if (!raw) return say('Bạn dán dữ liệu vào ô trên đã nhé.');

  try {
    packs = readJson(raw);
  } catch (e) {
    return say('Không đọc được dữ liệu: ' + e.message);
  }

  if (!packs.length) return say('Không tìm thấy chủ đề nào trong dữ liệu.');

  await markExisting();
  preview(check(packs));
});

function readJson(raw) {
  const clean = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const arr = JSON.parse(clean);
  const list = Array.isArray(arr) ? arr : [arr];

  return list.map(function (o) {
    const ws = Array.isArray(o.words) ? o.words : [];

    return {
      slug: (o.topic_slug || o.slug || '').trim().toLowerCase(),
      name_vi: (o.topic_name_vi || o.name_vi || '').trim(),
      name_en: (o.topic_name_en || o.name_en || '').trim(),
      words: ws.map(function (w) {
        return {
          word: (w.word || '').trim().toLowerCase(),
          phonetic: (w.phonetic || '').trim(),
          pos: (w.pos || '').trim().toLowerCase(),
          meaning_vi: (w.meaning_vi || '').trim(),
          example_en: (w.example_en || '').trim(),
          example_vi: (w.example_vi || '').trim(),
          synonyms: (w.synonyms || '').trim(),
          collocations: (w.collocations || '').trim(),
          level: parseInt(w.level || 1, 10),
          dup: false
        };
      })
    };
  });
}

// Đánh dấu những từ đã có sẵn trong chủ đề đó
async function markExisting() {
  for (const pk of packs) {
    const t = topicsNow.filter(function (x) { return x.slug === pk.slug; })[0];
    pk.topicId = t ? t.id : null;
    pk.isNew = !t;

    if (!t) continue;

    const { data: have } = await db
      .from('vocabulary').select('word').eq('topic_id', t.id);

    const set = new Set((have || []).map(function (x) { return (x.word || '').toLowerCase(); }));
    for (const w of pk.words) w.dup = set.has(w.word);
  }
}

// ---------- Kiểm lỗi ----------

function check(list) {
  const problems = {};

  list.forEach(function (pk, i) {
    const p = [];

    if (!pk.slug) p.push('thiếu topic_slug');
    if (!/^[a-z0-9-]+$/.test(pk.slug || '')) p.push('topic_slug chỉ được có chữ thường, số và gạch ngang');
    if (pk.isNew && !pk.name_vi) p.push('chủ đề mới nên phải có tên tiếng Việt');
    if (!pk.words.length) p.push('chủ đề này chưa có từ nào');

    const seen = new Set();

    pk.words.forEach(function (w, j) {
      const no = 'từ ' + (j + 1) + ' (' + (w.word || '?') + '): ';

      if (!w.word) p.push(no + 'thiếu từ');
      if (!w.meaning_vi) p.push(no + 'thiếu nghĩa tiếng Việt');
      if (POS.indexOf(w.pos) === -1) p.push(no + 'pos phải là n, v, adj, adv hoặc phr');
      if ([1, 2, 3].indexOf(w.level) === -1) p.push(no + 'level phải là 1, 2 hoặc 3');
      if (!w.example_en || !w.example_vi) p.push(no + 'thiếu câu ví dụ hoặc bản dịch');
      if (w.collocations && w.collocations.indexOf('—') === -1 && w.collocations.indexOf('-') === -1) {
        p.push(no + 'cụm từ chưa có dấu gạch ngăn nghĩa tiếng Việt');
      }
      if (w.word && seen.has(w.word)) p.push(no + 'bị lặp trong cùng chủ đề');
      seen.add(w.word);
    });

    if (p.length) problems[i] = p;
  });

  return problems;
}

// ---------- Xem trước ----------

function preview(bad) {
  const nBad = Object.keys(bad).length;
  let nNew = 0, nDup = 0;

  for (const pk of packs) {
    for (const w of pk.words) { if (w.dup) nDup++; else nNew++; }
  }

  let html = '<div class="section-head" style="margin-top:26px">' +
             '<h2>Xem trước ' + packs.length + ' chủ đề · ' + nNew + ' từ mới</h2>' +
             (nBad ? '<span class="tag-cold">' + nBad + ' chủ đề cần sửa</span>'
                   : '<span class="tag-warm">Không có lỗi</span>') + '</div>';

  if (nDup) {
    html += '<p class="empty" style="text-align:left">' + nDup +
            ' từ đã có sẵn trong kho, những từ này sẽ được bỏ qua khi lưu.</p>';
  }

  packs.forEach(function (pk, i) {
    const p = bad[i];

    html +=
      '<div class="wrong-q" style="' + (p ? 'border-color:var(--danger)' : '') + '">' +
        '<span class="q-tag">' + esc(pk.name_vi || pk.slug) + '</span> ' +
        (pk.isNew ? '<span class="tag-warm" style="font-size:0.78rem">chủ đề mới</span> '
                  : '<span class="stat-lab">chủ đề đã có</span> ') +
        (p ? '<span class="tag-cold" style="font-size:0.82rem">' + esc(p.join(' · ')) + '</span>' : '') +
        '<p class="ww" style="margin-top:8px">' + pk.words.length + ' từ trong dữ liệu</p>';

    pk.words.forEach(function (w) {
      html +=
        '<div style="margin-top:10px;padding-left:12px;border-left:2px solid ' +
          (w.dup ? 'var(--gold)' : 'var(--line)') + '">' +
          '<p class="wq" style="margin:0">' +
            '<b>' + esc(w.word) + '</b> ' +
            '<span style="color:#6C837E">' + esc(w.phonetic) + ' · ' + esc(w.pos) +
            ' · mức ' + w.level + '</span>' +
            (w.dup ? ' <span class="stat-lab">đã có, bỏ qua</span>' : '') +
          '</p>' +
          '<p class="ww" style="margin:4px 0 0">' + esc(w.meaning_vi) + '</p>' +
          (w.example_en ? '<p class="ww" style="margin:4px 0 0;color:#6C837E">' +
            esc(w.example_en) + '</p>' : '') +
          (w.collocations ? '<p class="key-point" style="margin:6px 0 0">' +
            esc(w.collocations) + '</p>' : '') +
        '</div>';
    });

    html += '</div>';
  });

  $('preview').innerHTML = html;

  if (nBad) {
    say('Có ' + nBad + ' chủ đề còn lỗi. Bạn sửa trong ô dữ liệu rồi bấm Xem trước lại. ' +
        'Vẫn lưu được nhưng những chủ đề lỗi sẽ bị bỏ qua.');
  } else if (!nNew) {
    say('Tất cả từ trong dữ liệu đều đã có sẵn trong kho, không có gì để thêm.');
  } else {
    say('Dữ liệu hợp lệ. Bấm Lưu để thêm ' + nNew + ' từ mới.', 'good');
  }

  $('btn-save').classList.remove('hidden');
  $('btn-save').dataset.bad = JSON.stringify(Object.keys(bad));
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  const bad = new Set(JSON.parse(this.dataset.bad || '[]').map(Number));
  const good = packs.filter(function (pk, i) { return !bad.has(i); });

  if (!good.length) return say('Không có chủ đề nào hợp lệ để lưu.');

  this.disabled = true;
  this.textContent = 'Đang lưu…';

  let nW = 0, nT = 0;

  for (const pk of good) {
    let topicId = pk.topicId;

    // Chủ đề mới thì tạo trước
    if (!topicId) {
      const maxOrder = topicsNow.reduce(function (m, t) {
        return Math.max(m, t.order_index || 0);
      }, 0);

      const { data: t, error } = await db.from('topics').insert({
        slug: pk.slug,
        name_vi: pk.name_vi,
        name_en: pk.name_en || pk.name_vi,
        order_index: maxOrder + 1
      }).select('id, slug, name_vi, order_index').single();

      if (error || !t) {
        this.disabled = false;
        this.textContent = 'Lưu vào kho từ vựng';
        return say('Không tạo được chủ đề "' + pk.slug + '": ' +
                   (error ? error.message : 'lỗi không rõ'));
      }

      topicId = t.id;
      topicsNow.push(t);
      nT++;
    }

    const rows = pk.words.filter(function (w) { return !w.dup; }).map(function (w) {
      return {
        topic_id: topicId,
        word: w.word,
        phonetic: w.phonetic || null,
        pos: w.pos || null,
        meaning_vi: w.meaning_vi,
        example_en: w.example_en || null,
        example_vi: w.example_vi || null,
        synonyms: w.synonyms || null,
        collocations: w.collocations || null,
        level: w.level || 1
      };
    });

    if (!rows.length) continue;

    const { error: e2 } = await db.from('vocabulary').insert(rows);

    if (e2) {
      this.disabled = false;
      this.textContent = 'Lưu vào kho từ vựng';
      return say('Không lưu được từ của chủ đề "' + pk.slug + '": ' + e2.message);
    }

    nW += rows.length;
  }

  this.disabled = false;
  this.textContent = 'Lưu vào kho từ vựng';

  say('Đã thêm ' + nW + ' từ' + (nT ? ' và ' + nT + ' chủ đề mới' : '') + '.', 'good');
  $('raw').value = '';
  $('preview').innerHTML = '';
  $('btn-save').classList.add('hidden');
  loadTopics();
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
