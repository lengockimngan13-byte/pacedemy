// ============================================================
// Pacedemy — duyệt những mục từ điển do máy soạn
//
// Học viên tra một từ không có trong kho thì Worker dựng tạm một mục
// rồi lưu vào bảng tu_dien_ngoai. Mục đó hiện cho học viên kèm nhãn
// "máy soạn, cô chưa duyệt" — nói thẳng chứ không giả vờ là bài giảng.
//
// Ở đây cô Ngân rà lại. Hai việc cô làm được:
//   - sửa ngay tại chỗ rồi bấm Đã duyệt, mục đó bỏ nhãn cảnh báo
//   - đưa hẳn vào một chủ đề trong kho chính, thành từ của cô
//
// Xếp theo số lượt tra, nên cô duyệt đúng từ nhiều người cần trước.
// ============================================================

const VocabDuyet = (function () {

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let ds = [];
  let chuDe = [];

  function viDuRaChu(v) {
    if (!Array.isArray(v)) return '';
    return v.map(function (x) { return (x.vi || '') + '\n' + (x.en || ''); }).join('\n\n');
  }

  function chuRaViDu(s) {
    const ra = String(s || '').split(/\n{2,}/).map(function (khoi) {
      const d = khoi.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!d.length) return null;
      if (d.length === 1) return { vi: '', en: d[0] };
      return { vi: d[0], en: d.slice(1).join(' ') };
    }).filter(function (x) { return x && (x.vi || x.en); });
    return ra.length ? ra : null;
  }

  async function nap() {
    const [{ data, error }, { data: ts }] = await Promise.all([
      db.from('tu_dien_ngoai')
        .select('id, tu, phien_am, loai_tu, nghia_ngan, dinh_nghia_vi, vi_du, ghi_chu, dong_nghia, nguon, lan_tra')
        .eq('da_duyet', false)
        .order('lan_tra', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(100),
      db.from('topics').select('id, name_vi').order('order_index')
    ]);

    chuDe = ts || [];

    if (error) {
      $('duyet-list').innerHTML = '<p class="empty">Không đọc được: ' + esc(error.message) + '</p>';
      return;
    }

    ds = data || [];

    if (!ds.length) {
      $('duyet-list').innerHTML =
        '<p class="empty">Chưa có mục nào chờ duyệt. Học viên tra từ ngoài kho thì nó hiện ở đây.</p>';
      return;
    }

    $('duyet-list').innerHTML = ds.map(ve).join('');
  }

  function ve(r) {
    const opt = chuDe.map(function (t) {
      return '<option value="' + t.id + '">' + esc(t.name_vi) + '</option>';
    }).join('');

    return '<div class="tbox dy-mot" data-id="' + r.id + '">' +
      '<div class="dy-dau">' +
        '<div>' +
          '<b>' + esc(r.tu) + '</b>' +
          (r.phien_am ? '<span class="dy-am">' + esc(r.phien_am) + '</span>' : '') +
          (r.loai_tu ? '<span class="dy-loai">' + esc(r.loai_tu) + '</span>' : '') +
        '</div>' +
        '<span class="dy-dem">' + r.lan_tra + ' lượt tra · ' +
          (r.nguon === 'ai' ? 'máy soạn' : 'từ điển mở') + '</span>' +
      '</div>' +

      '<div class="sn-hang">' +
        '<label class="sn-o sn-rong"><span>Nghĩa ngắn</span>' +
          '<input type="text" data-f="nghia_ngan" value="' + esc(r.nghia_ngan || '') + '"></label>' +
      '</div>' +

      '<textarea data-f="dinh_nghia_vi" rows="2" class="dy-ta" ' +
        'placeholder="định nghĩa đầy đủ bằng tiếng Việt">' + esc(r.dinh_nghia_vi || '') + '</textarea>' +

      '<textarea data-f="vi_du" rows="4" class="dy-ta" ' +
        'placeholder="ví dụ: dòng tiếng Việt rồi dòng tiếng Anh, cách nhau một dòng trống">' +
        esc(viDuRaChu(r.vi_du)) + '</textarea>' +

      '<textarea data-f="ghi_chu" rows="4" class="dy-ta" ' +
        'placeholder="ghi chú: phân biệt từ dễ nhầm, bẫy ngữ pháp. Bọc **hai dấu sao** để in đậm">' +
        esc(r.ghi_chu || '') + '</textarea>' +

      '<div class="dy-nut">' +
        '<button class="btn-sm test" type="button" data-duyet>Đã duyệt, giữ ở từ điển</button>' +
        '<label class="dy-vao">Đưa vào kho' +
          '<select data-chude><option value="">— chọn chủ đề —</option>' + opt + '</select>' +
        '</label>' +
        '<button class="btn-sm" type="button" data-bo>Bỏ mục này</button>' +
      '</div>' +
      '<p class="dy-bao"></p>' +
    '</div>';
  }

  function docO(el) {
    const o = {};
    el.querySelectorAll('[data-f]').forEach(function (x) {
      const k = x.dataset.f;
      o[k] = k === 'vi_du' ? chuRaViDu(x.value) : (x.value.trim() || null);
    });
    return o;
  }

  function bao(el, msg, xau) {
    const p = el.querySelector('.dy-bao');
    p.textContent = msg;
    p.className = 'dy-bao' + (xau ? ' xau' : ' tot');
  }

  async function duyet(el, id) {
    const o = docO(el);
    if (!o.nghia_ngan) return bao(el, 'Phải có nghĩa ngắn đã.', true);

    o.da_duyet = true;
    o.nguon = 'co';
    const { error } = await db.from('tu_dien_ngoai').update(o).eq('id', id);
    if (error) return bao(el, 'Không lưu được: ' + error.message, true);

    el.remove();
    if (!document.querySelector('.dy-mot')) nap();
    if (typeof toast === 'function') toast('Đã duyệt');
  }

  async function vaoKho(el, id, topicId) {
    const o = docO(el);
    if (!o.nghia_ngan) return bao(el, 'Phải có nghĩa ngắn đã.', true);

    const r = ds.find(function (x) { return x.id === id; });
    if (!r) return;

    // đã có trong kho rồi thì thôi, khỏi tạo bản trùng
    const { data: co } = await db.from('vocabulary')
      .select('id').ilike('word', r.tu).limit(1);
    if (co && co.length) {
      bao(el, 'Kho đã có từ này rồi, mình chỉ đánh dấu đã duyệt thôi.', false);
      await db.from('tu_dien_ngoai').update({ da_duyet: true }).eq('id', id);
      setTimeout(function () { el.remove(); }, 1400);
      return;
    }

    const { data: max } = await db.from('vocabulary')
      .select('order_index').eq('topic_id', topicId)
      .order('order_index', { ascending: false }).limit(1).maybeSingle();

    const vd = o.vi_du || [];

    const { error } = await db.from('vocabulary').insert({
      topic_id: topicId,
      word: r.tu,
      phonetic: r.phien_am || null,
      pos: r.loai_tu || null,
      meaning_vi: o.nghia_ngan,
      dinh_nghia_vi: o.dinh_nghia_vi,
      vi_du: o.vi_du,
      ghi_chu: o.ghi_chu,
      example_en: vd[0] ? vd[0].en : null,
      example_vi: vd[0] ? vd[0].vi : null,
      synonyms: r.dong_nghia || null,
      level: 1,
      order_index: (max ? max.order_index : 0) + 1
    });

    if (error) return bao(el, 'Không thêm vào kho được: ' + error.message, true);

    await db.from('tu_dien_ngoai').update({ da_duyet: true, nguon: 'co' }).eq('id', id);
    el.remove();
    if (!document.querySelector('.dy-mot')) nap();
    if (typeof toast === 'function') toast('Đã đưa «' + r.tu + '» vào kho');
  }

  async function bo(el, id) {
    const { error } = await db.from('tu_dien_ngoai').delete().eq('id', id);
    if (error) return bao(el, 'Không xoá được: ' + error.message, true);
    el.remove();
    if (!document.querySelector('.dy-mot')) nap();
  }

  let daNoi = false;

  function noi() {
    $('duyet-list').addEventListener('click', function (e) {
      const el = e.target.closest('.dy-mot');
      if (!el) return;
      const id = parseInt(el.dataset.id, 10);

      if (e.target.closest('[data-duyet]')) { duyet(el, id); return; }
      if (e.target.closest('[data-bo]')) {
        if (confirm('Bỏ hẳn mục «' + el.querySelector('b').textContent +
                    '»? Học viên tra lại thì máy dựng lại từ đầu.')) bo(el, id);
      }
    });

    $('duyet-list').addEventListener('change', function (e) {
      if (!e.target.matches('[data-chude]')) return;
      const el = e.target.closest('.dy-mot');
      const topicId = e.target.value;
      if (!topicId) return;
      vaoKho(el, parseInt(el.dataset.id, 10), parseInt(topicId, 10));
      e.target.value = '';
    });
  }

  async function moLai() {
    if (!daNoi) { noi(); daNoi = true; }
    await nap();
  }

  return { moLai: moLai };
})();
