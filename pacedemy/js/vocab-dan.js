// ============================================================
// Pacedemy — dán bảng từ vựng thẳng từ Word, Excel, Google Sheets
//
// Cô Ngân vốn soạn từ vựng trong file bảng. Trước đây muốn đưa lên web
// phải nhờ AI gói lại thành JSON rồi dán vào, hoặc gõ tay từng thẻ.
// Trang này nhận nguyên khối văn bản copy từ bảng.
//
// Khác chỗ tham khảo ở hai điểm, vì kho từ của Pacedemy nhiều cột hơn
// một cặp từ–nghĩa:
//   - đoán sẵn dấu ngăn cách, khỏi phải bấm chọn
//   - cho gán từng cột vào đúng ô: từ, phiên âm, loại từ, nghĩa, ví dụ
// ============================================================

const VocabDan = (function () {

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Các ô trong kho từ mà một cột có thể gán vào
  const O = [
    { ma: '',            ten: 'Bỏ qua cột này' },
    { ma: 'word',        ten: 'Từ tiếng Anh' },
    { ma: 'meaning_vi',  ten: 'Nghĩa tiếng Việt' },
    { ma: 'phonetic',    ten: 'Phiên âm' },
    { ma: 'pos',         ten: 'Loại từ' },
    { ma: 'example_en',  ten: 'Ví dụ tiếng Anh' },
    { ma: 'example_vi',  ten: 'Dịch ví dụ' },
    { ma: 'synonyms',    ten: 'Từ đồng nghĩa' },
    { ma: 'collocations', ten: 'Cụm hay đi kèm' }
  ];

  let chuDe = [];        // danh sách chủ đề trong kho
  let danhCot = [];      // cột thứ i gán vào ô nào
  let daTuDoan = false;  // đã đoán dấu ngăn cách cho lần dán này chưa
  let tuCo = new Set();  // từ đã có sẵn trong chủ đề đang chọn, để báo trùng

  // ---------- Đọc lựa chọn dấu ngăn ----------

  function dauCot() {
    const v = (document.querySelector('input[name="dn-cot"]:checked') || {}).value;
    if (v === 'tab') return '\t';
    if (v === 'tuy') return $('dn-cot-tuy').value || '\t';
    return v || '\t';
  }

  function dauTu() {
    const v = (document.querySelector('input[name="dn-tu"]:checked') || {}).value;
    if (v === 'nl') return '\n';
    if (v === 'tuy') return $('dn-tu-tuy').value || '\n';
    return v || '\n';
  }

  // ---------- Đoán dấu ngăn cách ----------
  // Dán từ Excel hay Google Sheets thì cột ngăn bằng Tab, dán từ Word
  // thường là gạch ngang hoặc hai chấm. Đoán trúng thì cô khỏi bấm.

  function doan(text) {
    const dong = text.split('\n').filter(function (d) { return d.trim(); }).slice(0, 12);
    if (!dong.length) return;

    const dem = function (k) {
      return dong.filter(function (d) { return d.indexOf(k) >= 0; }).length;
    };

    let chon = null;
    if (dem('\t') >= dong.length * 0.6)      chon = 'tab';
    else if (dem(' - ') >= dong.length * 0.6) chon = ' - ';
    else if (dem(' : ') >= dong.length * 0.6) chon = ' : ';
    else if (dem(': ') >= dong.length * 0.6)  chon = ': ';
    else if (dem(',') >= dong.length * 0.6)   chon = ',';
    else if (dem(';') >= dong.length * 0.6)   chon = ';';
    if (!chon) return;

    if (chon === 'tab' || chon === ',' || chon === ';') {
      const r = document.querySelector('input[name="dn-cot"][value="' + chon + '"]');
      if (r) r.checked = true;
    } else {
      document.querySelector('input[name="dn-cot"][value="tuy"]').checked = true;
      $('dn-cot-tuy').value = chon;
    }
  }

  // ---------- Bóc dữ liệu ----------

  function boc() {
    const raw = $('dn-raw').value;
    if (!raw.trim()) return [];

    const dTu = dauTu(), dCot = dauCot();

    const tho = raw.split(dTu)
      .map(function (d) { return d.trim(); })
      .filter(Boolean)
      .map(function (d) { return d.split(dCot).map(function (x) { return x.trim(); }); });

    if (!tho.length) return [];

    // Số cột lấy theo số phổ biến nhất trong các dòng. Dòng nào lẻ ra
    // nhiều cột hơn thì phần dư gộp hết vào cột cuối — để câu ví dụ có
    // dấu phẩy không bị vỡ thành mấy cột rác.
    const dem = {};
    tho.forEach(function (h) { dem[h.length] = (dem[h.length] || 0) + 1; });
    let n = 2, nhieu = -1;
    Object.keys(dem).forEach(function (k) {
      if (dem[k] > nhieu) { nhieu = dem[k]; n = parseInt(k, 10); }
    });

    return tho.map(function (h) {
      if (h.length <= n) return h;
      const dau = h.slice(0, n - 1);
      dau.push(h.slice(n - 1).join(dCot));
      return dau;
    });
  }

  // ---------- Gán cột ----------

  function soCot(hang) {
    return hang.reduce(function (m, h) { return Math.max(m, h.length); }, 0);
  }

  // Tự nhận ra cột nào là gì, dựa vào chính nội dung trong cột.
  // Bảng cô soạn hay có bốn cột từ · phiên âm · loại từ · nghĩa, mà thứ tự
  // mỗi file một khác, nên đoán theo nội dung đáng tin hơn đoán theo vị trí.
  const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const LOAI_TU = /^(n|v|adj|adv|prep|conj|pron|phr|idiom|n\.|v\.|adj\.|adv\.|danh từ|động từ|tính từ|trạng từ)$/i;
  const PHIEN_AM = /^[\/\[].+[\/\]]$/;

  function matDinh(n) {
    const d = [];
    for (let i = 0; i < n; i++) d.push(i === 0 ? 'word' : i === 1 ? 'meaning_vi' : '');
    return d;
  }

  function doanVaiCot(hang, n) {
    if (!hang.length) return matDinh(n);

    // Thống kê từng cột
    const ke = [];
    for (let i = 0; i < n; i++) {
      const o = hang.map(function (h) { return (h[i] || '').trim(); }).filter(Boolean);
      if (!o.length) { ke.push(null); continue; }
      const ty = function (f) { return o.filter(f).length / o.length; };
      ke.push({
        i: i,
        dai: o.reduce(function (a, x) { return a + x.length; }, 0) / o.length,
        pa: ty(function (x) { return PHIEN_AM.test(x); }),
        lt: ty(function (x) { return LOAI_TU.test(x); }),
        viet: ty(function (x) { return CO_DAU.test(x); }),
        cach: ty(function (x) { return x.indexOf(' ') >= 0; })
      });
    }

    const d = new Array(n).fill('');
    const con = ke.filter(Boolean);
    const lay = function (k, loc) {
      const c = con.filter(function (x) { return d[x.i] === '' && loc(x); });
      if (!c.length) return null;
      c.sort(function (a, b) { return k(b) - k(a); });
      return c[0];
    };

    // Phiên âm và loại từ nhận ra chắc chắn nhất nên gán trước
    let c = lay(function (x) { return x.pa; }, function (x) { return x.pa >= 0.6; });
    if (c) d[c.i] = 'phonetic';
    c = lay(function (x) { return x.lt; }, function (x) { return x.lt >= 0.6; });
    if (c) d[c.i] = 'pos';

    // Cột tiếng Việt: ngắn là nghĩa, dài và nhiều khoảng trắng là dịch ví dụ
    const viet = con.filter(function (x) { return d[x.i] === '' && x.viet >= 0.5; })
                    .sort(function (a, b) { return a.dai - b.dai; });
    if (viet[0]) d[viet[0].i] = 'meaning_vi';
    if (viet[1] && viet[1].dai > 28) d[viet[1].i] = 'example_vi';

    // Cột tiếng Anh: ngắn nhất là từ, cột dài có khoảng trắng là câu ví dụ
    const anh = con.filter(function (x) { return d[x.i] === ''; })
                   .sort(function (a, b) { return a.dai - b.dai; });
    if (anh[0]) d[anh[0].i] = 'word';
    const vd = anh.slice(1).filter(function (x) { return x.dai > 24 && x.cach >= 0.6; })[0];
    if (vd) d[vd.i] = 'example_en';

    // Không nhận ra nổi thì về mặc định cũ, còn hơn để trống hết
    if (d.indexOf('word') < 0 || d.indexOf('meaning_vi') < 0) return matDinh(n);
    return d;
  }

  function veDanhCot(n, hang) {
    if (!n) { $('dn-cot-map').innerHTML = ''; return; }

    if (danhCot.length !== n) danhCot = doanVaiCot(hang || [], n);

    const o = danhCot.map(function (chon, i) {
      const opt = O.map(function (x) {
        return '<option value="' + x.ma + '"' + (x.ma === chon ? ' selected' : '') + '>' +
               esc(x.ten) + '</option>';
      }).join('');
      return '<label class="sn-o"><span>Cột ' + (i + 1) + '</span>' +
             '<select data-cot="' + i + '">' + opt + '</select></label>';
    }).join('');

    $('dn-cot-map').innerHTML =
      '<p class="dn-lab" style="margin-top:20px">Cột nào là gì</p>' +
      '<div class="sn-hang">' + o + '</div>';
  }

  // ---------- Dựng danh sách từ ----------

  function lamTu() {
    const hang = boc();
    const ds = [];

    for (const h of hang) {
      const t = {};
      danhCot.forEach(function (o, i) {
        if (o && h[i]) t[o] = h[i];
      });
      if (!t.word || !t.meaning_vi) {
        ds.push({ loi: true, raw: h.join(' | '), word: t.word || '', meaning_vi: t.meaning_vi || '' });
      } else {
        t.trung = tuCo.has(t.word.trim().toLowerCase());
        ds.push(t);
      }
    }
    return ds;
  }

  function veXem() {
    const hang = boc();
    veDanhCot(soCot(hang), hang);

    const ds = lamTu();
    const tot = ds.filter(function (t) { return !t.loi && !t.trung; });
    const trung = ds.filter(function (t) { return t.trung; }).length;
    const loi = ds.filter(function (t) { return t.loi; }).length;

    $('dn-dem').textContent = tot.length + ' từ nhập được' +
      (trung ? ' · ' + trung + ' đã có sẵn' : '') +
      (loi ? ' · ' + loi + ' dòng thiếu' : '');

    if (!ds.length) {
      $('dn-xem').innerHTML = '<p class="empty">Chưa có gì để xem trước.</p>';
      return;
    }

    $('dn-xem').innerHTML = '<div class="dn-the">' + ds.map(function (t, i) {
      if (t.loi) {
        return '<div class="dn-mot dn-mot-loi">' +
                 '<span class="dn-stt">' + (i + 1) + '</span>' +
                 '<div><b>Dòng này thiếu từ hoặc thiếu nghĩa</b>' +
                 '<span class="dn-raw">' + esc(t.raw) + '</span></div>' +
               '</div>';
      }
      const them = ['phonetic', 'pos', 'example_en', 'example_vi', 'synonyms', 'collocations']
        .filter(function (k) { return t[k]; })
        .map(function (k) { return esc(t[k]); }).join(' · ');

      return '<div class="dn-mot' + (t.trung ? ' dn-mot-trung' : '') + '">' +
               '<span class="dn-stt">' + (i + 1) + '</span>' +
               '<div><b>' + esc(t.word) + '</b>' +
                 (t.trung ? '<span class="dn-co">đã có</span>' : '') +
                 '<span class="dn-ng">' + esc(t.meaning_vi) + '</span>' +
                 (them ? '<span class="dn-them">' + them + '</span>' : '') +
               '</div>' +
             '</div>';
    }).join('') + '</div>';
  }

  // ---------- Chủ đề ----------

  async function napChuDe() {
    const { data } = await db.from('topics')
      .select('id, slug, name_vi, order_index').order('order_index');
    chuDe = data || [];

    $('dn-topic').innerHTML =
      chuDe.map(function (t) {
        return '<option value="' + t.id + '">' + esc(t.name_vi) + '</option>';
      }).join('') +
      '<option value="moi">+ Chủ đề mới…</option>';

    doiChuDe();
  }

  async function napTuCo() {
    tuCo = new Set();
    const id = $('dn-topic').value;
    if (!id || id === 'moi') { veXem(); return; }

    const { data } = await db.from('vocabulary').select('word').eq('topic_id', id);
    for (const w of (data || [])) tuCo.add(String(w.word || '').trim().toLowerCase());
    veXem();
  }

  function doiChuDe() {
    const moi = $('dn-topic').value === 'moi';
    $('dn-ten-moi-o').classList.toggle('hidden', !moi);
    napTuCo();
  }

  // ---------- Lưu ----------

  function slug(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'chu-de';
  }

  function bao(msg, ok) {
    const n = $('note');
    n.className = 'note' + (ok ? ' ok' : '');
    n.textContent = msg;
    n.classList.remove('hidden');
    n.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function luu() {
    const nut = $('dn-luu');
    const ds = lamTu().filter(function (t) { return !t.loi && !t.trung; });

    if (!ds.length) return bao('Không có từ nào mới để nhập.');
    if (danhCot.indexOf('word') < 0 || danhCot.indexOf('meaning_vi') < 0) {
      return bao('Phải chỉ rõ cột nào là từ tiếng Anh và cột nào là nghĩa tiếng Việt.');
    }

    nut.disabled = true;
    const chu = nut.textContent;
    nut.textContent = 'Đang nhập…';

    let topicId = $('dn-topic').value;

    if (topicId === 'moi') {
      const ten = $('dn-ten-moi').value.trim();
      if (!ten) {
        nut.disabled = false; nut.textContent = chu;
        return bao('Chủ đề mới chưa có tên.');
      }
      const { data: t, error } = await db.from('topics').insert({
        slug: slug(ten), name_vi: ten, order_index: chuDe.length + 1
      }).select('id, slug, name_vi, order_index').single();

      if (error || !t) {
        nut.disabled = false; nut.textContent = chu;
        return bao('Không tạo được chủ đề: ' + (error ? error.message : 'lỗi không rõ'));
      }
      topicId = t.id;
      chuDe.push(t);
    }

    const { data: max } = await db.from('vocabulary')
      .select('order_index').eq('topic_id', topicId)
      .order('order_index', { ascending: false }).limit(1).maybeSingle();

    let i = (max ? max.order_index : 0) || 0;

    const rows = ds.map(function (t) {
      i++;
      return {
        topic_id: topicId,
        word: t.word,
        meaning_vi: t.meaning_vi,
        phonetic: t.phonetic || null,
        pos: t.pos || null,
        example_en: t.example_en || null,
        example_vi: t.example_vi || null,
        synonyms: t.synonyms || null,
        collocations: t.collocations || null,
        level: 1,
        order_index: i
      };
    });

    const { error } = await db.from('vocabulary').insert(rows);

    nut.disabled = false;
    nut.textContent = chu;

    if (error) return bao('Không nhập được: ' + error.message);

    bao('Đã nhập ' + rows.length + ' từ.', true);
    if (typeof toast === 'function') toast('Đã nhập ' + rows.length + ' từ');

    $('dn-raw').value = '';
    danhCot = [];
    daTuDoan = false;
    await napChuDe();
    veXem();
  }

  // ---------- Nối dây ----------

  function noi() {
    const raw = $('dn-raw');

    raw.addEventListener('input', function () {
      if (!daTuDoan && this.value.trim()) { doan(this.value); daTuDoan = true; }
      veXem();
    });

    // dán nội dung khác vào thì đoán lại từ đầu, cả dấu ngăn lẫn vai cột
    raw.addEventListener('paste', function () { daTuDoan = false; danhCot = []; });

    document.querySelectorAll('input[name="dn-cot"], input[name="dn-tu"]').forEach(function (r) {
      r.addEventListener('change', function () { danhCot = []; veXem(); });
    });

    ['dn-cot-tuy', 'dn-tu-tuy'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        const ten = id === 'dn-cot-tuy' ? 'dn-cot' : 'dn-tu';
        document.querySelector('input[name="' + ten + '"][value="tuy"]').checked = true;
        danhCot = [];
        veXem();
      });
    });

    $('dn-cot-map').addEventListener('change', function (e) {
      const i = e.target.dataset.cot;
      if (i == null) return;
      danhCot[parseInt(i, 10)] = e.target.value;
      veXem();
    });

    $('dn-topic').addEventListener('change', doiChuDe);
    $('dn-luu').addEventListener('click', luu);
    $('dn-xoa').addEventListener('click', function () {
      $('dn-raw').value = '';
      danhCot = [];
      daTuDoan = false;
      veXem();
    });
  }

  // Mỗi lần mở lại ngăn này thì nạp lại chủ đề, phòng khi cô vừa tạo
  // chủ đề mới ở ngăn khác.
  let daNoi = false;
  async function moLai() {
    if (!daNoi) { noi(); daNoi = true; }
    await napChuDe();
  }

  return { moLai: moLai };
})();
