// ============================================================
// Pacedemy — họ nhà từ (word family)
//
// Đây là BẢN MẪU một họ từ, dữ liệu viết sẵn trong file này để cô
// xem thử hình hài trước khi quyết có làm cho cả 525 từ hay không.
// Chưa nối vào cơ sở dữ liệu.
//
// Vì sao không vẽ dạng cây toả nhánh như mấy trang khác hay làm:
// một gốc từ có khi mười hai thành viên. Toả ra mười hai thẻ có
// đường nối thì trên màn hình máy tính nhìn đẹp, nhưng trên điện
// thoại — chỗ học viên học thật — nó thành cái bản đồ phải kéo qua
// kéo lại. Nên ở đây xếp dọc: gốc trên cùng, mỗi thành viên một
// dòng, bấm vào mới mở chi tiết. Đọc một mạch từ trên xuống.
//
// Và phần quan trọng hơn cái cây: NHÌN ra họ hàng không có nghĩa là
// CHỌN đúng lúc đi thi. Nên sau danh sách là năm câu điền chỗ trống,
// bốn phương án đúng là bốn thành viên trong họ — đúng kiểu Part 5
// ra đề. Sai thì nói thẳng dấu hiệu ngữ pháp, không chỉ báo sai.
// ============================================================

const HO = {
  goc: 'consider',
  nghia_goc: 'cân nhắc, xem xét',
  tu: [
    {
      tu: 'consider', duoi: null, loai: 'v', cap: 'B1',
      am: '/kənˈsɪdər/',
      nghia: 'cân nhắc, xem xét',
      dinh_nghia: 'suy nghĩ kỹ về một việc, thường là trước khi quyết định',
      cum: ['consider all options', 'carefully consider', 'consider a proposal'],
      vi_du: 'Please take your time to consider our job offer.',
      vi_du_vi: 'Xin dành thời gian cân nhắc lời mời làm việc của chúng tôi.'
    },
    {
      tu: 'consideration', duoi: '-ation', loai: 'n', cap: 'B2',
      am: '/kənˌsɪdəˈreɪʃn/',
      nghia: 'sự cân nhắc',
      dinh_nghia: 'việc suy nghĩ cẩn thận, thường kéo dài một thời gian',
      cum: ['take into consideration', 'under consideration', 'careful consideration'],
      vi_du: 'The proposal is still under consideration.',
      vi_du_vi: 'Đề xuất đó vẫn đang được xem xét.'
    },
    {
      tu: 'considerable', duoi: '-able', loai: 'adj', cap: 'B2',
      am: '/kənˈsɪdərəbl/',
      nghia: 'đáng kể, lớn (về số lượng, mức độ)',
      dinh_nghia: 'lớn về kích cỡ, số lượng hoặc mức độ',
      cum: ['a considerable amount', 'considerable experience', 'considerable progress'],
      vi_du: 'The company has made considerable progress this quarter.',
      vi_du_vi: 'Công ty đã có tiến bộ đáng kể trong quý này.'
    },
    {
      tu: 'considerably', duoi: '-ably', loai: 'adv', cap: 'B2',
      am: '/kənˈsɪdərəbli/',
      nghia: 'một cách đáng kể, nhiều',
      dinh_nghia: 'ở mức đáng chú ý; nhiều',
      cum: ['increase considerably', 'vary considerably', 'considerably lower'],
      vi_du: 'Sales increased considerably after the campaign.',
      vi_du_vi: 'Doanh số tăng đáng kể sau chiến dịch.'
    },
    {
      tu: 'considerate', duoi: '-ate', loai: 'adj', cap: 'B2',
      am: '/kənˈsɪdərət/',
      nghia: 'chu đáo, biết nghĩ cho người khác',
      dinh_nghia: 'tử tế, để ý đến cảm xúc của người khác',
      cum: ['considerate of others', 'a considerate colleague'],
      vi_du: 'It was considerate of you to call ahead.',
      vi_du_vi: 'Bạn gọi báo trước là chu đáo quá.',
      // Hai tính từ cùng gốc mà khác nghĩa hẳn — ETS rất hay bắt chỗ này
      bay: 'Đừng lẫn với <b>considerable</b>. <b>considerate</b> nói về tính cách con người, ' +
           '<b>considerable</b> nói về số lượng, mức độ.'
    }
  ]
};

// Năm câu luyện. Mỗi câu chừa đúng một chỗ, bốn phương án đều là
// thành viên trong họ — không pha từ lạ vào, vì cái cần luyện là
// chọn ĐÚNG TỪ LOẠI chứ không phải đoán nghĩa.
const CAU = [
  {
    cau: 'The board will ______ the new budget proposal at next week\'s meeting.',
    pa: ['consider', 'consideration', 'considerable', 'considerably'],
    dung: 'consider',
    vi: 'Hội đồng sẽ xem xét đề xuất ngân sách mới tại cuộc họp tuần sau.',
    dau: 'Sau <b>will</b> phải là động từ nguyên thể.',
    giai: 'Chỗ trống đứng ngay sau <b>will</b>, nên chỉ có thể là động từ nguyên mẫu: ' +
          '<b>consider</b>. Ba phương án kia là danh từ, tính từ, trạng từ — lắp vào sau ' +
          '<b>will</b> đều sai ngữ pháp.'
  },
  {
    cau: 'We took your suggestion into ______ before making the final decision.',
    pa: ['consider', 'consideration', 'considerable', 'considerate'],
    dung: 'consideration',
    vi: 'Chúng tôi đã cân nhắc gợi ý của bạn trước khi quyết định.',
    dau: '<b>take ... into ______</b> là cụm cố định, sau giới từ phải là danh từ.',
    giai: 'Sau giới từ <b>into</b> phải là danh từ, nên chọn <b>consideration</b>. ' +
          'Đây còn là cụm quen dùng <b>take something into consideration</b> — gặp nhiều ' +
          'trong Part 5, thuộc nguyên cụm là làm được ngay.'
  },
  {
    cau: 'The new software saved the team a ______ amount of time.',
    pa: ['consider', 'consideration', 'considerable', 'considerably'],
    dung: 'considerable',
    vi: 'Phần mềm mới giúp cả nhóm tiết kiệm được một lượng thời gian đáng kể.',
    dau: 'Giữa <b>a</b> và danh từ <b>amount</b> phải là tính từ.',
    giai: 'Chỗ trống nằm giữa mạo từ <b>a</b> và danh từ <b>amount</b>, nên phải là tính từ: ' +
          '<b>considerable</b>. Nhớ mẹo: thấy <b>a ____ + danh từ</b> là điền tính từ.'
  },
  {
    cau: 'Shipping costs vary ______ depending on the destination.',
    pa: ['consider', 'consideration', 'considerable', 'considerably'],
    dung: 'considerably',
    vi: 'Phí vận chuyển chênh nhau khá nhiều tuỳ điểm đến.',
    dau: 'Bổ nghĩa cho động từ <b>vary</b> thì phải là trạng từ.',
    giai: 'Chỗ trống đứng ngay sau động từ <b>vary</b> và không có danh từ nào theo sau, ' +
          'nên nó bổ nghĩa cho động từ — phải là trạng từ <b>considerably</b>. ' +
          'Đuôi <b>-ly</b> hay <b>-ably</b> gần như luôn là trạng từ.'
  },
  {
    cau: 'It was very ______ of Ms. Tanaka to send a thank-you note.',
    pa: ['considerate', 'considerable', 'consideration', 'considerably'],
    dung: 'considerate',
    vi: 'Cô Tanaka gửi thư cảm ơn thật là chu đáo.',
    dau: 'Nói về tính cách con người, không phải về số lượng.',
    giai: 'Sau <b>very</b> cần tính từ, mà ở đây có hai tính từ. Câu đang khen một người, ' +
          'nên phải là <b>considerate</b> (chu đáo). <b>considerable</b> chỉ dùng cho số lượng, ' +
          'mức độ — không bao giờ khen người. Đây đúng là bẫy ETS hay gài.'
  }
];

const $ = function (id) { return document.getElementById(id); };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TEN_LOAI = { v: 'động từ', n: 'danh từ', adj: 'tính từ', adv: 'trạng từ' };

// ---------- Màn 1 · danh sách họ từ ----------

function veHo() {
  let html =
    '<div class="ht-goc">' +
      '<span class="ht-goc-nhan">Gốc từ</span>' +
      '<h1>' + esc(HO.goc) + '</h1>' +
      '<p>' + esc(HO.nghia_goc) + ' · ' + HO.tu.length + ' từ cùng họ</p>' +
    '</div>';

  html += '<div class="ht-ds">';

  HO.tu.forEach(function (t, i) {
    html +=
      '<div class="ht-tu" data-i="' + i + '">' +
        '<button class="ht-dau" type="button" data-mo="' + i + '">' +
          '<span class="ht-duoi' + (t.duoi ? '' : ' ht-duoi-goc') + '">' +
            esc(t.duoi || 'gốc') + '</span>' +
          '<span class="ht-chu">' +
            '<b>' + esc(t.tu) + '</b>' +
            '<span class="ht-loai">' + esc(TEN_LOAI[t.loai] || t.loai) + '</span>' +
          '</span>' +
          '<span class="ht-nghia">' + esc(t.nghia) + '</span>' +
          '<span class="ht-mui" aria-hidden="true"></span>' +
        '</button>' +

        '<div class="ht-chi-tiet" hidden>' +
          '<p class="ht-am">' +
            '<button class="ht-loa" type="button" data-doc="' + esc(t.tu) + '" ' +
              'aria-label="Nghe cách đọc">🔊</button>' +
            '<code>' + esc(t.am) + '</code>' +
            '<span class="ht-cap">' + esc(t.cap) + '</span>' +
          '</p>' +
          '<p class="ht-dn">' + esc(t.dinh_nghia) + '</p>' +
          '<p class="ht-cum">' + t.cum.map(function (c) {
            return '<span>' + esc(c) + '</span>';
          }).join('') + '</p>' +
          '<p class="ht-vd">' + esc(t.vi_du) + '<br>' +
            '<i>' + esc(t.vi_du_vi) + '</i></p>' +
          (t.bay ? '<p class="ht-bay">' + t.bay + '</p>' : '') +
        '</div>' +
      '</div>';
  });

  html += '</div>';

  html +=
    '<div class="ht-nut">' +
      '<button class="btn btn-gold" type="button" id="ht-luyen">Luyện họ từ này · 5 câu</button>' +
    '</div>';

  $('view-ho').innerHTML = html;

  $('view-ho').querySelectorAll('[data-mo]').forEach(function (b) {
    b.addEventListener('click', function () {
      const the = b.parentElement;
      const ct = the.querySelector('.ht-chi-tiet');
      const dangMo = !ct.hidden;
      ct.hidden = dangMo;
      the.classList.toggle('ht-mo', !dangMo);
    });
  });

  $('view-ho').querySelectorAll('[data-doc]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof Speak !== 'undefined') Speak.say(b.dataset.doc);
    });
  });

  $('ht-luyen').addEventListener('click', batDau);
}

// ---------- Màn 2 · luyện ----------

let viTri = 0;
let dung = 0;
let saiList = [];
let batDauLuc = 0;

function batDau() {
  viTri = 0; dung = 0; saiList = []; batDauLuc = Date.now();
  $('view-ho').classList.add('hidden');
  $('view-luyen').classList.remove('hidden');
  $('view-done').classList.add('hidden');
  window.scrollTo(0, 0);
  veCau();
}

function veCau() {
  const c = CAU[viTri];

  $('ht-dem').textContent = 'Câu ' + (viTri + 1) + ' / ' + CAU.length;
  $('ht-thanh').style.width = (viTri / CAU.length * 100) + '%';

  $('ht-cau').innerHTML = esc(c.cau).replace(/______/g, '<span class="ht-trong">______</span>');

  $('ht-pa').innerHTML = c.pa.map(function (p) {
    return '<button class="ht-chon" type="button" data-pa="' + esc(p) + '">' + esc(p) + '</button>';
  }).join('');

  $('ht-ket').innerHTML = '';
  $('ht-ket').className = 'ht-ket';
  $('ht-tiep').classList.add('hidden');

  $('ht-pa').querySelectorAll('.ht-chon').forEach(function (b) {
    b.addEventListener('click', function () { tra(b.dataset.pa, c); });
  });
}

function tra(chon, c) {
  const laDung = chon === c.dung;

  $('ht-pa').querySelectorAll('.ht-chon').forEach(function (b) {
    b.disabled = true;
    if (b.dataset.pa === c.dung) b.classList.add('ht-chon-dung');
    else if (b.dataset.pa === chon) b.classList.add('ht-chon-sai');
  });

  if (laDung) {
    dung++;
    if (typeof Am !== 'undefined') Am.dung();
  } else {
    saiList.push({ c: c, chon: chon });
    if (typeof Am !== 'undefined') Am.sai();
  }

  // Dấu hiệu ngữ pháp hiện TRƯỚC phần giải thích dài: đó mới là thứ
  // học viên mang vào phòng thi được
  $('ht-ket').className = 'ht-ket ' + (laDung ? 'ht-ket-dung' : 'ht-ket-sai');
  $('ht-ket').innerHTML =
    '<p class="ht-ket-dau">' + (laDung ? 'Đúng rồi.' : 'Chưa đúng.') + ' ' + c.dau + '</p>' +
    '<p class="ht-ket-giai">' + c.giai + '</p>' +
    '<p class="ht-ket-vi">' + esc(c.vi) + '</p>';

  $('ht-tiep').classList.remove('hidden');
  $('ht-tiep').textContent = viTri === CAU.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo';
}

$('ht-tiep').addEventListener('click', function () {
  viTri++;
  if (viTri < CAU.length) { veCau(); window.scrollTo(0, 0); return; }
  xong();
});

function xong() {
  $('ht-thanh').style.width = '100%';
  $('view-luyen').classList.add('hidden');
  $('view-done').classList.remove('hidden');
  window.scrollTo(0, 0);

  // Phần chữa bài: chỉ hiện những câu sai, kèm lại dấu hiệu ngữ pháp
  $('ht-sai').innerHTML = saiList.length
    ? saiList.map(function (x) {
        return '<div class="wrong-q">' +
          '<p class="wq">' + esc(x.c.cau).replace(/______/g,
            '<b>' + esc(x.c.dung) + '</b>') + '</p>' +
          '<p class="wa">Bạn chọn <s>' + esc(x.chon) + '</s> · đáp án ' +
            '<b>' + esc(x.c.dung) + '</b></p>' +
          '<p class="ww">' + x.c.dau + '</p>' +
        '</div>';
      }).join('')
    : '';

  if (typeof XongBai !== 'undefined') {
    XongBai.ve($('view-done'), {
      dung: dung, tong: CAU.length,
      giay: Math.round((Date.now() - batDauLuc) / 1000),
      ten: 'Họ từ · ' + HO.goc,
      xemLai: 'ht-sai'
    });
  }
}

$('ht-lai').addEventListener('click', batDau);

$('ht-ve').addEventListener('click', function () {
  $('view-done').classList.add('hidden');
  $('view-luyen').classList.add('hidden');
  $('view-ho').classList.remove('hidden');
  window.scrollTo(0, 0);
});

// ---------- Khởi động ----------

(async function () {
  const me = await requireLogin();
  if (!me) return;
  veHo();
})();
