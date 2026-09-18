// ============================================================
// Pacedemy — Tiến độ của tôi (học viên).
// Ba bảng: theo kỹ năng (Part 1-7 + từ vựng), tổng quan từ vựng,
// và lịch sử thi thử. Tính trên toàn bộ thời gian dùng web, không
// giới hạn theo ngày như khối thống kê ở trang học.
// ============================================================

let me = null;

const $ = function (id) { return document.getElementById(id); };

const SKILL_LABEL = {
  1: 'Nghe — Part 1', 2: 'Nghe — Part 2', 3: 'Nghe — Part 3', 4: 'Nghe — Part 4',
  5: 'Đọc — Part 5', 6: 'Đọc — Part 6', 7: 'Đọc — Part 7'
};

(async function () {
  me = await requireLogin();
  if (!me) return;

  loadSkillTable();
  loadVocabTable();
  loadMockTable();
})();

// ---------- Bảng theo kỹ năng ----------

async function loadSkillTable() {
  const { data: atts } = await db
    .from('attempts')
    .select('mode, part, total_questions, correct_count')
    .eq('user_id', me.id)
    .not('submitted_at', 'is', null);

  const bySkill = {}; // key: '1'..'7' hoặc 'vocab'

  for (const a of (atts || [])) {
    let key = null;
    if (a.mode === 'practice' && a.part >= 1 && a.part <= 7) key = String(a.part);
    else if (a.mode === 'vocab' || a.mode === 'vocab_colloc' || a.mode === 'vocab_synonym') key = 'vocab';
    if (!key) continue;

    bySkill[key] = bySkill[key] || { n: 0, ok: 0 };
    bySkill[key].n += a.total_questions || 0;
    bySkill[key].ok += a.correct_count || 0;
  }

  const order = ['1', '2', '3', '4', '5', '6', '7', 'vocab'];
  let html = '';
  let any = false;

  order.forEach(function (key) {
    const s = bySkill[key];
    const label = key === 'vocab' ? 'Từ vựng (Kiểm tra)' : SKILL_LABEL[key];
    if (!s || !s.n) {
      html += '<tr><td>' + label + '</td><td colspan="3" class="stat-lab">chưa luyện</td></tr>';
      return;
    }
    any = true;
    const pct = Math.round(s.ok / s.n * 100);
    html += '<tr><td>' + label + '</td><td>' + s.n + '</td><td>' + s.ok + '</td>' +
            '<td><b style="color:' + (pct >= 70 ? 'var(--teal)' : (pct >= 50 ? '#6B4A05' : 'var(--danger)')) + '">' +
            pct + '%</b></td></tr>';
  });

  $('skill-body').innerHTML = html;
  if (!any) {
    $('skill-body').innerHTML = '<tr><td colspan="4" class="empty">Chưa luyện gì để có dữ liệu.</td></tr>';
  }
}

// ---------- Bảng từ vựng ----------

async function loadVocabTable() {
  const { data: prog } = await db
    .from('vocab_progress').select('status').eq('user_id', me.id);

  const c = { mastered: 0, reviewing: 0, learning: 0 };
  for (const p of (prog || [])) if (c[p.status] != null) c[p.status]++;

  const total = c.mastered + c.reviewing + c.learning;

  $('vocab-body').innerHTML =
    '<tr><td><b style="color:var(--teal)">' + c.mastered + '</b></td>' +
    '<td>' + c.reviewing + '</td><td>' + c.learning + '</td><td>' + total + '</td></tr>';
}

// ---------- Bảng lịch sử thi thử ----------

async function loadMockTable() {
  const { data: mocks } = await db
    .from('mock_tests')
    .select('submitted_at, seconds_used, listening_correct, reading_correct, payload')
    .eq('user_id', me.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (!mocks || !mocks.length) {
    $('mock-body').innerHTML = '<tr><td colspan="5" class="empty">Chưa thi thử lần nào.</td></tr>';
    return;
  }

  let html = '';

  for (const m of mocks) {
    const d = new Date(m.submitted_at);
    const dateStr = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    const mins = Math.round((m.seconds_used || 0) / 60);

    let lScore = '—', rScore = '—', total = '—';

    if (m.payload && m.payload.listening_total && m.payload.reading_total) {
      const [{ data: l }, { data: r }] = await Promise.all([
        db.rpc('toeic_estimate', { p_section: 'listening', p_correct: m.listening_correct, p_total: m.payload.listening_total }),
        db.rpc('toeic_estimate', { p_section: 'reading', p_correct: m.reading_correct, p_total: m.payload.reading_total })
      ]);
      if (l != null && r != null) { lScore = l; rScore = r; total = l + r; }
    }

    html += '<tr><td>' + dateStr + '</td><td>' + lScore + '</td><td>' + rScore + '</td>' +
            '<td><b>' + total + '</b></td><td>' + mins + ' phút</td></tr>';
  }

  $('mock-body').innerHTML = html;
}
