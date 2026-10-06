// ============================================================
// Pacedemy — luyện nói, phía học viên
//
// Một lượt: đọc tình huống → bấm nói → máy chấm → xem sai ở đâu.
//
// Chấm thế nào, nói rõ để khỏi hiểu nhầm:
//
//   Ngữ pháp, Từ vựng, Mạch lạc — AI đọc câu em nói rồi chấm.
//   Phát âm — Azure chấm từ chính file ghi âm, tới từng từ.
//
// Chưa cài khoá Azure thì KHÔNG hiện điểm phát âm. Lấy độ tin cậy
// của bộ nhận diện rồi gọi là điểm phát âm thì con số đó vô nghĩa,
// mà học viên lại tin.
//
// Lấy chữ từ giọng nói theo ba nấc, tuỳ máy có gì:
//   1. Azure — chuẩn nhất, và chạy được trên iPhone
//   2. Web Speech API của trình duyệt — Chrome có, Safari iOS không
//   3. Em tự gõ lại câu vừa nói — vẫn chấm được ba phần kia
//
// Không lưu file ghi âm lên máy chủ. Chỉ lưu điểm và câu chữ, để cô
// xem em tiến bộ tới đâu.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

let me = null;
let kieu = 'giao-tiep';
let kho = { 'giao-tiep': [], toeic: [] };
let deHienTai = null;
let daLam = {};            // id đề đã làm trong phiên này, để khỏi lặp
let urlNghe = null;
let dongHo = null;
let nghedDuocTam = '';     // chữ Web Speech bắt được, dùng khi Azure chưa bật
let recTam = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  if (!GhiAm.co()) {
    bao('Trình duyệt này không ghi âm được. Em mở bằng Chrome hoặc Safari bản mới nhé.', true);
    return;
  }

  noi();
  await napKho();
})();

function bao(msg, xau) {
  $('noi-bao').innerHTML = msg
    ? '<div class="tbox" style="border-color:' + (xau ? 'var(--danger)' : 'var(--gold)') + '">' +
      '<p style="margin:0;font-size:0.94rem;line-height:1.6">' + msg + '</p></div>'
    : '';
}

async function napKho() {
  const { data, error } = await db.from('de_noi')
    .select('id, kieu, tinh_huong, tinh_huong_vi, cum_tu, loai_cum, phien_am, nghia_vi, goi_y, muc_do')
    .eq('is_active', true).eq('da_duyet', true);

  if (error) return bao('Không đọc được đề: ' + esc(error.message), true);

  kho = { 'giao-tiep': [], toeic: [] };
  (data || []).forEach(function (d) { (kho[d.kieu] || kho.toeic).push(d); });

  deMoi();
}

// ---------- một đề ----------

function deMoi() {
  const ds = kho[kieu] || [];

  if (!ds.length) {
    $('noi-the').classList.add('hidden');
    bao('Phần này chưa có đề nào. Cô sẽ soạn thêm.', false);
    return;
  }

  // Ưu tiên đề chưa làm trong phiên này; hết thì cho vòng lại
  let con = ds.filter(function (d) { return !daLam[d.id]; });
  if (!con.length) { daLam = {}; con = ds; }

  deHienTai = con[Math.floor(Math.random() * con.length)];
  daLam[deHienTai.id] = true;

  bao('');
  $('noi-the').classList.remove('hidden');
  veDe();
  dungSach();
}

function veDe() {
  const d = deHienTai;
  const MUC = { 1: 'Dễ', 2: 'Vừa', 3: 'Khó' };

  $('noi-mucdo').textContent = MUC[d.muc_do] || 'Vừa';
  $('noi-th').textContent = d.tinh_huong;
  $('noi-th-vi').textContent = d.tinh_huong_vi || '';
  $('noi-th-vi').classList.add('hidden');
  $('btn-vi').setAttribute('aria-pressed', 'false');

  $('noi-cum-tu').textContent = d.cum_tu;
  $('noi-loai').textContent = d.loai_cum ? '(' + d.loai_cum + ')' : '';
  $('noi-am').textContent = d.phien_am || '';
  $('noi-nghia').textContent = d.nghia_vi ? d.cum_tu + ' — ' + d.nghia_vi : '';

  if (d.goi_y) {
    $('noi-goiy').textContent = '💡 ' + d.goi_y;
    $('noi-goiy').classList.remove('hidden');
  } else {
    $('noi-goiy').classList.add('hidden');
  }
}

function dungSach() {
  $('noi-ketqua').classList.add('hidden');
  $('noi-ketqua').innerHTML = '';
  $('noi-nut').classList.add('hidden');
  $('noi-go-box').classList.add('hidden');
  $('noi-go').value = '';
  $('noi-playback').classList.add('hidden');
  $('btn-ghi').classList.remove('hidden');
  $('btn-ghi').disabled = false;
  $('btn-ghi').textContent = '🎙 Bấm để nói';
  nghedDuocTam = '';
}

// ---------- ghi âm ----------

async function batGhi() {
  if (GhiAm.dangGhi()) return dungGhi();

  try { await GhiAm.batDau(); }
  catch (e) {
    return toast('Không dùng được micro: ' + (e.message || 'bị từ chối quyền'), 'bad');
  }

  // Chạy song song bộ nhận diện của trình duyệt làm phương án dự
  // phòng, phòng khi chưa cài khoá Azure.
  nghedDuocTam = '';
  if (SpeechRec) {
    try {
      recTam = new SpeechRec();
      recTam.lang = 'en-US';
      recTam.interimResults = false;
      recTam.continuous = true;
      recTam.onresult = function (ev) {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) nghedDuocTam += ' ' + ev.results[i][0].transcript;
        }
      };
      recTam.onerror = function () {};
      recTam.start();
    } catch (e) { recTam = null; }
  }

  $('btn-ghi').textContent = '⏹ Đang nghe — bấm để dừng';
  $('btn-ghi').classList.add('dang-ghi');
  $('noi-dem').classList.remove('hidden');

  let giay = 0;
  $('noi-dem').textContent = '0:00';
  dongHo = setInterval(function () {
    giay++;
    $('noi-dem').textContent = '0:' + (giay < 10 ? '0' : '') + giay;
    if (giay >= GhiAm.TOI_DA) dungGhi();
  }, 1000);
}

async function dungGhi() {
  clearInterval(dongHo);
  $('noi-dem').classList.add('hidden');
  $('btn-ghi').classList.remove('dang-ghi');
  $('btn-ghi').disabled = true;
  $('btn-ghi').textContent = 'Đang chấm…';

  if (recTam) { try { recTam.stop(); } catch (e) {} recTam = null; }

  let ra;
  try { ra = await GhiAm.dungLai(); }
  catch (e) {
    $('btn-ghi').disabled = false;
    $('btn-ghi').textContent = '🎙 Bấm để nói';
    return toast(e.message || 'Không ghi được', 'bad');
  }

  if (ra.giay < 1) {
    $('btn-ghi').disabled = false;
    $('btn-ghi').textContent = '🎙 Bấm để nói';
    return toast('Ngắn quá, em nói dài hơn một chút nhé.', 'bad');
  }

  if (urlNghe) URL.revokeObjectURL(urlNghe);
  urlNghe = URL.createObjectURL(ra.nghe);
  $('noi-playback').src = urlNghe;
  $('noi-playback').classList.remove('hidden');

  await chamHet(ra.wav);
}

// ---------- chấm ----------

async function token() {
  const { data } = await db.auth.getSession();
  return data && data.session && data.session.access_token;
}

async function chamHet(wav) {
  const tk = await token();
  if (!tk) { xongCham(); return toast('Phiên đăng nhập đã hết, đăng nhập lại nhé.', 'bad'); }

  // Bước 1: phát âm + nghe ra chữ
  let am = null;
  try {
    const r = await fetch('/api/cham-phat-am?text=', {
      method: 'POST',
      headers: { 'content-type': 'audio/wav', authorization: 'Bearer ' + tk },
      body: wav
    });
    am = await r.json();
    if (!r.ok) am = Object.assign({ hong: true }, am);
  } catch (e) { am = { hong: true }; }

  let cau = (am && am.nghe_duoc) ? am.nghe_duoc : nghedDuocTam.trim();

  if (!cau) {
    // Không nấc nào nghe được — để em gõ lại, vẫn chấm được ba phần kia
    xongCham();
    $('noi-go-box').classList.remove('hidden');
    $('noi-go').focus();
    toast(am && am.chua_cai
      ? 'Máy này chưa nghe được giọng nói. Em gõ lại câu vừa nói nhé.'
      : 'Chưa nghe rõ. Em gõ lại câu vừa nói, hoặc thử nói lại to hơn.', 'bad');
    return;
  }

  await chamChu(cau, am && !am.hong && !am.chua_cai ? am : null, tk);
}

async function chamChu(cau, am, tk) {
  tk = tk || await token();

  let kq = null;
  try {
    const r = await fetch('/api/cham-noi', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
      body: JSON.stringify({ de: deHienTai, cau_noi: cau })
    });
    kq = await r.json();
    if (!r.ok) { xongCham(); return toast(kq.loi || 'Không chấm được.', 'bad'); }
  } catch (e) { xongCham(); return toast('Mất kết nối, thử lại sau nhé.', 'bad'); }

  veKetQua(cau, kq, am);
  luuLuot(cau, kq, am);
  xongCham();
}

function xongCham() {
  $('btn-ghi').classList.add('hidden');
  $('btn-ghi').disabled = false;
  $('btn-ghi').textContent = '🎙 Bấm để nói';
  $('noi-nut').classList.remove('hidden');
}

// ---------- vẽ kết quả ----------

function veKetQua(cau, kq, am) {
  const phan = [
    { ten: 'Ngữ pháp', so: kq.ngu_phap },
    { ten: 'Từ vựng', so: kq.tu_vung },
    { ten: 'Mạch lạc', so: kq.mach_lac }
  ];
  if (am && am.phat_am) phan.push({ ten: 'Phát âm', so: am.phat_am });

  const tong = Math.round(phan.reduce(function (s, p) { return s + p.so; }, 0) / phan.length);

  let html =
    '<div class="noi-cau"><span class="noi-cau-nhan">Câu em nói</span>' +
      '<p>' + danhDau(cau, deHienTai.cum_tu, kq.dung_cum_tu) + '</p>' +
      (am && am.tu_yeu && am.tu_yeu.length
        ? '<p class="noi-tuyeu">Đọc chưa rõ: ' +
            am.tu_yeu.map(function (w) {
              return '<b>' + esc(w.tu) + '</b> <small>' + w.diem + '</small>';
            }).join(' · ') + '</p>'
        : '') +
    '</div>' +

    '<div class="noi-diem">' +
      '<span class="noi-tong ' + mau(tong) + '">' + tong + '</span>' +
      phan.map(function (p) {
        return '<span class="noi-mot"><i>' + p.ten + '</i><b>' + p.so + '</b></span>';
      }).join('') +
    '</div>';

  if (!am) {
    html += '<p class="noi-chuacham">Chưa chấm phát âm — phần này cần khoá Azure. ' +
      'Ba điểm trên chấm theo chữ, không liên quan tới giọng đọc.</p>';
  } else if (am.ngu_dieu != null) {
    html += '<p class="noi-chitiet">Phát âm chi tiết: chính xác ' + am.chinh_xac +
      ' · trôi chảy ' + am.troi_chay + ' · ngữ điệu ' + am.ngu_dieu + '</p>';
  }

  if (kq.nhan_xet) {
    html += '<div class="noi-nhanxet"><b>Cô nhận xét</b><p>' + esc(kq.nhan_xet) + '</p></div>';
  }

  if (kq.loi && kq.loi.length) {
    html += '<div class="noi-loi"><b>Chỗ cần sửa</b>' +
      kq.loi.map(function (l) {
        return '<div class="noi-motloi">' +
          '<span class="noi-sai">' + esc(l.sai) + '</span>' +
          '<span class="noi-mui">→</span>' +
          '<span class="noi-dung">' + esc(l.dung) + '</span>' +
          (l.vi_sao ? '<p>' + esc(l.vi_sao) + '</p>' : '') +
        '</div>';
      }).join('') + '</div>';
  }

  if (kq.cau_goi_y) {
    html += '<div class="noi-mau"><b>Em thử nói thế này</b>' +
      '<p>' + esc(kq.cau_goi_y) +
      '<button class="noi-loa" type="button" id="btn-nghe-mau" title="Nghe câu mẫu">🔊</button></p></div>';
  }

  $('noi-ketqua').innerHTML = html;
  $('noi-ketqua').classList.remove('hidden');

  const nm = $('btn-nghe-mau');
  if (nm) nm.addEventListener('click', function () { Speak.say(kq.cau_goi_y, 'US'); });
}

function mau(n) { return n >= 80 ? 'tot' : (n >= 60 ? 'kha' : 'yeu'); }

// Tô cụm từ bắt buộc trong câu em nói, để thấy ngay có dùng hay không
function danhDau(cau, cum, dung) {
  const c = esc(cau);
  if (!dung || !cum) return c;

  const re = new RegExp('(' + esc(cum).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+') + ')', 'i');
  return c.replace(re, '<mark>$1</mark>');
}

// ---------- lưu lại cho cô xem ----------

async function luuLuot(cau, kq, am) {
  const phan = [kq.ngu_phap, kq.tu_vung, kq.mach_lac];
  if (am && am.phat_am) phan.push(am.phat_am);
  const tong = Math.round(phan.reduce(function (a, b) { return a + b; }, 0) / phan.length);

  try {
    await db.from('luot_noi').insert({
      student_id: me.id,
      de_id: deHienTai.id,
      cau_noi: cau,
      dung_cum_tu: !!kq.dung_cum_tu,
      diem_tong: tong,
      ngu_phap: kq.ngu_phap,
      tu_vung: kq.tu_vung,
      mach_lac: kq.mach_lac,
      phat_am: am && am.phat_am ? am.phat_am : null,
      nhan_xet: kq.nhan_xet || null,
      cau_goi_y: kq.cau_goi_y || null,
      chi_tiet: { loi: kq.loi || [], tu_yeu: (am && am.tu_yeu) || [] }
    });
    await db.rpc('de_noi_dem', { p_id: deHienTai.id });
  } catch (e) { /* không lưu được thì thôi, đừng chặn em học tiếp */ }
}

// ---------- nối sự kiện ----------

function noi() {
  document.querySelectorAll('#kieu-tabs .test-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#kieu-tabs .test-tab').forEach(function (x) {
        x.classList.remove('on');
      });
      b.classList.add('on');
      kieu = b.dataset.kieu;
      daLam = {};
      deMoi();
    });
  });

  $('btn-ghi').addEventListener('click', batGhi);
  $('btn-doi').addEventListener('click', deMoi);
  $('btn-tiep').addEventListener('click', deMoi);
  $('btn-lai').addEventListener('click', function () { dungSach(); });

  $('btn-vi').addEventListener('click', function () {
    const el = $('noi-th-vi');
    const an = el.classList.toggle('hidden');
    $('btn-vi').setAttribute('aria-pressed', an ? 'false' : 'true');
  });

  $('btn-nghe-de').addEventListener('click', function () {
    if (deHienTai) Speak.say(deHienTai.tinh_huong, 'US');
  });

  $('btn-nghe-cum').addEventListener('click', function () {
    if (deHienTai) Speak.say(deHienTai.cum_tu, 'US');
  });

  $('btn-go-cham').addEventListener('click', async function () {
    const cau = $('noi-go').value.trim();
    if (!cau) return $('noi-go').focus();
    $('btn-go-cham').disabled = true;
    $('btn-go-cham').textContent = 'Đang chấm…';
    await chamChu(cau, null);
    $('btn-go-cham').disabled = false;
    $('btn-go-cham').textContent = 'Chấm câu này';
    $('noi-go-box').classList.add('hidden');
  });
}
