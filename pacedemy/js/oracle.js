// ============================================================
// Pacedemy — "Bốc quẻ ôn gì hôm nay": nhấn giữ vào hũ, kéo lên
// xuống để lắc. Lắc đủ thì một que xăm rớt ra, quẻ tự mở, kèm
// tiếng lắc lóc cóc và tiếng lấp lánh lúc mở quẻ (tự tạo bằng
// Web Audio, không cần file âm thanh nào).
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
    module: 'Luyện nghe — Part 1',
    href: 'listen.html?tab=1',
    cta: 'Đi luyện Part 1 →',
    lines: [
      'Part 1 chỉ có 6 câu nhưng là phần dễ ăn điểm nhất cả bài thi. Sai câu nào ở đây là phí câu đó.',
      'Quẻ nhắc khéo: mô tả tranh mà còn sai là do chủ quan, không phải do khó.',
      'Ai cũng nói Part 1 dễ. Vậy mà vẫn có người mất điểm ở đây. Đừng để là bạn.',
    ],
  },
  {
    module: 'Luyện nghe — Part 2',
    href: 'listen.html?tab=2',
    cta: 'Đi luyện Part 2 →',
    lines: [
      'Part 2 nhiều câu nhất trong phần Nghe, 25 câu liền không có tranh không có chữ để bấu víu.',
      'Chỉ nghe câu hỏi rồi chọn câu trả lời hợp lý — sai một nhịp là mất cả câu, quẻ này luyện đúng phản xạ đó.',
      'Không quen kiểu hỏi-đáp gián tiếp thì Part 2 dễ mất điểm oan nhất. Luyện cho quen tai.',
    ],
  },
  {
    module: 'Luyện nghe — Part 3',
    href: 'listen.html?tab=3',
    cta: 'Đi luyện Part 3 →',
    lines: [
      'Part 3 là đoạn hội thoại, mỗi bài 3 câu hỏi liền — bỏ lỡ một câu là dễ rối cả chùm.',
      'Nhiều bài Part 3 giờ có thêm hình hay biểu đồ, đọc trước câu hỏi sẽ đỡ hơn nhiều. Quẻ này nhắc luyện đúng chỗ đó.',
      'Nghe hiểu một đoạn hội thoại tự nhiên khó hơn nghe một câu đơn. Luyện Part 3 là luyện đúng thứ tiếng Anh đời thường.',
    ],
  },
  {
    module: 'Luyện nghe — Part 4',
    href: 'listen.html?tab=4',
    cta: 'Đi luyện Part 4 →',
    lines: [
      'Part 4 là bài nói dài một người, thường là thông báo hay lời nhắn — quen giọng đọc nhanh là ăn điểm.',
      'Cùng dạng ba-câu-một-bài như Part 3, nhưng không có người đối thoại để bắt nhịp. Luyện riêng cho quen.',
      'Quẻ này rơi trúng Part 4: đúng lúc cần luyện nghe văn bản dài, không có ai ngắt lời giúp bạn cả.',
    ],
  },
  {
    module: 'Luyện đọc — Part 5',
    href: 'part5.html?tab=5',
    cta: 'Đi luyện Part 5 →',
    lines: [
      'Part 5 là 30 câu ăn điểm nhanh nhất bài Đọc, nếu nắm chắc ngữ pháp thì tốn ít thời gian nhất.',
      'Làm chậm Part 5 là hụt giờ cho Part 7 phía sau. Luyện nhanh và chắc ở đây trước.',
      'Ngữ pháp không vững thì Part 5 sai lai rai suốt bài. Quẻ này nhắc quay lại củng cố gốc.',
    ],
  },
  {
    module: 'Luyện đọc — Part 6',
    href: 'part5.html?tab=6',
    cta: 'Đi luyện Part 6 →',
    lines: [
      'Part 6 không chỉ hỏi ngữ pháp một câu, mà hỏi cả mạch văn quanh chỗ trống. Đọc cả đoạn mới chọn đúng.',
      'Nhiều người làm Part 6 như Part 5, chọn nhanh rồi sai — vì có câu phải hiểu ý cả đoạn mới chọn được.',
      'Quẻ Trung Bình: Part 6 không khó bằng Part 7 nhưng dễ bị đánh giá thấp. Luyện kỹ để khỏi mất điểm lãng xẹt.',
    ],
  },
  {
    module: 'Luyện đọc — Part 7',
    href: 'part5.html?tab=7',
    cta: 'Đi luyện Part 7 →',
    lines: [
      'Part 7 chiếm nhiều câu nhất cả bài thi. Điểm Đọc cao hay thấp phần lớn quyết định ở đây.',
      'Quẻ này khó nhằn, giống chính Part 7 vậy. Nhưng né hoài thì càng khó hơn.',
      'Quản lý thời gian ở Part 7 là kỹ năng riêng, không tự có được — phải luyện mới quen.',
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
  {
    module: 'Động lực cá nhân',
    personal: true,
    href: null,
    cta: null,
    // 18 câu chung, không cần dữ liệu riêng — luôn dùng được
    lines: [
      'Điểm số không tự nhiên tăng. Nó tăng vì có người ngồi xuống làm thêm một đề mỗi ngày.',
      'Hôm nay chưa chắc là ngày giỏi nhất, nhưng chắc chắn là ngày sớm nhất để bắt đầu.',
      '999 câu đã làm không quan trọng bằng câu tiếp theo bạn sắp làm.',
      'So với hôm qua của chính mình, đừng so với ai khác.',
      'Mỗi câu sai hôm nay là một câu ít sai hơn lúc đi thi thật.',
      'Không ai giỏi tiếng Anh sau một đêm. Nhưng có người giỏi hơn sau một tháng kiên trì.',
      'Bạn không cần hoàn hảo, chỉ cần đều đặn.',
      'Ngày thi thật không đợi bạn sẵn sàng. Nó chỉ đến đúng hẹn.',
      '10 phút hôm nay cộng dồn lại thành một kỳ thi tốt hơn.',
      'Việc khó không làm hôm nay thì mai vẫn khó y vậy, chỉ có ít thời gian hơn để luyện.',
      'Quẻ này không đoán tương lai, chỉ nhắc bạn tương lai đang được quyết định ngay lúc này.',
      'Sự tiến bộ đôi khi im lặng. Không thấy điểm tăng không có nghĩa là không có gì thay đổi.',
      'Mục tiêu càng xa, càng cần bắt đầu càng sớm.',
      'Không có quẻ nào thay bạn học được. Chỉ có bạn.',
      'Cứ làm đủ số câu hôm nay, điểm số sẽ tự lo phần còn lại.',
      'Ai cũng có ngày lười. Quan trọng là ngày lười có kéo dài thành tuần lười không.',
      'Ôn từ vựng hôm nay, đỡ phải đoán mò lúc đi thi.',
      'Ngày thi TOEIC không hỏi bạn đã cố gắng bao nhiêu, chỉ hỏi bạn làm đúng bao nhiêu câu.',
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

// ---------- Dữ liệu thật của học viên, cho quẻ "Động lực cá nhân" ----------
// Chỉ gọi khi quẻ này thật sự được bốc trúng, không tốn truy vấn oan uổng
// mỗi lần bốc quẻ khác.

async function fetchOracleContext() {
  const ctx = { target: null, estimate: null, doneToday: 0, goal: 20, streak: 0 };
  if (typeof db === 'undefined' || typeof me === 'undefined' || !me) return ctx;

  try {
    const { data: prof } = await db
      .from('profiles').select('target_score, daily_goal, streak_days').eq('id', me.id).single();

    if (prof) {
      ctx.target = prof.target_score || null;
      ctx.goal = prof.daily_goal || 20;
      ctx.streak = prof.streak_days || 0;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: atts } = await db
      .from('attempts').select('total_questions')
      .eq('user_id', me.id).not('submitted_at', 'is', null)
      .gte('submitted_at', todayStart.toISOString());
    for (const a of (atts || [])) ctx.doneToday += a.total_questions || 0;

    const { data: mock } = await db
      .from('mock_tests')
      .select('listening_correct, reading_correct, payload')
      .eq('user_id', me.id).not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle();

    if (mock && mock.payload) {
      const [{ data: lScore }, { data: rScore }] = await Promise.all([
        db.rpc('toeic_estimate', { p_section: 'listening', p_correct: mock.listening_correct, p_total: mock.payload.listening_total }),
        db.rpc('toeic_estimate', { p_section: 'reading', p_correct: mock.reading_correct, p_total: mock.payload.reading_total })
      ]);
      if (lScore != null && rScore != null) ctx.estimate = lScore + rScore;
    }
  } catch (e) {
    // Không lấy được thì thôi, dùng câu chung là đủ.
  }

  return ctx;
}

// Ghép các dòng cá nhân hoá — chỉ đưa vào những dòng có đủ dữ liệu để
// điền, tránh hiện câu cụt hoặc số rỗng.
function personalLines(ctx) {
  const out = [];

  if (ctx.target && ctx.estimate != null) {
    const gap = ctx.target - ctx.estimate;
    if (gap > 0) {
      out.push('Bạn đang cách mục tiêu ' + ctx.target + ' điểm còn ' + gap +
        ' điểm, tính theo lần thi thử gần nhất. Làm thêm vài đề là rút ngắn khoảng cách đó.');
      out.push('Quẻ này tính thử rồi: còn ' + gap + ' điểm nữa là bạn chạm mục tiêu ' +
        ctx.target + '. Không xa như bạn nghĩ đâu.');
    } else {
      out.push('Điểm ước lượng gần nhất của bạn đã chạm mục tiêu ' + ctx.target +
        ' điểm rồi. Giờ là lúc giữ phong độ, đừng để tụt lại.');
    }
  } else if (ctx.target && ctx.estimate == null) {
    out.push('Bạn đặt mục tiêu ' + ctx.target +
      ' điểm rồi đó, nhưng chưa thi thử lần nào để biết mình đang ở đâu. Thi thử một lần đi.');
  } else if (!ctx.target) {
    out.push('Bạn chưa đặt mục tiêu điểm. Vào trang Tài khoản đặt một con số cụ thể, ' +
      'có đích mới nhắm đúng hướng được.');
  }

  if (ctx.doneToday < ctx.goal) {
    const left = ctx.goal - ctx.doneToday;
    out.push('Hôm nay bạn mới làm ' + ctx.doneToday + '/' + ctx.goal +
      ' câu. Còn ' + left + ' câu nữa là xong mục tiêu hôm nay.');
    out.push('Quẻ nhắc khéo: còn ' + left + ' câu nữa thôi là hôm nay coi như trọn vẹn.');
  } else {
    out.push('Hôm nay bạn đã xong mục tiêu ' + ctx.goal +
      ' câu rồi. Dư sức thì làm thêm, không thì nghỉ ngơi cũng xứng đáng.');
  }

  if (ctx.streak > 0) {
    out.push('Đang giữ chuỗi ' + ctx.streak + ' ngày liên tiếp. Đừng để hôm nay là ngày làm đứt chuỗi.');
    out.push('Chuỗi ' + ctx.streak + ' ngày không tự nhiên mà có. Giữ tiếp đi, sắp tới mốc rồi.');
  } else {
    out.push('Chưa có chuỗi ngày nào đang giữ. Học hôm nay là bắt đầu một chuỗi mới, ' +
      'ngày đầu luôn là ngày khó nhất.');
  }

  if (ctx.target && ctx.goal) {
    out.push('Mục tiêu ' + ctx.target + ' điểm không xa nếu mỗi ngày đều làm đủ ' +
      ctx.goal + ' câu như hôm nay đang làm.');
  }

  return out;
}

// ---------- Âm thanh tự tổng hợp (Web Audio, không cần file) ----------

let _oracleAudioCtx = null;

function oracleAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_oracleAudioCtx) _oracleAudioCtx = new AC();
  if (_oracleAudioCtx.state === 'suspended') _oracleAudioCtx.resume();
  return _oracleAudioCtx;
}

// Tiếng "cạch" ngắn mỗi lần đổi hướng khi lắc, như que chạm nhau trong hũ
function playRattle() {
  const c = oracleAudio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = 650 + Math.random() * 350;
  g.gain.setValueAtTime(0.13, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.08);
}

// Tiếng "lấp lánh" khi quẻ mở — vài nốt cao đi lên nhanh
function playSparkleSound() {
  const c = oracleAudio();
  if (!c) return;
  const notes = [880, 1108, 1318, 1760];
  notes.forEach(function (freq, i) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = c.currentTime + i * 0.07;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.11, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + 0.4);
  });
}

function playSparkleVisual() {
  const box = document.getElementById('oracle-sparkles');
  if (!box) return;
  box.classList.remove('burst');
  void box.offsetWidth; // ép trình duyệt tính lại để phát animation từ đầu
  box.classList.add('burst');
}

// ---------- Nội dung quẻ (không đổi so với trước) ----------

async function drawSlip() {
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
          '<button class="btn-sm" id="btn-oracle-again">Bốc lại</button>' +
        '</div>' +
      '</div>';
  } else {
    const slip = pick(SLIPS);

    if (slip.personal) {
      const ctx = await fetchOracleContext();
      const lines = slip.lines.concat(personalLines(ctx));
      html =
        '<div class="oracle-result">' +
          '<p class="oracle-title">🎯 ' + slip.module + '</p>' +
          '<p class="oracle-text">' + pick(lines) + '</p>' +
          '<div class="oracle-actions">' +
            '<button class="btn-sm" id="btn-oracle-again">Bốc lại</button>' +
          '</div>' +
        '</div>';
    } else {
      html =
        '<div class="oracle-result">' +
          '<p class="oracle-title">📿 ' + slip.module + '</p>' +
          '<p class="oracle-text">' + pick(slip.lines) + '</p>' +
          '<div class="oracle-actions">' +
            '<a class="btn btn-gold" href="' + slip.href + '">' + slip.cta + '</a>' +
            '<button class="btn-sm" id="btn-oracle-again">Bốc lại</button>' +
          '</div>' +
        '</div>';
    }
  }

  body.innerHTML = html;
  body.classList.remove('hidden');

  const again = document.getElementById('btn-oracle-again');
  if (again) again.addEventListener('click', resetJar);
}

// ---------- Hũ xăm: nhấn giữ, kéo lên xuống để lắc ----------

(function () {
  const wrap = document.getElementById('oracle-jar-wrap');
  if (!wrap) return;

  const REVERSALS_NEEDED = 5;  // đổi hướng đủ 5 lần thì rớt quẻ
  const MIN_STEP = 9;          // mỗi lần đổi hướng phải kéo ít nhất chừng này (px) mới tính

  let dragging = false;
  let lastY = 0;
  let dir = 0;
  let reversals = 0;

  function pointY(e) {
    return e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
  }

  function onDown(e) {
    if (wrap.classList.contains('drawn')) return; // đã rớt quẻ rồi, chờ bốc lại
    dragging = true;
    lastY = pointY(e);
    wrap.style.transition = 'none';
    oracleAudio(); // mở khoá âm thanh ngay trong cử chỉ chạm đầu tiên
  }

  function onMove(e) {
    if (!dragging) return;
    const y = pointY(e);
    const dy = y - lastY;
    if (Math.abs(dy) < 2) return;
    lastY = y;

    const wobble = Math.max(-16, Math.min(16, dy * 1.6));
    const shift = Math.max(-7, Math.min(7, dy * 0.6));
    wrap.style.transform = 'rotate(' + wobble + 'deg) translateY(' + shift + 'px)';

    const newDir = dy > 0 ? 1 : -1;
    if (newDir !== dir && Math.abs(dy) >= MIN_STEP) {
      reversals++;
      dir = newDir;
      playRattle();
    }

    if (reversals >= REVERSALS_NEEDED) {
      dragging = false;
      dropStick();
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    reversals = 0;
    dir = 0;
    wrap.style.transition = 'transform .3s ease';
    wrap.style.transform = '';
  }

  wrap.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  wrap.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);

  function dropStick() {
    reversals = 0;
    dir = 0;
    wrap.classList.add('drawn');
    wrap.style.transition = 'transform .2s ease';
    wrap.style.transform = '';
    document.getElementById('oracle-hint').textContent = 'Quẻ rớt rồi…';

    const stick = wrap.querySelector('.oracle-stick.lucky');
    if (stick) stick.classList.add('falling');

    setTimeout(function () {
      drawSlip();
      playSparkleSound();
      playSparkleVisual();
      document.getElementById('oracle-hint').textContent = 'Quẻ đã mở. Bấm "Bốc lại" muốn xin quẻ khác.';
    }, 650);
  }

  window.resetOracleJar = function () {
    wrap.classList.remove('drawn');
    const stick = wrap.querySelector('.oracle-stick.lucky');
    if (stick) stick.classList.remove('falling');
    const sparkles = document.getElementById('oracle-sparkles');
    if (sparkles) sparkles.classList.remove('burst');
    document.getElementById('oracle-hint').textContent =
      'Nhấn giữ vào hũ rồi kéo lên xuống để lắc, quẻ rớt ra là mở liền.';
  };
})();

function resetJar() {
  document.getElementById('oracle-body').classList.add('hidden');
  if (window.resetOracleJar) window.resetOracleJar();
}
