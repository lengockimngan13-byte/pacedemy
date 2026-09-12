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

  $('c-max').value = c.max_students || '';

  $('btn-newcode').addEventListener('click', async function () {
    if (!confirm('Đổi mã lớp? Mã cũ sẽ không dùng được nữa.')) return;
    this.disabled = true;
    const { data, error } = await db.rpc('doi_ma_lop', { p_class_id: Number(classId) });
    this.disabled = false;
    if (error) { alert('Không đổi được: ' + error.message); return; }
    $('c-code').textContent = data;
  });

  $('btn-max').addEventListener('click', async function () {
    const v = $('c-max').value.trim();
    const { error } = await db.from('classes')
      .update({ max_students: v ? parseInt(v, 10) : null }).eq('id', classId);
    $('max-ok').textContent = error ? 'Không lưu được' : 'Đã lưu';
    setTimeout(function () { $('max-ok').textContent = ''; }, 2500);
  });

  await loadRoster();
  loadPending();
  loadOutside();
  initAssign();
}

async function loadRoster() {
  const { data: mem } = await db
    .from('class_members').select('student_id')
    .eq('class_id', classId).eq('status', 'active');

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
      await db.from('class_members').insert({ class_id: classId, student_id: b.dataset.add, status: 'active' });
      loadRoster(); loadOutside();
    });
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// Giao bài cho lớp
// ============================================================

let draftItems = [];
let targetOpts = { vocab: [], part5: [], listen: [] };

async function initAssign() {
  const { data: ts } = await db.from('topics').select('id, name_vi').order('order_index');
  targetOpts.vocab = (ts || []).map(function (t) {
    return { v: String(t.id), t: t.name_vi };
  });

  const { data: tags } = await db.from('question_tags').select('tag').eq('part', 5);
  targetOpts.part5 = [{ v: '', t: 'Tất cả các dạng' }].concat(
    (tags || []).map(function (x) { return { v: x.tag, t: x.tag }; }));

  targetOpts.listen = [
    { v: '',  t: 'Tất cả Part 1 đến 4' },
    { v: '1', t: 'Part 1 — Mô tả tranh' },
    { v: '2', t: 'Part 2 — Hỏi đáp' },
    { v: '3', t: 'Part 3 — Hội thoại ngắn' },
    { v: '4', t: 'Part 4 — Bài nói ngắn' }
  ];

  fillTargets();
  drawDraft();
  $('it-kind').addEventListener('change', fillTargets);
  $('btn-add-item').addEventListener('click', addItem);
  $('btn-save-as').addEventListener('click', saveAssign);

  listAssigns();
}

function fillTargets() {
  const kind = $('it-kind').value;
  const list = targetOpts[kind] || [];
  $('it-target').innerHTML = list.map(function (o) {
    return '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>';
  }).join('');
}

function kindName(k) {
  return k === 'vocab' ? 'Từ vựng' : (k === 'part5' ? 'Part 5' : 'Luyện nghe');
}

function addItem() {
  const kind = $('it-kind').value;
  const sel = $('it-target');
  const amount = parseInt($('it-amount').value || '10', 10);

  if (amount < 1) return;

  draftItems.push({
    kind: kind,
    target: sel.value || null,
    label: kindName(kind) + ' · ' + sel.options[sel.selectedIndex].text,
    amount: amount
  });

  drawDraft();
}

function drawDraft() {
  if (!draftItems.length) {
    $('it-list').innerHTML =
      '<p class="empty" style="text-align:left">Chưa có việc nào. Thêm ít nhất một việc rồi mới giao được.</p>';
    return;
  }

  let html = '';
  draftItems.forEach(function (it, i) {
    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;padding:10px 14px">' +
        '<span style="flex:1">' + esc(it.label) + '</span>' +
        '<span class="stat-lab">' + it.amount + (it.kind === 'vocab' ? ' từ' : ' câu') + '</span>' +
        '<button class="btn-sm" data-rm="' + i + '">Bỏ</button>' +
      '</div>';
  });

  $('it-list').innerHTML = html;

  $('it-list').querySelectorAll('button[data-rm]').forEach(function (b) {
    b.addEventListener('click', function () {
      draftItems.splice(parseInt(b.dataset.rm, 10), 1);
      drawDraft();
    });
  });
}

async function saveAssign() {
  const title = $('as-title').value.trim();
  if (!title) { $('as-ok').textContent = 'Bạn đặt tên bài tập đã nhé.'; return; }
  if (!draftItems.length) { $('as-ok').textContent = 'Thêm ít nhất một đầu việc.'; return; }

  this.disabled = true;

  const { data: a, error } = await db.from('assignments').insert({
    class_id: classId,
    title: title,
    due_date: $('as-due').value || null
  }).select('id').single();

  if (error || !a) {
    this.disabled = false;
    $('as-ok').textContent = 'Không giao được: ' + (error ? error.message : 'lỗi không rõ');
    return;
  }

  const rows = draftItems.map(function (it) {
    return {
      assignment_id: a.id, kind: it.kind, target: it.target,
      label: it.label, amount: it.amount
    };
  });

  const { error: e2 } = await db.from('assignment_items').insert(rows);

  this.disabled = false;

  if (e2) {
    await db.from('assignments').delete().eq('id', a.id);
    $('as-ok').textContent = 'Không lưu được đầu việc: ' + e2.message;
    return;
  }

  $('as-title').value = '';
  $('as-due').value = '';
  draftItems = [];
  drawDraft();
  $('as-ok').textContent = 'Đã giao bài cho lớp.';
  setTimeout(function () { $('as-ok').textContent = ''; }, 3000);
  listAssigns();
}

// ---------- Bài đã giao và ai đã xong ----------

async function listAssigns() {
  const list = await fetchAssignments([classId]);

  if (!list.length) {
    $('assigns').innerHTML = '<p class="empty">Chưa giao bài nào cho lớp này.</p>';
    return;
  }

  const ids = roster.map(function (s) { return s.id; });
  let html = '';

  for (const a of list) {
    const done = await countProgress(a, ids);

    const rows = roster.map(function (s) {
      return { s: s, pct: assignPercent(a, done[s.id] || {}) };
    }).sort(function (x, y) { return y.pct - x.pct; });

    const finished = rows.filter(function (r) { return r.pct >= 100; }).length;

    html +=
      '<div class="wrong-q">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<span style="flex:1;min-width:180px;font-weight:600">' + esc(a.title) + '</span>' +
          '<span class="q-tag" style="margin:0">' + esc(dueText(a.due_date)) + '</span>' +
          '<span class="stat-lab">' + finished + '/' + rows.length + ' em xong</span>' +
          '<button class="btn-sm" data-del-as="' + a.id + '">Đóng bài</button>' +
        '</div>' +

        '<p class="ww" style="margin:8px 0 0;color:#6C837E">' +
          a.items.map(function (i) {
            return esc(i.label) + ' (' + i.amount + ')';
          }).join(' · ') + '</p>';

    for (const r of rows) {
      html +=
        '<div style="display:flex;align-items:center;gap:10px;margin-top:8px">' +
          '<span style="flex:1;min-width:130px;font-size:0.92rem">' +
            esc(r.s.full_name || 'Học viên') + '</span>' +
          '<span class="play-bar" style="flex:2;max-width:220px;cursor:default">' +
            '<span style="width:' + r.pct + '%"></span></span>' +
          '<span class="stat-lab" style="min-width:44px;text-align:right">' + r.pct + '%</span>' +
        '</div>';
    }

    html += '</div>';
  }

  $('assigns').innerHTML = html;

  $('assigns').querySelectorAll('button[data-del-as]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Đóng bài tập này? Học viên sẽ không thấy nữa.')) return;
      await db.from('assignments').update({ is_active: false }).eq('id', b.dataset.delAs);
      listAssigns();
    });
  });
}


// ============================================================
// Hàng chờ duyệt
// ============================================================

async function loadPending() {
  const box = $('pending-box');
  if (!box) return;

  const { data: mem } = await db
    .from('class_members').select('student_id, joined_at')
    .eq('class_id', classId).eq('status', 'pending');

  if (!mem || !mem.length) { box.innerHTML = ''; return; }

  const { data: ps } = await db
    .from('profiles').select('id, full_name, created_at')
    .in('id', mem.map(function (m) { return m.student_id; }));

  let html =
    '<div class="tbox" style="border-color:var(--gold)">' +
      '<h3>Đang chờ duyệt · ' + mem.length + ' người</h3>' +
      '<p style="margin:0 0 12px;font-size:0.94rem;line-height:1.65">' +
        'Những người này đã nhập đúng mã lớp. Chưa duyệt thì họ không vào được ' +
        'phần học và không nhận được bài tập.</p>';

  for (const m of mem) {
    const p = (ps || []).filter(function (x) { return x.id === m.student_id; })[0];
    const d = new Date(m.joined_at);

    html +=
      '<div class="wrong-q" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span style="flex:1;min-width:160px;font-weight:600">' +
          esc(p ? (p.full_name || 'Chưa đặt tên') : 'Không rõ') + '</span>' +
        '<span class="stat-lab">xin vào ' + d.getDate() + '/' + (d.getMonth() + 1) + '</span>' +
        '<button class="btn-sm test" data-ok="' + m.student_id + '">Duyệt</button>' +
        '<button class="btn-sm" data-no="' + m.student_id + '">Từ chối</button>' +
      '</div>';
  }

  html += '</div>';
  box.innerHTML = html;

  box.querySelectorAll('button[data-ok]').forEach(function (b) {
    b.addEventListener('click', async function () {
      await db.from('class_members').update({ status: 'active' })
        .eq('class_id', classId).eq('student_id', b.dataset.ok);
      loadPending(); loadRoster();
    });
  });

  box.querySelectorAll('button[data-no]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Từ chối người này?')) return;
      await db.from('class_members').delete()
        .eq('class_id', classId).eq('student_id', b.dataset.no);
      loadPending(); loadOutside();
    });
  });
}
