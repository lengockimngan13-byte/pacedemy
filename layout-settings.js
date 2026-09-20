// ============================================================
// Pacedemy — bố cục trang, chỉnh được trong Teacher Studio →
// "Chỉnh trang web", áp dụng cho toàn bộ trang học viên/giáo viên.
//
// Đọc site_settings khoá "layout": { page_width, section_gap }.
// - page_width: đổi thẳng biến --wrap có sẵn (bề rộng nội dung).
// - section_gap: CỘNG THÊM khoảng cách giữa các khối lớn trên
//   từng trang, không xoá hay viết đè margin đang có — để không
//   phá bố cục sẵn có của từng trang riêng lẻ.
//
// Không có dòng cài đặt nào thì giữ nguyên mặc định, trang hiện
// y như trước giờ.
// ============================================================

(async function () {
  try {
    const { data } = await db.from('site_settings').select('value').eq('key', 'layout').single();
    const v = (data && data.value) || {};

    if (v.page_width) {
      document.documentElement.style.setProperty('--wrap', v.page_width + 'px');
    }
    if (v.section_gap) {
      document.documentElement.style.setProperty('--section-gap', v.section_gap + 'px');
    }
  } catch (e) {
    // Chưa lưu cài đặt lần nào, hoặc mạng lỗi — giữ nguyên bố cục mặc định.
  }
})();
