// ============================================================
// Pacedemy — trang lớp học phía học viên
// Tiến độ của mình, bài cô giao, xếp hạng trong lớp, nhật ký, rời lớp.
// ============================================================

let me = null;
let classes = [];
let cur = null;

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  showStreak();

  const { data } = await db.rpc('lop_cua_toi');
  classes = data || [];

  if (!classes.length) {
    $('c-sub').textContent = 'Bạn chưa ở trong lớp nào.';
    return;
  }

  const saved = localStorage ? null : null;   // giữ đơn giản, luôn mở lớp đầu tiên
  cur = classes[0];

  if (classes.length > 1) drawPicker();

  open();
})();

async function showStreak() {
  const { data } = await db.from('profiles').select('streak_days').eq('id', me.id).single();
  const d = data && data.streak_days ? data.streak_days : 0;
  $('streak').textContent = d > 0 ? d + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';
}

function drawPicker() {
  $('pick').innerHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      classes.map(function (c) {
        return '<button class="btn-sm' + (c.class_id === cur.class_id ? ' test' : '') +
               '" data-c="' + c.class_id + '">' + esc(c.ten) + '</button>';
      }).join('') +
    '</div>';

  $('pick').querySelectorAll('button[data-c]').forEach(function (b) {
    b.addEventListener('click', function () {
      cur = classes.filter(function (c) { return String(c.class_id) === b.dataset.c; })[0];
      drawPicker();
      open();
    });
  });
}

async function open() {
  $('c-name').textContent = cur.ten;

  const d = new Date(cur.vao_ngay);
  $('c-sub').textContent =
    (cur.ghi_chu ? cur.ghi_chu + ' · ' : '') +
    cur.si_so + ' bạn trong lớp · bạn vào lớp từ ' +
    d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

  await loadRank();
  loadAssign();
  loadLog();
}

// ---------- Xếp hạng trong lớp ----------

async function loadRank() {
  const { data, error } = await db.rpc('bxh_lop', { p_class_id: cur.class_id });

  if (error || !data || !data.length) {
    $('rank-box').innerHTML = '<p class="empty">Chưa có dữ liệu xếp hạng.</p>';
    return;
  }

  let myRank = 0, myWords = 0, myXp = 0;

  let html = '<div class="board">';

  data.forEach(function (r, i) {
    const mine = (r.student_id === me.id);
    if (mine) { myRank = i + 1; myWords = r.tu_thuoc; myXp = r.diem; }

    html +=
      '<div class="board-row' + (mine ? ' me' : '') + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        avatar(r) +
        '<span class="who-name" style="flex:1">' +
          esc(r.ten || 'Học viên') + (mine ? ' (bạn)' : '') + '</span>' +
        '<span class="stat-lab">' + r.tu_thuoc + ' từ</span>' +
        '<span class="stat-lab">' + r.diem + ' điểm</span>' +
      '</div>';
  });

  html += '</div>';
  $('rank-box').innerHTML = html;

  $('m-rank').textContent = myRank ? myRank + '/' + data.length : '—';
  $('m-words').textContent = myWords;
  $('m-xp').textContent = myXp;
}

function avatar(r) {
  if (r.anh) return '<span class="dot-ava"><img src="' + esc(r.anh) + '" alt=""></span>';
  const n = (r.ten || 'U').trim().split(/\s+/);
  return '<span class="dot-ava">' + esc(n[n.length - 1].charAt(0).toUpperCase()) + '</span>';
}

// ---------- Bài cô giao ----------

async function loadAssign() {
  const list = await fetchAssignments([cur.class_id]);

  if (!list.length) {
    $('as-box').innerHTML = '<p class="empty">Cô chưa giao bài nào cho lớp này.</p>';
    return;
  }

  let html = '';

  for (const a of list) {
    const done = await countProgress(a, [me.id]);
    const mine = done[me.id] || {};
    const pct = assignPercent(a, mine);

    html +=
      '<div class="tbox" style="border-color:' + (pct >= 100 ? 'var(--teal)' : 'var(--gold)') + '">' +
        '<h3>' + esc(a.title) + '</h3>' +
        '<p style="margin:0 0 12px;font-size:0.9rem;color:var(--teal)">' +
          esc(dueText(a.due_date)) +
          (pct >= 100 ? ' · Đã làm xong' : ' · Hoàn thành ' + pct + '%') + '</p>';

    for (const it of a.items) {
      const d = Math.min(mine[it.id] || 0, it.amount);
      const w = Math.round(d / it.amount * 100);
      const unit = it.kind === 'vocab' ? ' từ' : ' câu';

      html +=
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
          '<span style="flex:1;min-width:140px;font-size:0.93rem">' + esc(it.label) + '</span>' +
          '<span class="play-bar" style="flex:1;max-width:180px;cursor:default">' +
            '<span style="width:' + w + '%"></span></span>' +
          '<span class="stat-lab" style="min-width:64px;text-align:right">' +
            d + '/' + it.amount + unit + '</span>' +
        '</div>';
    }

    html += '</div>';
  }

  $('as-box').innerHTML = html;
}

// ---------- Nhật ký học tập ----------

const MODE_NAME = {
  vocab: 'Kiểm tra từ vựng',
  practice: 'Luyện đề',
  review: 'Ôn từ tới hạn'
};

async function loadLog() {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();

  const { data } = await db
    .from('attempts')
    .select('id, mode, part, total_questions, correct_count, seconds_used, submitted_at')
    .eq('user_id', me.id)
    .gte('submitted_at', since)
    .order('submitted_at', { ascending: false })
    .limit(60);

  if (!data || !data.length) {
    $('log-box').innerHTML =
      '<p class="empty">14 ngày qua chưa có buổi học nào được ghi lại.</p>';
    $('m-acc').textContent = '—';
    return;
  }

  // Độ chính xác 30 ngày
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: big } = await db
    .from('attempts').select('total_questions, correct_count')
    .eq('user_id', me.id).gte('submitted_at', since30);

  let ask = 0, ok = 0;
  for (const a of (big || [])) {
    ask += a.total_questions || 0;
    ok  += a.correct_count || 0;
  }
  $('m-acc').textContent = ask ? Math.round(ok / ask * 100) + '%' : '—';

  // Gom theo ngày
  const byDay = {};
  for (const a of data) {
    const d = new Date(a.submitted_at);
    const key = d.getDate() + '/' + (d.getMonth() + 1);
    (byDay[key] = byDay[key] || []).push(a);
  }

  let html = '';

  for (const key of Object.keys(byDay)) {
    const list = byDay[key];
    let ask2 = 0, ok2 = 0, secs = 0;
    for (const a of list) {
      ask2 += a.total_questions || 0;
      ok2  += a.correct_count || 0;
      secs += a.seconds_used || 0;
    }

    html +=
      '<div class="wrong-q">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<span style="min-width:56px;font-weight:600">' + esc(key) + '</span>' +
          '<span class="stat-lab">' + list.length + ' buổi</span>' +
          '<span class="stat-lab">' + ok2 + '/' + ask2 + ' câu đúng</span>' +
          '<span class="stat-lab">' + Math.round(secs / 60) + ' phút</span>' +
        '</div>' +
        '<p class="ww" style="margin:6px 0 0;color:#6C837E">' +
          list.map(function (a) {
            const nm = a.part ? ('Part ' + a.part) : (MODE_NAME[a.mode] || a.mode);
            return nm + ' ' + (a.correct_count || 0) + '/' + (a.total_questions || 0);
          }).join(' · ') +
        '</p>' +
      '</div>';
  }

  $('log-box').innerHTML = html;
}

// ---------- Rời lớp ----------

$('btn-leave').addEventListener('click', async function () {
  if (!cur) return;
  if (!confirm('Rời lớp ' + cur.ten + '? Bạn sẽ không vào được các phần học cho tới khi vào lớp khác.')) return;

  this.disabled = true;

  const { error } = await db.from('class_members').delete()
    .eq('class_id', cur.class_id).eq('student_id', me.id);

  this.disabled = false;

  if (error) { $('leave-msg').textContent = 'Không rời được: ' + error.message; return; }

  location.replace('app.html');
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
