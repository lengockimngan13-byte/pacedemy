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
    .select('id, tu, cau, cau_vi, ghi_chu, cau_cua_toi, box, next_review')
    .eq('user_id', me.id)
    .order('next_review', { ascending: true, nullsFirst: true });

  if (error) {
    $('st-list').innerHTML = '<p class="empty">Không tải được sổ từ.</p>';
    return;
  }

  tat = data || [];
  ve();
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

function the(t) {
  const han = t.next_review ? new Date(t.next_review) : null;
  const toiHan = !han || han.getTime() <= Date.now();

  return '<div class="st-the" data-id="' + t.id + '">' +
    '<div class="st-dau">' +
      '<span class="st-tu-l">' + SoTu.esc(t.tu) + '</span>' +
      '<span class="st-hop">hộp ' + (t.box || 1) + '</span>' +
      (toiHan ? '<span class="st-han">tới hạn</span>' : '') +
      '<button class="st-xoa" type="button" data-xoa="' + t.id + '" title="Bỏ khỏi sổ">×</button>' +
    '</div>' +
    (t.cau ? '<p class="st-cau-l">' + khoet(t.cau, t.tu) + '</p>' : '') +
    (t.cau_vi ? '<p class="st-vi">' + SoTu.esc(t.cau_vi) + '</p>' : '') +
    (t.ghi_chu ? '<p class="st-ghi">' + SoTu.esc(t.ghi_chu) + '</p>' : '') +
    '<div class="st-rieng">' +
      '<label>Câu của riêng bạn — gắn với công việc hay đời sống của bạn</label>' +
      '<textarea rows="2" data-cau="' + t.id + '" placeholder="Viết một câu tiếng Anh có ' +
        SoTu.esc(t.tu) + ', nói về công việc hay đời sống của chính bạn.">' +
        SoTu.esc(t.cau_cua_toi || '') + '</textarea>' +
    '</div>' +
  '</div>';
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

  // Lưu câu của riêng học viên khi rời ô
  $('st-list').querySelectorAll('[data-cau]').forEach(function (o) {
    o.addEventListener('blur', async function () {
      const id = parseInt(o.dataset.cau, 10);
      const cu = (tat.find(function (t) { return t.id === id; }) || {}).cau_cua_toi || '';
      const moi = o.value.trim();
      if (moi === cu.trim()) return;

      const { error } = await db.from('tu_cua_toi')
        .update({ cau_cua_toi: moi || null }).eq('id', id);

      if (error) { toast('Không lưu được câu: ' + error.message, 'bad'); return; }
      const t = tat.find(function (x) { return x.id === id; });
      if (t) t.cau_cua_toi = moi;
      toast('Đã lưu câu của bạn.', 'good');
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

  // Ưu tiên câu học viên tự đặt, vì câu đó gắn với đời họ nên nhớ chắc hơn
  const cau = t.cau_cua_toi || t.cau || '';
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

function khoetTrong(cau, tu) {
  const an = String(tu).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + an + '\\w*', 'i');
  if (!re.test(cau)) return SoTu.esc(cau) + ' <span class="st-trong">_____</span>';
  return SoTu.esc(cau).replace(re, '<span class="st-trong">_____</span>');
}

async function answer(i) {
  if (locked) return;
  locked = true;

  const t = hang[at];
  const ok = t.chon[i] === t.tu;
  marks[at] = ok ? 'ok' : 'no';
  QuizProgress.draw({ at: at, total: hang.length, marks: marks });

  if (ok) right++;

  const dung = t.chon.indexOf(t.tu);
  const nut = $('opts').querySelectorAll('.opt');
  nut.forEach(function (b) { b.disabled = true; });
  if (nut[i]) nut[i].classList.add(ok ? 'right' : 'wrong');
  if (!ok && nut[dung]) nut[dung].classList.add('right');

  // Chấm xong mới mở bản dịch và câu đầy đủ ra
  const lo = $('st-lo');
  if (lo) {
    lo.innerHTML =
      '<b>' + SoTu.esc(t.cau_cua_toi || t.cau || '') + '</b>' +
      (t.cau_vi ? '<span>' + SoTu.esc(t.cau_vi) + '</span>' : '');
    lo.classList.add('st-lo-mo');
  }

  if (typeof Speak !== 'undefined') {
    if (ok) Speak.thoi(); else Speak.say(t.tu);
  }

  luuTien(t, ok);

  setTimeout(function () {
    at++;
    if (at >= hang.length) xong();
    else render();
  }, ok ? 900 : 2400);
}

async function luuTien(t, ok) {
  const box = ok ? Math.min(5, (t.box || 1) + 1) : 1;
  const han = new Date(Date.now() + SoTu.GAP[box] * 60000);

  await db.from('tu_cua_toi').update({
    box: box,
    last_reviewed: new Date().toISOString(),
    next_review: han.toISOString()
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
