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
//
// ---- Hai bản: miễn phí và đầy đủ ----
//
// Bản miễn phí làm việc hoàn toàn trong trình duyệt nên tốn 0đ, vì
// vậy không giới hạn lượt: em đọc theo câu mẫu, máy đối chiếu chữ nó
// nghe ra với câu mẫu rồi chỉ ra từ nào chưa nghe ra.
//
// Chỗ này phải nói cho đúng: "máy không nghe ra từ này" KHÔNG đồng
// nghĩa với "em đọc sai từ này". Micro rè, mạng chậm, nói nhanh —
// đều làm bộ nhận diện bỏ từ. Nên bản miễn phí KHÔNG hiện bất kỳ con
// số nào gọi là điểm phát âm. Nó đếm từ, và nói rõ là nó đang đếm từ.
//
// Bản đầy đủ mới gọi AI chấm ngữ pháp / từ vựng / mạch lạc và gọi
// Azure chấm phát âm tới từng âm — hai việc đó tốn tiền thật.
//
// Ba ô Ngữ pháp / Từ vựng / Mạch lạc vẫn hiện ở bản miễn phí nhưng
// để trống và làm mờ, để em thấy bản đầy đủ có thêm gì.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

let me = null;
let traPhi = true;         // mặc định coi như có, hỏi xong mới hạ xuống
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

  await hoiGoi();
  noi();
  await napKho();
})();

// ---------- bản nào ----------

async function hoiGoi() {
  try {
    const { data, error } = await db.rpc('goi_cua_toi');
    // Hỏi không được thì coi như có bản đầy đủ. Máy chủ vẫn chặn lại
    // nếu thật ra không có, nên không mất tiền; còn chặn oan ở đây thì
    // em đang có quyền dùng lại bị đẩy sang bản miễn phí.
    traPhi = (error || !data) ? true : !!data.tra_phi;
  } catch (e) { traPhi = true; }

  if (traPhi) return;

  document.body.classList.add('ban-mp');

  $('noi-gioi').textContent =
    'Em đọc to câu mẫu, máy đối chiếu rồi cho biết nó nghe ra những từ nào. ' +
    'Phần này không giới hạn lượt.';
  $('noi-dan').innerHTML =
    'Em đang dùng <b>bản miễn phí</b>. Bản đầy đủ chấm ngữ pháp, từ vựng, mạch lạc ' +
    'và phát âm tới từng âm — nhắn cô để mở.';
  $('noi-cum-truoc').textContent = 'Cụm từ nên học trong câu này:';
  $('noi-cum-sau').textContent = '';

  // Chỗ này KHÔNG dùng bao() được: deMoi() xoá #noi-bao mỗi lần đổi
  // đề, nên em sẽ thấy nút biến mất mà không có lời giải thích nào.
  if (!SpeechRec) {
    $('noi-khongnghe').innerHTML =
      '<b>Máy này chưa chạy được phần đọc theo câu mẫu.</b>' +
      '<p>Phần này nhờ trình duyệt nghe giọng nói, mà Safari trên iPhone và iPad ' +
      'chưa cho trang web làm việc đó. Em mở bằng <b>Chrome</b> trên máy tính, ' +
      'hoặc dùng máy <b>Android</b>, là chạy được.</p>' +
      '<p>Còn ở đây em vẫn bấm 🔊 nghe câu mẫu và tập đọc theo bình thường.</p>';
  }
}

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

  // goi_y mách hướng TRẢ LỜI, nên ở bản miễn phí (đọc theo mẫu) nó
  // không có nghĩa gì — thay bằng việc nhắc em đọc gì.
  if (!traPhi) {
    $('noi-goiy').innerHTML = '💡 Bấm 🔊 nghe câu mẫu trước, rồi đọc lại thật rõ.';
    $('noi-goiy').classList.remove('hidden');
  } else if (d.goi_y) {
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
  $('btn-ghi').textContent = nhanGhi();
  nghedDuocTam = '';

  // Bản miễn phí trên iPhone thì không có gì để bấm: bộ nhận diện của
  // Safari không chạy, mà bản miễn phí chỉ dựa vào nó.
  const chiu = !traPhi && !SpeechRec;
  $('btn-ghi').classList.toggle('hidden', chiu);
  $('noi-khongnghe').classList.toggle('hidden', !chiu);
}

function nhanGhi() {
  return traPhi ? '🎙 Bấm để nói' : '🎙 Bấm rồi đọc câu mẫu';
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

  $('btn-ghi').textContent = traPhi
    ? '⏹ Đang nghe — bấm để dừng'
    : '⏹ Đang nghe — đọc xong bấm lại';
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
  $('btn-ghi').textContent = traPhi ? 'Đang chấm…' : 'Đang đối chiếu…';

  if (recTam) { try { recTam.stop(); } catch (e) {} recTam = null; }

  let ra;
  try { ra = await GhiAm.dungLai(); }
  catch (e) {
    $('btn-ghi').disabled = false;
    $('btn-ghi').textContent = nhanGhi();
    return toast(e.message || 'Không ghi được', 'bad');
  }

  if (ra.giay < 1) {
    $('btn-ghi').disabled = false;
    $('btn-ghi').textContent = nhanGhi();
    return toast('Ngắn quá, em nói dài hơn một chút nhé.', 'bad');
  }

  if (urlNghe) URL.revokeObjectURL(urlNghe);
  urlNghe = URL.createObjectURL(ra.nghe);
  $('noi-playback').src = urlNghe;
  $('noi-playback').classList.remove('hidden');

  // Bản miễn phí dừng ở đây: không gửi gì lên máy chủ, không gọi AI,
  // không gọi Azure. Tất cả làm bằng chữ mà trình duyệt nghe ra.
  if (!traPhi) return docMau();

  await chamHet(ra.wav);
}

// ============================================================
// Bản miễn phí — đọc theo câu mẫu
// ============================================================
//
// Đối chiếu chữ trình duyệt nghe ra với câu mẫu, theo thứ tự: đi dọc
// câu mẫu, mỗi từ tìm trong phần chữ còn lại. Làm vậy thì em nói thêm
// hay bỏ một từ ở giữa cũng không làm lệch hết những từ sau.

function gotTu(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9']/g, '');
}

function chuanTu(s) {
  return String(s || '').split(/\s+/).map(gotTu).filter(Boolean);
}

// Giữ nguyên chữ hoa và dấu câu của câu mẫu để hiện lên cho đẹp, chỉ
// gọt khi đem đi so.
function doiChieu(mau, nghe) {
  const a = String(mau || '').split(/\s+/).filter(Boolean);
  const b = chuanTu(nghe);
  const ra = [];
  let i = 0;

  for (const goc of a) {
    const t = gotTu(goc);
    if (!t) continue;

    let gap = -1;
    for (let j = i; j < b.length; j++) { if (b[j] === t) { gap = j; break; } }
    if (gap >= 0) { ra.push({ tu: goc, khop: true }); i = gap + 1; }
    else { ra.push({ tu: goc, khop: false }); }
  }

  return ra;
}

function docMau(cauTruyen) {
  const cau = String(cauTruyen || nghedDuocTam || '').trim();
  xongCham();

  if (!cau) {
    return toast('Chưa nghe được gì. Em đọc to hơn và gần micro hơn nhé.', 'bad');
  }

  const mau = deHienTai.tinh_huong;
  const ds = doiChieu(mau, cau);
  const khop = ds.filter(function (x) { return x.khop; }).length;
  const thieu = ds.filter(function (x) { return !x.khop; })
    .map(function (x) { return gotTu(x.tu); });

  let html =
    '<div class="noi-cau"><span class="noi-cau-nhan">Câu mẫu</span>' +
      '<p class="noi-doi">' + ds.map(function (x) {
        return '<span class="' + (x.khop ? 'tu-khop' : 'tu-hut') + '">' + esc(x.tu) + '</span>';
      }).join(' ') + '</p>' +
    '</div>' +

    '<div class="noi-cau"><span class="noi-cau-nhan">Máy nghe ra</span>' +
      '<p>' + esc(cau) + '</p></div>' +

    '<p class="noi-dem-tu"><b>' + khop + '/' + ds.length + '</b> từ trong câu mẫu ' +
      'máy nghe ra được.' + (thieu.length
        ? ' Chưa nghe ra: ' + thieu.map(function (t) { return '<b>' + esc(t) + '</b>'; }).join(', ') + '.'
        : ' Trọn câu.') + '</p>' +

    '<p class="noi-thatthe">Máy không nghe ra một từ <b>không chắc</b> là em đọc sai từ đó — ' +
      'micro rè hay nói nhanh cũng làm nó bỏ từ. Đây là phần tập đọc, không phải điểm phát âm. ' +
      'Điểm phát âm thật, tới từng âm, nằm ở bản đầy đủ.</p>' +

    '<div class="noi-diem mo">' +
      ['Ngữ pháp', 'Từ vựng', 'Mạch lạc'].map(function (t) {
        return '<span class="noi-mot"><i>' + t + '</i><b>—</b></span>';
      }).join('') +
    '</div>' +

    '<div class="noi-nangcap">' +
      '<b>Bản đầy đủ có thêm</b>' +
      '<ul>' +
        '<li>Em tự nghĩ câu trả lời theo tình huống, không đọc theo mẫu nữa.</li>' +
        '<li>Chấm ngữ pháp, từ vựng, mạch lạc — kèm chỗ sai và cách sửa.</li>' +
        '<li>Điểm phát âm tới từng âm, chỉ đúng âm nào đọc hụt.</li>' +
        '<li>Một câu mẫu hay hơn cho đúng tình huống đó.</li>' +
      '</ul>' +
      '<p>Em nhắn cô để mở bản đầy đủ. Học viên đang trong lớp của cô thì có sẵn rồi.</p>' +
    '</div>';

  $('noi-ketqua').innerHTML = html;
  $('noi-ketqua').classList.remove('hidden');

  luuDocMau(cau, khop, ds.length, thieu);
}

// Vẫn lưu lại, nhưng để trống hết các cột điểm. Cô xem được em có
// luyện hay không mà không có con số nào bịa ra trong hồ sơ.
async function luuDocMau(cau, khop, tong, thieu) {
  try {
    await db.from('luot_noi').insert({
      student_id: me.id,
      de_id: deHienTai.id,
      cau_noi: cau,
      chi_tiet: { che_do: 'doc-mau', khop: khop, tong_tu: tong, tu_hut: thieu }
    });
    await db.rpc('de_noi_dem', { p_id: deHienTai.id });
  } catch (e) { /* không lưu được thì thôi */ }
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

    // Gói vừa hết hạn, hoặc cô vừa chuyển em sang bản miễn phí giữa
    // lúc em đang học. Chuyển sang bản miễn phí ngay, đừng báo lỗi.
    if (r.status === 402 || (kq && kq.can_tra_phi)) {
      traPhi = false;
      document.body.classList.add('ban-mp');
      return docMau(cau);
    }

    if (!r.ok) { xongCham(); return toast(kq.loi || 'Không chấm được.', 'bad'); }
  } catch (e) { xongCham(); return toast('Mất kết nối, thử lại sau nhé.', 'bad'); }

  veKetQua(cau, kq, am);
  luuLuot(cau, kq, am);
  xongCham();
}

function xongCham() {
  $('btn-ghi').classList.add('hidden');
  $('btn-ghi').disabled = false;
  $('btn-ghi').textContent = nhanGhi();
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
