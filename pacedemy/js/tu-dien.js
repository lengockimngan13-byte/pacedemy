// ============================================================
// Pacedemy — từ điển
//
// Nguồn là chính kho từ của cô Ngân, không mượn dữ liệu của ai.
// Được ba thứ mà từ điển ngoài không có: nghĩa viết theo cách cô dạy,
// ví dụ lấy từ ngữ cảnh TOEIC, và mỗi từ đều gắn với chủ đề đang học.
//
// Kho còn nhỏ nên cách xử lý "không tìm thấy" mới là phần quan trọng:
// mỗi lần học viên tra hụt, hệ thống ghi lại vào bảng tra_cuu_hut.
// Danh sách đó chính là thứ tự ưu tiên bổ sung từ cho cô.
//
// Toàn bộ kho tải một lần rồi tìm ngay trên máy, nên gõ tới đâu ra
// kết quả tới đó, không phải chờ mạng từng chữ.
// ============================================================

let me = null;
let kho = [];          // toàn bộ từ, đã chuẩn hoá sẵn để tìm
let chuDe = {};        // id -> tên chủ đề
let soTu = new Set();  // từ đã có trong sổ từ của học viên
let daGhiHut = new Set();

const $ = function (id) { return document.getElementById(id); };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bỏ dấu tiếng Việt để gõ "hoa don" vẫn ra "hoá đơn"
function bo(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim();
}

// ---------- Nạp kho ----------

async function napKho() {
  const [{ data: ws }, { data: ts }] = await Promise.all([
    db.from('vocabulary')
      .select('id, topic_id, word, phonetic, pos, meaning_vi, dinh_nghia_vi, vi_du, ghi_chu, ' +
              'example_en, example_vi, synonyms, collocations, image_url')
      .order('word'),
    db.from('topics').select('id, name_vi, slug')
  ]);

  for (const t of (ts || [])) chuDe[t.id] = t.name_vi;

  kho = (ws || []).map(function (w) {
    return Object.assign({}, w, {
      kAnh: bo(w.word),
      kViet: bo(w.meaning_vi),
      kTheo: bo(w.synonyms || '') + ' ' + bo(w.collocations || '')
    });
  });
}

async function napSoTu() {
  if (!me) return;
  const { data } = await db.from('tu_cua_toi').select('tu').eq('user_id', me.id);
  soTu = new Set((data || []).map(function (r) { return String(r.tu).toLowerCase(); }));
}

// ---------- Tìm ----------
// Xếp hạng: trùng khít > bắt đầu bằng > chứa trong từ > chứa trong nghĩa.
// Có xếp hạng thì gõ "in" ra "invoice" trước "training", đúng cái người
// ta mong hơn là trả về theo thứ tự chữ cái.

function tim(q) {
  const k = bo(q);
  if (!k) return [];

  const ra = [];

  for (const w of kho) {
    let diem = 0;

    if (w.kAnh === k) diem = 100;
    else if (w.kAnh.indexOf(k) === 0) diem = 80;
    else if (w.kViet === k) diem = 70;
    else if (w.kViet.indexOf(k) === 0) diem = 60;
    else if (w.kAnh.indexOf(k) > 0) diem = 45;
    else if (w.kViet.indexOf(k) > 0) diem = 35;
    else if (w.kTheo.indexOf(k) >= 0) diem = 20;

    if (diem) ra.push({ w: w, diem: diem });
  }

  ra.sort(function (a, b) {
    return b.diem - a.diem || a.w.kAnh.length - b.w.kAnh.length ||
           a.w.kAnh.localeCompare(b.w.kAnh);
  });

  return ra.map(function (x) { return x.w; });
}

// ---------- Vẽ một từ ----------

// Thẻ từ dựng theo kiểu từ điển thật, không phải một dòng nghĩa:
// khối tiếng Việt ở trên, khối tiếng Anh ở dưới, rồi tới ví dụ và ghi chú.
// Mỗi khối chỉ hiện khi có dữ liệu, nên từ nào cô chưa soạn kỹ vẫn gọn gàng.

const LOAI = {
  n: 'NOUN', v: 'VERB', adj: 'ADJ', adv: 'ADV',
  prep: 'PREP', conj: 'CONJ', pron: 'PRON',
  phr: 'CỤM TỪ', 'phr v': 'ĐỘNG TỪ CỤM'
};

function nutNghe(text, nho) {
  return '<button class="td-loa' + (nho ? ' td-loa-nho' : '') + '" type="button" ' +
           'data-doc="' + esc(text) + '" aria-label="Nghe phát âm">' +
           '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
             '<path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>' +
           '</svg></button>';
}

function veTu(w, q) {
  const trongSo = soTu.has(String(w.word).toLowerCase());
  const ten = chuDe[w.topic_id];
  const loai = LOAI[w.pos] || (w.pos ? w.pos.toUpperCase() : '');

  let html = '<article class="td-the">';

  // ---- khối tiếng Việt ----
  html += '<div class="td-khoi td-khoi-vi">' +
            '<div>' +
              '<p class="td-nhan">TIẾNG VIỆT</p>' +
              '<h3 class="td-vi">' + danhDau(w.meaning_vi, q) + '</h3>' +
            '</div>' +
            (w.image_url
              ? '<img class="td-anh" src="' + esc(w.image_url) + '" alt="" loading="lazy">'
              : '') +
          '</div>';

  // ---- khối tiếng Anh ----
  html += '<div class="td-khoi">' +
            '<p class="td-nhan">TIẾNG ANH</p>' +
            '<div class="td-dau">' +
              '<h3 class="td-en">' + danhDau(w.word, q) + '</h3>' +
              (loai ? '<span class="td-loai">' + esc(loai) + '</span>' : '') +
            '</div>' +
            '<p class="td-am">' +
              (w.phonetic ? esc(w.phonetic) + ' ' : '') + nutNghe(w.word) +
            '</p>' +
          '</div>';

  // ---- định nghĩa ----
  const dn = w.dinh_nghia_vi || w.meaning_vi;
  html += '<p class="td-nghia">' + danhDau(dn, q) + '</p>';

  // ---- ví dụ ----
  let vd = Array.isArray(w.vi_du) ? w.vi_du : [];
  if (!vd.length && w.example_en) vd = [{ vi: w.example_vi, en: w.example_en }];
  vd = vd.filter(function (x) { return x && x.en; });

  if (vd.length) {
    html += '<section class="td-hop td-hop-vd">' +
              '<p class="td-hop-dau">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
                  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<path d="M4 5h16v11H9l-5 4z"/></svg>Ví dụ</p>' +
              '<ol class="td-vd">' +
              vd.map(function (x) {
                return '<li>' +
                         (x.vi ? '<p class="td-vd-vi">' + esc(x.vi) + '</p>' : '') +
                         '<p class="td-vd-en">' + nutNghe(x.en, true) +
                           '<span>' + esc(x.en) + '</span></p>' +
                       '</li>';
              }).join('') +
              '</ol>' +
            '</section>';
  }

  // ---- ghi chú của cô ----
  if (w.ghi_chu) {
    html += '<section class="td-hop td-hop-gc">' +
              '<p class="td-hop-dau">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
                  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<path d="M5 3h14v18l-7-4-7 4zM9 8h6M9 12h4"/></svg>Ghi chú</p>' +
              '<div class="td-gc">' + vanBan(w.ghi_chu) + '</div>' +
            '</section>';
  }

  // ---- từ gần nghĩa và cụm hay đi kèm ----
  const them = [];
  if (w.synonyms) them.push(['Gần nghĩa', w.synonyms]);
  if (w.collocations) them.push(['Hay đi với', w.collocations]);
  if (them.length) {
    html += '<dl class="td-them">' + them.map(function (x) {
      return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  html += '<div class="td-chan">' +
            (ten ? '<a class="q-tag" href="topic.html?id=' + w.topic_id + '">' + esc(ten) + '</a>' : '') +
            '<button class="btn-sm' + (trongSo ? '' : ' test') + '" type="button" ' +
              'data-luu="' + esc(w.word) + '"' + (trongSo ? ' disabled' : '') + '>' +
              (trongSo ? 'Đã có trong sổ từ' : '+ Lưu vào sổ từ') +
            '</button>' +
          '</div>';

  return html + '</article>';
}

// Ghi chú cô gõ nhiều dòng, giữ nguyên cách xuống dòng và cho in đậm
// bằng **hai dấu sao**, vì cô hay viết kiểu đó trong giáo án.
function vanBan(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .split(/\n{2,}/)
    .map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; })
    .join('');
}

// Tô vàng đúng đoạn người ta vừa gõ, kể cả khi họ gõ không dấu
function danhDau(text, q) {
  const s = String(text == null ? '' : text);
  const k = bo(q || '');
  if (!k) return esc(s);

  const kho2 = bo(s);
  const i = kho2.indexOf(k);
  if (i < 0) return esc(s);

  // bo() giữ nguyên số ký tự nên vị trí trong chuỗi gốc khớp 1-1
  return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + k.length)) + '</mark>' +
         esc(s.slice(i + k.length));
}

// ---------- Không tìm thấy ----------

async function ghiHut(q) {
  const k = String(q || '').trim().toLowerCase();
  if (!k || daGhiHut.has(k)) return;
  if (!/^[a-z][a-z'\- ]*$/.test(k)) return;   // chỉ ghi khi trông như từ tiếng Anh
  daGhiHut.add(k);
  try { await db.rpc('ghi_tra_cuu_hut', { p_tu: k }); } catch (e) { /* ghi hụt thì thôi */ }
}

function veKhongCo(q) {
  const laAnh = /^[a-zA-Z][a-zA-Z'\- ]*$/.test(q.trim());

  return '<div class="td-trong">' +
           '<p class="td-trong-dau">Từ điển chưa có «' + esc(q.trim()) + '»</p>' +
           (laAnh
             ? '<p>Đã ghi lại để cô Ngân bổ sung. Từ nào nhiều bạn tra thì cô thêm trước.</p>'
             : '<p>Bạn thử gõ lại, hoặc gõ từ tiếng Anh xem sao.</p>') +
           '<div class="td-trong-nut">' +
             '<a class="btn-sm test" href="vocab.html">Xem các chủ đề từ vựng</a>' +
             '<a class="btn-sm" href="so-tu.html">Mở sổ từ của tôi</a>' +
           '</div>' +
         '</div>';
}

// ---------- Vẽ kết quả ----------

let goLan = 0;

function chay() {
  const q = $('q').value;
  $('q-xoa').classList.toggle('hidden', !q);

  if (!q.trim()) {
    $('ket-qua').innerHTML = '';
    $('dem').textContent = '';
    $('duyet').classList.remove('hidden');
    return;
  }

  $('duyet').classList.add('hidden');

  const ds = tim(q);

  if (!ds.length) {
    $('dem').textContent = '';
    $('ket-qua').innerHTML = veKhongCo(q);
    const lan = ++goLan;
    // chờ một nhịp rồi mới ghi, để người đang gõ dở không bị ghi oan
    setTimeout(function () { if (lan === goLan) ghiHut(q); }, 1200);
    return;
  }

  $('dem').textContent = ds.length + ' từ';
  $('ket-qua').innerHTML = ds.slice(0, 60).map(function (w) { return veTu(w, q); }).join('') +
    (ds.length > 60 ? '<p class="td-dem">Còn ' + (ds.length - 60) + ' từ nữa, bạn gõ thêm cho gọn lại nhé.</p>' : '');
}

// ---------- Duyệt ----------

function veDuyet() {
  const chu = {};
  for (const w of kho) {
    const c = (w.kAnh[0] || '#').toUpperCase();
    chu[c] = (chu[c] || 0) + 1;
  }

  $('chu-cai').innerHTML = Object.keys(chu).sort().map(function (c) {
    return '<button class="td-chu-nut" type="button" data-chu="' + c + '">' +
             c + '<span>' + chu[c] + '</span></button>';
  }).join('');

  const dem = {};
  for (const w of kho) dem[w.topic_id] = (dem[w.topic_id] || 0) + 1;

  $('chu-de').innerHTML = Object.keys(chuDe)
    .filter(function (id) { return dem[id]; })
    .sort(function (a, b) { return chuDe[a].localeCompare(chuDe[b], 'vi'); })
    .map(function (id) {
      return '<a class="td-chude-o" href="topic.html?id=' + id + '">' +
               '<b>' + esc(chuDe[id]) + '</b><span>' + dem[id] + ' từ</span></a>';
    }).join('');
}

// ---------- Nối dây ----------

let hen = null;

$('q').addEventListener('input', function () {
  clearTimeout(hen);
  hen = setTimeout(chay, 120);
});

$('q-xoa').addEventListener('click', function () {
  $('q').value = '';
  $('q').focus();
  chay();
});

$('chu-cai').addEventListener('click', function (e) {
  const b = e.target.closest('[data-chu]');
  if (!b) return;
  $('q').value = b.dataset.chu.toLowerCase();
  chay();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('click', async function (e) {
  const nghe = e.target.closest('[data-doc]');
  if (nghe) {
    if (typeof Speak !== 'undefined') Speak.say(nghe.dataset.doc);
    return;
  }

  const luu = e.target.closest('[data-luu]');
  if (!luu || luu.disabled) return;

  const tu = luu.dataset.luu;
  const w = kho.find(function (x) { return x.word === tu; });
  if (!w || !me) return;

  luu.disabled = true;
  luu.textContent = 'Đang lưu…';

  const han = new Date(Date.now() + 10 * 60000);   // ôn lại sau 10 phút, hộp 1
  const { error } = await db.from('tu_cua_toi').insert({
    user_id: me.id,
    tu: w.word,
    cau: w.example_en || null,
    cau_vi: w.example_vi || null,
    ghi_chu: w.meaning_vi,
    box: 1,
    next_review: han.toISOString()
  });

  if (error) {
    luu.disabled = false;
    luu.classList.add('test');
    luu.textContent = '+ Lưu vào sổ từ';
    if (typeof toast === 'function') toast('Chưa lưu được: ' + error.message, 'bad');
    return;
  }

  soTu.add(String(w.word).toLowerCase());
  luu.classList.remove('test');
  luu.textContent = 'Đã có trong sổ từ';
  if (typeof toast === 'function') toast('Đã thêm «' + w.word + '» vào sổ từ');
});

// Gõ dấu / ở bất kỳ đâu là nhảy vào ô tra, quen tay như mấy trang tra cứu khác
document.addEventListener('keydown', function (e) {
  if (e.key === '/' && document.activeElement !== $('q')) {
    e.preventDefault();
    $('q').focus();
  }
});

// ---------- Khởi động ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  await napKho();
  await napSoTu();
  veDuyet();

  // cho phép mở thẳng một từ qua đường dẫn: tu-dien.html?q=invoice
  const q = new URLSearchParams(location.search).get('q');
  if (q) { $('q').value = q; chay(); }
})();
