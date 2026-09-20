// ============================================================
// Pacedemy — trang bảng xếp hạng
// ============================================================

let me = null;
let view = 'week';

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('streak_days').eq('id', me.id).single();
  const d = data && data.streak_days ? data.streak_days : 0;
  $('streak').textContent = d > 0 ? d + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';

  load();
})();

document.querySelectorAll('.tab').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    view = b.dataset.view;
    load();
  });
});

async function load() {
  $('board').innerHTML = '<p class="empty">Đang tải…</p>';
  $('my-rank').innerHTML = '';

  const weekly = (view === 'week');

  const { data, error } = weekly
    ? await db.from('leaderboard_weekly')
        .select('id, full_name, avatar_url, weekly_xp, sessions, active_days, rank')
        .order('rank').limit(50)
    : await db.from('leaderboard_alltime')
        .select('id, full_name, avatar_url, total_xp, streak_days, rank')
        .order('rank').limit(50);

  if (error) {
    $('board').innerHTML = '<p class="empty">Không tải được bảng xếp hạng.</p>';
    return;
  }

  if (!data || !data.length) {
    $('board').innerHTML = weekly
      ? '<p class="empty">Tuần này chưa ai học. Bạn học một buổi là đứng đầu bảng ngay.</p>'
      : '<p class="empty">Chưa có ai trên bảng xếp hạng.</p>';
    return;
  }

  let rows = '';
  for (const r of data) {
    const score = weekly ? r.weekly_xp : r.total_xp;
    const extra = weekly
      ? (r.active_days || 0) + ' ngày · ' + r.sessions + ' lượt'
      : 'chuỗi ' + (r.streak_days || 0) + ' ngày';

    rows +=
      '<tr class="' + (r.id === me.id ? 'me' : '') + '">' +
        '<td class="rank">' + medal(r.rank) + '</td>' +
        '<td><div class="who">' + ava(r) +
            '<div><div class="who-name">' + esc(r.full_name || 'Học viên') + '</div>' +
            '<div class="who-goal">' + esc(extra) + '</div></div></div></td>' +
        '<td style="text-align:right;font-weight:600">' + score + '</td>' +
      '</tr>';
  }

  $('board').innerHTML =
    '<table class="board"><thead><tr>' +
      '<th style="width:52px">Hạng</th><th>Học viên</th>' +
      '<th style="text-align:right">Câu đúng</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';

  const mine = data.find(function (r) { return r.id === me.id; });
  if (!mine) {
    $('my-rank').innerHTML =
      '<div class="due-card" style="margin-bottom:20px">' +
        '<div><h2>Bạn chưa có tên trên bảng này</h2>' +
        '<p>Làm một bài kiểm tra từ vựng hoặc luyện Part 5 là có điểm ngay.</p></div>' +
        '<a class="btn btn-gold" href="vocab.html">Học ngay</a>' +
      '</div>';
  }
}

function medal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

function ava(r) {
  if (r.avatar_url) return '<span class="dot-ava"><img src="' + esc(r.avatar_url) + '" alt=""></span>';
  const n = (r.full_name || 'U').trim().split(/\s+/);
  return '<span class="dot-ava">' + esc(n[n.length - 1].charAt(0).toUpperCase()) + '</span>';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
