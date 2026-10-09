// ============================================================
// Pacedemy — nạp nội dung trang giới thiệu từ site_settings
// Trang chủ công khai, không cần đăng nhập vẫn đọc được.
// Lỗi mạng thì giữ nguyên chữ tĩnh có sẵn trong HTML, không vỡ trang.
// ============================================================

(async function () {
  try {
    const { data } = await db.from('site_settings')
      .select('key, value')
      .in('key', ['hero', 'strip', 'teacher_bio', 'ket', 'lop']);

    if (!data) return;

    const byKey = {};
    for (const row of data) byKey[row.key] = row.value;

    const set = function (id, text) {
      const el = document.getElementById(id);
      if (el && text) el.textContent = text;
    };

    if (byKey.hero) {
      set('hero-title', byKey.hero.title);
      set('hero-sub', byKey.hero.subtitle);
    }

    if (byKey.strip) {
      const s = byKey.strip;
      set('strip-head', s.head);
      ['learn', 'practice', 'review', 'repeat'].forEach(function (k) {
        if (s[k]) {
          set('strip-' + k + '-title', s[k].title);
          set('strip-' + k + '-desc', s[k].desc);
        }
      });
    }

    if (byKey.teacher_bio) {
      const b = byKey.teacher_bio;
      set('who-name', b.name);
      set('who-short', b.short);

      const photo = document.getElementById('who-photo');
      if (photo && b.photo) photo.src = b.photo;

      if (b.show) document.getElementById('who-sec').style.display = '';
    }

    veKet(byKey.ket);
    veLop(byKey.lop);
  } catch (e) {
    // Mạng lỗi hoặc chưa chạy SQL: giữ nguyên chữ mặc định trong HTML.
  }
})();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Mục "bạn đang mắc kẹt ở đâu" ----------
//
// Chưa lưu gì thì giữ nguyên bốn ô viết sẵn trong HTML. Chỉ vẽ lại khi
// cô đã sửa, và tắt hẳn khi cô tắt.

function veKet(k) {
  if (!k) return;

  const o = document.getElementById('ket-sec');
  if (!o) return;

  if (k.show === false) { o.style.display = 'none'; return; }

  if (k.head) document.getElementById('ket-head').textContent = k.head;
  if (k.lead) document.getElementById('ket-lead').textContent = k.lead;

  const ds = Array.isArray(k.muc) ? k.muc.filter(function (x) { return x && x.h; }) : [];
  if (!ds.length) return;

  document.getElementById('ket-grid').innerHTML = ds.map(function (x) {
    return '<article class="ket"><h3>' + esc(x.h) + '</h3>' +
           '<p>' + esc(x.p || '') + '</p></article>';
  }).join('');
}

// ---------- Mục "Lớp của cô" ----------
//
// Chưa khai lớp nào thì mục này không hiện. Thà không có còn hơn có một
// khung trống hoặc mấy con số bịa ra cho đầy chỗ.

function veLop(l) {
  const o = document.getElementById('lop-sec');
  if (!o || !l || l.show === false) return;

  const ds = Array.isArray(l.lop) ? l.lop.filter(function (x) { return x && x.ten; }) : [];
  if (!ds.length) return;

  if (l.head) document.getElementById('lop-head').textContent = l.head;
  if (l.lead) document.getElementById('lop-lead').textContent = l.lead;

  document.getElementById('lop-grid').innerHTML = ds.map(function (x) {
    const y = Array.isArray(x.y) ? x.y.filter(Boolean) : [];
    return '<article class="lop' + (x.noi_bat ? ' noi-bat' : '') + '">' +
      (x.noi_bat ? '<span class="lop-cho">Nhiều bạn chọn</span>' : '') +
      '<h3>' + esc(x.ten) + '</h3>' +
      (x.cho ? '<p class="lop-cho-ai">' + esc(x.cho) + '</p>' : '') +
      (y.length
        ? '<ul>' + y.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
        : '') +
      (x.ghi_chu ? '<p class="lop-ghi">' + esc(x.ghi_chu) + '</p>' : '') +
      '<a class="btn btn-line" href="#lien-he">Hỏi về lớp này</a>' +
    '</article>';
  }).join('');

  o.style.display = '';
}
