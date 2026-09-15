// ============================================================
// Pacedemy — giáo viên tự chỉnh trang giới thiệu và bật/tắt tính năng
// Đọc/ghi vào bảng site_settings, index.html và app.html sẽ đọc
// cùng bảng này để hiển thị đúng nội dung mới nhất.
// ============================================================

let me = null;

const $ = function (id) { return document.getElementById(id); };

const FEATURES = [
  { key: 'vocab',       label: 'Từ vựng' },
  { key: 'listen',      label: 'Luyện nghe' },
  { key: 'read',        label: 'Luyện đọc' },
  { key: 'mock',        label: 'Thi thử' },
  { key: 'leaderboard', label: 'Xếp hạng / Lớp học' },
  { key: 'class',       label: 'Vào lớp bằng mã' }
];

const STRIP_PARTS = [
  { key: 'learn',    label: 'Learn' },
  { key: 'practice', label: 'Practice' },
  { key: 'review',   label: 'Review' },
  { key: 'repeat',   label: 'Repeat' }
];

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') { $('view-deny').classList.remove('hidden'); return; }

  $('view-main').classList.remove('hidden');
  await loadAll();
})();

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

async function getSetting(key, fallback) {
  const { data } = await db.from('site_settings').select('value').eq('key', key).single();
  return (data && data.value) || fallback;
}

async function saveSetting(key, value) {
  return db.from('site_settings')
    .upsert({ key: key, value: value, updated_at: new Date().toISOString() });
}

// ---------- Nạp dữ liệu hiện có ----------

async function loadAll() {
  const features = await getSetting('features', {});
  $('feat-list').innerHTML = FEATURES.map(function (f) {
    const on = features[f.key] !== false;
    return '<label class="check-row">' +
      '<input type="checkbox" data-feat="' + f.key + '"' + (on ? ' checked' : '') + '>' +
      '<span>' + f.label + '</span></label>';
  }).join('');

  const hero = await getSetting('hero', {});
  $('hero-title').value = hero.title || '';
  $('hero-sub').value = hero.subtitle || '';

  const strip = await getSetting('strip', {});
  $('strip-head').value = strip.head || '';

  $('strip-fields').innerHTML = STRIP_PARTS.map(function (p) {
    const v = strip[p.key] || {};
    return (
      '<div class="field"><label>' + p.label + ' · tiêu đề</label>' +
        '<input type="text" data-strip-title="' + p.key + '" value="' + esc(v.title || '') + '"></div>' +
      '<div class="field"><label>' + p.label + ' · mô tả</label>' +
        '<textarea rows="3" data-strip-desc="' + p.key + '">' + esc(v.desc || '') + '</textarea></div>'
    );
  }).join('');

  const bio = await getSetting('teacher_bio', {});
  $('bio-show').checked = !!bio.show;
  $('bio-name').value = bio.name || '';
  $('bio-role').value = bio.role || '';
  $('bio-short').value = bio.short || '';
  $('bio-photo').value = bio.photo || '';

  const layout = await getSetting('layout', {});
  $('layout-width').value = layout.page_width || '';
  $('layout-gap').value = layout.section_gap || '';
}

// ---------- Lưu bố cục trang ----------

$('btn-save-layout').addEventListener('click', async function () {
  this.disabled = true;

  const width = parseInt($('layout-width').value, 10);
  const gap = parseInt($('layout-gap').value, 10);

  const layout = {
    page_width: width > 0 ? width : null,
    section_gap: gap >= 0 && $('layout-gap').value !== '' ? gap : null
  };

  const { error } = await saveSetting('layout', layout);

  this.disabled = false;

  say(error ? 'Không lưu được: ' + error.message
            : 'Đã lưu. Tải lại một trang bất kỳ để thấy thay đổi.', error ? '' : 'good');
});

// ---------- Lưu tính năng ----------

$('btn-save-feat').addEventListener('click', async function () {
  const value = {};
  FEATURES.forEach(function (f) {
    value[f.key] = $('feat-list').querySelector('input[data-feat="' + f.key + '"]').checked;
  });

  this.disabled = true;
  const { error } = await saveSetting('features', value);
  this.disabled = false;

  say(error ? 'Không lưu được: ' + error.message : 'Đã lưu. Học viên thấy thay đổi ngay khi tải lại trang.', error ? '' : 'good');
});

// ---------- Lưu nội dung trang giới thiệu ----------

$('btn-save-content').addEventListener('click', async function () {
  this.disabled = true;

  const hero = { title: $('hero-title').value.trim(), subtitle: $('hero-sub').value.trim() };

  const strip = { head: $('strip-head').value.trim() };
  STRIP_PARTS.forEach(function (p) {
    strip[p.key] = {
      title: $('strip-fields').querySelector('input[data-strip-title="' + p.key + '"]').value.trim(),
      desc: $('strip-fields').querySelector('textarea[data-strip-desc="' + p.key + '"]').value.trim()
    };
  });

  const bio = {
    show: $('bio-show').checked,
    name: $('bio-name').value.trim(),
    role: $('bio-role').value.trim(),
    short: $('bio-short').value.trim(),
    photo: $('bio-photo').value.trim()
  };

  const results = await Promise.all([
    saveSetting('hero', hero),
    saveSetting('strip', strip),
    saveSetting('teacher_bio', bio)
  ]);

  this.disabled = false;

  const bad = results.find(function (r) { return r.error; });
  say(bad ? 'Không lưu được: ' + bad.error.message : 'Đã lưu trang giới thiệu.', bad ? '' : 'good');
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
