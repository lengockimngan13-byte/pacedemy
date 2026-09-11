// ============================================================
// Pacedemy — màn hình chọn dạng bài Part 5
// ============================================================

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
  const { data: qs, error } = await db
    .from('questions')
    .select('id, skill_group, topic_tag')
    .eq('part', 5)
    .eq('is_active', true);

  if (error || !qs || !qs.length) {
    $('groups').innerHTML = '<p class="empty">Chưa có câu hỏi nào cho Part 5.</p>';
    return;
  }

  // Số câu đã làm của học viên, gom theo dạng
  const { data: atts } = await db
    .from('attempts').select('id').eq('user_id', me.id).eq('part', 5);

  const ids = (atts || []).map(function (a) { return a.id; });
  let doneBy = {};

  if (ids.length) {
    const { data: ans } = await db
      .from('attempt_answers')
      .select('question_id, is_correct')
      .in('attempt_id', ids.slice(0, 200));

    const tagOf = {};
    for (const q of qs) tagOf[q.id] = q.topic_tag;

    for (const a of (ans || [])) {
      const t = tagOf[a.question_id];
      if (!t) continue;
      doneBy[t] = doneBy[t] || { seen: 0, right: 0 };
      doneBy[t].seen++;
      if (a.is_correct) doneBy[t].right++;
    }
  }

  // Gom theo nhóm lớn rồi tới dạng
  const tree = {};
  for (const q of qs) {
    const g = q.skill_group || 'Khác';
    const t = q.topic_tag || 'Chưa phân loại';
    tree[g] = tree[g] || {};
    tree[g][t] = (tree[g][t] || 0) + 1;
  }

  const order = ['Ngữ pháp', 'Từ vựng'];
  const groups = Object.keys(tree).sort(function (a, b) {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia === -1 ? 9 : ia) - (ib === -1 ? 9 : ib);
  });

  let html = '';

  for (const g of groups) {
    const tags = Object.keys(tree[g]).sort();
    let totalG = 0;
    for (const t of tags) totalG += tree[g][t];

    html +=
      '<section class="level-block">' +
        '<div class="level-head">' +
          '<h2>' + esc(g) + '</h2>' +
          '<span class="level-band ' + (g === 'Ngữ pháp' ? 'band-1' : 'band-2') + '">' +
            totalG + ' câu</span>' +
        '</div>' +
        '<div class="set-grid">';

    for (const t of tags) {
      const n = tree[g][t];
      const d = doneBy[t];
      const line = d
        ? d.right + '/' + d.seen + ' câu đúng · ' + Math.round(d.right / d.seen * 100) + '%'
        : 'Chưa luyện dạng này';

      html +=
        '<div class="set">' +
          '<div class="set-top">' +
            '<span class="set-name">' + esc(t) + '</span>' +
            '<span class="set-n">' + n + ' câu</span>' +
          '</div>' +
          '<span class="count">' + esc(line) + '</span>' +
          '<div class="topic-actions">' +
            '<a class="btn-sm test" style="flex:1" href="practice.html?part=5&dang=' +
              encodeURIComponent(t) + '">Luyện dạng này</a>' +
          '</div>' +
        '</div>';
    }

    html += '</div></section>';
  }

  $('groups').innerHTML = html;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
