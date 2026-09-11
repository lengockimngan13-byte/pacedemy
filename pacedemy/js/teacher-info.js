// ============================================================
// Pacedemy — THÔNG TIN GIÁO VIÊN
//
// Ngân sửa trực tiếp file này trên GitHub, không cần đụng code.
// Chỗ nào ghi SUA_LAI thì thay bằng nội dung thật.
// Mục nào để chuỗi rỗng '' thì phần đó tự ẩn trên trang.
// ============================================================

const TEACHER = {

  // ---------- Phần đầu trang ----------
  name:  'Lê Ngọc Kim Ngân',
  role:  'Giáo viên TOEIC Listening & Reading',
  photo: 'images/ngan.jpg',        // tải ảnh chân dung lên thư mục images

  // Ba con số hiện nổi bật ở đầu trang
  facts: [
    { num: '10',    label: 'năm dạy TOEIC' },
    { num: 'Thạc sĩ', label: 'Ngôn ngữ Anh (đang học)' },
    { num: '100%',  label: 'giáo trình tự biên soạn' }
  ],

  // ---------- Giới thiệu ngắn, dùng cho trang chủ công khai ----------
  short:
    'Mình là Ngân, mười năm dạy TOEIC cho người đi làm và sinh viên. ' +
    'Pacedemy là nơi mình đưa toàn bộ giáo trình tự soạn lên thành một lộ trình học có thể theo dõi được tiến độ.',

  // ---------- Giới thiệu đầy đủ, dùng cho trang bên trong ----------
  bio: [
    'Mình bắt đầu dạy tiếng Anh từ năm 2016, và chọn đi sâu vào TOEIC Listening & Reading thay vì dạy dàn trải. Lý do đơn giản: phần lớn học viên tìm tới mình đều có một hạn cụ thể cần đạt, một con số cần đủ để tốt nghiệp hoặc để ứng tuyển. Dạy đúng một thứ và dạy kỹ thì hiệu quả hơn.',

    'Hiện mình vừa dạy tại trung tâm, vừa nhận lớp riêng dạy trực tuyến qua Zoom và Google Meet. Toàn bộ tài liệu, bài tập và đề luyện đều do mình tự biên soạn theo từng học viên, không dùng giáo trình có sẵn.',

    'Mình đang học Thạc sĩ Ngôn ngữ Anh tại Trường Đại học Công nghệ TP.HCM. Việc học lại từ đầu ở bậc sau đại học giúp mình lý giải được nhiều thứ trước đây chỉ dạy theo kinh nghiệm.'
    // SUA_LAI: thêm hoặc bớt đoạn tuỳ ý
  ],

  // ---------- Cách dạy ----------
  approach: [
    { h: 'Học theo nhịp của từng người',
      p: 'Không có lộ trình chung cho mọi học viên. Người đi làm mỗi tối được ba mươi phút sẽ có cách đi khác sinh viên rảnh cả buổi chiều.' },
    { h: 'Ôn lại đúng lúc sắp quên',
      p: 'Từ vựng trên Pacedemy quay lại theo khoảng cách giãn dần. Học viên không phải tự nhớ hôm nay nên ôn gì.' },
    { h: 'Sửa tận gốc, không học mẹo',
      p: 'Mẹo làm bài giúp thêm vài chục điểm rồi dừng. Hiểu được vì sao sai mới đưa được điểm lên mốc cao hơn.' }
    // SUA_LAI: đổi lại cho đúng cách Ngân hay nói với học viên
  ],

  // ---------- Bằng cấp, chứng chỉ ----------
  credentials: [
    'Đang học Thạc sĩ Ngôn ngữ Anh — Trường Đại học Công nghệ TP.HCM (HUTECH)'
    // SUA_LAI: thêm bằng cử nhân, chứng chỉ TOEIC, TESOL, IELTS... của Ngân
  ],

  // ---------- Kết quả học viên ----------
  // Bỏ trống mảng này thì cả mục tự ẩn.
  results: [
    // SUA_LAI: điền dần khi Ngân hệ thống lại được số liệu
    // { from: 450, to: 700, months: 3, who: 'Bạn P., sinh viên năm cuối',
    //   quote: 'Trước đây em học từ vựng xong quên hết. Ôn theo lịch của cô thì nhớ được.' },
  ],

  // ---------- Liên hệ ----------
  contact: {
    email:    'contact@pacedemy.com',
    zalo:     '',   // SUA_LAI: số Zalo, ví dụ '0901234567'
    facebook: '',   // SUA_LAI: link Fanpage đầy đủ, ví dụ 'https://facebook.com/pacedemy'
    form:     true  // true để hiện form liên hệ ngay trên trang
  }
};
