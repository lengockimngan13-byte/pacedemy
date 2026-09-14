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
  // Danh mục dạng bài, kể cả dạng chưa có câu nào
  const { data: tags } = await db
    .from('question_tags')
    .select('skill_group, tag, note, order_index')
    .eq('part', 5)
    .order('order_index');

  const { data: qs } = await db
    .from('questions')
    .select('id, topic_tag')
    .eq('part', 5)
    .eq('is_active', true);

  if (!tags || !tags.length) {
    $('groups').innerHTML = '<p class="empty">Chưa có danh mục dạng bài.</p>';
    return;
  }

  const countBy = {};
  for (const q of (qs || [])) countBy[q.topic_tag] = (countBy[q.topic_tag] || 0) + 1;

  // Kết quả học viên theo từng dạng
  const doneBy = await myResults(qs || []);

  // Gom theo nhóm lớn, giữ nguyên thứ tự trong danh mục
  const groups = [];
  const seen = {};
  for (const t of tags) {
    if (!seen[t.skill_group]) { seen[t.skill_group] = []; groups.push(t.skill_group); }
    seen[t.skill_group].push(t);
  }

  let html = '';

  for (const g of groups) {
    const list = seen[g];
    let totalG = 0;
    for (const t of list) totalG += (countBy[t.tag] || 0);

    html +=
      '<section class="level-block">' +
        '<div class="level-head">' +
          '<h2>' + esc(g) + '</h2>' +
          '<span class="level-band ' + (g === 'Ngữ pháp' ? 'band-1' : 'band-2') + '">' +
            totalG + ' câu</span>' +
        '</div>' +
        '<div class="set-grid">';

    for (const t of list) {
      const n = countBy[t.tag] || 0;

      if (!n) {
        html +=
          '<div class="set" style="opacity:.5">' +
            '<div class="set-top">' +
              '<span class="set-name">' + esc(t.tag) + '</span>' +
              '<span class="set-n">đang soạn</span>' +
            '</div>' +
            '<span class="count">' + esc(t.note || '') + '</span>' +
          '</div>';
        continue;
      }

      const d = doneBy[t.tag];
      const line = d
        ? d.right + '/' + d.seen + ' câu đúng · ' + Math.round(d.right / d.seen * 100) + '%'
        : (t.note || 'Chưa luyện dạng này');

      html +=
        '<div class="set">' +
          '<div class="set-top">' +
            '<span class="set-name">' + esc(t.tag) + '</span>' +
            '<span class="set-n">' + n + ' câu</span>' +
          '</div>' +
          '<span class="count">' + esc(line) + '</span>' +
          '<div class="topic-actions">' +
            '<a class="btn-sm test" style="flex:1" href="practice.html?part=5&dang=' +
              encodeURIComponent(t.tag) + '">Luyện dạng này</a>' +
          '</div>' +
        '</div>';
    }

    html += '</div></section>';
  }

  $('groups').innerHTML = html;
}

// Số câu đúng của học viên, gom theo dạng bài
async function myResults(qs) {
  const out = {};

  const { data: atts } = await db
    .from('attempts').select('id').eq('user_id', me.id).eq('part', 5)
    .order('id', { ascending: false }).limit(60);

  const ids = (atts || []).map(function (a) { return a.id; });
  if (!ids.length) return out;

  const { data: ans } = await db
    .from('attempt_answers')
    .select('question_id, is_correct')
    .in('attempt_id', ids);

  const tagOf = {};
  for (const q of qs) tagOf[q.id] = q.topic_tag;

  for (const a of (ans || [])) {
    const t = tagOf[a.question_id];
    if (!t) continue;
    out[t] = out[t] || { seen: 0, right: 0 };
    out[t].seen++;
    if (a.is_correct) out[t].right++;
  }

  return out;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
