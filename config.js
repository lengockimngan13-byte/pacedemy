// ============================================================
// Pacedemy — cấu hình kết nối Supabase
//
// Lấy hai giá trị này trong Supabase Dashboard:
//   PROJECT_URL : Settings > Data API > Project URL
//   PUBLIC_KEY  : Settings > API Keys > khoá bắt đầu bằng sb_publishable_
//
// Chỉ dán khoá sb_publishable_ vào đây.
// Tuyệt đối không dán khoá sb_secret_ — khoá đó bỏ qua toàn bộ
// phân quyền và ai xem mã nguồn trang web cũng đọc được.
// ============================================================

const PROJECT_URL = 'https://sniokhczcetdpxackzjl.supabase.co';
const PUBLIC_KEY  = 'sb_publishable_uuarfSrlgA7YQ9pVInAvKg_WEz9cXZp';

const db = window.supabase.createClient(PROJECT_URL, PUBLIC_KEY);

// Chuyển hướng về trang đăng nhập nếu chưa có phiên đăng nhập.
async function requireLogin() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    window.location.replace('login.html');
    return null;
  }
  return data.session.user;
}
