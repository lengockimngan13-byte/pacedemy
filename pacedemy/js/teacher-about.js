// ============================================================
// Pacedemy — Ngân tự chỉnh nội dung trang giới thiệu đầy đủ
// (about.html). Lưu vào site_settings, khoá "teacher_page".
// Đọc/ghi cùng cơ chế site_settings đã dùng cho "Chỉnh trang web",
// chỉ khác khoá lưu.
// ============================================================

let me = null;

const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!data || data.role !== 'teacher') { $('view-deny').classList.remove('hidden'); return; }

  $('view-main').classList.remove('hidden');
  await load();
})();

function say(msg, kind) {
  const n = $('note');
  n.classList.remove('hidden');
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.textContent = msg;
}

async function getSetting(key, fallback) {
  const { data } = await db.from('site_settings').select('value').eq('key', key).single();
  return (data && data.value) || fallback;
}

function saveSetting(key, value) {
  return db.from('site_settings')
    .upsert({ key: key, value: value, updated_at: new Date().toISOString() });
}

// ---------- Nạp dữ liệu hiện có ----------

async function load() {
  const t = await getSetting('teacher_page', TEACHER_DEFAULTS);

  $('show').checked = !!t.show;
  $('name').value = t.name || '';
  $('role').value = t.role || '';
  $('photo').value = t.photo || '';
  $('short').value = t.short || '';

  const facts = t.facts || [];
  $('facts-fields').innerHTML = [0, 1, 2].map(function (i) {
    const f = facts[i] || {};
    return (
      '<div style="display:flex;gap:10px;margin-bottom:10px">' +
        '<input type="text" id="fact-num-' + i + '" placeholder="Ví dụ: 10" ' +
          'value="' + esc(f.num || '') + '" style="width:140px;padding:10px 12px;' +
          'border:1.5px solid var(--line);border-radius:var(--r);font-family:var(--ui)">' +
        '<input type="text" id="fact-label-' + i + '" placeholder="Ví dụ: năm dạy TOEIC" ' +
          'value="' + esc(f.label || '') + '" style="flex:1;padding:10px 12px;' +
          'border:1.5px solid var(--line);border-radius:var(--r);font-family:var(--ui)">' +
      '</div>'
    );
  }).join('');

  fillBio(t.bio || []);
  fillApproach(t.approach || []);
  fillCredentials(t.credentials || []);
  fillResults(t.results || []);

  const c = t.contact || {};
  $('c-email').value = c.email || '';
  $('c-zalo').value = c.zalo || '';
  $('c-facebook').value = c.facebook || '';
  $('c-form').checked = c.form !== false;
}

// ---------- Đôi lời về mình (danh sách đoạn văn) ----------

function bioRow(text) {
  const row = document.createElement('div');
  row.className = 'rep-row';
  row.innerHTML =
    '<textarea rows="3" placeholder="Một đoạn giới thiệu…"></textarea>' +
    '<button class="btn-sm" type="button">Bỏ</button>';
  row.querySelector('textarea').value = text || '';
  row.querySelector('button').addEventListener('click', function () { row.remove(); });
  return row;
}

function fillBio(list) {
  const box = $('bio-list');
  box.innerHTML = '';
  (list.length ? list : ['']).forEach(function (b) { box.appendChild(bioRow(b)); });
}

$('btn-add-bio').addEventListener('click', function () { $('bio-list').appendChild(bioRow('')); });

function readBio() {
  return Array.from($('bio-list').querySelectorAll('textarea'))
    .map(function (t) { return t.value.trim(); })
    .filter(Boolean);
}

// ---------- Cách mình dạy (tiêu đề + đoạn) ----------

function approachRow(h, p) {
  const row = document.createElement('div');
  row.className = 'rep-row';
  row.innerHTML =
    '<input type="text" placeholder="Tiêu đề ngắn, ví dụ: Sửa tận gốc, không học mẹo" data-f="h">' +
    '<textarea rows="2" placeholder="Đoạn giải thích ngắn" data-f="p"></textarea>' +
    '<button class="btn-sm" type="button">Bỏ</button>';
  row.querySelector('[data-f="h"]').value = h || '';
  row.querySelector('[data-f="p"]').value = p || '';
  row.querySelector('button').addEventListener('click', function () { row.remove(); });
  return row;
}

function fillApproach(list) {
  const box = $('approach-list');
  box.innerHTML = '';
  (list.length ? list : [{}]).forEach(function (a) { box.appendChild(approachRow(a.h, a.p)); });
}

$('btn-add-approach').addEventListener('click', function () { $('approach-list').appendChild(approachRow('', '')); });

function readApproach() {
  return Array.from($('approach-list').children).map(function (row) {
    return {
      h: row.querySelector('[data-f="h"]').value.trim(),
      p: row.querySelector('[data-f="p"]').value.trim()
    };
  }).filter(function (a) { return a.h || a.p; });
}

// ---------- Bằng cấp, chứng chỉ (một dòng) ----------

function credRow(text) {
  const row = document.createElement('div');
  row.className = 'rep-row rep-row-inline';
  row.innerHTML =
    '<input type="text" placeholder="Ví dụ: Đang học Thạc sĩ Ngôn ngữ Anh — HUTECH">' +
    '<button class="btn-sm" type="button">Bỏ</button>';
  row.querySelector('input').value = text || '';
  row.querySelector('button').addEventListener('click', function () { row.remove(); });
  return row;
}

function fillCredentials(list) {
  const box = $('cred-list');
  box.innerHTML = '';
  (list.length ? list : ['']).forEach(function (c) { box.appendChild(credRow(c)); });
}

$('btn-add-cred').addEventListener('click', function () { $('cred-list').appendChild(credRow('')); });

function readCredentials() {
  return Array.from($('cred-list').querySelectorAll('input'))
    .map(function (i) { return i.value.trim(); })
    .filter(Boolean);
}

// ---------- Kết quả học viên ----------

function resultRow(r) {
  r = r || {};
  const row = document.createElement('div');
  row.className = 'rep-row res-row';
  row.innerHTML =
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="number" placeholder="Điểm trước" data-f="from" style="width:120px">' +
      '<input type="number" placeholder="Điểm sau" data-f="to" style="width:120px">' +
      '<input type="number" placeholder="Số tháng" data-f="months" style="width:120px">' +
    '</div>' +
    '<input type="text" placeholder="Tên/mô tả học viên, ví dụ: Bạn P., sinh viên năm cuối" data-f="who">' +
    '<textarea rows="2" placeholder="Trích lời học viên (không bắt buộc)" data-f="quote"></textarea>' +
    '<button class="btn-sm" type="button">Bỏ</button>';

  row.querySelector('[data-f="from"]').value = r.from || '';
  row.querySelector('[data-f="to"]').value = r.to || '';
  row.querySelector('[data-f="months"]').value = r.months || '';
  row.querySelector('[data-f="who"]').value = r.who || '';
  row.querySelector('[data-f="quote"]').value = r.quote || '';
  row.querySelector('button').addEventListener('click', function () { row.remove(); });
  return row;
}

function fillResults(list) {
  const box = $('results-list');
  box.innerHTML = '';
  list.forEach(function (r) { box.appendChild(resultRow(r)); });
  if (!list.length) {
    box.innerHTML = '<p class="empty" style="text-align:left">Chưa có kết quả nào, bấm "+ Thêm học viên" khi có nhé.</p>';
  }
}

$('btn-add-result').addEventListener('click', function () {
  const box = $('results-list');
  const empty = box.querySelector('.empty');
  if (empty) empty.remove();
  box.appendChild(resultRow({}));
});

function readResults() {
  return Array.from($('results-list').children)
    .filter(function (row) { return row.querySelector; })
    .map(function (row) {
      const from = row.querySelector('[data-f="from"]');
      if (!from) return null;
      return {
        from: parseInt(row.querySelector('[data-f="from"]').value, 10) || null,
        to: parseInt(row.querySelector('[data-f="to"]').value, 10) || null,
        months: parseInt(row.querySelector('[data-f="months"]').value, 10) || null,
        who: row.querySelector('[data-f="who"]').value.trim(),
        quote: row.querySelector('[data-f="quote"]').value.trim()
      };
    })
    .filter(function (r) { return r && (r.who || r.from || r.to); });
}

// ---------- Lưu ----------

$('btn-save').addEventListener('click', async function () {
  this.disabled = true;

  const payload = {
    show: $('show').checked,
    name: $('name').value.trim(),
    role: $('role').value.trim(),
    photo: $('photo').value.trim(),
    facts: [0, 1, 2].map(function (i) {
      return { num: $('fact-num-' + i).value.trim(), label: $('fact-label-' + i).value.trim() };
    }).filter(function (f) { return f.num || f.label; }),
    short: $('short').value.trim(),
    bio: readBio(),
    approach: readApproach(),
    credentials: readCredentials(),
    results: readResults(),
    contact: {
      email: $('c-email').value.trim(),
      zalo: $('c-zalo').value.trim(),
      facebook: $('c-facebook').value.trim(),
      form: $('c-form').checked
    }
  };

  const { error } = await saveSetting('teacher_page', payload);

  this.disabled = false;
  say(error ? 'Không lưu được: ' + error.message : 'Đã lưu. Bấm "Xem thử trang giới thiệu" để kiểm tra.',
      error ? 'bad' : 'good');
});

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
