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
    .limit(10);

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
        '<td>' + r.weekly_xp + ' điểm</td>' +
      '</tr>';
  }

  wrap.innerHTML =
    '<table class="board">' +
      '<thead><tr>' +
        '<th>Hạng</th><th>Học viên</th>' +
        '<th class="hide-sm">Ngày học</th>' +
        '<th class="hide-sm">Lượt làm bài</th>' +
        '<th>Điểm tuần</th>' +
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
})();
