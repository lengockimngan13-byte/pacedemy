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
let isTeacher = false;
const SETS = {};        // 'mức-bộ' -> danh sách từ
const WORDS = {};       // id từ -> dữ liệu đầy đủ

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  slug = new URLSearchParams(location.search).get('chu-de');
  if (!slug) { location.replace('vocab.html'); return; }

  const { data: prof } = await db.from('profiles').select('role').eq('id', me.id).single();
  isTeacher = !!(prof && prof.role === 'teacher');

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
    .select('id, level, word, phonetic, pos, meaning_vi, example_en, example_vi, synonyms, collocations')
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
      const key = lv + '-' + (i + 1);
      SETS[key] = chunk;
      for (const w of chunk) WORDS[w.id] = w;

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
            '<button class="btn-sm" data-see="' + key + '">Xem từ</button>' +
            '<a class="btn-sm learn" href="flashcard.html' + link + '">Học thẻ</a>' +
            '<a class="btn-sm test" href="study.html' + link + '">Kiểm tra</a>' +
          '</div>' +
          '<div class="set-words hidden" data-box="' + key + '"></div>' +
        '</div>';
    }

    html += '</div></section>';
  }

  $('levels').innerHTML = html;
  bindSee();
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


// ============================================================
// Danh sách từ trong một bộ
// ============================================================

function bindSee() {
  document.querySelectorAll('button[data-see]').forEach(function (b) {
    b.addEventListener('click', function () {
      const key = b.dataset.see;
      const box = document.querySelector('[data-box="' + key + '"]');
      if (!box) return;

      const open = !box.classList.contains('hidden');
      if (open) {
        box.classList.add('hidden');
        b.textContent = 'Xem từ';
      } else {
        drawWords(key);
        box.classList.remove('hidden');
        b.textContent = 'Ẩn danh sách';
      }
    });
  });
}

function drawWords(key) {
  const box = document.querySelector('[data-box="' + key + '"]');
  const list = SETS[key] || [];

  let html = '<ul class="wordlist">';

  for (const w of list) {
    html +=
      '<li data-row="' + w.id + '">' +
        '<div class="wl-main">' +
          '<span class="wl-word">' + esc(w.word) + '</span>' +
          (w.phonetic ? '<span class="wl-ipa">' + esc(w.phonetic) + '</span>' : '') +
          (w.pos ? '<span class="wl-pos">' + esc(w.pos) + '</span>' : '') +
        '</div>' +
        '<div class="wl-mean">' + esc(w.meaning_vi || '') + '</div>' +
        '<div class="wl-act">' +
          '<button class="wl-say" data-say="' + esc(w.word) + '" title="Nghe">🔊</button>' +
          (isTeacher ? '<button class="wl-edit" data-edit="' + w.id + '">Sửa</button>' : '') +
        '</div>' +
      '</li>';
  }

  html += '</ul>';
  box.innerHTML = html;

  box.querySelectorAll('button[data-say]').forEach(function (b) {
    b.addEventListener('click', function () { say(b.dataset.say); });
  });

  box.querySelectorAll('button[data-edit]').forEach(function (b) {
    b.addEventListener('click', function () { openEdit(key, b.dataset.edit); });
  });
}

// ---------- Đọc to bằng giọng của trình duyệt ----------

function say(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// ============================================================
// Sửa thẻ ngay tại chỗ, chỉ giáo viên thấy
// ============================================================

const FIELDS = [
  ['word',         'Từ'],
  ['phonetic',     'Phiên âm'],
  ['pos',          'Loại từ (n, v, adj, adv, phr)'],
  ['meaning_vi',   'Nghĩa tiếng Việt'],
  ['example_en',   'Câu ví dụ'],
  ['example_vi',   'Dịch câu ví dụ'],
  ['synonyms',     'Từ đồng nghĩa, ngăn bằng dấu phẩy'],
  ['collocations', 'Cụm từ, ngăn bằng dấu chấm phẩy, dạng: cụm — nghĩa']
];

function openEdit(key, id) {
  const w = WORDS[id];
  const row = document.querySelector('li[data-row="' + id + '"]');
  if (!w || !row) return;

  let html = '<div class="wl-form">';

  for (const f of FIELDS) {
    const long = (f[0] === 'example_en' || f[0] === 'example_vi' || f[0] === 'collocations');
    html +=
      '<label>' + esc(f[1]) +
        (long
          ? '<textarea rows="2" data-f="' + f[0] + '">' + esc(w[f[0]] || '') + '</textarea>'
          : '<input type="text" data-f="' + f[0] + '" value="' + esc(w[f[0]] || '') + '">') +
      '</label>';
  }

  html +=
    '<label>Mức' +
      '<select data-f="level">' +
        [1, 2, 3].map(function (n) {
          return '<option value="' + n + '"' + (w.level === n ? ' selected' : '') + '>' +
                 n + ' — ' + LEVELS[n].name + '</option>';
        }).join('') +
      '</select>' +
    '</label>' +
    '<div class="wl-form-act">' +
      '<button class="btn-sm test" data-save="' + id + '">Lưu</button>' +
      '<button class="btn-sm" data-cancel="1">Huỷ</button>' +
      '<button class="wl-say" data-say="' + esc(w.word) + '">🔊 Nghe thử</button>' +
      '<span class="wl-msg"></span>' +
    '</div>' +
  '</div>';

  row.insertAdjacentHTML('beforeend', html);
  row.classList.add('editing');

  const form = row.querySelector('.wl-form');

  form.querySelector('[data-cancel]').addEventListener('click', function () {
    form.remove();
    row.classList.remove('editing');
  });

  form.querySelector('[data-say]').addEventListener('click', function () {
    say(form.querySelector('[data-f="word"]').value.trim() || w.word);
  });

  form.querySelector('[data-save]').addEventListener('click', async function () {
    const msg = form.querySelector('.wl-msg');
    const patch = {};

    for (const f of FIELDS) {
      const v = form.querySelector('[data-f="' + f[0] + '"]').value.trim();
      patch[f[0]] = v || null;
    }
    patch.level = parseInt(form.querySelector('[data-f="level"]').value, 10);

    if (!patch.word || !patch.meaning_vi) {
      msg.textContent = 'Từ và nghĩa không được để trống.';
      return;
    }

    this.disabled = true;
    const { error } = await db.from('vocabulary').update(patch).eq('id', id);
    this.disabled = false;

    if (error) { msg.textContent = 'Không lưu được: ' + error.message; return; }

    Object.assign(w, patch);
    form.remove();
    row.classList.remove('editing');
    drawWords(key);
  });
}
