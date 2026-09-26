// ============================================================
// Pacedemy — hồ sơ học viên, phía giáo viên
// Chia nhánh: tổng quan, luyện đề, thi thử, từ vựng, dạng hay sai, nhật ký.
// ============================================================

let me = null;
let sid = null;
let prof = null;

let atts = [];      // toàn bộ buổi học
let mocks = [];     // các lần thi thử
let wrongs = null;  // lười nạp, chỉ khi mở tab Dạng hay sai
let detail = {};    // chi tiết từng câu của một buổi, nạp khi giáo viên bấm mở
let vocab = null;   // lười nạp

const $ = function (id) { return document.getElementById(id); };

const PART_NAME = {
  1: 'Part 1 · Mô tả tranh',
  2: 'Part 2 · Hỏi đáp',
  3: 'Part 3 · Hội thoại',
  4: 'Part 4 · Bài nói',
  5: 'Part 5 · Hoàn thành câu',
  6: 'Part 6 · Điền đoạn văn',
  7: 'Part 7 · Đọc hiểu'
};

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data: mine } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!mine || mine.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  sid = new URLSearchParams(location.search).get('id');
  if (!sid) { $('body').innerHTML = '<p class="empty">Thiếu mã học viên.</p>'; return; }

  $('view-main').classList.remove('hidden');

  const { data: p } = await db.from('profiles')
    .select('id, full_name, target_score, goal_note, total_xp, streak_days, best_streak, daily_goal, last_active, created_at')
    .eq('id', sid).single();

  prof = p || {};
  $('s-name').textContent = prof.full_name || 'Học viên';

  const { data: a } = await db.from('attempts')
    .select('id, mode, part, total_questions, correct_count, seconds_used, started_at, submitted_at')
    .eq('user_id', sid).not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  atts = a || [];

  const { data: m } = await db.from('mock_tests')
    .select('id, submitted_at, seconds_used, listening_correct, reading_correct, total_questions, payload')
    .eq('user_id', sid).not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  mocks = m || [];

  header();
  bindTabs();
  show('tong-quan');
})();

// ---------- Dòng đầu và cảnh báo ----------

function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

function header() {
  const last = atts.length ? atts[0].submitted_at : prof.last_active;
  const d = daysAgo(last);

  $('s-sub').textContent =
    (prof.target_score ? 'Mục tiêu ' + prof.target_score + ' điểm · ' : '') +
    'chuỗi ' + (prof.streak_days || 0) + ' ngày · ' +
    (d === null ? 'chưa học buổi nào'
                : (d === 0 ? 'có học hôm nay' : 'lần cuối cách đây ' + d + ' ngày'));

  let alert = '';

  if (d === null) {
    alert = 'Học viên này chưa làm bài nào kể từ khi tạo tài khoản.';
  } else if (d >= 14) {
    alert = 'Đã ' + d + ' ngày không vào học. Nên nhắn hỏi thăm.';
  } else if (d >= 7) {
    alert = 'Đã ' + d + ' ngày không vào học.';
  }

  $('alert-box').innerHTML = alert
    ? '<div class="tbox" style="border-color:var(--gold)">' +
        '<p style="margin:0;font-size:0.95rem">' + esc(alert) + '</p></div>'
    : '';
}

function bindTabs() {
  $('tabs').querySelectorAll('button[data-t]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('tabs').querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      show(b.dataset.t);
    });
  });
}

function show(t) {
  if (t === 'tong-quan') return tabOverview();
  if (t === 'luyen-de')  return tabDrill();
  if (t === 'thi-thu')   return tabMock();
  if (t === 'tu-vung')   return tabVocab();
  if (t === 'hay-sai')   return tabWrong();
  if (t === 'tung-cau')  return tabDetail();
  if (t === 'nhat-ky')   return tabLog();
}

// ---------- Tổng quan ----------

function tabOverview() {
  const drill = atts.filter(function (a) { return a.mode === 'practice'; });
  const voc   = atts.filter(function (a) { return a.mode === 'vocab' || a.mode === 'review'; });

  const sum = function (list, f) {
    return list.reduce(function (m, a) { return m + (f(a) || 0); }, 0);
  };

  const dOk = sum(drill, function (a) { return a.correct_count; });
  const dN  = sum(drill, function (a) { return a.total_questions; });
  const vOk = sum(voc,   function (a) { return a.correct_count; });
  const vN  = sum(voc,   function (a) { return a.total_questions; });
  const mins = Math.round(sum(atts, function (a) { return a.seconds_used; }) / 60);

  // Buổi học theo tuần gần đây
  const weeks = {};
  for (const a of atts) {
    const d = new Date(a.submitted_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = monday.getDate() + '/' + (monday.getMonth() + 1);
    weeks[k] = (weeks[k] || 0) + 1;
  }

  const wk = Object.keys(weeks).slice(0, 6);

  // Giờ học quen thuộc
  const hours = {};
  for (const a of atts) {
    const h = new Date(a.submitted_at).getHours();
    const band = h < 6 ? 'Đêm khuya 0–6h'
               : (h < 12 ? 'Buổi sáng 6–12h'
               : (h < 18 ? 'Buổi chiều 12–18h' : 'Buổi tối 18–24h'));
    hours[band] = (hours[band] || 0) + 1;
  }

  $('body').innerHTML =
    '<section class="stats">' +
      stat(atts.length, 'Buổi học đã ghi') +
      stat(dN ? dOk + '/' + dN : '—', 'Luyện đề đúng') +
      stat(vN ? vOk + '/' + vN : '—', 'Từ vựng đúng') +
      stat(mins + ' phút', 'Tổng thời gian học') +
    '</section>' +

    card('Nhịp học theo tuần',
      wk.length
        ? wk.map(function (k) {
            const n = weeks[k];
            return row('Tuần bắt đầu ' + k, bar(Math.min(100, n * 14)), n + ' buổi');
          }).join('')
        : '<p class="empty" style="text-align:left">Chưa có dữ liệu.</p>') +

    card('Giờ học quen thuộc',
      Object.keys(hours).length
        ? Object.keys(hours).sort(function (a, b) { return hours[b] - hours[a]; })
            .map(function (k) {
              const n = hours[k];
              return row(k, bar(Math.round(n / atts.length * 100)),
                         n + ' buổi · ' + Math.round(n / atts.length * 100) + '%');
            }).join('')
        : '<p class="empty" style="text-align:left">Chưa có dữ liệu.</p>');
}

// ---------- Luyện đề ----------

function tabDrill() {
  const drill = atts.filter(function (a) { return a.mode === 'practice'; });

  if (!drill.length) {
    $('body').innerHTML = '<p class="empty">Học viên chưa luyện đề buổi nào.</p>';
    return;
  }

  const byPart = {};
  for (const a of drill) {
    const p = a.part || 0;
    byPart[p] = byPart[p] || { ok: 0, n: 0, buoi: 0 };
    byPart[p].ok += a.correct_count || 0;
    byPart[p].n  += a.total_questions || 0;
    byPart[p].buoi++;
  }

  const keys = Object.keys(byPart).map(Number)
    .filter(function (k) { return k >= 1 && k <= 7; })
    .sort(function (a, b) { return a - b; });

  let rows = '';
  let weak = null;

  for (const k of keys) {
    const v = byPart[k];
    const pct = v.n ? Math.round(v.ok / v.n * 100) : 0;
    if (v.n >= 10 && (!weak || pct < weak.pct)) weak = { part: k, pct: pct };

    rows += row(PART_NAME[k] || ('Part ' + k), bar(pct),
                v.ok + '/' + v.n, pct + '%', v.buoi + ' buổi');
  }

  $('body').innerHTML =
    (weak
      ? '<div class="tbox" style="border-color:var(--gold)"><p style="margin:0;font-size:0.95rem">' +
        'Yếu nhất hiện nay là ' + esc(PART_NAME[weak.part]) + ' với ' + weak.pct +
        '% câu đúng.</p></div>'
      : '') +
    card('Đúng bao nhiêu câu theo từng part', rows) +
    card('Từng buổi luyện gần đây',
      drill.slice(0, 20).map(function (a) {
        const d = new Date(a.submitted_at);
        return row(
          d.getDate() + '/' + (d.getMonth() + 1) + ' ' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0'),
          '<span style="flex:1">' + (a.part ? 'Part ' + a.part : 'Trộn nhiều part') + '</span>',
          (a.correct_count || 0) + '/' + (a.total_questions || 0),
          Math.round((a.seconds_used || 0) / 60) + ' phút');
      }).join(''));
}

// ---------- Thi thử ----------

function tabMock() {
  if (!mocks.length) {
    $('body').innerHTML = '<p class="empty">Học viên chưa thi thử lần nào.</p>';
    return;
  }

  let html = '';

  for (const m of mocks) {
    const pl = m.payload || {};
    const lN = pl.listening_total || 0;
    const rN = pl.reading_total || 0;
    const d = new Date(m.submitted_at);

    let inner =
      row('Phần Nghe · Part 1 đến 4',
          bar(lN ? Math.round(m.listening_correct / lN * 100) : 0),
          m.listening_correct + '/' + lN) +
      row('Phần Đọc · Part 5 đến 7',
          bar(rN ? Math.round(m.reading_correct / rN * 100) : 0),
          m.reading_correct + '/' + rN);

    const parts = pl.parts || {};
    const keys = Object.keys(parts).map(Number).sort(function (a, b) { return a - b; });

    if (keys.length) {
      inner += '<p class="review-note" style="margin:14px 0 6px">Chi tiết từng part</p>';
      for (const k of keys) {
        const v = parts[k];
        const pct = v.n ? Math.round(v.ok / v.n * 100) : 0;
        inner += row(PART_NAME[k] || ('Part ' + k), bar(pct), v.ok + '/' + v.n, pct + '%');
      }
    } else {
      inner += '<p class="review-note">Lần thi này chưa lưu chi tiết từng part.</p>';
    }

    html += card(
      'Ngày ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() +
        ' · ' + (m.listening_correct + m.reading_correct) + '/' + m.total_questions +
        ' câu đúng · làm hết ' + Math.round((m.seconds_used || 0) / 60) + ' phút',
      inner);
  }

  $('body').innerHTML = html;
}

// ---------- Từ vựng ----------

async function tabVocab() {
  $('body').innerHTML = '<p class="empty">Đang tải…</p>';

  if (!vocab) {
    const { data: prog } = await db
      .from('vocab_progress').select('vocabulary_id, status, box').eq('user_id', sid);

    const ids = (prog || []).map(function (x) { return x.vocabulary_id; });

    let words = [];
    if (ids.length) {
      const { data } = await db.from('vocabulary')
        .select('id, word, topic_id').in('id', ids);
      words = data || [];
    }

    const { data: topics } = await db.from('topics').select('id, name_vi');

    vocab = { prog: prog || [], words: words, topics: topics || [] };
  }

  const tName = {};
  for (const t of vocab.topics) tName[t.id] = t.name_vi;

  const tOf = {};
  for (const w of vocab.words) tOf[w.id] = w.topic_id;

  const byTopic = {};
  let mastered = 0, learning = 0;

  for (const p of vocab.prog) {
    const tid = tOf[p.vocabulary_id];
    if (tid == null) continue;

    byTopic[tid] = byTopic[tid] || { thuoc: 0, dangOn: 0, moi: 0 };

    if (p.status === 'mastered') { byTopic[tid].thuoc++; mastered++; }
    else if (p.status === 'reviewing') { byTopic[tid].dangOn++; learning++; }
    else { byTopic[tid].moi++; learning++; }
  }

  const voc = atts.filter(function (a) { return a.mode === 'vocab' || a.mode === 'review'; });
  const vOk = voc.reduce(function (m, a) { return m + (a.correct_count || 0); }, 0);
  const vN  = voc.reduce(function (m, a) { return m + (a.total_questions || 0); }, 0);

  const keys = Object.keys(byTopic);

  $('body').innerHTML =
    '<section class="stats">' +
      stat(mastered, 'Từ đã thuộc hẳn') +
      stat(learning, 'Từ đang học dở') +
      stat(vN ? vOk + '/' + vN : '—', 'Kiểm tra đúng') +
      stat(voc.length, 'Lần kiểm tra') +
    '</section>' +

    card('Từ vựng theo chủ đề',
      keys.length
        ? keys.map(function (tid) {
            const v = byTopic[tid];
            const tot = v.thuoc + v.dangOn + v.moi;
            return row(tName[tid] || 'Chủ đề khác',
                       bar(tot ? Math.round(v.thuoc / tot * 100) : 0),
                       v.thuoc + '/' + tot + ' thuộc',
                       v.dangOn + ' đang ôn');
          }).join('')
        : '<p class="empty" style="text-align:left">Chưa học từ nào.</p>');
}

// ---------- Dạng hay sai ----------

async function tabWrong() {
  $('body').innerHTML = '<p class="empty">Đang tải…</p>';

  if (!wrongs) {
    const ids = atts.map(function (a) { return a.id; });

    if (!ids.length) { wrongs = []; }
    else {
      let all = [];
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await db.from('attempt_answers')
          .select('question_id, is_correct').in('attempt_id', ids.slice(i, i + 100));
        all = all.concat(data || []);
      }

      const qids = [...new Set(all.map(function (x) { return x.question_id; }))];

      const qInfo = {};
      for (let i = 0; i < qids.length; i += 200) {
        const { data } = await db.from('questions')
          .select('id, part, topic_tag').in('id', qids.slice(i, i + 200));
        for (const q of (data || [])) qInfo[q.id] = q;
      }

      wrongs = all.map(function (x) {
        const q = qInfo[x.question_id] || {};
        return { ok: x.is_correct, tag: q.topic_tag || 'Chưa gắn dạng', part: q.part || 0 };
      });
    }
  }

  if (!wrongs.length) {
    $('body').innerHTML = '<p class="empty">Chưa có dữ liệu câu trả lời để phân tích.</p>';
    return;
  }

  const byTag = {};
  for (const w of wrongs) {
    byTag[w.tag] = byTag[w.tag] || { ok: 0, n: 0, part: w.part };
    byTag[w.tag].n++;
    if (w.ok) byTag[w.tag].ok++;
  }

  // Chỉ xét dạng đã làm từ 4 câu trở lên cho đỡ nhiễu
  const list = Object.keys(byTag)
    .map(function (k) {
      const v = byTag[k];
      return { tag: k, ok: v.ok, n: v.n, part: v.part, pct: Math.round(v.ok / v.n * 100) };
    })
    .filter(function (x) { return x.n >= 4; })
    .sort(function (a, b) { return a.pct - b.pct; });

  const thin = Object.keys(byTag).length - list.length;

  if (!list.length) {
    $('body').innerHTML =
      '<p class="empty">Chưa dạng nào đủ 4 câu để nhận xét. Cần học viên luyện thêm.</p>';
    return;
  }

  const weak = list.filter(function (x) { return x.pct < 60; });
  const strong = list.slice().reverse().filter(function (x) { return x.pct >= 80; });

  $('body').innerHTML =
    (weak.length
      ? '<div class="tbox" style="border-color:var(--danger)">' +
          '<h3>Cần ôn lại</h3>' +
          '<p style="margin:0;font-size:0.95rem;line-height:1.7">' +
            weak.slice(0, 5).map(function (x) {
              return esc(x.tag) + ' (' + x.pct + '%)';
            }).join(' · ') +
          '</p></div>'
      : '') +

    card('Toàn bộ các dạng, xếp từ yếu nhất',
      list.map(function (x) {
        return row(
          esc(x.tag) + (x.part ? ' · Part ' + x.part : ''),
          bar(x.pct),
          x.ok + '/' + x.n,
          x.pct + '%');
      }).join('') +
      (thin ? '<p class="review-note">Còn ' + thin +
              ' dạng khác chưa đủ 4 câu nên chưa đưa vào bảng.</p>' : '')) +

    (strong.length
      ? card('Đang làm tốt',
          strong.slice(0, 6).map(function (x) {
            return row(esc(x.tag), bar(x.pct), x.ok + '/' + x.n, x.pct + '%');
          }).join(''))
      : '');
}

// ---------- Từng câu ----------
//
// Liệt kê các buổi có lưu chi tiết câu trả lời. Bấm một buổi thì mới
// tải câu hỏi của buổi đó, để không kéo cả ngàn câu về một lúc.

const MODE_NAME = {
  practice: 'Luyện đề',
  mock: 'Thi thử',
  exam: 'Thi thử',
  vocab: 'Kiểm tra từ vựng',
  vocab_colloc: 'Kiểm tra cụm từ',
  vocab_synonym: 'Kiểm tra cách nói khác',
  review: 'Ôn từ tới hạn',
  flashcard: 'Học thẻ từ vựng',
  extra: 'Luyện trộn'
};

function when(iso) {
  const d = new Date(iso);
  return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function mmss(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  return Math.floor(s / 60) + ' phút ' + (s % 60) + ' giây';
}

function tabDetail() {
  // Chỉ những buổi có ghi lại từng câu mới mở xem chi tiết được
  const list = atts.filter(function (a) {
    return a.mode === 'practice' || a.mode === 'mock' || a.mode === 'exam';
  });

  if (!list.length) {
    $('body').innerHTML = '<p class="empty">Chưa có buổi nào lưu chi tiết từng câu. ' +
      'Phần luyện đề, luyện nghe, luyện đọc và thi thử mới có dữ liệu này.</p>';
    return;
  }

  $('body').innerHTML =
    '<p class="review-note" style="margin:0 0 12px">Bấm một buổi để xem học viên trả lời từng câu ra sao.</p>' +
    list.map(function (a) {
      const pct = a.total_questions ? Math.round((a.correct_count || 0) / a.total_questions * 100) : 0;
      return '<details class="att" data-id="' + esc(a.id) + '">' +
        '<summary>' +
          '<span class="att-when">' + esc(when(a.submitted_at)) + '</span>' +
          '<span class="att-mode">' + esc(MODE_NAME[a.mode] || a.mode) +
            (a.part ? ' · Part ' + a.part : '') + '</span>' +
          '<span class="att-score">' + (a.correct_count || 0) + '/' + (a.total_questions || 0) +
            ' · ' + pct + '%</span>' +
          '<span class="att-time">' + mmss(a.seconds_used) + '</span>' +
        '</summary>' +
        '<div class="att-body"><p class="empty">Bấm để tải…</p></div>' +
      '</details>';
    }).join('');

  $('body').querySelectorAll('details.att').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) loadDetail(d);
    });
  });
}

async function loadDetail(d) {
  const id = d.dataset.id;
  const box = d.querySelector('.att-body');

  if (detail[id]) { box.innerHTML = detail[id]; return; }

  box.innerHTML = '<p class="empty">Đang tải…</p>';

  const { data: ans, error } = await db.from('attempt_answers')
    .select('question_id, exam_question_id, selected, is_correct, seconds_spent')
    .eq('attempt_id', id);

  if (error) {
    box.innerHTML = '<p class="empty">Không tải được: ' + esc(error.message) + '</p>';
    return;
  }
  if (!ans || !ans.length) {
    box.innerHTML = '<p class="empty">Buổi này không lưu chi tiết từng câu.</p>';
    return;
  }

  // Câu luyện đề nằm bảng questions, câu thi thử nằm bảng exam_questions
  const qIds = [...new Set(ans.map(function (x) { return x.question_id; }).filter(Boolean))];
  const eIds = [...new Set(ans.map(function (x) { return x.exam_question_id; }).filter(Boolean))];

  const cols = 'id, part, question_text, options, correct_answer, explanation, topic_tag';
  const [qRes, eRes] = await Promise.all([
    qIds.length ? db.from('questions').select(cols).in('id', qIds) : Promise.resolve({ data: [] }),
    eIds.length ? db.from('exam_questions').select(cols).in('id', eIds) : Promise.resolve({ data: [] })
  ]);

  const info = {};
  for (const q of (qRes.data || [])) info['q' + q.id] = q;
  for (const q of (eRes.data || [])) info['e' + q.id] = q;

  const html = ans.map(function (x, i) { return oneQuestion(x, info, i + 1); }).join('');
  const old = ans.filter(function (x) { return !x.question_id && !x.exam_question_id; }).length;

  detail[id] = html + (old
    ? '<p class="review-note">' + old + ' câu của buổi này được làm trước khi web lưu mã câu hỏi, ' +
      'nên chỉ còn đúng/sai chứ không xem lại được nội dung.</p>'
    : '');
  box.innerHTML = detail[id];
}

function oneQuestion(x, info, no) {
  const q = info[x.question_id ? 'q' + x.question_id : 'e' + x.exam_question_id];
  const ok = x.is_correct;
  const secs = x.seconds_spent != null ? x.seconds_spent : null;

  let head =
    '<div class="qd-head">' +
      '<span class="qd-no">Câu ' + no + '</span>' +
      '<span class="qd-mark ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Đúng' : 'Sai') + '</span>' +
      (q && q.part ? '<span class="stat-lab">Part ' + q.part + '</span>' : '') +
      (q && q.topic_tag ? '<span class="stat-lab">' + esc(q.topic_tag) + '</span>' : '') +
      (secs != null ? '<span class="stat-lab">' + secs + ' giây</span>' : '') +
    '</div>';

  if (!q) {
    return '<div class="qd">' + head +
      '<p class="ww">Học viên chọn ' + esc(x.selected || 'bỏ trống') +
      '. Câu hỏi này không còn trong ngân hàng đề.</p></div>';
  }

  const o = q.options || {};
  const chose = x.selected;
  const right = q.correct_answer;

  let opts = '';
  for (const k of ['A', 'B', 'C', 'D']) {
    if (o[k] == null) continue;
    const isRight = k === right;
    const isChose = k === chose;
    opts +=
      '<div class="qd-opt' + (isRight ? ' is-right' : '') + (isChose && !isRight ? ' is-wrong' : '') + '">' +
        '<span class="qd-letter">' + k + '</span>' +
        '<span class="qd-text">' + esc(o[k]) + '</span>' +
        (isChose ? '<span class="qd-tag">học viên chọn</span>' : '') +
        (isRight && !isChose ? '<span class="qd-tag">đáp án đúng</span>' : '') +
      '</div>';
  }

  return '<div class="qd">' + head +
    (q.question_text ? '<p class="qd-q">' + esc(q.question_text) + '</p>' : '') +
    opts +
    (!chose ? '<p class="ww" style="margin:8px 0 0">Học viên bỏ trống câu này.</p>' : '') +
    (!ok && q.explanation ? '<p class="qd-why">' + esc(q.explanation) + '</p>' : '') +
  '</div>';
}

// ---------- Nhật ký ----------

function tabLog() {
  if (!atts.length) {
    $('body').innerHTML = '<p class="empty">Chưa có buổi học nào.</p>';
    return;
  }

  const MODE = {
    vocab: 'Kiểm tra từ vựng',
    review: 'Ôn từ tới hạn',
    practice: 'Luyện đề',
    mock: 'Thi thử',
    exam: 'Thi thử'
  };

  const byDay = {};
  for (const a of atts.slice(0, 120)) {
    const d = new Date(a.submitted_at);
    const k = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    (byDay[k] = byDay[k] || []).push(a);
  }

  let html = '';

  for (const k of Object.keys(byDay)) {
    const list = byDay[k];
    let mins = 0, ok = 0, n = 0;
    for (const a of list) {
      mins += (a.seconds_used || 0) / 60;
      ok += a.correct_count || 0;
      n += a.total_questions || 0;
    }

    html +=
      '<div class="wrong-q">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<span style="min-width:90px;font-weight:600">' + esc(k) + '</span>' +
          '<span class="stat-lab">' + list.length + ' buổi</span>' +
          '<span class="stat-lab">' + ok + '/' + n + ' câu đúng</span>' +
          '<span class="stat-lab">' + Math.round(mins) + ' phút</span>' +
        '</div>';

    for (const a of list) {
      const d = new Date(a.submitted_at);
      html +=
        '<p class="ww" style="margin:6px 0 0;color:#6C837E">' +
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0') + ' · ' +
          (MODE[a.mode] || a.mode) +
          (a.part ? ' Part ' + a.part : '') + ' · ' +
          (a.correct_count || 0) + '/' + (a.total_questions || 0) + ' câu đúng · ' +
          Math.round((a.seconds_used || 0) / 60) + ' phút' +
        '</p>';
    }

    html += '</div>';
  }

  $('body').innerHTML = html;
}

// ---------- Mảnh dùng chung ----------

function stat(num, lab) {
  return '<div class="stat"><span class="stat-num">' + num +
         '</span><span class="stat-lab">' + lab + '</span></div>';
}

function card(title, inner) {
  return '<div class="tbox"><h3>' + title + '</h3>' + inner + '</div>';
}

function bar(pct) {
  return '<span class="play-bar" style="flex:1;max-width:150px;cursor:default">' +
         '<span style="width:' + pct + '%"></span></span>';
}

function row() {
  const a = Array.prototype.slice.call(arguments);
  let out = '<div class="fold-row"><span style="flex:1;min-width:130px">' + a[0] + '</span>';

  for (let i = 1; i < a.length; i++) {
    out += a[i].indexOf('<span') === 0
      ? a[i]
      : '<span class="stat-lab" style="min-width:58px;text-align:right">' + a[i] + '</span>';
  }

  return out + '</div>';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
