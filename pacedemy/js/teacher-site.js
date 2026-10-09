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
  { key: 'shadow',      label: 'Luyện nói theo (Shadowing)' },
  { key: 'read',        label: 'Luyện đọc' },
  { key: 'extra',       label: 'Ôn tổng hợp (trộn Nghe/Đọc/Từ vựng)' },
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

  await napKet();
  await napLop();
}

// ---------- Mục "bạn đang mắc kẹt ở đâu" ----------
//
// Bốn ô cố định. Bỏ trống ô nào thì ô đó không hiện ra trang chủ.

async function napKet() {
  const k = await getSetting('ket', {});
  const ds = Array.isArray(k.muc) ? k.muc : [];

  $('ket-show').checked = k.show !== false;
  $('ket-head').value = k.head || '';
  $('ket-lead').value = k.lead || '';

  let html = '';
  for (let i = 0; i < 4; i++) {
    const v = ds[i] || {};
    html +=
      '<div class="field"><label>Nỗi khổ ' + (i + 1) + ' — câu học viên hay nói</label>' +
        '<input type="text" data-ket-h="' + i + '" value="' + esc(v.h || '') + '" ' +
        'placeholder="“Học từ vựng hoài mà vào đề vẫn không nhận ra”"></div>' +
      '<div class="field"><label>Nỗi khổ ' + (i + 1) + ' — mình giải thích và làm gì</label>' +
        '<textarea rows="3" data-ket-p="' + i + '">' + esc(v.p || '') + '</textarea></div>';
  }
  $('ket-fields').innerHTML = html;
}

function docKet() {
  const muc = [];
  for (let i = 0; i < 4; i++) {
    const h = $('ket-fields').querySelector('[data-ket-h="' + i + '"]').value.trim();
    const p = $('ket-fields').querySelector('[data-ket-p="' + i + '"]').value.trim();
    if (h) muc.push({ h: h, p: p });
  }
  return {
    show: $('ket-show').checked,
    head: $('ket-head').value.trim(),
    lead: $('ket-lead').value.trim(),
    muc: muc
  };
}

// ---------- Mục "Lớp của cô" ----------
//
// Số lớp thay đổi được, nên dựng từng thẻ một thay vì cố định ô như
// phần trên. Cô thêm bớt lớp mà không phải nhờ ai sửa mã.

function theLop(v, i) {
  v = v || {};
  const y = Array.isArray(v.y) ? v.y.join('\n') : '';

  return '<div class="tbox lop-the" data-lop="' + i + '" style="margin-bottom:14px">' +
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
      '<b style="flex:1">Lớp ' + (i + 1) + '</b>' +
      '<label class="check-row" style="margin:0">' +
        '<input type="checkbox" data-lop-nb' + (v.noi_bat ? ' checked' : '') + '>' +
        '<span>Gắn nhãn “Nhiều bạn chọn”</span></label>' +
      '<button class="btn-sm" type="button" data-lop-xoa ' +
        'style="flex:0 0 auto;color:#B4442F">Xoá</button>' +
    '</div>' +
    '<div class="field"><label>Tên lớp</label>' +
      '<input type="text" data-lop-ten value="' + esc(v.ten || '') + '" ' +
      'placeholder="Lớp 1-1"></div>' +
    '<div class="field"><label>Dành cho ai</label>' +
      '<textarea rows="2" data-lop-cho>' + esc(v.cho || '') + '</textarea></div>' +
    '<div class="field"><label>Trong lớp có gì — mỗi dòng một ý</label>' +
      '<textarea rows="4" data-lop-y>' + esc(y) + '</textarea></div>' +
    '<div class="field"><label>Ghi chú thêm (không bắt buộc)</label>' +
      '<input type="text" data-lop-ghi value="' + esc(v.ghi_chu || '') + '" ' +
      'placeholder="Mở lớp mới khi đủ ba bạn cùng mức."></div>' +
  '</div>';
}

async function napLop() {
  const l = await getSetting('lop', {});
  $('lop-head').value = l.head || '';
  $('lop-lead').value = l.lead || '';
  veLop(Array.isArray(l.lop) ? l.lop : []);
}

function veLop(ds) {
  $('lop-list').innerHTML = ds.map(theLop).join('');
}

function docLop() {
  const ds = [];
  $('lop-list').querySelectorAll('.lop-the').forEach(function (o) {
    const ten = o.querySelector('[data-lop-ten]').value.trim();
    if (!ten) return;
    ds.push({
      ten: ten,
      cho: o.querySelector('[data-lop-cho]').value.trim(),
      y: o.querySelector('[data-lop-y]').value.split('\n')
           .map(function (x) { return x.trim(); }).filter(Boolean),
      ghi_chu: o.querySelector('[data-lop-ghi]').value.trim(),
      noi_bat: o.querySelector('[data-lop-nb]').checked
    });
  });
  return {
    head: $('lop-head').value.trim(),
    lead: $('lop-lead').value.trim(),
    lop: ds
  };
}

$('lop-them').addEventListener('click', function () {
  const ds = docLop().lop;
  ds.push({ ten: '', cho: '', y: [], ghi_chu: '', noi_bat: false });
  veLop(ds);
});

// Xoá thì đọc lại toàn bộ rồi vẽ lại, để mấy ô còn lại không mất chữ
// cô vừa gõ mà chưa lưu.
$('lop-list').addEventListener('click', function (e) {
  const nut = e.target.closest('[data-lop-xoa]');
  if (!nut) return;

  const the = nut.closest('.lop-the');
  const i = parseInt(the.dataset.lop, 10);

  const ds = [];
  $('lop-list').querySelectorAll('.lop-the').forEach(function (o, j) {
    if (j === i) return;
    ds.push({
      ten: o.querySelector('[data-lop-ten]').value.trim(),
      cho: o.querySelector('[data-lop-cho]').value.trim(),
      y: o.querySelector('[data-lop-y]').value.split('\n')
           .map(function (x) { return x.trim(); }).filter(Boolean),
      ghi_chu: o.querySelector('[data-lop-ghi]').value.trim(),
      noi_bat: o.querySelector('[data-lop-nb]').checked
    });
  });
  veLop(ds);
});

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
    saveSetting('teacher_bio', bio),
    saveSetting('ket', docKet()),
    saveSetting('lop', docLop())
  ]);

  this.disabled = false;

  const bad = results.find(function (r) { return r.error; });
  say(bad ? 'Không lưu được: ' + bad.error.message : 'Đã lưu trang giới thiệu.', bad ? '' : 'good');
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
