// ============================================================
// Pacedemy — trang chủ: con số, kết quả học viên, nút liên hệ
// Lấy từ Teacher Studio → "Trang giới thiệu" (site_settings,
// khoá "teacher_page", qua js/teacher-info.js). Ngân sửa ở đó,
// trang chủ tự cập nhật, không cần sửa code.
// Mạng lỗi thì giữ nút email mặc định, không vỡ trang.
// ============================================================

(async function () {
  let t;
  try { t = await TEACHER_READY; } catch (e) { return; }
  if (!t) return;

  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Con số nổi bật (10 năm dạy, Thạc sĩ…)
  const facts = (t.facts || []).filter(function (f) { return f && f.num; });
  const factsBox = document.getElementById('who-facts');
  if (factsBox && facts.length) {
    factsBox.innerHTML = facts.map(function (f) {
      return '<div class="fact"><b>' + esc(f.num) + '</b><span>' + esc(f.label) + '</span></div>';
    }).join('');
    factsBox.hidden = false;
  }

  // Kết quả học viên — chỉ hiện khi đã nhập ít nhất một người
  const results = (t.results || []).filter(function (r) { return r && (r.to || r.quote); });
  const resBox = document.getElementById('who-results');
  if (resBox && results.length) {
    document.getElementById('who-results-list').innerHTML = results.slice(0, 3).map(function (r) {
      let h = '<div class="res">';
      if (r.from && r.to) {
        h += '<p class="jump">' + esc(r.from) + ' → <b>' + esc(r.to) + '</b>' +
             (r.months ? ' <span class="res-time">trong ' + esc(r.months) + ' tháng</span>' : '') + '</p>';
      }
      if (r.who)   h += '<span class="who">' + esc(r.who) + '</span>';
      if (r.quote) h += '<p class="quote">' + esc(r.quote) + '</p>';
      return h + '</div>';
    }).join('');
    resBox.hidden = false;
  }

  // Nút liên hệ
  const c = t.contact || {};
  const btns = [];
  if (c.zalo) {
    btns.push('<a class="btn btn-gold" href="https://zalo.me/' + esc(c.zalo) +
              '" target="_blank" rel="noopener">Nhắn Zalo cho cô</a>');
  }
  if (c.facebook) {
    btns.push('<a class="btn ' + (btns.length ? 'btn-line' : 'btn-gold') + '" href="' + esc(c.facebook) +
              '" target="_blank" rel="noopener">Nhắn qua Facebook</a>');
  }
  if (c.email) {
    btns.push('<a class="btn ' + (btns.length ? 'btn-line' : 'btn-gold') + '" href="mailto:' +
              esc(c.email) + '">Gửi email cho cô</a>');
  }
  const reach = document.getElementById('reach-home');
  if (reach && btns.length) reach.innerHTML = btns.join('');
})();
