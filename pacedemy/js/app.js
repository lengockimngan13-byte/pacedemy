// ============================================================
// Pacedemy — bảng điều khiển học viên
// ============================================================

let me = null;

function el(id) { return document.getElementById(id); }

// Gán chữ an toàn: ô không tồn tại thì bỏ qua, không làm đứng cả trang
function put(id, text) {
  const n = el(id);
  if (n) n.textContent = text;
}

// Câu chào theo giờ trong ngày
function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// Chỉ lấy tên gọi cho thân mật
function firstName(full) {
  if (!full) return 'bạn';
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}

// ---------- Hồ sơ ----------

async function loadProfile() {
  const { data, error } = await db
    .from('profiles')
    .select('full_name, total_xp, streak_days, target_score, current_score, role')
    .eq('id', me.id)
    .single();

  if (error || !data) {
    el('greet-name').textContent = 'Chào bạn';
    return null;
  }

  el('greet-name').textContent = greeting() + ', ' + firstName(data.full_name) + '.';

  const days = data.streak_days || 0;
  el('streak').textContent = days > 0 ? days + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';

  if (data.role === 'teacher') el('link-teacher').classList.remove('hidden');

  // Thẻ giới thiệu giáo viên: học viên chỉ thấy khi đã bật công tắc,
  // giáo viên luôn thấy để xem thử trước khi công bố.
  const card = el('teacher-card');
  if (card && (data.role === 'teacher' || (typeof TEACHER !== 'undefined' && TEACHER.show))) {
    card.style.display = '';
  }

  el('greet-line').textContent = data.target_score
    ? 'Mục tiêu của bạn: ' + data.target_score + ' điểm TOEIC.'
    : 'Chúc bạn một buổi học hiệu quả.';

  return data;
}

// ---------- Số liệu học tập ----------

const PART_NAME = {
  1: 'Part 1 · Mô tả tranh',
  2: 'Part 2 · Hỏi đáp',
  3: 'Part 3 · Hội thoại',
  4: 'Part 4 · Bài nói',
  5: 'Part 5 · Hoàn thành câu',
  6: 'Part 6 · Điền đoạn văn',
  7: 'Part 7 · Đọc hiểu'
};

async function loadStats() {
  // Số từ đã thuộc hẳn
  const words = await db
    .from('vocab_progress')
    .select('vocabulary_id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('status', 'mastered');

  setMastered(words.count || 0);

  // Toàn bộ buổi học đã ghi lại
  const { data: atts } = await db
    .from('attempts')
    .select('mode, part, total_questions, correct_count, submitted_at')
    .eq('user_id', me.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  // --- Từ vựng ---
  let vOk = 0, vN = 0;
  // --- Luyện đề, tách theo part ---
  const drill = {};
  let dOk = 0, dN = 0;

  for (const a of (atts || [])) {
    if (a.mode === 'vocab' || a.mode === 'review') {
      vOk += a.correct_count || 0;
      vN  += a.total_questions || 0;
      continue;
    }

    if (a.mode === 'practice') {
      const p = a.part || 0;
      drill[p] = drill[p] || { ok: 0, n: 0 };
      drill[p].ok += a.correct_count || 0;
      drill[p].n  += a.total_questions || 0;
      dOk += a.correct_count || 0;
      dN  += a.total_questions || 0;
    }
  }

  setAccuracy('vocab', vOk, vN);
  setDrillBreakdown(drill, dOk, dN);

  // --- Thi thử gần nhất ---
  const { data: mocks } = await db
    .from('mock_tests')
    .select('id, submitted_at, seconds_used, listening_correct, reading_correct, total_questions, payload')
    .eq('user_id', me.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(10);

  const last = (mocks || [])[0];
  setMock(last);

  drawBreakdown(drill, dOk, dN, vOk, vN, mocks || []);
}

// ---------- Đếm số chạy dần và thanh tiến trình ----------

function animateNumber(el, target) {
  if (!el) return;
  const from = 0;
  const dur = 900;
  const t0 = performance.now();

  function tick(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setMastered(n) {
  animateNumber(el('s-words'), n);
}

function setAccuracy(key, ok, n) {
  const numEl = el('s-' + key);
  const ofEl = el('s-' + key + '-of');
  const bar = el('s-' + key + '-bar');

  if (!n) {
    if (numEl) numEl.textContent = '0';
    if (ofEl) ofEl.textContent = ' — chưa có dữ liệu';
    if (bar) bar.style.width = '0%';
    return;
  }

  const pct = Math.round(ok / n * 100);
  animateNumber(numEl, ok);
  if (ofEl) ofEl.textContent = ' / ' + n + ' câu · ' + pct + '%';
  if (bar) setTimeout(function () { bar.style.width = pct + '%'; }, 120);
}

const PART_SHORT = {
  1: 'Nghe P1', 2: 'Nghe P2', 3: 'Nghe P3', 4: 'Nghe P4',
  5: 'Đọc P5', 6: 'Đọc P6', 7: 'Đọc P7'
};

function setDrillBreakdown(drill, dOk, dN) {
  const numEl = el('s-drill');
  const ofEl = el('s-drill-of');
  const empty = el('s-drill-empty');
  const box = el('s-drill-parts');

  if (!dN) {
    numEl.textContent = '0';
    ofEl.textContent = '';
    empty.classList.remove('hidden');
    box.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  const pct = Math.round(dOk / dN * 100);
  animateNumber(numEl, dOk);
  ofEl.textContent = ' / ' + dN + ' câu tổng · ' + pct + '%';

  const keys = Object.keys(drill).map(Number)
    .filter(function (k) { return k >= 1 && k <= 7 && drill[k].n; })
    .sort(function (a, b) { return a - b; });

  box.innerHTML = keys.map(function (k) {
    const v = drill[k];
    const p = Math.round(v.ok / v.n * 100);
    return '<span class="part-chip">' + (PART_SHORT[k] || ('Part ' + k)) +
      ' <b>' + v.ok + '/' + v.n + '</b> · ' + p + '%</span>';
  }).join('');
}

function setMock(last) {
  const numEl = el('s-mock');
  const ofEl = el('s-mock-of');
  const sub = el('s-mock-sub');

  if (!last) {
    if (numEl) numEl.textContent = '0';
    if (ofEl) ofEl.textContent = '';
    return;
  }

  const ok = last.listening_correct + last.reading_correct;
  const pct = last.total_questions ? Math.round(ok / last.total_questions * 100) : 0;
  const d = new Date(last.submitted_at);

  animateNumber(numEl, ok);
  if (ofEl) ofEl.textContent = ' / ' + last.total_questions + ' câu · ' + pct + '%';
  if (sub) sub.textContent = 'Ngày ' + d.getDate() + '/' + (d.getMonth() + 1);
}

// ---------- Hai thẻ chi tiết ----------

function drawBreakdown(drill, dOk, dN, vOk, vN, mocks) {
  const box = el('break-box');
  if (!box) return;

  let html = '';

  // Thẻ 1: luyện tập theo part
  if (dN) {
    html +=
      '<div class="tbox fold" id="fold-drill">' +
        '<button class="fold-head" data-fold="drill">' +
          '<span>Luyện tập theo từng part</span>' +
          '<span class="stat-lab">' + dOk + '/' + dN + ' câu đúng · ' +
            Math.round(dOk / dN * 100) + '%</span>' +
        '</button>' +
        '<div class="fold-body hidden">' + partRows(drill) + '</div>' +
      '</div>';
  }

  // Thẻ 2: thi thử
  if (mocks.length) {
    const m = mocks[0];
    const pl = m.payload || {};
    const lN = pl.listening_total || 0;
    const rN = pl.reading_total || 0;
    const d = new Date(m.submitted_at);

    let inner =
      '<div class="fold-row">' +
        '<span style="flex:1">Phần Nghe · Part 1 đến 4</span>' +
        '<span class="stat-lab">' + m.listening_correct + '/' + lN + '</span>' +
        '<span class="stat-lab">' + (lN ? Math.round(m.listening_correct / lN * 100) : 0) + '%</span>' +
      '</div>' +
      '<div class="fold-row">' +
        '<span style="flex:1">Phần Đọc · Part 5 đến 7</span>' +
        '<span class="stat-lab">' + m.reading_correct + '/' + rN + '</span>' +
        '<span class="stat-lab">' + (rN ? Math.round(m.reading_correct / rN * 100) : 0) + '%</span>' +
      '</div>' +
      '<p class="review-note" style="margin:12px 0 6px">Chi tiết từng part</p>' +
      partRows(pl.parts || {});

    if (mocks.length > 1) {
      inner += '<p class="review-note" style="margin:14px 0 6px">Các lần thi trước</p>';
      for (const x of mocks.slice(1)) {
        const dx = new Date(x.submitted_at);
        inner +=
          '<div class="fold-row">' +
            '<span style="flex:1">' + dx.getDate() + '/' + (dx.getMonth() + 1) + '/' +
              dx.getFullYear() + '</span>' +
            '<span class="stat-lab">Nghe ' + x.listening_correct + '</span>' +
            '<span class="stat-lab">Đọc ' + x.reading_correct + '</span>' +
            '<span class="stat-lab">' +
              (x.listening_correct + x.reading_correct) + '/' + x.total_questions + '</span>' +
          '</div>';
      }
    }

    html +=
      '<div class="tbox fold" id="fold-mock">' +
        '<button class="fold-head" data-fold="mock">' +
          '<span>Thi thử ngày ' + d.getDate() + '/' + (d.getMonth() + 1) + '</span>' +
          '<span class="stat-lab">' +
            (m.listening_correct + m.reading_correct) + '/' + m.total_questions +
            ' câu đúng</span>' +
        '</button>' +
        '<div class="fold-body hidden">' + inner + '</div>' +
      '</div>';
  }

  // Thẻ từ vựng gộp chung vào dòng phụ
  if (vN) {
    html +=
      '<p class="review-note">Phần kiểm tra từ vựng: ' + vOk + '/' + vN + ' câu đúng · ' +
      Math.round(vOk / vN * 100) + '%. Con số này tính cả các lần ôn lại.</p>';
  }

  box.innerHTML = html;

  box.querySelectorAll('button[data-fold]').forEach(function (b) {
    b.addEventListener('click', function () {
      const body = b.parentElement.querySelector('.fold-body');
      body.classList.toggle('hidden');
      b.classList.toggle('open');
    });
  });
}

function partRows(obj) {
  const keys = Object.keys(obj)
    .map(Number)
    .filter(function (k) { return k >= 1 && k <= 7; })
    .sort(function (a, b) { return a - b; });

  if (!keys.length) return '<p class="empty" style="text-align:left">Chưa có dữ liệu.</p>';

  return keys.map(function (k) {
    const v = obj[k];
    const pct = v.n ? Math.round(v.ok / v.n * 100) : 0;

    return '<div class="fold-row">' +
      '<span style="flex:1">' + (PART_NAME[k] || ('Part ' + k)) + '</span>' +
      '<span class="play-bar" style="flex:1;max-width:130px;cursor:default">' +
        '<span style="width:' + pct + '%"></span></span>' +
      '<span class="stat-lab" style="min-width:62px;text-align:right">' +
        v.ok + '/' + v.n + '</span>' +
      '<span class="stat-lab" style="min-width:38px;text-align:right">' + pct + '%</span>' +
    '</div>';
  }).join('');
}

// ---------- Bảng xếp hạng ----------

async function loadBoard() {
  const wrap = el('board-wrap');

  const { data, error } = await db
    .from('leaderboard_weekly')
    .select('id, full_name, avatar_url, weekly_xp, sessions, active_days, rank')
    .order('rank', { ascending: true })
    .limit(5);

  if (error) {
    wrap.innerHTML = '<p class="empty">Chưa tải được bảng xếp hạng. Bạn thử tải lại trang nhé.</p>';
    return;
  }

  if (!data || !data.length) {
    wrap.innerHTML = '<p class="empty">Tuần này chưa ai học. Bạn học một buổi là đứng đầu bảng ngay.</p>';
    return;
  }

  let rows = '';
  for (const r of data) {
    const days = r.active_days || 0;
    rows +=
      '<tr class="' + (r.id === me.id ? 'me' : '') + '">' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><div class="who">' + boardAvatar(r) +
            '<span>' + escapeHtml(r.full_name || 'Học viên') + '</span></div></td>' +
        '<td class="hide-sm">' + days + (days === 1 ? ' ngày' : ' ngày') + '</td>' +
        '<td class="hide-sm">' + r.sessions + ' lượt</td>' +
        '<td>' + r.weekly_xp + ' câu</td>' +
      '</tr>';
  }

  wrap.innerHTML =
    '<table class="board">' +
      '<thead><tr>' +
        '<th>Hạng</th><th>Học viên</th>' +
        '<th class="hide-sm">Ngày học</th>' +
        '<th class="hide-sm">Lượt làm bài</th>' +
        '<th>Câu đúng tuần</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

function boardAvatar(r) {
  if (r.avatar_url) {
    return '<span class="dot-ava"><img src="' + escapeHtml(r.avatar_url) + '" alt=""></span>';
  }
  const n = (r.full_name || 'U').trim().split(/\s+/);
  return '<span class="dot-ava">' + escapeHtml(n[n.length - 1].charAt(0).toUpperCase()) + '</span>';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Đăng xuất ----------

el('btn-logout').addEventListener('click', async function () {
  await db.auth.signOut();
  window.location.replace('index.html');
});

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  await loadProfile();

  safely(loadStats);
  safely(loadStreak);
  loadBoard();
  loadFeedback();
  loadClass();
  loadMyAssignments();
})();


// ============================================================
// Nhận xét của cô và lớp học
// ============================================================

async function loadFeedback() {
  const box = el('fb-box');
  if (!box) return;

  const { data } = await db
    .from('feedback')
    .select('id, body, is_read, created_at')
    .eq('student_id', me.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || !data.length) { box.innerHTML = ''; return; }

  const unread = data.filter(function (f) { return !f.is_read; }).length;

  let html =
    '<div class="tbox" style="border-color:var(--gold)">' +
      '<h3>Lời nhắn của cô' + (unread ? ' · ' + unread + ' tin mới' : '') + '</h3>';

  for (const f of data) {
    const d = new Date(f.created_at);
    html +=
      '<div class="kv" style="align-items:flex-start">' +
        '<span style="min-width:88px;color:var(--teal);font-size:0.86rem">' +
          d.getDate() + '/' + (d.getMonth() + 1) + '</span>' +
        '<span style="font-weight:' + (f.is_read ? '400' : '600') + '">' +
          escapeHtml(f.body) + '</span>' +
      '</div>';
  }

  if (unread) {
    html += '<button class="btn-quiet" id="btn-fb-read" style="margin-top:10px">Đánh dấu đã đọc</button>';
  }

  html += '</div>';
  box.innerHTML = html;

  const b = el('btn-fb-read');
  if (b) {
    b.addEventListener('click', async function () {
      await db.from('feedback').update({ is_read: true })
        .eq('student_id', me.id).eq('is_read', false);
      loadFeedback();
    });
  }
}

async function loadClass() {
  const box = el('join-box');
  if (!box) return;

  const kicked = new URLSearchParams(location.search).get('can-lop') === '1';

  const { data: mem } = await db
    .from('class_members').select('class_id, status').eq('student_id', me.id);

  const active  = (mem || []).filter(function (m) { return m.status === 'active'; });
  const pending = (mem || []).filter(function (m) { return m.status === 'pending'; });

  // Giáo viên đã tắt tính năng lớp học, và bạn cũng chưa ở trong lớp nào
  // thì khỏi mời nhập mã.
  if (!active.length && !pending.length) {
    const { data: fs } = await db.from('site_settings').select('value').eq('key', 'features').single();
    const feat = (fs && fs.value) || {};
    if (feat.class === false) { box.innerHTML = ''; return; }
  }

  // Đã được duyệt vào ít nhất một lớp
  if (active.length) {
    const { data: cs } = await db
      .from('classes').select('name')
      .in('id', active.map(function (m) { return m.class_id; }));

    const names = (cs || []).map(function (c) { return c.name; }).join(' · ');
    box.innerHTML = names
      ? '<p class="empty" style="text-align:left">Bạn đang học lớp: <b>' +
        escapeHtml(names) + '</b></p>'
      : '';
    return;
  }

  // Đã nhập mã, đang chờ cô duyệt
  if (pending.length) {
    box.innerHTML =
      '<div class="tbox" style="border-color:var(--gold)">' +
        '<h3>Đang chờ cô duyệt</h3>' +
        '<p style="margin:0;font-size:0.94rem;line-height:1.65">' +
          'Bạn đã nhập mã lớp thành công. Cô sẽ duyệt trong thời gian sớm nhất. ' +
          'Khi được duyệt, các phần học sẽ mở ra ngay trên trang này.</p>' +
      '</div>';
    return;
  }

  // Chưa có lớp
  box.innerHTML =
    '<div class="tbox" style="border-color:var(--gold)">' +
      '<h3>Nhập mã lớp để bắt đầu</h3>' +
      '<p style="margin:0 0 12px;font-size:0.94rem;line-height:1.65">' +
        (kicked
          ? 'Phần học chỉ mở cho học viên trong lớp. Bạn nhập mã lớp cô đưa cho bạn nhé.'
          : 'Nhập mã lớp cô đưa cho bạn. Cô duyệt xong là học được ngay.') +
      '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<input id="join-code" type="text" maxlength="6" placeholder="VD: K7M2QP" ' +
          'style="flex:1;min-width:160px;padding:10px 14px;border:1.5px solid var(--line);' +
          'border-radius:var(--r);font-family:var(--ui);text-transform:uppercase;letter-spacing:2px">' +
        '<button class="btn btn-gold" id="btn-join">Vào lớp</button>' +
      '</div>' +
      '<span id="join-msg" style="display:block;margin-top:10px;font-size:0.88rem;color:var(--teal)"></span>' +
    '</div>';

  el('btn-join').addEventListener('click', async function () {
    const code = el('join-code').value.trim().toUpperCase();
    if (!code) return;

    this.disabled = true;
    const { data, error } = await db.rpc('vao_lop', { p_code: code });
    this.disabled = false;

    if (error) { el('join-msg').textContent = 'Không vào được lớp: ' + error.message; return; }

    const say = {
      'khong-tim-thay': 'Không có lớp nào dùng mã này. Bạn kiểm tra lại nhé.',
      'da-o-trong':     'Bạn đã ở trong lớp này rồi.',
      'het-cho':        'Lớp này đã đủ sĩ số. Bạn nhắn cô nhé.',
      'cho-duyet':      'Đã gửi yêu cầu. Chờ cô duyệt là học được.'
    };

    el('join-msg').textContent = say[data] || 'Đã gửi yêu cầu.';
    if (data === 'cho-duyet' || data === 'da-o-trong') setTimeout(loadClass, 1400);
  });
}

// ============================================================
// Bài cô giao
// ============================================================

async function loadMyAssignments() {
  const box = el('as-box');
  if (!box) return;

  const { data: mem } = await db
    .from('class_members').select('class_id').eq('student_id', me.id);

  const classIds = (mem || []).map(function (m) { return m.class_id; });
  if (!classIds.length) { box.innerHTML = ''; return; }

  const list = await fetchAssignments(classIds);
  if (!list.length) { box.innerHTML = ''; return; }

  let html = '';

  for (const a of list) {
    const done = await countProgress(a, [me.id]);
    const mine = done[me.id] || {};
    const pct = assignPercent(a, mine);

    html +=
      '<div class="tbox" style="border-color:' + (pct >= 100 ? 'var(--teal)' : 'var(--gold)') + '">' +
        '<h3>' + escapeHtml(a.title) + '</h3>' +
        '<p style="margin:0 0 12px;font-size:0.9rem;color:var(--teal)">' +
          escapeHtml(dueText(a.due_date)) +
          (pct >= 100 ? ' · Bạn đã làm xong bài này' : ' · Hoàn thành ' + pct + '%') +
        '</p>';

    for (const it of a.items) {
      const d = Math.min(mine[it.id] || 0, it.amount);
      const w = Math.round(d / it.amount * 100);
      const unit = it.kind === 'vocab' ? ' từ' : ' câu';

      html +=
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
          '<span style="flex:1;min-width:140px;font-size:0.93rem">' +
            escapeHtml(it.label) + '</span>' +
          '<span class="play-bar" style="flex:1;max-width:180px;cursor:default">' +
            '<span style="width:' + w + '%"></span></span>' +
          '<span class="stat-lab" style="min-width:64px;text-align:right">' +
            d + '/' + it.amount + unit + '</span>' +
        '</div>';
    }

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">';
    const kinds = new Set(a.items.map(function (i) { return i.kind; }));
    if (kinds.has('vocab'))  html += '<a class="btn-sm test" href="vocab.html">Học từ vựng</a>';
    if (kinds.has('part5'))  html += '<a class="btn-sm test" href="part5.html">Luyện Part 5</a>';
    if (kinds.has('listen')) html += '<a class="btn-sm test" href="listen.html">Luyện nghe</a>';
    html += '</div></div>';
  }

  box.innerHTML = html;
}

// ============================================================
// Giữ chuỗi ngày học
// ============================================================

const MOC = [3, 7, 14, 30, 60, 100, 180, 365];

async function loadStreak() {
  const box = el('streak-box');
  if (!box) return;

  const { data: prof } = await db
    .from('profiles').select('streak_days, best_streak, daily_goal').eq('id', me.id).single();

  const streak = (prof && prof.streak_days) || 0;
  const best   = (prof && prof.best_streak) || 0;
  const goal   = (prof && prof.daily_goal) || 20;

  // 35 ngày gần nhất
  const since = new Date(Date.now() - 34 * 86400000);
  since.setHours(0, 0, 0, 0);

  const { data: atts } = await db
    .from('attempts').select('total_questions, correct_count, submitted_at')
    .eq('user_id', me.id).not('submitted_at', 'is', null)
    .gte('submitted_at', since.toISOString());

  const byDay = {};
  for (const a of (atts || [])) {
    const k = dayKey(new Date(a.submitted_at));
    byDay[k] = (byDay[k] || 0) + (a.total_questions || 0);
  }

  const today = dayKey(new Date());
  const doneToday = byDay[today] || 0;
  const pct = Math.min(100, Math.round(doneToday / goal * 100));

  // Chuỗi mới nhất so với mốc
  const next = MOC.find(function (m) { return m > streak; }) || null;

  let html =
    '<div class="tbox streak-card">' +
      '<div class="streak-top">' +
        '<div>' +
          '<span class="streak-big">' + streak + '</span>' +
          '<span class="streak-unit">ngày liên tiếp</span>' +
        '</div>' +
        '<div class="streak-side">' +
          (best > streak ? '<span class="stat-lab">Kỷ lục của bạn: ' + best + ' ngày</span>' : '') +
          (next ? '<span class="stat-lab">Còn ' + (next - streak) +
                  ' ngày nữa là đạt mốc ' + next + '</span>' : '') +
        '</div>' +
      '</div>' +

      '<div class="goal-line">' +
        '<span style="flex:1">Hôm nay ' + doneToday + '/' + goal + ' câu</span>' +
        '<span class="play-bar" style="flex:1;max-width:190px;cursor:default">' +
          '<span style="width:' + pct + '%"></span></span>' +
        (doneToday >= goal
          ? '<span class="tag-warm" style="font-size:0.78rem">đã giữ được chuỗi</span>'
          : '<span class="stat-lab">còn ' + (goal - doneToday) + ' câu</span>') +
      '</div>' +

      '<div class="heat" id="heat">' + heatCells(byDay) + '</div>' +

      '<div class="goal-edit">' +
        '<span class="stat-lab">Mục tiêu mỗi ngày</span>' +
        [10, 20, 30, 50].map(function (n) {
          return '<button class="btn-sm' + (n === goal ? ' test' : '') +
                 '" data-goal="' + n + '">' + n + ' câu</button>';
        }).join('') +
      '</div>' +
    '</div>';

  box.innerHTML = html;

  box.querySelectorAll('button[data-goal]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('profiles')
        .update({ daily_goal: parseInt(b.dataset.goal, 10) }).eq('id', me.id);
      loadStreak();
    });
  });

  // Ghi lại kỷ lục
  if (streak > best) {
    await db.from('profiles').update({ best_streak: streak }).eq('id', me.id);
  }
}

function safely(fn) {
  try {
    const r = fn();
    if (r && r.catch) r.catch(function (e) { console.error(fn.name, e); });
  } catch (e) {
    console.error(fn.name, e);
  }
}

function dayKey(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function heatCells(byDay) {
  let out = '';

  for (let i = 34; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const n = byDay[dayKey(d)] || 0;
    const lv = n === 0 ? 0 : (n < 10 ? 1 : (n < 25 ? 2 : (n < 50 ? 3 : 4)));

    out += '<span class="cell lv' + lv + '" title="' +
           d.getDate() + '/' + (d.getMonth() + 1) + ' · ' + n + ' câu"></span>';
  }

  return out;
}
