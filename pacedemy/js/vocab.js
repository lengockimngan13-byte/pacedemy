// ============================================================
// Pacedemy — trang chủ đề từ vựng
// ============================================================

let me = null;

(async function () {
  me = await requireLogin();
  if (!me) return;

  showStreak();
  loadTopics();
  loadDue();
})();

async function showStreak() {
  const { data } = await db.from('profiles').select('streak_days').eq('id', me.id).single();
  const d = data && data.streak_days ? data.streak_days : 0;
  document.getElementById('streak').textContent =
    d > 0 ? d + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';
}

// ---------- Số từ đến hạn ôn ----------

async function loadDue() {
  const { count } = await db
    .from('vocab_progress')
    .select('vocabulary_id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .neq('status', 'mastered')
    .lte('next_review', new Date().toISOString());

  if (!count) return;

  document.getElementById('due-card').style.display = 'flex';
  document.getElementById('due-line').textContent =
    count + ' từ đang chờ bạn ôn lại. Ôn đúng hạn thì nhớ lâu hơn nhiều.';
}

// ---------- Danh sách chủ đề ----------

async function loadTopics() {
  const box = document.getElementById('topics');

  const { data: topics, error } = await db
    .from('topics')
    .select('id, slug, name_en, name_vi')
    .eq('is_active', true)
    .order('order_index');

  if (error || !topics || !topics.length) {
    box.innerHTML = '<p class="empty">Chưa có chủ đề nào. Bạn báo giáo viên thêm từ vựng nhé.</p>';
    return;
  }

  // Tổng số từ mỗi chủ đề
  const { data: words } = await db.from('vocabulary').select('id, topic_id');

  // Tiến độ của học viên
  const { data: prog } = await db
    .from('vocab_progress')
    .select('vocabulary_id, status')
    .eq('user_id', me.id);

  const topicOf = {};
  const totalBy = {};
  for (const w of (words || [])) {
    topicOf[w.id] = w.topic_id;
    totalBy[w.topic_id] = (totalBy[w.topic_id] || 0) + 1;
  }

  const doneBy = {};
  for (const p of (prog || [])) {
    if (p.status !== 'mastered') continue;
    const t = topicOf[p.vocabulary_id];
    if (t) doneBy[t] = (doneBy[t] || 0) + 1;
  }

  let html = '';
  for (const t of topics) {
    const total = totalBy[t.id] || 0;
    const done  = doneBy[t.id] || 0;
    const pct   = total ? Math.round(done / total * 100) : 0;

    if (total === 0) {
      html +=
        '<span class="topic" style="opacity:.55">' +
          '<h3>' + esc(t.name_vi) + '</h3>' +
          '<span class="en">' + esc(t.name_en) + '</span>' +
          '<div class="bar"><span style="width:0"></span></div>' +
          '<span class="count">Chưa có từ</span>' +
        '</span>';
      continue;
    }

    const slug = encodeURIComponent(t.slug);
    html +=
      '<div class="topic">' +
        '<h3>' + esc(t.name_vi) + '</h3>' +
        '<span class="en">' + esc(t.name_en) + '</span>' +
        '<div class="bar"><span class="' + (pct === 100 ? 'full' : '') + '" style="width:' + pct + '%"></span></div>' +
        '<span class="count">' + done + '/' + total + ' từ đã thuộc</span>' +
        '<div class="topic-actions">' +
          '<a class="btn-sm test" href="topic.html?chu-de=' + slug + '" style="flex:1">Mở chủ đề</a>' +
        '</div>' +
      '</div>';
  }

  box.innerHTML = html;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


