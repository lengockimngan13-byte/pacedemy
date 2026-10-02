// ============================================================
// Pacedemy — Thỏ đập ô chữ
//
// Game đi cảnh nhỏ để luyện từ vựng Part 5. Câu hỏi lấy thẳng từ
// ngân hàng đề của cô, nhóm Từ vựng (và Từ loại nếu học viên chọn),
// nên đập ô chữ cũng là đang luyện đúng dạng đề thi thật.
//
// Cách chơi: bốn ô chữ treo trên cao, mỗi ô một đáp án. Chạy tới
// dưới ô mình chọn rồi nhảy lên đội vào đáy ô.
//
// Kết quả ghi vào attempts như mọi bài luyện Part 5 khác, nên vẫn
// tính vào mục tiêu mỗi ngày và thống kê của học viên.
// ============================================================

// ---------- Hằng số ----------

const SO_CAU = 10;        // số câu một lượt chơi
const TIM = 3;            // số trái tim
const XP_DUNG = 1;        // cho bằng các chế độ luyện khác cho công bằng

const VOCAB_TAGS = ['Giới từ', 'Từ nối', 'Chọn từ đúng nghĩa', 'Cụm từ cố định', 'Cụm động từ'];
const WORD_TAGS  = ['Chia từ loại', 'Danh từ', 'Tính từ', 'Trạng từ'];

// Vật lý — đơn vị là điểm ảnh một khung hình, nhịp chuẩn 60 khung/giây
const TRONG_LUC = 0.78;
const SUC_NHAY  = -16.4;
const TOC_CHAY  = 4.6;

const MAU = {
  troi1: '#DCEAE6', troi2: '#F2F7F5',
  doi:   '#CFE1DB',
  dat:   '#8A6A4A', co: '#4E9C6B',
  o:     '#F0A830', oVien: '#0C2422',
  oDung: '#2A7F76', oSai: '#B4432E', oTat: '#C9D8D3',
  tho:   '#0C2422', khan: '#F0A830',
  chu:   '#0C2422'
};

// ---------- Trạng thái ----------

let me = null;
let nhom = 'vocab';
let kho = [];           // toàn bộ câu lấy được
let hang = [];          // mười câu của lượt này
let qi = 0;
let tim = TIM;
let diem = 0;
let chuoi = 0;
let dung = 0;
let saiList = [];
let batDau = null;
let attemptId = null;
let cauBatDau = null;
let soDaLam = 0;

let pha = 'cho';        // 'cho' = chưa bắt đầu | 'choi' | 'ngung' = đang xem kết quả câu | 'het'
let dangChay = false;

const $ = function (id) { return document.getElementById(id); };

// ---------- Khung vẽ ----------

const cv = $('g-canvas');
const ctx = cv.getContext('2d');

let W = 760, H = 460;
let datY = 0;
let oList = [];         // [{x,y,w,h,key,text,trangThai,nhun}]

const tho = { x: 0, y: 0, vx: 0, vy: 0, w: 30, h: 38, duoiDat: true, huong: 1, buoc: 0 };
let xu = [];            // đồng xu bay lên khi đội trúng
let chu = [];           // chữ +điểm bay lên

function doKhung() {
  const rong = Math.max(300, Math.min(900, cv.parentElement.clientWidth));
  W = Math.round(rong);
  H = W < 460 ? 380 : 400;

  const tyLe = window.devicePixelRatio || 1;
  cv.width = Math.round(W * tyLe);
  cv.height = Math.round(H * tyLe);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  ctx.setTransform(tyLe, 0, 0, tyLe, 0, 0);

  datY = H - 46;
  tho.h = 38;
  tho.y = Math.min(tho.y || (datY - tho.h), datY - tho.h);
  if (!tho.x) tho.x = W / 2 - tho.w / 2;
  tho.x = Math.max(4, Math.min(W - tho.w - 4, tho.x));

  xepO();
}

// Bốn ô chữ xếp một hàng, luôn nhìn thấy hết, không phải cuộn ngang
function xepO() {
  const khe = W < 460 ? 6 : 10;
  const rongO = (W - khe * 5) / 4;
  const caoO = 58;

  // Đặt ô theo đúng tầm nhảy: thỏ bật lên cao được chừng này,
  // chừa thêm một quãng cho dễ canh chứ không sát nút.
  const tamNhay = (SUC_NHAY * SUC_NHAY) / (2 * TRONG_LUC);
  const yO = Math.max(16, datY - tho.h - tamNhay + 36 - caoO);

  oList.forEach(function (o, i) {
    o.x = khe + i * (rongO + khe);
    o.y = yO;
    o.w = rongO;
    o.h = caoO;
  });
}

// ---------- Nạp câu hỏi ----------

async function napKho() {
  const tags = nhom === 'all' ? VOCAB_TAGS.concat(WORD_TAGS) : VOCAB_TAGS;

  const { data } = await db
    .from('questions')
    .select('id, question_text, options, correct_answer, explanation, topic_tag, translation_vi, key_point')
    .eq('part', 5).eq('is_active', true).in('topic_tag', tags);

  kho = (data || []).filter(function (q) {
    return q.options && q.correct_answer && q.options[q.correct_answer];
  });

  $('g-dem').textContent = kho.length
    ? 'Có ' + kho.length + ' câu trong ngân hàng đề. Mỗi lượt chơi bốc ngẫu nhiên ' +
      Math.min(SO_CAU, kho.length) + ' câu.'
    : 'Chưa có câu nào ở dạng này.';

  $('g-start').disabled = !kho.length;
}

function tron(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

// ---------- Vào một lượt chơi ----------

function vaoChoi() {
  hang = tron(kho).slice(0, SO_CAU);
  qi = 0; tim = TIM; diem = 0; chuoi = 0; dung = 0;
  saiList = []; attemptId = null; soDaLam = 0;
  batDau = new Date();

  $('view-start').classList.add('hidden');
  $('view-done').classList.add('hidden');
  $('view-play').classList.remove('hidden');

  doKhung();
  rinhCau();

  if (!dangChay) { dangChay = true; requestAnimationFrame(vong); }
}

function rinhCau() {
  const q = hang[qi];
  pha = 'choi';
  cauBatDau = Date.now();
  $('g-giai').classList.add('hidden');

  // Câu hỏi để trên HTML cho dễ đọc và tự xuống dòng, không vẽ vào canvas
  $('g-cau').innerHTML = chenO(q.question_text);

  const keys = ['A', 'B', 'C', 'D'];
  oList = keys.map(function (k) {
    return { key: k, text: (q.options || {})[k] || '', trangThai: '', nhun: 0 };
  });
  xepO();

  tho.x = W / 2 - tho.w / 2;
  tho.y = datY - tho.h;
  tho.vx = 0; tho.vy = 0; tho.duoiDat = true;

  xu = []; chu = [];
  veHud();
}

// Thay dãy gạch dưới trong đề bằng một ô trống nhìn rõ
function chenO(text) {
  return esc(text || '').replace(/_{2,}/g, '<span class="g-blank"></span>');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function veHud() {
  let t = '';
  for (let i = 0; i < TIM; i++) t += i < tim ? '♥' : '<i>♥</i>';
  $('g-tim').innerHTML = t;
  $('g-cnt').textContent = 'Câu ' + Math.min(qi + 1, SO_CAU) + '/' + hang.length;
  $('g-diem').innerHTML = diem + ' điểm' +
    (chuoi > 1 ? '<b class="g-chuoi">chuỗi ' + chuoi + '</b>' : '');
}

// ---------- Điều khiển ----------

const phim = { trai: false, phai: false, nhay: false };

document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { phim.trai = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { phim.phai = true; e.preventDefault(); }
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    phim.nhay = true; e.preventDefault();
  }
  if (pha === 'ngung' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); cauKe(); }
});

document.addEventListener('keyup', function (e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') phim.trai = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') phim.phai = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') phim.nhay = false;
});

(function nutCham() {
  const khung = $('g-touch');
  if (!khung) return;

  // Không tin mỗi media query: có máy cảm ứng vẫn báo là có chuột.
  const coCham = (navigator.maxTouchPoints || 0) > 0 ||
                 'ontouchstart' in window ||
                 window.matchMedia('(hover: none)').matches;
  if (coCham) khung.classList.add('hien');

  khung.querySelectorAll('[data-nut]').forEach(function (b) {
    const ten = b.dataset.nut;

    const bat = function (e) { e.preventDefault(); phim[ten] = true; b.classList.add('on'); };
    const tat = function (e) { e.preventDefault(); phim[ten] = false; b.classList.remove('on'); };

    b.addEventListener('pointerdown', bat);
    b.addEventListener('pointerup', tat);
    b.addEventListener('pointercancel', tat);
    b.addEventListener('pointerleave', tat);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
})();

// ---------- Vòng lặp ----------

let truoc = 0;

function vong(nay) {
  const dt = Math.min(2.5, truoc ? (nay - truoc) / 16.67 : 1);   // chuẩn theo 60 khung/giây
  truoc = nay;

  if (pha === 'choi') capNhat(dt);
  ve();

  requestAnimationFrame(vong);
}

function capNhat(dt) {
  // Chạy ngang
  tho.vx = 0;
  if (phim.trai) { tho.vx = -TOC_CHAY; tho.huong = -1; }
  if (phim.phai) { tho.vx = TOC_CHAY; tho.huong = 1; }

  tho.x += tho.vx * dt;
  tho.x = Math.max(4, Math.min(W - tho.w - 4, tho.x));
  if (tho.vx && tho.duoiDat) tho.buoc += dt * 0.32;

  // Nhảy
  if (phim.nhay && tho.duoiDat) {
    tho.vy = SUC_NHAY;
    tho.duoiDat = false;
  }

  const yTruoc = tho.y;
  tho.vy += TRONG_LUC * dt;
  tho.y += tho.vy * dt;

  // Đội vào đáy ô — chỉ tính khi đang bay lên
  if (tho.vy < 0) {
    for (const o of oList) {
      const day = o.y + o.h;
      const chamNgang = tho.x + tho.w > o.x + 4 && tho.x < o.x + o.w - 4;
      const xuyenDay = yTruoc >= day && tho.y <= day;
      if (chamNgang && xuyenDay) {
        tho.y = day;
        tho.vy = 1.5;          // bật ngược xuống
        o.nhun = 1;
        doiO(o);
        break;
      }
    }
  }

  // Chạm đất
  if (tho.y >= datY - tho.h) {
    tho.y = datY - tho.h;
    tho.vy = 0;
    tho.duoiDat = true;
  }

  for (const o of oList) if (o.nhun > 0) o.nhun = Math.max(0, o.nhun - 0.09 * dt);

  // Đồng xu và chữ bay
  xu = xu.filter(function (c) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 0.35 * dt; c.doi += 0.25 * dt;
    return c.y < H + 40;
  });
  chu = chu.filter(function (c) {
    c.y -= 0.9 * dt; c.mo -= 0.016 * dt;
    return c.mo > 0;
  });
}

// ---------- Chấm một câu ----------

function doiO(o) {
  if (pha !== 'choi') return;

  const q = hang[qi];
  const ok = o.key === q.correct_answer;
  pha = 'ngung';
  soDaLam++;

  oList.forEach(function (x) {
    if (x === o) x.trangThai = ok ? 'dung' : 'sai';
    else if (!ok && x.key === q.correct_answer) x.trangThai = 'dung';
    else x.trangThai = 'tat';
  });

  ghiCauTraLoi(q, o.key, ok);

  if (ok) {
    dung++;
    chuoi++;
    const them = 10 + (chuoi > 1 ? (chuoi - 1) * 5 : 0);
    diem += them;

    for (let i = 0; i < 9; i++) {
      xu.push({
        x: o.x + o.w / 2 + (Math.random() - 0.5) * o.w * 0.5, y: o.y - 6,
        vx: (Math.random() - 0.5) * 5, vy: -4 - Math.random() * 3.5, doi: Math.random() * 6
      });
    }
    chu.push({ x: o.x + o.w / 2, y: o.y - 28, t: '+' + them, mo: 1, mau: MAU.oDung });

    if (typeof Speak !== 'undefined') Speak.say(dienVaoCho(q.question_text, o.text));

    veHud();
    setTimeout(cauKe, 950);
  } else {
    chuoi = 0;
    tim--;
    tho.vy = -6;                       // nảy ngược lại cho biết là trật
    chu.push({ x: o.x + o.w / 2, y: o.y - 28, t: 'hụt', mo: 1, mau: MAU.oSai });
    saiList.push({ q: q, chon: o.key });

    veHud();
    hienGiai(q, o.key);
  }
}

function dienVaoCho(text, tu) {
  return String(text || '').replace(/_{2,}/g, tu || '');
}

// Đáp sai thì dừng hẳn lại, cho đọc giải thích rồi tự bấm đi tiếp.
// Đây là chỗ học được nhiều nhất nên không hối.
function hienGiai(q, chon) {
  const opts = q.options || {};
  const box = $('g-giai');

  box.innerHTML =
    '<p class="g-giai-h">' + (tim > 0 ? 'Hụt mất rồi' : 'Hết tim') + '</p>' +
    '<p class="g-giai-cau">' +
      esc(q.question_text || '').replace(/_{2,}/g,
        '<b class="g-dung">' + esc(opts[q.correct_answer] || '') + '</b>') +
    '</p>' +
    (q.translation_vi ? '<p class="g-giai-vi">' + esc(q.translation_vi) + '</p>' : '') +
    '<p class="g-giai-chon">Bạn đội vào ô <b>' + esc(opts[chon] || chon) + '</b></p>' +
    (q.explanation ? '<p class="g-giai-why">' + esc(q.explanation) + '</p>' : '') +
    '<button class="btn btn-gold" id="g-tiep">' +
      (tim > 0 ? 'Chơi tiếp' : 'Xem kết quả') + '</button>';

  box.classList.remove('hidden');
  const b = $('g-tiep');
  if (b) b.addEventListener('click', cauKe);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cauKe() {
  if (pha !== 'ngung') return;
  $('g-giai').classList.add('hidden');

  if (tim <= 0) { ketThuc(false); return; }

  qi++;
  if (qi >= hang.length) { ketThuc(true); return; }
  rinhCau();
}

// ---------- Vẽ ----------

function ve() {
  // Trời
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, MAU.troi1);
  g.addColorStop(1, MAU.troi2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  veDoi();
  veDat();
  oList.forEach(veO);
  veXu();
  veTho();
  veChu();
}

function veDoi() {
  ctx.fillStyle = MAU.doi;
  for (const d of [[W * 0.18, 70], [W * 0.55, 92], [W * 0.88, 60]]) {
    ctx.beginPath();
    ctx.arc(d[0], datY + 10, d[1], Math.PI, 0);
    ctx.fill();
  }
}

function veDat() {
  ctx.fillStyle = MAU.dat;
  ctx.fillRect(0, datY, W, H - datY);
  ctx.fillStyle = MAU.co;
  ctx.fillRect(0, datY, W, 9);

  // Vạch gạch cho ra dáng nền game
  ctx.strokeStyle = 'rgba(0,0,0,.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, datY + 9);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

function veO(o) {
  const y = o.y - o.nhun * 9;

  let nen = MAU.o;
  if (o.trangThai === 'dung') nen = MAU.oDung;
  else if (o.trangThai === 'sai') nen = MAU.oSai;
  else if (o.trangThai === 'tat') nen = MAU.oTat;

  // Bóng đổ
  ctx.fillStyle = 'rgba(12,36,34,.14)';
  ctx.fillRect(o.x + 3, y + 4, o.w, o.h);

  ctx.fillStyle = nen;
  ctx.fillRect(o.x, y, o.w, o.h);
  ctx.strokeStyle = MAU.oVien;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(o.x + 1.25, y + 1.25, o.w - 2.5, o.h - 2.5);

  // Bốn đinh tán ở góc, kiểu ô bí ẩn
  ctx.fillStyle = 'rgba(12,36,34,.5)';
  for (const p of [[6, 6], [o.w - 9, 6], [6, o.h - 9], [o.w - 9, o.h - 9]]) {
    ctx.fillRect(o.x + p[0], y + p[1], 3, 3);
  }

  // Chữ trong ô — tự thu nhỏ cho vừa bề ngang
  const sang = o.trangThai === 'dung' || o.trangThai === 'sai';
  ctx.fillStyle = sang ? '#fff' : MAU.chu;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let co = o.w < 110 ? 15 : 19;
  const day = o.w - 14;
  do {
    ctx.font = '700 ' + co + 'px "Be Vietnam Pro", system-ui, sans-serif';
    if (ctx.measureText(o.text).width <= day || co <= 9) break;
    co -= 1;
  } while (true);

  ctx.fillText(o.text, o.x + o.w / 2, y + o.h / 2 + 5);

  // Nhãn A B C D ở mép trên
  ctx.font = '700 10px "Be Vietnam Pro", system-ui, sans-serif';
  ctx.fillStyle = sang ? 'rgba(255,255,255,.75)' : 'rgba(12,36,34,.5)';
  ctx.fillText(o.key, o.x + o.w / 2, y + 12);
}

function veXu() {
  for (const c of xu) {
    const r = 6 * Math.abs(Math.cos(c.doi));
    ctx.fillStyle = MAU.o;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, Math.max(1.5, r), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = MAU.oVien;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function veChu() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const c of chu) {
    ctx.globalAlpha = Math.max(0, c.mo);
    ctx.font = '700 20px Lexend, system-ui, sans-serif';
    ctx.fillStyle = c.mau;
    ctx.fillText(c.t, c.x, c.y);
    ctx.globalAlpha = 1;
  }
}

// Thỏ của Pacedemy, vẽ bằng hình khối chứ không dùng ảnh
function veTho() {
  const x = tho.x, y = tho.y, w = tho.w, h = tho.h;
  const nhun = tho.duoiDat && tho.vx ? Math.sin(tho.buoc * 6) * 1.5 : 0;

  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.scale(tho.huong, 1);

  // Bóng dưới chân
  if (tho.duoiDat) {
    ctx.fillStyle = 'rgba(12,36,34,.18)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.45, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = MAU.tho;

  // Hai tai
  ctx.save();
  ctx.rotate(-0.22);
  ctx.beginPath(); ctx.ellipse(-5, -h - 2 + nhun, 3.6, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(0.16);
  ctx.beginPath(); ctx.ellipse(4, -h - 2 + nhun, 3.6, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Đầu
  ctx.beginPath(); ctx.arc(0, -h + 10 + nhun, 10, 0, Math.PI * 2); ctx.fill();

  // Thân
  ctx.beginPath(); ctx.ellipse(0, -10 + nhun, 9, 11, 0, 0, Math.PI * 2); ctx.fill();

  // Khăn quàng màu thương hiệu
  ctx.fillStyle = MAU.khan;
  ctx.fillRect(-9, -20 + nhun, 18, 4);
  ctx.fillRect(4, -18 + nhun, 5, 8);

  // Chân — mở ra khi đang bay
  ctx.fillStyle = MAU.tho;
  const dang = tho.duoiDat ? Math.sin(tho.buoc * 6) * 3 : 4;
  ctx.fillRect(-7 - dang * 0.3, -2, 5, 3);
  ctx.fillRect(2 + dang * 0.3, -2, 5, 3);

  // Mắt
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(4, -h + 9 + nhun, 2.1, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ---------- Ghi kết quả ----------

async function ghiCauTraLoi(q, chon, ok) {
  if (!me) return;

  if (!attemptId) {
    const { data, error } = await db.from('attempts').insert({
      user_id: me.id,
      mode: 'practice',
      part: 5,
      started_at: batDau.toISOString(),
      total_questions: hang.length,
      correct_count: 0
    }).select('id').single();

    if (error) { toast('Không lưu được lượt chơi: ' + error.message, 'bad'); return; }
    attemptId = data ? data.id : null;
  }

  if (!attemptId) return;

  await db.from('attempt_answers').insert({
    attempt_id: attemptId,
    question_id: q.id,
    selected: chon,
    is_correct: ok,
    seconds_spent: cauBatDau ? Math.round((Date.now() - cauBatDau) / 1000) : null
  });
}

async function ketThuc(hetBai) {
  pha = 'het';
  $('view-play').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  $('g-done-title').textContent = hetBai
    ? (dung === hang.length ? 'Đi hết màn, không hụt câu nào.' : 'Đi hết màn.')
    : 'Hết tim rồi.';

  $('g-done-score').textContent = diem + ' điểm';
  $('g-done-sub').textContent =
    'Đúng ' + dung + '/' + soDaLam + ' câu đã đội' +
    (saiList.length ? '. Dưới đây là mấy câu cần xem lại.' : '. Không hụt câu nào.');

  $('g-done-wrong').innerHTML = saiList.length ? veLaiCauSai() : '';

  const giay = Math.round((Date.now() - batDau.getTime()) / 1000);

  if (attemptId) {
    const { error } = await db.from('attempts').update({
      submitted_at: new Date().toISOString(),
      total_questions: soDaLam,
      correct_count: dung,
      reading_correct: dung,
      seconds_used: giay,
      xp_earned: dung * XP_DUNG
    }).eq('id', attemptId);

    if (error) toast('Không lưu được kết quả: ' + error.message, 'bad');
  }

  // Gọi cả khi không đúng câu nào, vì đã ngồi làm thì vẫn tính là có học
  // trong ngày — giống các chế độ luyện khác.
  await db.rpc('add_xp', { p_xp: dung * XP_DUNG });
}

function veLaiCauSai() {
  let html = '<p class="review-head">Xem lại</p>';

  for (const s of saiList) {
    const q = s.q;
    const opts = q.options || {};
    html +=
      '<div class="wrong-q">' +
        (q.key_point ? '<p class="key-point">' + esc(q.key_point) + '</p>' : '') +
        '<p class="wq">' + esc(q.question_text || '').replace(/_{2,}/g,
          '<b class="filled">' + esc(opts[q.correct_answer] || '') + '</b>') + '</p>' +
        (q.translation_vi ? '<p class="trans">' + esc(q.translation_vi) + '</p>' : '') +
        '<p class="chose">Bạn đã đội: ' + esc(opts[s.chon] || s.chon) + '</p>' +
      '</div>';
  }

  return html;
}

// ---------- Khởi động ----------

$('g-dang').querySelectorAll('[data-nhom]').forEach(function (b) {
  b.addEventListener('click', function () {
    nhom = b.dataset.nhom;
    $('g-dang').querySelectorAll('[data-nhom]').forEach(function (x) {
      x.className = 'btn-sm ' + (x === b ? 'test' : 'learn');
    });
    napKho();
  });
});

$('g-start').addEventListener('click', vaoChoi);
$('g-again').addEventListener('click', function () {
  $('view-done').classList.add('hidden');
  vaoChoi();
});

window.addEventListener('resize', function () {
  if (!$('view-play').classList.contains('hidden')) doKhung();
});

(async function () {
  me = await requireLogin();
  if (!me) return;

  $('g-start').disabled = true;
  await napKho();

  if (!kho.length) {
    $('view-start').classList.add('hidden');
    $('view-empty').classList.remove('hidden');
  }
})();
