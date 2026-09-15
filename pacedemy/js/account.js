// ============================================================
// Pacedemy — trang tài khoản
// ============================================================

let me = null;
let profile = null;

const $ = function (id) { return document.getElementById(id); };

// ---------- Thông báo ----------

function say(msg, kind) {
  toast(msg, kind === 'good' ? 'good' : 'bad');
  const n = $('note');
  n.textContent = msg;
  n.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
  n.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearNote() { $('note').className = 'note hidden'; }

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const emailEl = $('acc-email');
  if (emailEl) emailEl.textContent = me.email;

  const { data } = await db
    .from('profiles')
    .select('full_name, avatar_url, target_score, goal_note, role')
    .eq('id', me.id)
    .single();

  profile = data || {};

  $('p-name').value = profile.full_name || '';

  // Mục tiêu điểm và mục tiêu học chỉ dành cho học viên, giáo viên không cần.
  if (profile.role === 'teacher') {
    const goalCard = $('goal-fields');
    if (goalCard) goalCard.classList.add('hidden');
  } else {
    $('p-goal').value = profile.goal_note || '';
    if (profile.target_score) $('p-target').value = String(profile.target_score);
  }

  drawAvatar();
})();

// ---------- Ảnh đại diện ----------

function drawAvatar() {
  const img = $('ava-img');
  const ini = $('ava-ini');

  if (profile.avatar_url) {
    img.src = profile.avatar_url;
    img.classList.remove('hidden');
    ini.classList.add('hidden');
    $('btn-rm-ava').classList.remove('hidden');
  } else {
    img.classList.add('hidden');
    ini.classList.remove('hidden');
    const n = (profile.full_name || 'U').trim().split(/\s+/);
    ini.textContent = n[n.length - 1].charAt(0).toUpperCase();
    $('btn-rm-ava').classList.add('hidden');
  }
}

$('btn-pick').addEventListener('click', function () { $('file-ava').click(); });

$('file-ava').addEventListener('change', async function () {
  const file = this.files && this.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) return say('Bạn chọn một file ảnh nhé.');
  if (file.size > 5 * 1024 * 1024) return say('Ảnh lớn quá, bạn chọn ảnh dưới 5MB.');

  clearNote();
  $('btn-pick').disabled = true;
  $('btn-pick').textContent = 'Đang tải lên…';

  try {
    const blob = await shrink(file, 320);
    const path = me.id + '/avatar.jpg';

    const up = await db.storage.from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (up.error) throw up.error;

    const { data: pub } = db.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl + '?v=' + Date.now();

    const res = await db.from('profiles').update({ avatar_url: url }).eq('id', me.id);
    if (res.error) throw res.error;

    profile.avatar_url = url;
    drawAvatar();
    say('Đã cập nhật ảnh đại diện.', 'good');
  } catch (e) {
    say('Không tải được ảnh lên: ' + (e.message || 'lỗi không rõ'));
  }

  $('btn-pick').disabled = false;
  $('btn-pick').textContent = 'Chọn ảnh';
  this.value = '';
});

// Thu nhỏ ảnh ngay trên máy học viên cho nhẹ kho lưu trữ
function shrink(file, size) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, size, size);

      c.toBlob(function (b) {
        b ? resolve(b) : reject(new Error('Không xử lý được ảnh'));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = function () { reject(new Error('Không đọc được file ảnh')); };
    img.src = URL.createObjectURL(file);
  });
}

$('btn-rm-ava').addEventListener('click', async function () {
  if (!confirm('Xoá ảnh đại diện hiện tại?')) return;

  await db.storage.from('avatars').remove([me.id + '/avatar.jpg']);
  await db.from('profiles').update({ avatar_url: null }).eq('id', me.id);

  profile.avatar_url = null;
  drawAvatar();
  say('Đã xoá ảnh đại diện.', 'good');
});

// ---------- Lưu thông tin ----------

$('btn-save').addEventListener('click', async function () {
  const name = $('p-name').value.trim();
  if (!name) return say('Bạn nhập họ tên nhé.');

  clearNote();
  this.disabled = true;
  this.textContent = 'Đang lưu…';

  const patch = { full_name: name };

  if (profile.role !== 'teacher') {
    patch.target_score = parseInt($('p-target').value, 10);
    patch.goal_note = $('p-goal').value.trim() || null;
  }

  const res = await db.from('profiles').update(patch).eq('id', me.id);

  this.disabled = false;
  this.textContent = 'Lưu thay đổi';

  if (res.error) return say('Không lưu được: ' + res.error.message);

  profile.full_name = name;
  drawAvatar();
  say('Đã lưu thông tin.', 'good');
});

// ---------- Đổi mật khẩu ----------

$('btn-pass').addEventListener('click', async function () {
  const p1 = $('p-pass1').value;
  const p2 = $('p-pass2').value;

  if (p1.length < 6) return say('Mật khẩu cần ít nhất 6 ký tự.');
  if (p1 !== p2)     return say('Hai lần nhập mật khẩu chưa khớp nhau.');

  clearNote();
  this.disabled = true;
  this.textContent = 'Đang đổi…';

  const { error } = await db.auth.updateUser({ password: p1 });

  this.disabled = false;
  this.textContent = 'Đổi mật khẩu';

  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('should be at least')) return say('Mật khẩu cần ít nhất 6 ký tự.');
    if (m.includes('different from'))     return say('Mật khẩu mới phải khác mật khẩu cũ.');
    return say('Không đổi được mật khẩu: ' + error.message);
  }

  $('p-pass1').value = '';
  $('p-pass2').value = '';
  say('Đã đổi mật khẩu. Lần sau bạn đăng nhập bằng mật khẩu mới nhé.', 'good');
});

// ---------- Xoá tài khoản ----------

$('btn-del').addEventListener('click', async function () {
  const typed = $('p-confirm').value.trim().toUpperCase();

  if (typed !== 'XOA TAI KHOAN') {
    return say('Bạn gõ đúng chữ XOA TAI KHOAN vào ô phía trên để xác nhận nhé.');
  }

  if (!confirm('Thao tác này không khôi phục được. Xoá hẳn tài khoản?')) return;

  this.disabled = true;
  this.textContent = 'Đang xoá…';

  const { error } = await db.rpc('delete_my_account');

  if (error) {
    this.disabled = false;
    this.textContent = 'Xoá tài khoản của tôi';
    return say('Không xoá được: ' + error.message);
  }

  await db.auth.signOut();
  alert('Tài khoản đã được xoá. Cảm ơn bạn đã học cùng Pacedemy.');
  window.location.replace('index.html');
});


function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
