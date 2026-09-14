// ============================================================
// Pacedemy — "Bốc quẻ ôn gì hôm nay": chọn ngẫu nhiên một module
// để gợi ý học viên, kèm lời phán vui kiểu thầy bói. Bốc lại
// bao nhiêu lần cũng được, không giới hạn.
//
// Ngân muốn thêm module mới hoặc đổi lời phán: sửa mảng SLIPS
// bên dưới, mỗi phần tử là 1 module với danh sách lines (chọn
// ngẫu nhiên 1 dòng mỗi lần bốc trúng module đó).
// ============================================================

const SLIPS = [
  {
    module: 'Từ vựng theo chủ đề',
    href: 'vocab.html',
    cta: 'Đi học từ ngay →',
    lines: [
      'Quẻ này bảo: còn cả rổ từ chưa thuộc đang đợi. Học đi rồi tính tiếp.',
      'Hôm nay hợp mệnh Từ Vựng. Lật vài thẻ, biết đâu trúng đúng từ hay quên.',
      'Trời không phụ người chăm học từ. Trời chỉ phụ người bấm bốc quẻ rồi tắt app.',
    ],
  },
  {
    module: 'Luyện nghe — Part 1 đến 4',
    href: 'listen.html',
    cta: 'Đi luyện nghe →',
    lines: [
      'Quẻ Thính Giác linh ứng: tai đang rảnh, mở vài câu nghe cho quen giọng đọc.',
      'Hôm nay nên luyện nghe. Không phải vì quẻ hên, mà vì Part 1-4 dễ ăn điểm nhất.',
      'Duyên số run rủi bạn đến Part nghe hôm nay. Đừng cãi số.',
    ],
  },
  {
    module: 'Luyện đọc — Part 5, 6, 7',
    href: 'part5.html',
    cta: 'Đi luyện đọc →',
    lines: [
      'Quẻ này hơi khó nhằn, giống Part 7. Nhưng né hoài thì càng khó hơn.',
      'Hôm nay vía hợp ngữ pháp. Làm vài câu Part 5, sai cũng có giải thích ngay.',
      'Con đường ngắn nhất tới điểm cao đi qua Part 6. Không có đường tắt khác đâu.',
    ],
  },
  {
    module: 'Thi thử có bấm giờ',
    href: 'fulltest.html',
    cta: 'Vào thi thử →',
    lines: [
      'Quẻ Đại Cát: hôm nay hợp thi thử. Xem thử phong độ tới đâu rồi.',
      'Lâu rồi chưa bấm giờ làm bài. Quẻ này nhắc khéo đó.',
      'Không thi thử thì sao biết mình đang đứng ở đâu so với mục tiêu.',
    ],
  },
];

// Quẻ hiếm: thỉnh thoảng phán "nghỉ", tỉ lệ thấp cho vui, không có
// nút đi đâu cả — chỉ để bốc lại.
const REST_SLIP = {
  lines: [
    'Quẻ Hạ Hạ: hôm nay vía xui, học vào chữ cũng không vô. Nghỉ sớm, mai học bù.',
    'Thầy bói phán: hôm nay tay bốc quẻ, không phải tay học bài. Thôi nghỉ đi.',
  ],
};

const REST_CHANCE = 1 / 12; // khoảng 1 trong 12 lần bốc

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function drawSlip() {
  const body = document.getElementById('oracle-body');
  if (!body) return;

  const isRest = Math.random() < REST_CHANCE;
  let html;

  if (isRest) {
    html =
      '<div class="oracle-result">' +
        '<p class="oracle-title">😴 Nghỉ ngơi</p>' +
        '<p class="oracle-text">' + pick(REST_SLIP.lines) + '</p>' +
        '<div class="oracle-actions">' +
          '<button class="btn btn-line" id="btn-oracle-again">Bốc lại</button>' +
        '</div>' +
      '</div>';
  } else {
    const slip = pick(SLIPS);
    html =
      '<div class="oracle-result">' +
        '<p class="oracle-title">📿 ' + slip.module + '</p>' +
        '<p class="oracle-text">' + pick(slip.lines) + '</p>' +
        '<div class="oracle-actions">' +
          '<a class="btn btn-gold" href="' + slip.href + '">' + slip.cta + '</a>' +
          '<button class="btn btn-line" id="btn-oracle-again">Bốc lại</button>' +
        '</div>' +
      '</div>';
  }

  body.innerHTML = html;
  const again = document.getElementById('btn-oracle-again');
  if (again) again.addEventListener('click', drawSlip);
}

(function () {
  const btn = document.getElementById('btn-oracle');
  if (btn) btn.addEventListener('click', drawSlip);
})();
