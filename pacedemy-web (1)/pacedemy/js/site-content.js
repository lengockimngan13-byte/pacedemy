// ============================================================
// Pacedemy — nạp nội dung trang giới thiệu từ site_settings
// Trang chủ công khai, không cần đăng nhập vẫn đọc được.
// Lỗi mạng thì giữ nguyên chữ tĩnh có sẵn trong HTML, không vỡ trang.
// ============================================================

(async function () {
  try {
    const { data } = await db.from('site_settings')
      .select('key, value').in('key', ['hero', 'strip', 'teacher_bio']);

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
  } catch (e) {
    // Mạng lỗi hoặc chưa chạy SQL: giữ nguyên chữ mặc định trong HTML.
  }
})();
