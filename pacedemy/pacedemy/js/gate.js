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

    const { data: mem } = await db
      .from('class_members').select('class_id')
      .eq('student_id', user.id).eq('status', 'active').limit(1);

    if (!mem || !mem.length) {
      location.replace('app.html?can-lop=1');
    }
  } catch (e) {
    // Mạng lỗi thì để trang chạy bình thường, không khoá oan học viên.
  }
})();
