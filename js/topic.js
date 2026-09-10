// ============================================================
// Pacedemy — trang chi tiết chủ đề
// Chia từ theo mức, mỗi mức cắt thành các bộ nhỏ.
// ============================================================

const SET_SIZE = 12;

const LEVELS = {
  1: { name: 'Cơ bản',    band: '400 – 500',  note: 'Từ nền tảng, gặp nhiều nhất trong đề' },
  2: { name: 'Trung cấp', band: '600 – 700',  note: 'Từ thường gặp ở Part 5 và Part 7' },
  3: { name: 'Nâng cao',  band: '800 trở lên', note: 'Từ khó, hay xuất hiện ở câu bẫy' }
};

let me = null;
let slug = null;

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  slug = new URLSearchParams(location.search).get('chu-de');
  if (!slug) { location.replace('vocab.html'); return; }

  showStreak();
  build();
})();

async function showStreak() {
  const { data } = await db.from('profiles').select('streak_days').eq('id', me.id).single();
  const d = data && data.streak_days ? data.streak_days : 0;
  $('streak').textContent = d > 0 ? d + ' ngày liên tiếp' : 'Bắt đầu chuỗi ngày học';
}

async function build() {
  const { data: t } = await db
    .from('topics').select('id, name_vi, name_en').eq('slug', slug).single();

  if (!t) { $('levels').innerHTML = '<p class="empty">Không tìm thấy chủ đề này.</p>'; return; }

  $('t-name').textContent = t.name_vi;

  const { data: words } = await db
    .from('vocabulary')
    .select('id, level')
    .eq('topic_id', t.id)
    .order('level')
    .order('order_index')
    .order('id');

  if (!words || !words.length) {
    $('t-sub').textContent = t.name_en;
    $('levels').innerHTML = '<p class="empty">Chủ đề này chưa có từ nào.</p>';
    return;
  }

  $('t-sub').textContent = t.name_en + ' · ' + words.length + ' từ';

  // Tiến độ của học viên
  const { data: prog } = await db
    .from('vocab_progress')
    .select('vocabulary_id, status')
    .eq('user_id', me.id)
    .eq('status', 'mastered');

  const done = {};
  for (const p of (prog || [])) done[p.vocabulary_id] = true;

  // Gom theo mức
  const byLevel = {};
  for (const w of words) {
    const lv = w.level || 1;
    (byLevel[lv] = byLevel[lv] || []).push(w);
  }

  let html = '';

  for (const lv of Object.keys(byLevel).sort()) {
    const list = byLevel[lv];
    const meta = LEVELS[lv] || { name: 'Mức ' + lv, band: '', note: '' };

    html +=
      '<section class="level-block">' +
        '<div class="level-head">' +
          '<h2>' + esc(meta.name) + '</h2>' +
          (meta.band ? '<span class="level-band band-' + lv + '">' + esc(meta.band) + '</span>' : '') +
          '<span class="level-note">' + esc(meta.note) + '</span>' +
        '</div>' +
        '<div class="set-grid">';

    const sets = Math.ceil(list.length / SET_SIZE);

    for (let i = 0; i < sets; i++) {
      const chunk = list.slice(i * SET_SIZE, (i + 1) * SET_SIZE);
      let ok = 0;
      for (const w of chunk) if (done[w.id]) ok++;
      const pct = Math.round(ok / chunk.length * 100);
      const finished = (ok === chunk.length);

      const link = '?chu-de=' + encodeURIComponent(slug) + '&muc=' + lv + '&bo=' + (i + 1);

      html +=
        '<div class="set' + (finished ? ' done' : '') + '">' +
          '<div class="set-top">' +
            '<span class="set-name">Bộ ' + (i + 1) +
              (finished ? ' <span class="set-check">✓</span>' : '') + '</span>' +
            '<span class="set-n">' + chunk.length + ' từ</span>' +
          '</div>' +
          '<div class="bar"><span class="' + (finished ? 'full' : '') + '" style="width:' + pct + '%"></span></div>' +
          '<span class="count">' + ok + '/' + chunk.length + ' đã thuộc</span>' +
          '<div class="topic-actions">' +
            '<a class="btn-sm learn" href="flashcard.html' + link + '">Học thẻ</a>' +
            '<a class="btn-sm test" href="study.html' + link + '">Kiểm tra</a>' +
          '</div>' +
        '</div>';
    }

    html += '</div></section>';
  }

  $('levels').innerHTML = html;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

$('btn-logout').addEventListener('click', async function () {
  await db.auth.signOut();
  window.location.replace('index.html');
});
