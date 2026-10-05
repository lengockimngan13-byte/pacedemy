// ============================================================
// Pacedemy — hình nền học viên tự chọn
//
// Bấm "Hình nền" ở cuối thanh menu. Dán link ảnh, GIF hoặc YouTube
// (kiểu "study with me"), hoặc chọn một cảnh dựng sẵn.
//
// Ba điều quyết định cách viết chỗ này:
//
//   1. Chữ phải đọc được. Nền video tối mà chữ cũng tối thì học viên
//      không đọc nổi đề. Nên trên nền luôn có một lớp kính mờ, kéo
//      chỉnh được, mặc định đủ mờ để chữ rõ.
//
//   2. Điện thoại không chạy video sẵn. Video nền ngốn pin và nhiều
//      máy chặn tự phát. Mặc định điện thoại chỉ lấy ảnh bìa của
//      video đứng yên; ai muốn chạy video thì tự bật.
//
//   3. Cảnh dựng sẵn vẽ bằng CSS, không tải gì từ mạng. Không có
//      link nào hỏng, không tốn dung lượng của học viên.
//
// Lưu trong máy học viên (localStorage), không lưu lên server: đây
// là sở thích riêng từng người, mỗi em một nền khác nhau cũng được.
// ============================================================

const Nen = (function () {

  const KHOA = 'pacedemy-nen';
  const MO_MAC_DINH = 82;   // độ đục của tấm kính, %

  const CANH = [
    { id: 'som-mai', ten: 'Sớm mai', css:
      'radial-gradient(1200px 700px at 15% 0%, #FFE2B0 0%, rgba(255,226,176,0) 60%),' +
      'radial-gradient(900px 600px at 85% 15%, #FFD3E0 0%, rgba(255,211,224,0) 55%),' +
      'linear-gradient(170deg, #FFF6E8 0%, #E9F2F5 100%)' , nho:
      'radial-gradient(90px 56px at 15% 0%, #FFE2B0 0%, rgba(255,226,176,0) 62%),' +
      'radial-gradient(70px 48px at 88% 18%, #FFD3E0 0%, rgba(255,211,224,0) 58%),' +
      'linear-gradient(170deg, #FFF6E8 0%, #E9F2F5 100%)' },

    { id: 'bien-dem', ten: 'Biển đêm', css:
      'radial-gradient(900px 600px at 80% 8%, #2A7F76 0%, rgba(42,127,118,0) 60%),' +
      'radial-gradient(1000px 700px at 8% 92%, #123A52 0%, rgba(18,58,82,0) 60%),' +
      'linear-gradient(160deg, #0B2235 0%, #16485A 100%)' , nho:
      'radial-gradient(70px 46px at 80% 6%, #2A7F76 0%, rgba(42,127,118,0) 62%),' +
      'radial-gradient(80px 54px at 6% 95%, #123A52 0%, rgba(18,58,82,0) 62%),' +
      'linear-gradient(160deg, #0B2235 0%, #16485A 100%)' },

    { id: 'thu-vien', ten: 'Thư viện', css:
      'radial-gradient(800px 520px at 22% 8%, #F0A830 0%, rgba(240,168,48,0) 55%),' +
      'linear-gradient(165deg, #38281B 0%, #6B4A2E 100%)' , nho:
      'radial-gradient(64px 42px at 22% 6%, #F0A830 0%, rgba(240,168,48,0) 58%),' +
      'linear-gradient(165deg, #38281B 0%, #6B4A2E 100%)' },

    { id: 'rung-mua', ten: 'Rừng mưa', css:
      'radial-gradient(900px 600px at 72% 18%, #8FDCB4 0%, rgba(143,220,180,0) 60%),' +
      'linear-gradient(170deg, #1B4034 0%, #2A7F76 100%)' , nho:
      'radial-gradient(70px 46px at 72% 16%, #8FDCB4 0%, rgba(143,220,180,0) 62%),' +
      'linear-gradient(170deg, #1B4034 0%, #2A7F76 100%)' },

    { id: 'hoang-hon', ten: 'Hoàng hôn', css:
      'radial-gradient(1000px 620px at 50% 112%, #F0A830 0%, rgba(240,168,48,0) 60%),' +
      'linear-gradient(175deg, #512A57 0%, #C25D6C 55%, #F3A66B 100%)' , nho:
      'radial-gradient(80px 50px at 50% 118%, #F0A830 0%, rgba(240,168,48,0) 62%),' +
      'linear-gradient(175deg, #512A57 0%, #C25D6C 55%, #F3A66B 100%)' },

    { id: 'giay-nga', ten: 'Giấy ngà', css:
      'radial-gradient(820px 520px at 86% 0%, #F7EFE1 0%, rgba(247,239,225,0) 60%),' +
      'linear-gradient(180deg, #FDFBF6 0%, #F0F4F0 100%)' , nho:
      'radial-gradient(66px 42px at 86% 0%, #EFE2CC 0%, rgba(239,226,204,0) 62%),' +
      'linear-gradient(180deg, #FDFBF6 0%, #E9EFEA 100%)' }
  ];

  let chup = null;   // bản đang dùng lúc mở hộp, để bấm Huỷ thì trả lại

  // ---------- đọc / ghi ----------

  function doc() {
    try {
      const s = localStorage.getItem(KHOA);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  function luu(o) {
    try {
      if (o && o.kieu) localStorage.setItem(KHOA, JSON.stringify(o));
      else localStorage.removeItem(KHOA);
    } catch (e) { /* máy chặn lưu thì thôi, nền vẫn chạy hết phiên này */ }
  }

  // ---------- nhận dạng link ----------

  function layYoutube(s) {
    const m = String(s).match(
      /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|live\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }

  function nhanDang(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;

    const yt = layYoutube(s);
    if (yt) return { kieu: 'youtube', id: yt };

    // Chỉ nhận https: trang chạy https, link http bị trình duyệt chặn
    // và học viên chỉ thấy nền trắng mà không hiểu vì sao.
    if (/^https:\/\/\S+$/i.test(s)) return { kieu: 'anh', url: s };
    if (/^http:\/\//i.test(s)) return { loi: 'Link phải bắt đầu bằng https.' };
    return { loi: 'Chưa nhận ra link này. Cần link ảnh, GIF hoặc YouTube.' };
  }

  // ---------- vẽ nền ----------

  function laDienThoai() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function thichTinh() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function oLop() {
    let el = document.getElementById('nen-lop');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nen-lop';
    el.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(el, document.body.firstChild);

    const kinh = document.createElement('div');
    kinh.id = 'nen-kinh';
    kinh.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(kinh, el.nextSibling);
    return el;
  }

  function ap(o) {
    if (!document.body) return;

    const goc = document.documentElement;
    const lop = oLop();

    if (!o || !o.kieu) {
      goc.classList.remove('co-nen');
      goc.style.removeProperty('--nen-giay');
      lop.innerHTML = '';
      lop.style.background = '';
      return;
    }

    goc.classList.add('co-nen');
    goc.style.setProperty('--nen-giay', (o.mo == null ? MO_MAC_DINH : o.mo) / 100);

    if (o.kieu === 'canh') {
      const c = CANH.find(function (x) { return x.id === o.id; }) || CANH[0];
      lop.innerHTML = '';
      lop.style.background = c.css;
      return;
    }

    if (o.kieu === 'anh') {
      lop.innerHTML = '';
      lop.style.background =
        '#0C2422 url("' + String(o.url).replace(/"/g, '%22') + '") center / cover no-repeat';
      return;
    }

    if (o.kieu === 'youtube') {
      // hqdefault lúc nào cũng có; maxresdefault nhiều video thiếu,
      // thiếu là ra ô đen chứ không báo gì.
      const bia = 'https://img.youtube.com/vi/' + o.id + '/hqdefault.jpg';
      const chayVideo = (!laDienThoai() || o.video_dt) && !thichTinh();

      if (!chayVideo) {
        lop.innerHTML = '';
        lop.style.background = '#0C2422 url("' + bia + '") center / cover no-repeat';
        return;
      }

      lop.style.background = '#0C2422 url("' + bia + '") center / cover no-repeat';
      lop.innerHTML =
        '<iframe class="nen-yt" title="hình nền" tabindex="-1" frameborder="0" ' +
          'allow="autoplay; encrypted-media" ' +
          'src="https://www.youtube-nocookie.com/embed/' + o.id +
            '?autoplay=1&mute=1&loop=1&playlist=' + o.id +
            '&controls=0&modestbranding=1&rel=0&iv_load_policy=3' +
            '&playsinline=1&disablekb=1&fs=0"></iframe>';
    }
  }

  // ---------- hộp chỉnh ----------

  const $ = function (id) { return document.getElementById(id); };

  function dungHop() {
    if ($('nen-che')) return;

    const o = document.createElement('div');
    o.className = 'nen-che';
    o.id = 'nen-che';
    o.hidden = true;
    o.innerHTML =
      '<div class="nen-hop" role="dialog" aria-modal="true" aria-labelledby="nen-tieu">' +
        '<div class="nen-dau">' +
          '<h2 id="nen-tieu">Hình nền</h2>' +
          '<button class="nen-dong" id="nen-dong" type="button" aria-label="Đóng">×</button>' +
        '</div>' +

        '<label class="nen-nhan" for="nen-link">Link ảnh / GIF / YouTube</label>' +
        '<input id="nen-link" type="url" inputmode="url" autocomplete="off" ' +
          'placeholder="dán link vào đây…">' +
        '<p class="nen-goi">Link ảnh trực tiếp (.jpg, .png, .gif) hoặc link video ' +
          'YouTube — loại "study with me" dán vào được luôn.</p>' +
        '<p class="nen-nay" id="nen-nay"></p>' +

        '<p class="nen-hoac"><span>Hoặc chọn cảnh dựng sẵn</span></p>' +
        '<div class="nen-canh" id="nen-canh"></div>' +

        '<label class="nen-nhan" for="nen-mo">Lớp kính trước nền — <b id="nen-mo-so"></b></label>' +
        '<input id="nen-mo" type="range" min="55" max="100" step="1">' +
        '<p class="nen-goi">Kéo sang phải cho chữ dễ đọc, sang trái cho nền hiện rõ hơn.</p>' +

        '<label class="nen-tick"><input type="checkbox" id="nen-dt">' +
          '<span>Chạy video cả trên điện thoại — nền sống động hơn nhưng tốn pin</span></label>' +

        '<div class="nen-nut">' +
          '<button class="btn btn-line nen-xoa" id="nen-xoa" type="button">Xoá nền</button>' +
          '<span class="nen-day"></span>' +
          '<button class="btn btn-line" id="nen-huy" type="button">Huỷ</button>' +
          '<button class="btn btn-gold" id="nen-ok" type="button">Áp dụng</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(o);

    $('nen-canh').innerHTML = CANH.map(function (c) {
      return '<button class="nen-o" type="button" data-canh="' + c.id + '" ' +
        'style="background:' + (c.nho || c.css) + '"><span>' + c.ten + '</span></button>';
    }).join('');

    noiHop();
  }

  // Gom những gì đang hiện trong hộp thành một bản cài đặt
  function docHop() {
    const o = {
      mo: parseInt($('nen-mo').value, 10),
      video_dt: $('nen-dt').checked
    };

    const canh = $('nen-canh').querySelector('.nen-o.on');
    const link = $('nen-link').value.trim();

    if (link) {
      const r = nhanDang(link);
      if (r && r.loi) return { loi: r.loi };
      if (r && r.kieu === 'youtube') { o.kieu = 'youtube'; o.id = r.id; return o; }
      if (r && r.kieu === 'anh') { o.kieu = 'anh'; o.url = r.url; return o; }
    }

    if (canh) { o.kieu = 'canh'; o.id = canh.dataset.canh; return o; }
    return { mo: o.mo, video_dt: o.video_dt };   // chưa chọn gì
  }

  function xemThu() {
    const o = docHop();
    if (o.loi) { baoHop(o.loi, true); return; }
    baoHop(moTa(o), false);
    ap(o.kieu ? o : null);
  }

  function moTa(o) {
    if (!o || !o.kieu) return 'Chưa chọn nền nào.';
    if (o.kieu === 'canh') {
      const c = CANH.find(function (x) { return x.id === o.id; });
      return 'Đang dùng cảnh ' + (c ? c.ten : o.id) + '.';
    }
    if (o.kieu === 'youtube') {
      return 'Đang dùng video YouTube' +
        (laDienThoai() && !o.video_dt ? ' — trên điện thoại hiện ảnh đứng yên.' : '.');
    }
    return 'Đang dùng ảnh em dán vào.';
  }

  function baoHop(msg, xau) {
    const p = $('nen-nay');
    p.textContent = msg;
    p.className = 'nen-nay' + (xau ? ' xau' : '');
  }

  function chonCanh(id) {
    $('nen-canh').querySelectorAll('.nen-o').forEach(function (b) {
      b.classList.toggle('on', b.dataset.canh === id);
      b.setAttribute('aria-pressed', b.dataset.canh === id ? 'true' : 'false');
    });
  }

  function noiHop() {
    $('nen-canh').addEventListener('click', function (e) {
      const b = e.target.closest('.nen-o');
      if (!b) return;
      // Chọn cảnh thì bỏ link đi, nếu không link vẫn thắng và học viên
      // bấm mãi không thấy cảnh đổi.
      $('nen-link').value = '';
      chonCanh(b.dataset.canh);
      xemThu();
    });

    $('nen-link').addEventListener('input', function () {
      if ($('nen-link').value.trim()) chonCanh(null);
      xemThu();
    });

    $('nen-mo').addEventListener('input', function () {
      $('nen-mo-so').textContent = $('nen-mo').value + '%';
      xemThu();
    });

    $('nen-dt').addEventListener('change', xemThu);

    $('nen-ok').addEventListener('click', function () {
      const o = docHop();
      if (o.loi) return baoHop(o.loi, true);
      luu(o.kieu ? o : null);
      ap(o.kieu ? o : null);
      dong(true);
      if (typeof toast === 'function') toast(o.kieu ? 'Đã đổi hình nền' : 'Đã bỏ hình nền');
    });

    $('nen-xoa').addEventListener('click', function () {
      luu(null);
      ap(null);
      dong(true);
      if (typeof toast === 'function') toast('Đã bỏ hình nền');
    });

    $('nen-huy').addEventListener('click', function () { dong(false); });
    $('nen-dong').addEventListener('click', function () { dong(false); });

    $('nen-che').addEventListener('click', function (e) {
      if (e.target === $('nen-che')) dong(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('nen-che').hidden) dong(false);
    });
  }

  function mo() {
    dungHop();
    chup = doc();

    const o = chup || {};
    $('nen-link').value = o.kieu === 'youtube'
      ? 'https://www.youtube.com/watch?v=' + o.id
      : (o.kieu === 'anh' ? o.url : '');
    chonCanh(o.kieu === 'canh' ? o.id : null);
    $('nen-mo').value = o.mo == null ? MO_MAC_DINH : o.mo;
    $('nen-mo-so').textContent = $('nen-mo').value + '%';
    $('nen-dt').checked = !!o.video_dt;
    baoHop(moTa(chup), false);

    $('nen-che').hidden = false;
    document.body.classList.add('nen-dang-mo');
    setTimeout(function () { $('nen-link').focus(); }, 30);
  }

  function dong(giu) {
    // Huỷ thì trả lại đúng nền lúc mới mở, vì mọi thay đổi đều đã
    // hiện ra ngoài trang rồi.
    if (!giu) ap(chup);
    $('nen-che').hidden = true;
    document.body.classList.remove('nen-dang-mo');
    const nut = $('nut-nen');
    if (nut) nut.focus();
  }

  // ---------- nút trong menu ----------

  function ganNut() {
    const chan = document.querySelector('.side-foot');
    if (!chan || $('nut-nen')) return;

    const b = document.createElement('button');
    b.className = 'side-back';
    b.id = 'nut-nen';
    b.type = 'button';
    b.textContent = 'Hình nền';
    b.addEventListener('click', mo);

    const ra = $('btn-logout');
    chan.insertBefore(b, ra || null);
  }

  function khoiDong() {
    ap(doc());
    ganNut();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', khoiDong);
  } else {
    khoiDong();
  }

  return { mo: mo, ap: ap, doc: doc, CANH: CANH, nhanDang: nhanDang };
})();
