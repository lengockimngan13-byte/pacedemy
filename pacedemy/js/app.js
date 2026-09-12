// ============================================================
// Pacedemy — bảng điều khiển học viên
// ============================================================

let me = null;

function el(id) { return document.getElementById(id); }

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
  el('s-xp').textContent = data.total_xp || 0;

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

async function loadStats() {
  // Số từ đã thuộc
  const words = await db
    .from('vocab_progress')
    .select('vocabulary_id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('status', 'mastered');

  el('s-words').textContent = words.count || 0;

  // Tổng số câu đã luyện + điểm thi thử gần nhất
  const { data: attempts } = await db
    .from('attempts')
    .select('total_questions, estimated_score, mode, submitted_at')
    .eq('user_id', me.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (!attempts || !attempts.length) {
    el('s-questions').textContent = 0;
    el('s-score').textContent = '—';
    return;
  }

  let total = 0;
  for (const a of attempts) total += (a.total_questions || 0);
  el('s-questions').textContent = total;

  const lastExam = attempts.find(function (a) {
    return a.mode === 'exam' && a.estimated_score;
  });
  el('s-score').textContent = lastExam ? lastExam.estimated_score : '—';
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
  loadStats();
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

  const { data: mem } = await db
    .from('class_members').select('class_id').eq('student_id', me.id);

  if (mem && mem.length) {
    const { data: cs } = await db
      .from('classes').select('name')
      .in('id', mem.map(function (m) { return m.class_id; }));

    const names = (cs || []).map(function (c) { return c.name; }).join(' · ');
    box.innerHTML = names
      ? '<p class="empty" style="text-align:left">Bạn đang học lớp: <b>' +
        escapeHtml(names) + '</b></p>'
      : '';
    return;
  }

  box.innerHTML =
    '<div class="tbox">' +
      '<h3>Vào lớp của cô</h3>' +
      '<p style="margin:0 0 12px;font-size:0.94rem">Nhập mã lớp cô đưa cho bạn.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<input id="join-code" type="text" maxlength="6" placeholder="VD: K7M2QP" ' +
          'style="flex:1;min-width:160px;padding:10px 14px;border:1.5px solid var(--line);' +
          'border-radius:var(--r);font-family:var(--ui);text-transform:uppercase;letter-spacing:2px">' +
        '<button class="btn btn-line" id="btn-join">Vào lớp</button>' +
      '</div>' +
      '<span id="join-msg" style="display:block;margin-top:10px;font-size:0.88rem;color:var(--teal)"></span>' +
    '</div>';

  el('btn-join').addEventListener('click', async function () {
    const code = el('join-code').value.trim().toUpperCase();
    if (!code) return;

    this.disabled = true;

    const { data: c } = await db
      .from('classes').select('id, name').eq('code', code).eq('is_active', true).maybeSingle();

    if (!c) {
      this.disabled = false;
      el('join-msg').textContent = 'Không tìm thấy lớp nào có mã này. Bạn kiểm tra lại nhé.';
      return;
    }

    const { error } = await db.from('class_members')
      .insert({ class_id: c.id, student_id: me.id });

    this.disabled = false;

    if (error) { el('join-msg').textContent = 'Không vào được lớp: ' + error.message; return; }

    el('join-msg').textContent = 'Đã vào lớp ' + c.name + '.';
    setTimeout(loadClass, 1200);
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
