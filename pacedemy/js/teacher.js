// ============================================================
// Pacedemy — Teacher Studio
// Chỉ tài khoản có role = 'teacher' vào được.
// Dữ liệu cũng được khoá ở tầng database bằng Row Level Security,
// nên học viên gõ thẳng địa chỉ này cũng không đọc được gì.
// ============================================================

let me = null;
let students = [];
let topics = [];

const $ = function (id) { return document.getElementById(id); };

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data: mine } = await db
    .from('profiles').select('role').eq('id', me.id).single();

  if (!mine || mine.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-list').classList.remove('hidden');
  loadClass();
})();

// ---------- Danh sách lớp ----------

async function loadClass() {
  const { data: people, error } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, target_score, goal_note, total_xp, streak_days, last_active')
    .eq('role', 'student')
    .order('total_xp', { ascending: false });

  if (error) {
    $('table-box').innerHTML = '<p class="empty">Không tải được danh sách: ' + esc(error.message) + '</p>';
    return;
  }

  students = people || [];

  if (!students.length) {
    $('class-sub').textContent = 'Chưa có học viên nào đăng ký.';
    $('table-box').innerHTML = '<p class="empty">Khi học viên tạo tài khoản, tên sẽ hiện ở đây.</p>';
    return;
  }

  // Số từ đã thuộc của từng em
  const { data: prog } = await db
    .from('vocab_progress')
    .select('user_id, status')
    .eq('status', 'mastered');

  const wordsBy = {};
  for (const p of (prog || [])) wordsBy[p.user_id] = (wordsBy[p.user_id] || 0) + 1;

  // Hoạt động 7 ngày gần nhất
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recent } = await db
    .from('attempts')
    .select('user_id, correct_count, total_questions')
    .gte('submitted_at', since);

  const sessBy = {};
  for (const a of (recent || [])) sessBy[a.user_id] = (sessBy[a.user_id] || 0) + 1;

  // Số liệu tổng của lớp
  let totalWords = 0;
  for (const k in wordsBy) totalWords += wordsBy[k];

  $('c-total').textContent = students.length;
  $('c-active').textContent = Object.keys(sessBy).length;
  $('c-words').textContent = totalWords;
  $('c-sessions').textContent = (recent || []).length;

  $('class-sub').textContent =
    students.length + ' học viên · ' + Object.keys(sessBy).length + ' em có học trong tuần';

  drawTable(wordsBy, sessBy);
}

function drawTable(wordsBy, sessBy) {
  let rows = '';

  for (const s of students) {
    const words = wordsBy[s.id] || 0;
    const sess  = sessBy[s.id] || 0;
    const days  = daysSince(s.last_active);

    let when, cls;
    if (days === null)   { when = 'Chưa học buổi nào'; cls = 'tag-cold'; }
    else if (days === 0) { when = 'Hôm nay';           cls = 'tag-warm'; }
    else if (days === 1) { when = 'Hôm qua';           cls = 'tag-warm'; }
    else if (days <= 7)  { when = days + ' ngày trước'; cls = ''; }
    else                 { when = days + ' ngày trước'; cls = 'tag-cold'; }

    rows +=
      '<tr data-id="' + esc(s.id) + '">' +
        '<td>' +
          '<div class="who">' + avatar(s) +
            '<div>' +
              '<div class="who-name">' + esc(s.full_name || 'Học viên') + '</div>' +
              '<div class="who-goal">Mục tiêu ' + (s.target_score || '—') + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td>' + words + ' từ</td>' +
        '<td class="hide-sm">' + sess + ' buổi</td>' +
        '<td class="hide-sm">' + (s.total_xp || 0) + '</td>' +
        '<td class="hide-sm">' + (s.streak_days || 0) + ' ngày</td>' +
        '<td class="' + cls + '">' + when + '</td>' +
      '</tr>';
  }

  $('table-box').innerHTML =
    '<table class="tt"><thead><tr>' +
      '<th>Học viên</th><th>Đã thuộc</th>' +
      '<th class="hide-sm">Tuần này</th><th class="hide-sm">Điểm</th>' +
      '<th class="hide-sm">Chuỗi ngày</th><th>Học gần nhất</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';

  document.querySelectorAll('.tt tbody tr').forEach(function (tr) {
    tr.addEventListener('click', function () { openOne(tr.dataset.id); });
  });
}

function avatar(s) {
  if (s.avatar_url) {
    return '<span class="dot-ava"><img src="' + esc(s.avatar_url) + '" alt=""></span>';
  }
  const n = (s.full_name || 'U').trim().split(/\s+/);
  return '<span class="dot-ava">' + esc(n[n.length - 1].charAt(0).toUpperCase()) + '</span>';
}

function daysSince(d) {
  if (!d) return null;
  const then = new Date(d + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - then) / 86400000);
}

// ---------- Chi tiết một học viên ----------

async function openOne(id) {
  const s = students.find(function (x) { return x.id === id; });
  if (!s) return;

  $('view-list').classList.add('hidden');
  $('view-one').classList.remove('hidden');
  window.scrollTo(0, 0);

  $('s-name').textContent = s.full_name || 'Học viên';
  $('s-meta').textContent =
    'Mục tiêu ' + (s.target_score || '—') + ' điểm · ' +
    (s.total_xp || 0) + ' điểm tích luỹ · chuỗi ' + (s.streak_days || 0) + ' ngày';

  $('one-box').innerHTML = '<p class="empty">Đang tải chi tiết…</p>';

  if (!topics.length) {
    const { data } = await db.from('topics').select('id, name_vi').order('order_index');
    topics = data || [];
  }

  const { data: words } = await db.from('vocabulary').select('id, topic_id, word, meaning_vi');
  const { data: prog } = await db
    .from('vocab_progress')
    .select('vocabulary_id, status, wrong_count, correct_count')
    .eq('user_id', id);

  const { data: atts } = await db
    .from('attempts')
    .select('mode, total_questions, correct_count, submitted_at, seconds_used')
    .eq('user_id', id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(10);

  let html = '';

  // Mục tiêu học viên tự viết
  if (s.goal_note) {
    html += '<div class="tbox"><h3>Mục tiêu học viên tự viết</h3>' +
            '<p style="margin:0;line-height:1.65">' + esc(s.goal_note) + '</p></div>';
  }

  html += progressByTopic(words, prog);
  html += weakWords(words, prog);
  html += history(atts);

  $('one-box').innerHTML = html;
}

function progressByTopic(words, prog) {
  const done = {};
  for (const p of (prog || [])) if (p.status === 'mastered') done[p.vocabulary_id] = true;

  const total = {}, ok = {};
  for (const w of (words || [])) {
    total[w.topic_id] = (total[w.topic_id] || 0) + 1;
    if (done[w.id]) ok[w.topic_id] = (ok[w.topic_id] || 0) + 1;
  }

  let rows = '';
  for (const t of topics) {
    const tt = total[t.id] || 0;
    if (!tt) continue;
    const oo = ok[t.id] || 0;
    const pct = Math.round(oo / tt * 100);
    rows +=
      '<div class="kv">' +
        '<span>' + esc(t.name_vi) + '</span>' +
        '<span style="display:flex;align-items:center;gap:10px">' +
          '<span class="mini-bar"><span style="width:' + pct + '%"></span></span>' +
          oo + '/' + tt +
        '</span>' +
      '</div>';
  }

  return '<div class="tbox"><h3>Tiến độ theo chủ đề</h3>' +
         (rows || '<p class="empty" style="padding:0">Chưa học chủ đề nào.</p>') + '</div>';
}

function weakWords(words, prog) {
  const byId = {};
  for (const w of (words || [])) byId[w.id] = w;

  const weak = (prog || [])
    .filter(function (p) { return p.wrong_count >= 2 && p.status !== 'mastered'; })
    .sort(function (a, b) { return b.wrong_count - a.wrong_count; })
    .slice(0, 12);

  if (!weak.length) {
    return '<div class="tbox"><h3>Từ hay sai</h3>' +
           '<p class="empty" style="padding:0">Chưa có từ nào sai từ hai lần trở lên.</p></div>';
  }

  let rows = '';
  for (const p of weak) {
    const w = byId[p.vocabulary_id];
    if (!w) continue;
    rows += '<div class="kv"><span>' + esc(w.word) + ' — ' + esc(w.meaning_vi) + '</span>' +
            '<span class="tag-cold">sai ' + p.wrong_count + ' lần</span></div>';
  }

  return '<div class="tbox"><h3>Từ hay sai — nên nhắc trong buổi học</h3>' + rows + '</div>';
}

function history(atts) {
  if (!atts || !atts.length) {
    return '<div class="tbox"><h3>Lịch sử làm bài</h3>' +
           '<p class="empty" style="padding:0">Chưa có buổi học nào.</p></div>';
  }

  let rows = '';
  for (const a of atts) {
    const d = new Date(a.submitted_at);
    const when = d.getDate() + '/' + (d.getMonth() + 1) + ' ' +
                 String(d.getHours()).padStart(2, '0') + ':' +
                 String(d.getMinutes()).padStart(2, '0');
    const label = a.mode === 'vocab' ? 'Từ vựng' : (a.mode === 'exam' ? 'Thi thử' : 'Luyện tập');
    rows += '<div class="kv"><span>' + when + ' · ' + label + '</span>' +
            '<span>' + a.correct_count + '/' + a.total_questions + '</span></div>';
  }

  return '<div class="tbox"><h3>10 buổi gần nhất</h3>' + rows + '</div>';
}

$('back-list').addEventListener('click', function (e) {
  e.preventDefault();
  $('view-one').classList.add('hidden');
  $('view-list').classList.remove('hidden');
  window.scrollTo(0, 0);
});

$('btn-logout').addEventListener('click', async function () {
  await db.auth.signOut();
  window.location.replace('index.html');
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
