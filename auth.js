// ============================================================
// Pacedemy — đăng nhập / đăng ký
// ============================================================

const viewLogin  = document.getElementById('view-login');
const viewSignup = document.getElementById('view-signup');
const note       = document.getElementById('note');

// ---------- Thông báo ----------

function say(message, kind) {
  toast(message, kind === 'good' ? 'good' : 'bad');
  note.textContent = message;
  note.className = 'note ' + (kind === 'good' ? 'note-good' : 'note-bad');
}

function clearNote() {
  note.className = 'note hidden';
  note.textContent = '';
}

// Đổi thông báo lỗi tiếng Anh của Supabase sang tiếng Việt
function readable(error) {
  const raw = (error && error.message ? error.message : '').toLowerCase();

  if (raw.includes('invalid login credentials'))
    return 'Email hoặc mật khẩu chưa đúng. Bạn thử nhập lại nhé.';
  if (raw.includes('already registered') || raw.includes('already been registered'))
    return 'Email này đã có tài khoản. Bạn chuyển sang mục đăng nhập nhé.';
  if (raw.includes('password should be at least'))
    return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (raw.includes('unable to validate email') || raw.includes('invalid email'))
    return 'Địa chỉ email chưa hợp lệ.';
  if (raw.includes('email not confirmed'))
    return 'Tài khoản chưa xác nhận email. Bạn báo lại giáo viên để được mở nhé.';
  if (raw.includes('rate limit') || raw.includes('too many'))
    return 'Bạn thao tác hơi nhanh. Chờ khoảng một phút rồi thử lại.';
  if (raw.includes('failed to fetch') || raw.includes('network'))
    return 'Không kết nối được máy chủ. Kiểm tra lại mạng rồi thử lại.';

  return 'Có lỗi xảy ra: ' + (error && error.message ? error.message : 'không rõ nguyên nhân');
}

// ---------- Chuyển qua lại hai màn ----------

function showSignup() {
  clearNote();
  viewLogin.classList.add('hidden');
  viewSignup.classList.remove('hidden');
  document.title = 'Tạo tài khoản — Pacedemy';
}

function showLogin() {
  clearNote();
  viewSignup.classList.add('hidden');
  viewLogin.classList.remove('hidden');
  document.title = 'Đăng nhập — Pacedemy';
}

document.getElementById('to-signup').addEventListener('click', showSignup);
document.getElementById('to-login').addEventListener('click', showLogin);

// Vào thẳng màn đăng ký khi bấm nút từ trang chủ
if (new URLSearchParams(window.location.search).has('dangky')) showSignup();

// ---------- Đăng nhập ----------

const btnLogin = document.getElementById('btn-login');

async function login() {
  const email = document.getElementById('li-email').value.trim();
  const pass  = document.getElementById('li-pass').value;

  if (!email || !pass) return say('Bạn nhập đủ email và mật khẩu nhé.');

  btnLogin.disabled = true;
  btnLogin.textContent = 'Đang đăng nhập…';
  clearNote();

  const { error } = await db.auth.signInWithPassword({ email: email, password: pass });

  if (error) {
    say(readable(error));
    btnLogin.disabled = false;
    btnLogin.textContent = 'Đăng nhập';
    return;
  }

  window.location.replace('app.html');
}

btnLogin.addEventListener('click', login);

// ---------- Đăng ký ----------

const btnSignup = document.getElementById('btn-signup');

async function signup() {
  const name   = document.getElementById('su-name').value.trim();
  const email  = document.getElementById('su-email').value.trim();
  const pass   = document.getElementById('su-pass').value;
  const target = parseInt(document.getElementById('su-target').value, 10);

  if (!name)          return say('Bạn cho biết họ tên để hiển thị trên bảng xếp hạng nhé.');
  if (!email)         return say('Bạn nhập email nhé.');
  if (pass.length < 6) return say('Mật khẩu cần ít nhất 6 ký tự.');

  btnSignup.disabled = true;
  btnSignup.textContent = 'Đang tạo tài khoản…';
  clearNote();

  const { data, error } = await db.auth.signUp({
    email: email,
    password: pass,
    options: { data: { full_name: name } }
  });

  if (error) {
    say(readable(error));
    btnSignup.disabled = false;
    btnSignup.textContent = 'Tạo tài khoản';
    return;
  }

  // Chưa có phiên đăng nhập nghĩa là dự án vẫn bật xác nhận email
  if (!data.session) {
    say('Tài khoản đã tạo. Bạn mở email để xác nhận rồi quay lại đăng nhập nhé.', 'good');
    btnSignup.disabled = false;
    btnSignup.textContent = 'Tạo tài khoản';
    return;
  }

  // Lưu mục tiêu điểm vào hồ sơ
  await db.from('profiles').update({ target_score: target }).eq('id', data.user.id);

  window.location.replace('app.html');
}

btnSignup.addEventListener('click', signup);

// ---------- Phím Enter ----------

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  if (!viewSignup.classList.contains('hidden')) signup();
  else login();
});

// ---------- Đã đăng nhập rồi thì vào thẳng ----------

db.auth.getSession().then(function (res) {
  if (res.data.session) window.location.replace('app.html');
});

// ---------- Đăng nhập / đăng ký bằng Google ----------

async function withGoogle() {
  clearNote();
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + '/app.html' }
  });
  if (error) say('Không mở được cửa sổ Google: ' + error.message);
}

const btnGoogleLogin = document.getElementById('btn-google-login');
if (btnGoogleLogin) btnGoogleLogin.addEventListener('click', withGoogle);

const btnGoogleSignup = document.getElementById('btn-google-signup');
if (btnGoogleSignup) btnGoogleSignup.addEventListener('click', withGoogle);
