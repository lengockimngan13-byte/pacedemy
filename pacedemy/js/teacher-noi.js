// ============================================================
// Pacedemy — soạn đề luyện nói
//
// Ba cách tạo đề, cô dùng cái nào cũng được:
//
//   1. Lấy cụm từ trong kho từ vựng — chọn một chủ đề, AI dựng tình
//      huống quanh đúng những cụm từ cô đã nhập. Nói và học từ khớp
//      nhau, em vừa học "place an order" xong là gặp ngay đề dùng nó.
//   2. Để AI tự nghĩ theo kiểu đề — rộng hơn, dùng khi muốn thêm
//      tình huống ngoài kho.
//   3. Cô tự gõ — toàn quyền, dùng cho tình huống riêng của lớp.
//
// Đề do AI soạn vào kho ở trạng thái CHỜ DUYỆT, học viên chưa thấy.
// Cô rà rồi mới bật. Lý do: phiên âm và cụm từ là thứ em sẽ bắt
// chước, sai một chỗ là em học sai theo.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

let me = null;
let ds = [];
let loc = 'cho';
let chuDe = [];
let nhap = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(async function () {
  me = await requireLogin();
  if (!me) return;

  const { data: mine } = await db.from('profiles').select('role').eq('id', me.id).single();
  if (!mine || mine.role !== 'teacher') {
    $('view-deny').classList.remove('hidden');
    return;
  }

  $('view-main').classList.remove('hidden');

  const { data: ts } = await db.from('topics')
    .select('id, name_vi').eq('is_active', true).order('order_index');
  chuDe = ts || [];
  $('dnai-chude').innerHTML += chuDe.map(function (t) {
    return '<option value="' + t.id + '">' + esc(t.name_vi) + '</option>';
  }).join('');

  noi();
  await nap();
})();

// ---------- danh sách ----------

async function nap() {
  const { data, error } = await db.from('de_noi')
    .select('id, kieu, tinh_huong, tinh_huong_vi, cum_tu, loai_cum, phien_am, nghia_vi, goi_y, muc_do, nguon, da_duyet, is_active, lan_dung')
    .order('da_duyet').order('id', { ascending: false });

  if (error) {
    $('dn-ds').innerHTML = '<p class="empty">Không đọc được: ' + esc(error.message) + '</p>';
    return;
  }

  ds = data || [];

  const cho = ds.filter(function (d) { return !d.da_duyet; }).length;
  const gt = ds.filter(function (d) { return d.kieu === 'giao-tiep' && d.da_duyet && d.is_active; }).length;
  const tc = ds.filter(function (d) { return d.kieu === 'toeic' && d.da_duyet && d.is_active; }).length;

  $('dn-dem').innerHTML =
    '<b>' + gt + '</b> đề giao tiếp · <b>' + tc + '</b> đề công sở đang mở cho học viên' +
    (cho ? ' · <b>' + cho + '</b> đề chờ cô duyệt' : '');

  ve();
}

function ve() {
  const list = loc === 'cho'
    ? ds.filter(function (d) { return !d.da_duyet; })
    : ds.filter(function (d) { return d.kieu === loc; });

  if (!list.length) {
    $('dn-ds').innerHTML = '<p class="empty">' +
      (loc === 'cho' ? 'Không có đề nào chờ duyệt.' : 'Chưa có đề nào ở mục này.') + '</p>';
    return;
  }

  $('dn-ds').innerHTML = list.map(mot).join('');
}

function mot(d) {
  return '<div class="tbox dn-mot" data-id="' + d.id + '">' +
    '<div class="dn-dau">' +
      '<b>' + esc(d.tinh_huong) + '</b>' +
      (!d.da_duyet ? '<span class="dn-cho">chờ duyệt</span>' : '') +
      (!d.is_active ? '<span class="dn-tat">đã tắt</span>' : '') +
      '<span class="noi-day"></span>' +
      '<span class="dn-meta">' +
        (d.nguon === 'ai' ? 'máy soạn' : d.nguon === 'kho' ? 'từ kho từ vựng' : 'cô soạn') +
        (d.lan_dung ? ' · ' + d.lan_dung + ' lượt' : '') + '</span>' +
    '</div>' +

    '<input type="text" class="dn-o" data-f="tinh_huong" value="' + esc(d.tinh_huong) + '">' +
    '<input type="text" class="dn-o" data-f="tinh_huong_vi" value="' + esc(d.tinh_huong_vi || '') + '" ' +
      'placeholder="tình huống bằng tiếng Việt">' +

    '<div class="dn-ba">' +
      '<input type="text" class="dn-o" data-f="cum_tu" value="' + esc(d.cum_tu) + '" placeholder="cụm từ">' +
      '<input type="text" class="dn-o" data-f="phien_am" value="' + esc(d.phien_am || '') + '" placeholder="/phiên âm/">' +
      '<input type="text" class="dn-o" data-f="nghia_vi" value="' + esc(d.nghia_vi || '') + '" placeholder="nghĩa tiếng Việt">' +
    '</div>' +

    '<input type="text" class="dn-o" data-f="goi_y" value="' + esc(d.goi_y || '') + '" ' +
      'placeholder="gợi ý hướng nói cho học viên">' +

    '<div class="dn-nut-mot">' +
      (d.da_duyet
        ? '<button class="btn-sm" type="button" data-tat>' + (d.is_active ? 'Tắt đề này' : 'Bật lại') + '</button>'
        : '<button class="btn-sm test" type="button" data-duyet>Duyệt, cho học viên thấy</button>') +
      '<button class="btn-sm" type="button" data-bo>Bỏ hẳn</button>' +
      '<span class="dn-bao"></span>' +
    '</div>' +
  '</div>';
}

function docO(el) {
  const o = {};
  el.querySelectorAll('[data-f]').forEach(function (x) {
    o[x.dataset.f] = x.value.trim() || null;
  });
  return o;
}

async function luuMot(el, them) {
  const id = parseInt(el.dataset.id, 10);
  const o = docO(el);
  if (!o.tinh_huong || !o.cum_tu) {
    el.querySelector('.dn-bao').textContent = 'Phải có tình huống và cụm từ.';
    return false;
  }
  Object.assign(o, them || {});
  const { error } = await db.from('de_noi').update(o).eq('id', id);
  if (error) { el.querySelector('.dn-bao').textContent = 'Không lưu được: ' + error.message; return false; }
  return true;
}

// ---------- nhờ AI ----------

async function token() {
  const { data } = await db.auth.getSession();
  return data && data.session && data.session.access_token;
}

async function chayAi() {
  const nut = $('dnai-chay');
  nut.disabled = true;
  nut.textContent = 'Đang soạn…';

  const kieu = $('dnai-kieu').value;
  const topicId = $('dnai-chude').value;
  const soDe = Math.min(10, Math.max(1, parseInt($('dnai-so').value, 10) || 5));

  // Lấy cụm từ trong kho từ vựng của chủ đề cô chọn
  let tuCo = [];
  let tenChuDe = '';
  if (topicId) {
    const t = chuDe.find(function (x) { return String(x.id) === topicId; });
    tenChuDe = t ? t.name_vi : '';
    const { data: vs } = await db.from('vocabulary')
      .select('word, collocations').eq('topic_id', parseInt(topicId, 10)).limit(60);

    (vs || []).forEach(function (v) {
      if (v.collocations) {
        String(v.collocations).split(',').forEach(function (c) {
          const x = c.trim();
          if (x && x.indexOf(' ') > 0) tuCo.push(x);
        });
      }
    });
    tuCo = [...new Set(tuCo)].sort(function () { return Math.random() - 0.5; }).slice(0, soDe * 2);

    if (!tuCo.length) {
      xongAi();
      return toast('Chủ đề này chưa có cụm từ nào trong kho. Chọn chủ đề khác, hoặc để AI tự nghĩ.', 'bad');
    }
  }

  const tk = await token();
  if (!tk) { xongAi(); return toast('Phiên đăng nhập đã hết.', 'bad'); }

  let o = {};
  try {
    const r = await fetch('/api/de-noi-ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
      body: JSON.stringify({
        kieu: kieu, so_de: soDe, chu_de: tenChuDe,
        tu_co: tuCo, yeu_cau: $('dnai-them').value.trim()
      })
    });
    o = await r.json();
    if (!r.ok) { xongAi(); return toast(o.loi || 'Máy chủ lỗi ' + r.status, 'bad'); }
  } catch (e) { xongAi(); return toast('Mất kết nối, thử lại sau nhé.', 'bad'); }

  if (!o.de || !o.de.length) { xongAi(); return toast('AI không soạn được đề nào.', 'bad'); }

  // Đánh dấu nguồn: lấy từ kho hay AI tự nghĩ, để sau còn biết
  nhap = o.de.map(function (d) {
    d.nguon = topicId ? 'kho' : 'ai';
    if (topicId) d.topic_id = parseInt(topicId, 10);
    return d;
  });

  veNhap();
  xongAi();
}

function xongAi() {
  $('dnai-chay').disabled = false;
  $('dnai-chay').textContent = 'Soạn nháp';
}

function veNhap() {
  $('dnai-hoi').classList.add('hidden');
  $('dnai-xem').classList.remove('hidden');

  $('dnai-xem').innerHTML =
    '<p class="nen-goi" style="margin-top:0">' + nhap.length + ' đề. ' +
      'Lưu xong vẫn nằm ở mục <b>Chờ duyệt</b>, học viên chưa thấy — cô rà phiên âm ' +
      'và cụm từ rồi mới bật.</p>' +

    '<div class="ai-tuan">' +
      nhap.map(function (d) {
        return '<div class="ai-mottuan">' +
          '<b>' + esc(d.tinh_huong) + '</b>' +
          (d.tinh_huong_vi ? '<p>' + esc(d.tinh_huong_vi) + '</p>' : '') +
          '<ul><li>' + esc(d.cum_tu) +
            (d.phien_am ? ' <code>' + esc(d.phien_am) + '</code>' : '') +
            (d.nghia_vi ? ' — ' + esc(d.nghia_vi) : '') + '</li>' +
            (d.goi_y ? '<li>' + esc(d.goi_y) + '</li>' : '') +
          '</ul>' +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="nen-nut">' +
      '<button class="btn btn-line" id="dnai-lai" type="button">Soạn lại</button>' +
      '<span class="nen-day"></span>' +
      '<button class="btn btn-gold" id="dnai-luu" type="button">Lưu vào chờ duyệt</button>' +
    '</div>';

  $('dnai-lai').addEventListener('click', function () {
    $('dnai-xem').classList.add('hidden');
    $('dnai-hoi').classList.remove('hidden');
  });
  $('dnai-luu').addEventListener('click', luuNhap);
}

async function luuNhap() {
  if (!nhap) return;
  const nut = $('dnai-luu');
  nut.disabled = true;
  nut.textContent = 'Đang lưu…';

  const { error } = await db.from('de_noi').insert(nhap);
  if (error) {
    nut.disabled = false; nut.textContent = 'Lưu vào chờ duyệt';
    return toast('Không lưu được: ' + error.message, 'bad');
  }

  nhap = null;
  dongAi();
  loc = 'cho';
  document.querySelectorAll('#dn-tabs .test-tab').forEach(function (x) {
    x.classList.toggle('on', x.dataset.loc === 'cho');
  });
  toast('Đã lưu. Rà lại rồi bấm Duyệt từng đề nhé.');
  await nap();
}

function moAi() {
  nhap = null;
  $('dnai-hoi').classList.remove('hidden');
  $('dnai-xem').classList.add('hidden');
  $('dnai-che').hidden = false;
  document.body.classList.add('nen-dang-mo');
}

function dongAi() {
  $('dnai-che').hidden = true;
  document.body.classList.remove('nen-dang-mo');
}

// ---------- tự gõ ----------

async function luuTay() {
  const o = {
    kieu: $('t-kieu').value,
    tinh_huong: $('t-th').value.trim(),
    tinh_huong_vi: $('t-thvi').value.trim() || null,
    cum_tu: $('t-cum').value.trim(),
    phien_am: $('t-am').value.trim() || null,
    nghia_vi: $('t-nghia').value.trim() || null,
    goi_y: $('t-goiy').value.trim() || null,
    nguon: 'co',
    da_duyet: true
  };

  if (!o.tinh_huong || !o.cum_tu) return toast('Phải có tình huống và cụm từ.', 'bad');

  const { error } = await db.from('de_noi').insert(o);
  if (error) return toast('Không thêm được: ' + error.message, 'bad');

  ['t-th', 't-thvi', 't-cum', 't-am', 't-nghia', 't-goiy'].forEach(function (i) { $(i).value = ''; });
  $('dntay-che').hidden = true;
  document.body.classList.remove('nen-dang-mo');
  toast('Đã thêm đề');
  await nap();
}

// ---------- nối ----------

function noi() {
  document.querySelectorAll('#dn-tabs .test-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#dn-tabs .test-tab').forEach(function (x) {
        x.classList.remove('on');
      });
      b.classList.add('on');
      loc = b.dataset.loc;
      ve();
    });
  });

  $('dn-ds').addEventListener('click', async function (e) {
    const el = e.target.closest('.dn-mot');
    if (!el) return;
    const id = parseInt(el.dataset.id, 10);
    const d = ds.find(function (x) { return x.id === id; });

    if (e.target.closest('[data-duyet]')) {
      if (await luuMot(el, { da_duyet: true })) { toast('Đã duyệt'); nap(); }
      return;
    }
    if (e.target.closest('[data-tat]')) {
      await db.from('de_noi').update({ is_active: !d.is_active }).eq('id', id);
      nap();
      return;
    }
    if (e.target.closest('[data-bo]')) {
      if (!confirm('Bỏ hẳn đề «' + d.cum_tu + '»?')) return;
      await db.from('de_noi').delete().eq('id', id);
      nap();
    }
  });

  // Gõ xong rời ô thì lưu luôn
  $('dn-ds').addEventListener('focusout', function (e) {
    if (!e.target.matches('[data-f]')) return;
    luuMot(e.target.closest('.dn-mot'));
  });

  $('dn-ai').addEventListener('click', moAi);
  $('dnai-chay').addEventListener('click', chayAi);
  $('dnai-huy').addEventListener('click', dongAi);
  $('dnai-dong').addEventListener('click', dongAi);
  $('dnai-che').addEventListener('click', function (e) {
    if (e.target === $('dnai-che')) dongAi();
  });

  $('dn-tay').addEventListener('click', function () {
    $('dntay-che').hidden = false;
    document.body.classList.add('nen-dang-mo');
  });
  $('t-luu').addEventListener('click', luuTay);
  $('t-huy').addEventListener('click', function () {
    $('dntay-che').hidden = true;
    document.body.classList.remove('nen-dang-mo');
  });
  $('dntay-dong').addEventListener('click', function () {
    $('dntay-che').hidden = true;
    document.body.classList.remove('nen-dang-mo');
  });
}
