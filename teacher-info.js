// ============================================================
// Pacedemy — THÔNG TIN GIÁO VIÊN (trang giới thiệu đầy đủ, about.html)
//
// Trước đây sửa trực tiếp file này. Giờ Ngân tự sửa trong
// Teacher Studio → "Trang giới thiệu" (teacher-about.html), lưu
// vào bảng site_settings, khoá "teacher_page" — không cần đụng
// code hay deploy lại nữa.
//
// TEACHER_DEFAULTS bên dưới chỉ dùng khi CHƯA lưu lần nào (hoặc
// mạng lỗi lúc tải) — giữ nguyên nội dung gốc để trang không bị
// trống trong lúc Ngân chưa vào chỉnh.
//
// Lưu ý: đây là trang giới thiệu ĐẦY ĐỦ (about.html). Khác với
// thẻ giới thiệu nhỏ trên trang chủ công khai (index.html), thẻ
// đó vẫn sửa ở "Chỉnh trang web" như cũ (khoá site_settings khác:
// "teacher_bio"), không đụng gì tới file này.
// ============================================================

const TEACHER_DEFAULTS = {

  show: false,

  name:  'Lê Ngọc Kim Ngân',
  role:  'Giáo viên TOEIC Listening & Reading',
  photo: 'images/ngan.jpg',

  facts: [
    { num: '10',      label: 'năm dạy TOEIC' },
    { num: 'Thạc sĩ', label: 'Ngôn ngữ Anh (đang học)' },
    { num: '100%',    label: 'giáo trình tự biên soạn' }
  ],

  short:
    'Mình là Ngân, mười năm dạy TOEIC cho người đi làm và sinh viên. ' +
    'Pacedemy là nơi mình đưa toàn bộ giáo trình tự soạn lên thành một lộ trình học có thể theo dõi được tiến độ.',

  bio: [
    'Mình bắt đầu dạy tiếng Anh từ năm 2016, và chọn đi sâu vào TOEIC Listening & Reading thay vì dạy dàn trải. Lý do đơn giản: phần lớn học viên tìm tới mình đều có một hạn cụ thể cần đạt, một con số cần đủ để tốt nghiệp hoặc để ứng tuyển. Dạy đúng một thứ và dạy kỹ thì hiệu quả hơn.',
    'Hiện mình vừa dạy tại trung tâm, vừa nhận lớp riêng dạy trực tuyến qua Zoom và Google Meet. Toàn bộ tài liệu, bài tập và đề luyện đều do mình tự biên soạn theo từng học viên, không dùng giáo trình có sẵn.',
    'Mình đang học Thạc sĩ Ngôn ngữ Anh tại Trường Đại học Công nghệ TP.HCM. Việc học lại từ đầu ở bậc sau đại học giúp mình lý giải được nhiều thứ trước đây chỉ dạy theo kinh nghiệm.'
  ],

  approach: [
    { h: 'Học theo nhịp của từng người',
      p: 'Không có lộ trình chung cho mọi học viên. Người đi làm mỗi tối được ba mươi phút sẽ có cách đi khác sinh viên rảnh cả buổi chiều.' },
    { h: 'Ôn lại đúng lúc sắp quên',
      p: 'Từ vựng trên Pacedemy quay lại theo khoảng cách giãn dần. Học viên không phải tự nhớ hôm nay nên ôn gì.' },
    { h: 'Sửa tận gốc, không học mẹo',
      p: 'Mẹo làm bài giúp thêm vài chục điểm rồi dừng. Hiểu được vì sao sai mới đưa được điểm lên mốc cao hơn.' }
  ],

  credentials: [
    'Đang học Thạc sĩ Ngôn ngữ Anh — Trường Đại học Công nghệ TP.HCM (HUTECH)'
  ],

  results: [],

  contact: {
    email:    'contact@pacedemy.com',
    zalo:     '',
    facebook: '',
    form:     true
  }
};

let TEACHER = null;

// Các trang khác (about.js, app.js) await TEACHER_READY trước khi
// đọc biến TEACHER, để chắc chắn đã tải xong dữ liệu từ database.
const TEACHER_READY = (async function () {
  try {
    const { data } = await db.from('site_settings').select('value').eq('key', 'teacher_page').single();
    const v = (data && data.value) || {};
    TEACHER = Object.assign({}, TEACHER_DEFAULTS, v);
    TEACHER.contact = Object.assign({}, TEACHER_DEFAULTS.contact, v.contact || {});
  } catch (e) {
    TEACHER = TEACHER_DEFAULTS;
  }
  return TEACHER;
})();
