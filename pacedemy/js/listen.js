// ============================================================
// Pacedemy — màn hình chọn bài nghe Part 1 đến 4
// ============================================================

const PARTS = [
  { n: 1, name: 'Part 1 — Mô tả tranh',
    desc: 'Nhìn ảnh, nghe bốn câu, chọn câu tả đúng nhất.' },
  { n: 2, name: 'Part 2 — Hỏi đáp',
    desc: 'Nghe một câu hỏi, chọn câu đáp phù hợp. Không có đề in sẵn.' },
  { n: 3, name: 'Part 3 — Hội thoại ngắn',
    desc: 'Nghe đoạn hội thoại giữa hai đến ba người, trả lời ba câu.' },
  { n: 4, name: 'Part 4 — Bài nói ngắn',
    desc: 'Nghe một bài nói, thông báo hoặc tin nhắn thoại, trả lời ba câu.' }
];

let me = null;
const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  showStreak();
  build();
})();

async function showStreak() {
  const { data } = await db.from('profiles').select('streak_days').eq('id', me.id).single();
  const d = data && data.streak_days ? data.streak_days : 0;
  $('streak').textContent = d > 0 ? d + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';
}

async function build() {
  const { data: sets } = await db
    .from('listening_sets')
    .select('id, part, title, difficulty')
    .eq('is_active', true)
    .order('id');

  const { data: qs } = await db
    .from('questions')
    .select('id, part, set_id')
    .not('set_id', 'is', null)
    .eq('is_active', true);

  const done = await myResults();

  // Đếm số câu trong từng bộ đề
  const qInSet = {};
  for (const q of (qs || [])) qInSet[q.set_id] = (qInSet[q.set_id] || 0) + 1;

  let html = '';

  for (const p of PARTS) {
    const list = (sets || []).filter(function (s) { return s.part === p.n; });
    let nq = 0;
    for (const s of list) nq += (qInSet[s.id] || 0);

    html +=
      '<section class="level-block">' +
        '<div class="part-head">' +
          '<div>' +
            '<h2>' + esc(p.name) + '</h2>' +
            '<p>' + esc(p.desc) + '</p>' +
          '</div>' +
          (list.length
            ? '<a class="btn btn-gold" href="listen-practice.html?part=' + p.n + '">Luyện ngẫu nhiên</a>'
            : '<span class="set-n">đang soạn</span>') +
        '</div>';

    if (!list.length) {
      html += '<p class="empty">Phần này chưa có bài nghe nào. Cô đang soạn nhé.</p></section>';
      continue;
    }

    const d = done[p.n];
    html += '<p class="level-note">' + list.length + ' bài nghe · ' + nq + ' câu hỏi' +
            (d ? ' · bạn đã đúng ' + d.right + '/' + d.seen + ' câu' : '') + '</p>';

    html += '<div class="set-grid">';

    for (const s of list) {
      const c = qInSet[s.id] || 0;
      html +=
        '<div class="set">' +
          '<div class="set-top">' +
            '<span class="set-name">' + esc(s.title) + '</span>' +
            '<span class="set-n">' + c + ' câu</span>' +
          '</div>' +
          '<span class="count">' + level(s.difficulty) + '</span>' +
          '<div class="topic-actions">' +
            '<a class="btn-sm test" style="flex:1" href="listen-practice.html?set=' + s.id + '">Nghe bài này</a>' +
          '</div>' +
        '</div>';
    }

    html += '</div></section>';
  }

  $('parts').innerHTML = html;
}

function level(d) {
  if (d === 1) return 'Mức dễ';
  if (d === 3) return 'Mức khó';
  return 'Mức vừa';
}

// Số câu nghe đã đúng của học viên, gom theo từng part
async function myResults() {
  const out = {};

  const { data: atts } = await db
    .from('attempts').select('id, part')
    .eq('user_id', me.id).in('part', [1, 2, 3, 4])
    .order('id', { ascending: false }).limit(80);

  if (!atts || !atts.length) return out;

  const partOf = {};
  const ids = [];
  for (const a of atts) { partOf[a.id] = a.part; ids.push(a.id); }

  const { data: ans } = await db
    .from('attempt_answers')
    .select('attempt_id, is_correct')
    .in('attempt_id', ids);

  for (const a of (ans || [])) {
    const p = partOf[a.attempt_id];
    if (!p) continue;
    out[p] = out[p] || { seen: 0, right: 0 };
    out[p].seen++;
    if (a.is_correct) out[p].right++;
  }

  return out;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
