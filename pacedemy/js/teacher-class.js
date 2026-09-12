// ============================================================
// Pacedemy — quản lý lớp học và gửi nhận xét cho học viên
// Không có ?id thì hiện danh sách lớp, có ?id thì mở một lớp.
// ============================================================

let me = null;
let classId = null;
let roster = [];   // học viên trong lớp

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  classId = new URLSearchParams(location.search).get('id');

  if (classId) {
    $('view-one').classList.remove('hidden');
    openClass();
  } else {
    $('view-list').classList.remove('hidden');
    listClasses();
  }
})();

// ============================================================
// Danh sách lớp
// ============================================================

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // bỏ I, O, 0, 1 cho khỏi nhìn nhầm
  let s = '';
  for (let i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

async function listClasses() {
  const { data: rows, error } = await db
    .from('classes')
    .select('id, name, code, note, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    $('classes').innerHTML = '<p class="empty">Không tải được: ' + esc(error.message) + '</p>';
    return;
  }

  if (!rows || !rows.length) {
    $('classes').innerHTML = '<p class="empty">Chưa có lớp nào. Tạo lớp đầu tiên ở khung phía trên.</p>';
    return;
  }

  const { data: mem } = await db.from('class_members').select('class_id');
  const n = {};
  for (const m of (mem || [])) n[m.class_id] = (n[m.class_id] || 0) + 1;

  let html = '';
  for (const c of rows) {
    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:200px">' +
          '<p class="wq" style="font-weight:600;margin:0">' + esc(c.name) +
            (c.is_active ? '' : ' <span class="tag-cold" style="font-size:0.76rem">đã đóng</span>') +
          '</p>' +
          (c.note ? '<p class="ww" style="margin:4px 0 0">' + esc(c.note) + '</p>' : '') +
        '</div>' +
        '<span class="q-tag" style="margin:0">Mã ' + esc(c.code) + '</span>' +
        '<span class="stat-lab">' + (n[c.id] || 0) + ' học viên</span>' +
        '<a class="btn-sm test" href="teacher-class.html?id=' + c.id + '">Mở lớp</a>' +
        '<button class="btn-sm" data-close="' + c.id + '" data-on="' + (c.is_active ? '1' : '0') + '">' +
          (c.is_active ? 'Đóng lớp' : 'Mở lại') + '</button>' +
      '</div>';
  }

  $('classes').innerHTML = html;

  $('classes').querySelectorAll('button[data-close]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('classes')
        .update({ is_active: b.dataset.on !== '1' })
        .eq('id', b.dataset.close);
      listClasses();
    });
  });
}

$('btn-new') && $('btn-new').addEventListener('click', async function () {
  const name = $('new-name').value.trim();
  if (!name) { $('new-note-msg').textContent = 'Bạn đặt tên lớp đã nhé.'; return; }

  this.disabled = true;

  const { error } = await db.from('classes').insert({
    name: name,
    note: $('new-note').value.trim() || null,
    code: makeCode()
  });

  this.disabled = false;

  if (error) { $('new-note-msg').textContent = 'Không tạo được: ' + error.message; return; }

  $('new-name').value = '';
  $('new-note').value = '';
  $('new-note-msg').textContent = 'Đã tạo lớp.';
  setTimeout(function () { $('new-note-msg').textContent = ''; }, 3000);
  listClasses();
});

// ============================================================
// Một lớp
// ============================================================

async function openClass() {
  const { data: c } = await db
    .from('classes').select('id, name, code, note').eq('id', classId).single();

  if (!c) { $('c-name').textContent = 'Không tìm thấy lớp này'; return; }

  $('c-name').textContent = c.name;
  $('c-sub').textContent = c.note || '';
  $('c-code').textContent = c.code;

  $('btn-copy').addEventListener('click', function () {
    navigator.clipboard.writeText(c.code);
    this.textContent = 'Đã copy';
    setTimeout(() => { this.textContent = 'Copy mã'; }, 2500);
  });

  await loadRoster();
  loadOutside();
}

async function loadRoster() {
  const { data: mem } = await db
    .from('class_members').select('student_id').eq('class_id', classId);

  const ids = (mem || []).map(function (m) { return m.student_id; });

  if (!ids.length) {
    roster = [];
    $('c-count').textContent = '0 học viên';
    $('roster').innerHTML = '<p class="empty">Chưa có em nào vào lớp. Gửi mã lớp cho các em nhé.</p>';
    return;
  }

  const { data: ps } = await db
    .from('profiles')
    .select('id, full_name, avatar_url, target_score, total_xp, streak_days, last_active')
    .in('id', ids);

  roster = ps || [];
  $('c-count').textContent = roster.length + ' học viên';

  // Tiến độ
  const { data: prog } = await db
    .from('vocab_progress').select('user_id').eq('status', 'mastered').in('user_id', ids);

  const words = {};
  for (const p of (prog || [])) words[p.user_id] = (words[p.user_id] || 0) + 1;

  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: atts } = await db
    .from('attempts')
    .select('user_id, correct_count, total_questions')
    .in('user_id', ids).gte('submitted_at', since);

  const sess = {}, right = {}, asked = {};
  for (const a of (atts || [])) {
    sess[a.user_id]  = (sess[a.user_id]  || 0) + 1;
    right[a.user_id] = (right[a.user_id] || 0) + (a.correct_count || 0);
    asked[a.user_id] = (asked[a.user_id] || 0) + (a.total_questions || 0);
  }

  // Nhận xét đã gửi
  const { data: fb } = await db
    .from('feedback').select('student_id, body, created_at, is_read')
    .eq('class_id', classId).order('created_at', { ascending: false });

  const last = {};
  for (const f of (fb || [])) if (!last[f.student_id]) last[f.student_id] = f;

  roster.sort(function (a, b) {
    return (sess[b.id] || 0) - (sess[a.id] || 0);
  });

  let html = '';

  for (const s of roster) {
    const acc = asked[s.id] ? Math.round(right[s.id] / asked[s.id] * 100) + '%' : '—';
    const f = last[s.id];

    html +=
      '<div class="wrong-q">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<span style="flex:1;min-width:160px;font-weight:600">' +
            esc(s.full_name || 'Học viên') + '</span>' +
          '<span class="stat-lab">' + (words[s.id] || 0) + ' từ thuộc</span>' +
          '<span class="stat-lab">' + (sess[s.id] || 0) + ' buổi/tuần</span>' +
          '<span class="stat-lab">đúng ' + acc + '</span>' +
          '<button class="btn-sm" data-out="' + s.id + '">Rời lớp</button>' +
        '</div>' +

        (f ? '<p class="ww" style="margin:10px 0 0;color:#6C837E">' +
               'Nhận xét gần nhất' + (f.is_read ? ' (đã đọc)' : ' (chưa đọc)') + ': ' +
               esc(f.body.slice(0, 110)) + (f.body.length > 110 ? '…' : '') + '</p>' : '') +

        '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          '<input type="text" data-msg="' + s.id + '" placeholder="Viết nhận xét riêng cho em này…" ' +
            'style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid var(--line);' +
            'border-radius:var(--r);font-family:var(--ui);font-size:0.92rem">' +
          '<button class="btn-sm test" data-send="' + s.id + '">Gửi</button>' +
        '</div>' +
      '</div>';
  }

  $('roster').innerHTML = html;

  $('roster').querySelectorAll('button[data-send]').forEach(function (b) {
    b.addEventListener('click', function () { sendOne(b.dataset.send, b); });
  });

  $('roster').querySelectorAll('button[data-out]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Cho em này rời lớp?')) return;
      await db.from('class_members').delete()
        .eq('class_id', classId).eq('student_id', b.dataset.out);
      loadRoster(); loadOutside();
    });
  });
}

async function sendOne(sid, btn) {
  const box = $('roster').querySelector('input[data-msg="' + sid + '"]');
  const body = box.value.trim();
  if (!body) return;

  btn.disabled = true;

  const { error } = await db.from('feedback').insert({
    student_id: sid, class_id: classId, body: body
  });

  btn.disabled = false;

  if (error) { alert('Không gửi được: ' + error.message); return; }

  box.value = '';
  btn.textContent = 'Đã gửi';
  setTimeout(function () { btn.textContent = 'Gửi'; loadRoster(); }, 1500);
}

$('btn-all') && $('btn-all').addEventListener('click', async function () {
  const body = $('all-msg').value.trim();
  if (!body) return;
  if (!roster.length) { $('all-ok').textContent = 'Lớp chưa có học viên nào.'; return; }

  this.disabled = true;

  const rows = roster.map(function (s) {
    return { student_id: s.id, class_id: classId, body: body };
  });

  const { error } = await db.from('feedback').insert(rows);

  this.disabled = false;

  if (error) { $('all-ok').textContent = 'Không gửi được: ' + error.message; return; }

  $('all-msg').value = '';
  $('all-ok').textContent = 'Đã gửi cho ' + rows.length + ' em.';
  setTimeout(function () { $('all-ok').textContent = ''; loadRoster(); }, 3000);
});

// ---------- Học viên chưa có lớp ----------

async function loadOutside() {
  const { data: all } = await db
    .from('profiles').select('id, full_name, role').neq('role', 'teacher');

  const { data: mem } = await db.from('class_members').select('student_id');
  const inClass = new Set((mem || []).map(function (m) { return m.student_id; }));

  const free = (all || []).filter(function (p) { return !inClass.has(p.id); });

  if (!free.length) {
    $('outside').innerHTML = '<p class="empty">Mọi học viên đều đã có lớp.</p>';
    return;
  }

  let html = '';
  for (const p of free) {
    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span style="flex:1;min-width:160px">' + esc(p.full_name || 'Học viên') + '</span>' +
        '<button class="btn-sm test" data-add="' + p.id + '">Thêm vào lớp</button>' +
      '</div>';
  }

  $('outside').innerHTML = html;

  $('outside').querySelectorAll('button[data-add]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('class_members').insert({ class_id: classId, student_id: b.dataset.add });
      loadRoster(); loadOutside();
    });
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
