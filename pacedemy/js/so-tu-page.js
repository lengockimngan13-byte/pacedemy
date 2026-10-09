// ============================================================
// Pacedemy — trang Sổ từ của tôi
//
// Xem những từ đã nhặt từ đề, tự đặt một câu của riêng mình cho từng
// từ, và ôn lại theo vòng Leitner.
//
// Kiểu ôn cố ý giống Part 5: hiện lại đúng câu đã gặp nhưng khoét chỗ
// trống, chọn 1 trong 4. Ôn theo đúng cách đề thi sẽ hỏi.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

const SIZE = 10;

let me = null;
let tat = [];        // toàn bộ sổ
let hang = [];       // hàng đợi đang ôn
let at = 0;
let marks = [];
let right = 0;
let locked = false;
let batDau = null;

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;
  await nap();
})();

async function nap() {
  const { data, error } = await db.from('tu_cua_toi')
    .select('id, tu, cau, cau_vi, ghi_chu, cau_cua_toi, cau_trang_thai, cau_gop_y, cau_sua_lai, box, next_review, last_reviewed, created_at, so_lan_on, so_lan_dung')
    .eq('user_id', me.id)
    .order('next_review', { ascending: true, nullsFirst: true });

  if (error) {
    $('st-list').innerHTML = '<p class="empty">Không tải được sổ từ.</p>';
    return;
  }

  tat = data || [];
  await napHoi();
  ve();
}

// Từ nào có sẵn câu hỏi kiểu Part 2 thì lúc ôn dùng câu đó,
// từ nào chưa có thì vẫn ôn bằng kiểu điền chỗ trống.
async function napHoi() {
  if (!tat.length) return;

  const tu = tat.map(function (t) { return String(t.tu || '').toLowerCase(); });

  const { data } = await db.from('cau_hoi_tho')
    .select('tu, boi_canh, cau_hoi, dap_an, giai_thich')
    .eq('is_active', true).in('tu', tu);

  const theoTu = {};
  for (const h of (data || [])) theoTu[String(h.tu).toLowerCase()] = h;

  for (const t of tat) t.hoi = theoTu[String(t.tu || '').toLowerCase()] || null;
}

function denHan() {
  const now = Date.now();
  return tat.filter(function (t) {
    return !t.next_review || new Date(t.next_review).getTime() <= now;
  });
}

// ---------- Danh sách ----------

function ve() {
  if (!tat.length) {
    $('st-tom').innerHTML = '';
    $('st-list').innerHTML =
      '<div class="tbox">' +
        '<h3>Sổ từ còn trống</h3>' +
        '<p style="margin:0 0 14px;font-size:0.94rem;line-height:1.65;color:#4A635E">' +
          'Làm một bài luyện Part 5 hoặc chơi Thỏ đập ô chữ. Làm sai câu nào, ' +
          'Pacedemy mời bạn nhặt từ trong câu đó vào đây.' +
        '</p>' +
        '<div class="done-actions">' +
          '<a class="btn btn-gold" href="practice.html?part=5">Luyện Part 5</a>' +
          '<a class="btn btn-line" href="game.html">Chơi Thỏ đập ô chữ</a>' +
        '</div>' +
      '</div>';
    return;
  }

  const han = denHan();
  const thuoc = tat.filter(function (t) { return (t.box || 1) >= 4; }).length;

  $('st-tom').innerHTML =
    '<div class="tbox st-tom">' +
      '<div class="st-so">' +
        '<div><b>' + tat.length + '</b><span>từ trong sổ</span></div>' +
        '<div><b>' + han.length + '</b><span>tới hạn ôn</span></div>' +
        '<div><b>' + thuoc + '</b><span>đã thuộc</span></div>' +
      '</div>' +
      (han.length
        ? '<button class="btn btn-gold" id="st-on">Ôn ' + Math.min(SIZE, han.length) + ' từ tới hạn</button>'
        : '<button class="btn btn-line" id="st-on">Chưa tới hạn, ôn trước cũng được</button>') +
    '</div>';

  $('st-on').addEventListener('click', batDauOn);

  $('st-list').innerHTML = tat.map(the).join('');
  gan();
}

const TRANG_THAI = {
  nhap: { nhan: '',                 lop: '' },
  cho:  { nhan: 'Chờ cô duyệt',     lop: 'st-cho' },
  dat:  { nhan: 'Cô đã duyệt',      lop: 'st-dat' },
  sua:  { nhan: 'Cô bảo cần sửa',   lop: 'st-sua' }
};

function the(t) {
  const han = t.next_review ? new Date(t.next_review) : null;
  const toiHan = !han || han.getTime() <= Date.now();
  const tt = TRANG_THAI[t.cau_trang_thai] || TRANG_THAI.nhap;
  const coCau = !!(t.cau_cua_toi && t.cau_cua_toi.trim());

  return '<div class="st-the" data-id="' + t.id + '">' +
    '<div class="st-dau">' +
      '<span class="st-tu-l">' + SoTu.esc(t.tu) + '</span>' +
      '<span class="st-hop">hộp ' + (t.box || 1) + '</span>' +
      (toiHan ? '<span class="st-han">tới hạn</span>' : '') +
      (t.hoi ? '<span class="st-co-hoi" title="Từ này có bài Thỏ hỏi">🐰 Thỏ hỏi</span>' : '') +
      '<button class="st-xoa" type="button" data-xoa="' + t.id + '" title="Bỏ khỏi sổ">×</button>' +
    '</div>' +
    (t.cau ? '<p class="st-cau-l">' + khoet(t.cau, t.tu) + '</p>' : '') +
    (t.cau_vi ? '<p class="st-vi">' + SoTu.esc(t.cau_vi) + '</p>' : '') +
    (t.ghi_chu ? '<p class="st-ghi">' + SoTu.esc(t.ghi_chu) + '</p>' : '') +

    nhatKy(t) +
  '</div>';
}

// Nhật ký của từng từ — nhặt về lúc nào, ôn mấy lần, đúng mấy lần
function nhatKy(t) {
  const them = t.created_at ? ngayGon(t.created_at) : null;
  const on = t.so_lan_on || 0;
  const ok = t.so_lan_dung || 0;
  const lan = t.last_reviewed ? ngayGon(t.last_reviewed) : null;

  const muc = [];
  if (them) muc.push('nhặt về ' + them);
  muc.push(on ? 'đã ôn ' + on + ' lần, đúng ' + ok : 'chưa ôn lần nào');
  if (lan) muc.push('gần nhất ' + lan);

  return '<p class="st-nk">' + muc.join(' · ') + '</p>';
}

function ngayGon(iso) {
  const d = new Date(iso);
  const hn = new Date(); hn.setHours(0, 0, 0, 0);
  const cach = Math.floor((hn - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (cach === 0) return 'hôm nay';
  if (cach === 1) return 'hôm qua';
  if (cach < 7) return cach + ' ngày trước';
  return d.getDate() + '/' + (d.getMonth() + 1);
}

// Tô đậm từ trong câu cho dễ thấy
function khoet(cau, tu) {
  const an = String(tu).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(' + an + ')', 'i');
  const parts = String(cau).split(re);

  return parts.map(function (p, i) {
    return i % 2 ? '<b>' + SoTu.esc(p) + '</b>' : SoTu.esc(p);
  }).join('');
}

function gan() {
  $('st-list').querySelectorAll('[data-xoa]').forEach(function (b) {
    b.addEventListener('click', async function () {
      if (!confirm('Bỏ từ này khỏi sổ?')) return;
      const { error } = await db.from('tu_cua_toi').delete().eq('id', parseInt(b.dataset.xoa, 10));
      if (error) { toast('Không bỏ được: ' + error.message, 'bad'); return; }
      toast('Đã bỏ khỏi sổ.', 'good');
      nap();
    });
  });
}

// ---------- Ôn ----------

function batDauOn() {
  const han = denHan();
  const nguon = han.length ? han : tat;

  hang = tron(nguon).slice(0, SIZE).map(function (t) {
    return Object.assign({}, t, { chon: taoChon(t) });
  });

  at = 0; marks = []; right = 0; batDau = new Date();

  $('view-list').classList.add('hidden');
  $('view-done').classList.add('hidden');
  $('view-on').classList.remove('hidden');

  render();
}

// Ba từ nhiễu lấy từ chính sổ của học viên. Chưa đủ bốn từ thì cho ít hơn,
// vẫn ôn được chứ không chặn lại.
function taoChon(t) {
  const khac = tron(tat.filter(function (x) {
    return x.id !== t.id && x.tu.toLowerCase() !== t.tu.toLowerCase();
  })).slice(0, 3).map(function (x) { return x.tu; });

  return tron([t.tu].concat(khac));
}

function tron(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = r[i]; r[i] = r[j]; r[j] = x;
  }
  return r;
}

function render() {
  const t = hang[at];
  locked = false;

  QuizProgress.draw({ at: at, total: hang.length, marks: marks });

  if (t.hoi && typeof ThoHoi !== 'undefined') { veHoi(t); return; }

  // Chỉ dùng câu học viên tự đặt khi cô đã duyệt đạt. Câu chưa duyệt mà
  // đem ra làm đề thì học viên luyện đi luyện lại chính cái sai của mình.
  const cau = (t.cau_trang_thai === 'dat' && t.cau_cua_toi) ? t.cau_cua_toi : (t.cau || '');
  const de = cau ? khoetTrong(cau, t.tu) : '<span class="st-trong">(chưa có câu)</span>';

  // Bản dịch để dành tới sau khi chấm. Hiện trước là lộ đáp án, và bài
  // này cốt luyện đọc câu tiếng Anh rồi chọn từ hợp — đúng việc Part 5 hỏi.
  $('word-box').innerHTML =
    '<p class="quiz-prompt">Điền từ còn thiếu</p>' +
    '<p class="quiz-sentence">' + de + '</p>' +
    '<p class="quiz-hint" id="st-lo"></p>';

  $('opts').innerHTML = t.chon.map(function (x, i) {
    return '<button class="opt" data-i="' + i + '">' +
             '<span class="letter">' + (i + 1) + '</span>' + SoTu.esc(x) +
           '</button>';
  }).join('');

  $('opts').querySelectorAll('.opt').forEach(function (b) {
    b.addEventListener('click', function () { answer(parseInt(b.dataset.i, 10)); });
  });

  $('opt-hint').textContent = t.chon.map(function (_, i) { return i + 1; }).join(' · ') + ' để chọn';
}

// Bài Thỏ hỏi: bối cảnh, thỏ hỏi, chọn câu đáp lại
function veHoi(t) {
  $('opts').innerHTML = '';
  $('opt-hint').textContent = '';

  ThoHoi.ve($('word-box'), t.hoi, function (dung) {
    locked = true;
    cham(t, dung, 2600);
  });
}

function khoetTrong(cau, tu) {
  const an = String(tu).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + an + '\\w*', 'i');
  if (!re.test(cau)) return SoTu.esc(cau) + ' <span class="st-trong">_____</span>';
  return SoTu.esc(cau).replace(re, '<span class="st-trong">_____</span>');
}

// Dùng chung cho cả hai kiểu bài: ghi điểm, ghi tiến độ, hẹn sang câu kế
function cham(t, ok, cho) {
  marks[at] = ok ? 'ok' : 'no';
  QuizProgress.draw({ at: at, total: hang.length, marks: marks });

  if (ok) right++;
  luuTien(t, ok);

  setTimeout(function () {
    at++;
    if (at >= hang.length) xong();
    else render();
  }, cho);
}

async function answer(i) {
  if (locked) return;
  locked = true;

  const t = hang[at];
  const ok = t.chon[i] === t.tu;

  if (typeof Am !== 'undefined') { ok ? Am.dung() : Am.sai(); }

  const dung = t.chon.indexOf(t.tu);
  const nut = $('opts').querySelectorAll('.opt');
  nut.forEach(function (b) { b.disabled = true; });
  if (nut[i]) nut[i].classList.add(ok ? 'right' : 'wrong');
  if (!ok && nut[dung]) nut[dung].classList.add('right');

  // Chấm xong mới mở bản dịch và câu đầy đủ ra
  const lo = $('st-lo');
  if (lo) {
    lo.innerHTML =
      '<b>' + SoTu.esc((t.cau_trang_thai === 'dat' && t.cau_cua_toi) ? t.cau_cua_toi : (t.cau || '')) + '</b>' +
      (t.cau_vi ? '<span>' + SoTu.esc(t.cau_vi) + '</span>' : '');
    lo.classList.add('st-lo-mo');
  }

  if (typeof Speak !== 'undefined') {
    if (ok) Speak.thoi(); else Speak.say(t.tu);
  }

  cham(t, ok, ok ? 900 : 2400);
}

async function luuTien(t, ok) {
  const box = ok ? Math.min(5, (t.box || 1) + 1) : 1;
  const han = new Date(Date.now() + SoTu.GAP[box] * 60000);

  await db.from('tu_cua_toi').update({
    box: box,
    last_reviewed: new Date().toISOString(),
    next_review: han.toISOString(),
    so_lan_on: (t.so_lan_on || 0) + 1,
    so_lan_dung: (t.so_lan_dung || 0) + (ok ? 1 : 0)
  }).eq('id', t.id);
}

async function xong() {
  $('view-on').classList.add('hidden');
  $('view-done').classList.remove('hidden');

  const giay = Math.round((Date.now() - batDau.getTime()) / 1000);

  if (typeof XongBai !== 'undefined') {
    XongBai.ve($('view-done'), {
      dung: right, tong: hang.length, xp: right, giay: giay, ten: 'Sổ từ của tôi'
    });
  }

  const { data, error } = await db.from('attempts').insert({
    user_id: me.id,
    mode: 'review',
    started_at: batDau.toISOString(),
    submitted_at: new Date().toISOString(),
    total_questions: hang.length,
    correct_count: right,
    seconds_used: giay,
    xp_earned: right
  }).select('id').single();

  if (error) toast('Không lưu được lượt ôn: ' + error.message, 'bad');
  else if (data) await db.rpc('add_xp', { p_xp: right });

  await nap();
}

$('btn-again').addEventListener('click', function () {
  $('view-done').classList.add('hidden');
  batDauOn();
});

$('btn-back').addEventListener('click', function () {
  $('view-done').classList.add('hidden');
  $('view-list').classList.remove('hidden');
});

// ---------- Phím số ----------

document.addEventListener('keydown', function (e) {
  if ($('view-on').classList.contains('hidden')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const o = document.activeElement;
  if (o && /^(INPUT|TEXTAREA|SELECT)$/.test(o.tagName)) return;

  if (!/^[1-9]$/.test(e.key)) return;
  const b = $('opts').querySelectorAll('.opt')[parseInt(e.key, 10) - 1];
  if (b && !locked) { e.preventDefault(); answer(parseInt(e.key, 10) - 1); }
});
