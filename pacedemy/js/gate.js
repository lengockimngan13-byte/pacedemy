// ============================================================
// Pacedemy — cánh cửa lớp
// Tài khoản chưa thuộc lớp nào, hoặc đang chờ duyệt, thì không
// vào được các module học. Giáo viên đi thẳng.
// ============================================================

(async function () {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { location.replace('login.html'); return; }

    const { data: prof } = await db
      .from('profiles').select('role').eq('id', user.id).single();

    if (prof && prof.role === 'teacher') return;

    const { data: mem, error } = await db
      .from('class_members').select('class_id')
      .eq('student_id', user.id).eq('status', 'active').limit(1);

    // Chỉ chặn khi chắc chắn học viên không có lớp nào.
    // Truy vấn lỗi thì để trang chạy tiếp, không đá người dùng ra.
    if (!error && Array.isArray(mem) && mem.length === 0) {
      location.replace('app.html?can-lop=1');
    }
  } catch (e) {
    // Mạng lỗi thì để trang chạy bình thường, không khoá oan học viên.
  }
})();
