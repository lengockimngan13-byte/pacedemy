// ============================================================
// Pacedemy — cánh cửa lớp
//
// Tài khoản chưa thuộc lớp nào thì không vào được các module học.
// Giáo viên đi thẳng.
//
// Trừ mấy trang để MỞ cho bản miễn phí. Trang mở là trang mà người
// chưa vào lớp vẫn học được, và phần nào tốn tiền trong đó đã bị chặn
// sẵn ở máy chủ (ai_xin_luot trả -3), nên mở ra không sinh chi phí.
//
// Mặc định chỉ mở trang luyện nói, vì đó là trang duy nhất hiện có bản
// miễn phí chạy hẳn trong trình duyệt. Muốn mở thêm trang nào thì tích
// ở Teacher Studio → Chi phí AI, đừng sửa danh sách này — nội dung cô
// soạn mở ra là người ngoài lớp đọc được hết.
// ============================================================

(function () {
  const MO_MAC_DINH = ['noi.html'];

  const trang = (location.pathname.split('/').pop() || 'index.html')
    .toLowerCase().replace(/\.html$/, '') + '.html';

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
      if (error || !Array.isArray(mem) || mem.length > 0) return;

      if (await trangMo()) return;

      location.replace('app.html?can-lop=1');
    } catch (e) {
      // Mạng lỗi thì để trang chạy bình thường, không khoá oan học viên.
    }
  })();

  async function trangMo() {
    let ds = MO_MAC_DINH;
    try {
      const { data } = await db.from('site_settings')
        .select('value').eq('key', 'trang_mo').maybeSingle();
      if (data && Array.isArray(data.value)) ds = data.value;
    } catch (e) { /* đọc không được thì dùng mặc định */ }

    return ds.some(function (x) {
      return String(x).toLowerCase().replace(/\.html$/, '') + '.html' === trang;
    });
  }
})();
