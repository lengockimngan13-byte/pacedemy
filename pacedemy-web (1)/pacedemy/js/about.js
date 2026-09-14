// ============================================================
// Pacedemy — trang giới thiệu giáo viên
// Nội dung lấy từ js/teacher-info.js
// ============================================================

let me = null;
const $ = function (id) { return document.getElementById(id); };

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data } = await db.from('profiles').select('role').eq('id', me.id).single();
  const amTeacher = data && data.role === 'teacher';

  if (!TEACHER.show && !amTeacher) {
    $('page').innerHTML =
      '<div class="done"><h1>Trang đang cập nhật</h1>' +
      '<p class="sub">Phần giới thiệu sẽ sớm có. Bạn quay lại sau nhé.</p>' +
      '<div class="done-actions"><a class="btn btn-ink" href="app.html">Về trang học</a></div></div>';
    return;
  }

  if (amTeacher && !TEACHER.show) {
    $('page').innerHTML =
      '<div class="note note-good" style="margin-bottom:22px">' +
      'Chế độ xem thử. Học viên chưa thấy trang này. ' +
      'Mở js/teacher-info.js và đổi show thành true khi muốn công bố.</div>';
    const box = document.createElement('div');
    $('page').appendChild(box);
    drawInto(box);
    return;
  }

  draw();
})();

function draw() { drawInto($('page')); }

function drawInto(target) {
  const t = TEACHER;
  let h = '';

  // Đầu trang
  h += '<div class="tt-head">' +
         (t.photo ? '<img class="tt-photo" src="' + esc(t.photo) + '" alt="' + esc(t.name) +
                    '" onerror="this.style.display=\'none\'">' : '') +
         '<div><h1>' + esc(t.name) + '</h1>' +
         '<p class="role">' + esc(t.role) + '</p></div>' +
       '</div>';

  if (t.facts && t.facts.length) {
    h += '<div class="facts">';
    for (const f of t.facts) {
      h += '<div class="fact"><b>' + esc(f.num) + '</b><span>' + esc(f.label) + '</span></div>';
    }
    h += '</div>';
  }

  // Giới thiệu
  if (t.bio && t.bio.length) {
    h += '<section class="tt-sec" style="border-top:none;padding-top:0"><h2>Đôi lời về mình</h2>';
    for (const p of t.bio) h += '<p>' + esc(p) + '</p>';
    h += '</section>';
  }

  // Cách dạy
  if (t.approach && t.approach.length) {
    h += '<section class="tt-sec"><h2>Cách mình dạy</h2>';
    for (const a of t.approach) {
      h += '<div class="how"><h3>' + esc(a.h) + '</h3><p>' + esc(a.p) + '</p></div>';
    }
    h += '</section>';
  }

  // Bằng cấp
  if (t.credentials && t.credentials.length) {
    h += '<section class="tt-sec"><h2>Bằng cấp và chứng chỉ</h2><ul class="creds">';
    for (const c of t.credentials) h += '<li>' + esc(c) + '</li>';
    h += '</ul></section>';
  }

  // Kết quả học viên
  if (t.results && t.results.length) {
    h += '<section class="tt-sec"><h2>Học viên đã đi tới đâu</h2>';
    for (const r of t.results) {
      h += '<div class="res">';
      if (r.from && r.to) {
        h += '<p class="jump">' + r.from + ' → <b>' + r.to + '</b>' +
             (r.months ? ' <span style="font-size:0.9rem;font-weight:500;color:#6C837E">trong ' +
                         r.months + ' tháng</span>' : '') + '</p>';
      }
      if (r.who)   h += '<span class="who">' + esc(r.who) + '</span>';
      if (r.quote) h += '<p class="quote">' + esc(r.quote) + '</p>';
      h += '</div>';
    }
    h += '</section>';
  }

  // Liên hệ
  const c = t.contact || {};
  h += '<section class="tt-sec"><h2>Muốn học cùng mình?</h2><div class="reach">';
  if (c.email)    h += '<a href="mailto:' + esc(c.email) + '">Gửi email</a>';
  if (c.zalo)     h += '<a href="https://zalo.me/' + esc(c.zalo) + '" target="_blank" rel="noopener">Nhắn Zalo</a>';
  if (c.facebook) h += '<a href="' + esc(c.facebook) + '" target="_blank" rel="noopener">Fanpage</a>';
  h += '</div>';

  if (c.form) {
    h += '<div id="form-box" style="margin-top:22px">' +
           '<div class="field"><label for="m-text">Hoặc để lại lời nhắn</label>' +
           '<textarea id="m-text" placeholder="Mình đang ở mức khoảng 400 và cần 650 trước tháng 6. Cô tư vấn giúp em lộ trình với ạ."></textarea></div>' +
           '<button class="btn btn-ink" id="btn-send">Gửi lời nhắn</button>' +
           '<div id="m-note" class="note hidden" style="margin-top:14px"></div>' +
         '</div>';
  }

  h += '</section>';

  target.innerHTML = h;

  if (c.form) $('btn-send').addEventListener('click', send);
}

async function send() {
  const text = document.getElementById('m-text').value.trim();
  const note = document.getElementById('m-note');
  const btn  = document.getElementById('btn-send');

  if (text.length < 10) {
    note.className = 'note note-bad';
    note.textContent = 'Bạn viết thêm vài chữ nữa nhé.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang gửi…';

  const { error } = await db.from('contact_messages').insert({
    user_id: me.id,
    message: text
  });

  btn.disabled = false;
  btn.textContent = 'Gửi lời nhắn';

  if (error) {
    note.className = 'note note-bad';
    note.textContent = 'Chưa gửi được: ' + error.message;
    return;
  }

  document.getElementById('m-text').value = '';
  note.className = 'note note-good';
  note.textContent = 'Đã gửi. Cô sẽ trả lời bạn sớm nhất có thể.';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
