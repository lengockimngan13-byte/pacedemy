// ============================================================
// Pacedemy — nhờ AI soạn nháp lộ trình
//
// Cô gõ một câu như "lộ trình 800+ cho em nghe tạm ổn nhưng Part 7
// hay không kịp giờ", máy soạn ra tám tuần kèm việc từng tuần.
//
// Nhưng nháp KHÔNG tự lưu. Cô xem hết rồi mới bấm Áp dụng, và sau khi
// áp dụng vẫn sửa được từng tuần như lộ trình tự soạn. Lý do: lộ trình
// là thứ học viên theo hàng tuần, một việc sai là em làm lệch cả tuần,
// mà nhìn lướt thì không thấy gì bất thường.
//
// Máy chủ đã lọc bỏ những việc kho chưa có bài, và chép đúng tên dạng
// Part 5 trong kho. Chỗ nào bị bỏ thì nói thẳng ra cho cô biết, chứ
// không im lặng giao ít hơn.
// ============================================================

(function () {

  const $ = function (id) { return document.getElementById(id); };

  const GOI_Y = [
    'Lộ trình 800+ cho em đã được 650',
    'Em mất gốc ngữ pháp, cần 6 tuần làm lại nền',
    'Em nghe yếu, Part 3 và 4 hay đoán bừa',
    'Part 7 không kịp giờ, cần luyện tốc độ đọc',
    'Ôn gấp 3 tuần trước ngày thi'
  ];

  let nhap = null;
  let dangChay = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- mở / đóng ----------

  function mo() {
    nhap = null;
    $('ai-hoi').classList.remove('hidden');
    $('ai-xem').classList.add('hidden');
    $('ai-xem').innerHTML = '';
    $('ai-yeu').value = '';
    $('ai-tuan').value = 8;
    $('ai-goiy').innerHTML = GOI_Y.map(function (g) {
      return '<button type="button" class="ai-chip">' + esc(g) + '</button>';
    }).join('');
    $('ai-che').hidden = false;
    document.body.classList.add('nen-dang-mo');
    setTimeout(function () { $('ai-yeu').focus(); }, 30);
  }

  function dong() {
    if (dangChay) return;
    $('ai-che').hidden = true;
    document.body.classList.remove('nen-dang-mo');
  }

  // ---------- gọi máy chủ ----------

  async function chay() {
    if (dangChay) return;

    const yeu = $('ai-yeu').value.trim();
    if (!yeu) { $('ai-yeu').focus(); return toast('Nói một câu cô muốn lộ trình thế nào đã.', 'bad'); }

    dangChay = true;
    $('ai-chay').disabled = true;
    $('ai-chay').textContent = 'Đang soạn…';

    let tk = null;
    try {
      const { data } = await db.auth.getSession();
      tk = data && data.session && data.session.access_token;
    } catch (e) {}

    if (!tk) { xong(); return toast('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.', 'bad'); }

    let res;
    try {
      res = await fetch('/api/lo-trinh-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
        body: JSON.stringify({ yeu_cau: yeu, so_tuan: parseInt($('ai-tuan').value, 10) || 8 })
      });
    } catch (e) { xong(); return toast('Mất kết nối, bạn thử lại sau nhé.', 'bad'); }

    let o = {};
    try { o = await res.json(); } catch (e) {}

    if (!res.ok) {
      xong();
      return toast(o.loi || loiMay(res.status), 'bad');
    }

    if (!o.tuan || !o.tuan.length) {
      xong();
      return toast('Nháp ra rỗng — có thể kho chưa có bài cho hướng này. Thử yêu cầu khác xem.', 'bad');
    }

    nhap = o;
    veNhap();
    xong();
  }

  function xong() {
    dangChay = false;
    $('ai-chay').disabled = false;
    $('ai-chay').textContent = 'Soạn nháp';
  }

  function loiMay(status) {
    if (status === 403) return 'Chỉ tài khoản giáo viên dùng được.';
    if (status === 404) return 'Chưa có đường dẫn này. Worker cần deploy bản mới.';
    return 'Máy chủ trả về lỗi ' + status + '.';
  }

  // ---------- xem nháp ----------

  function veNhap() {
    const o = nhap;
    const tongViec = o.tuan.reduce(function (s, t) { return s + t.viec.length; }, 0);

    $('ai-hoi').classList.add('hidden');
    $('ai-xem').classList.remove('hidden');

    $('ai-xem').innerHTML =
      '<div class="ai-dau">' +
        '<h3>' + esc(o.ten) + '</h3>' +
        '<p>' + o.tuan.length + ' tuần · ' + tongViec + ' việc' +
          (o.muc_tieu ? ' · nhắm ' + o.muc_tieu : '') + '</p>' +
        (o.mo_ta ? '<p class="ai-mo">' + esc(o.mo_ta) + '</p>' : '') +
      '</div>' +

      (o.bo_bot && o.bo_bot.length
        ? '<div class="ai-bo"><b>Đã bỏ bớt mấy việc vì kho chưa có bài:</b> ' +
            o.bo_bot.map(esc).join(' · ') + '</div>'
        : '') +

      '<div class="ai-tuan">' +
        o.tuan.map(function (t) {
          return '<div class="ai-mottuan">' +
            '<b>Tuần ' + t.tuan + ' · ' + esc(t.tieu_de) + '</b>' +
            (t.ghi_chu ? '<p>' + esc(t.ghi_chu) + '</p>' : '') +
            '<ul>' + t.viec.map(function (v) {
              return '<li>' + esc(v.label) + ' — <b>' + v.amount + '</b> ' +
                (LoTrinh.DON_VI[v.kind] || '') + '</li>';
            }).join('') + '</ul>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<p class="nen-goi">Áp dụng xong vẫn sửa được từng tuần như lộ trình tự soạn. ' +
        'Chưa bấm thì chưa có gì được lưu.</p>' +

      '<div class="nen-nut">' +
        '<button class="btn btn-line" id="ai-lai" type="button">Soạn lại</button>' +
        '<span class="nen-day"></span>' +
        '<button class="btn btn-line" id="ai-bo" type="button">Bỏ nháp</button>' +
        '<button class="btn btn-gold" id="ai-luu" type="button">Áp dụng</button>' +
      '</div>';

    $('ai-lai').addEventListener('click', function () {
      $('ai-xem').classList.add('hidden');
      $('ai-hoi').classList.remove('hidden');
    });
    $('ai-bo').addEventListener('click', function () { nhap = null; dong(); });
    $('ai-luu').addEventListener('click', luu);
  }

  // ---------- áp dụng ----------
  // Ghi lần lượt: lộ trình → từng tuần → việc của tuần đó. Giữa chừng
  // lỗi thì xoá luôn lộ trình vừa tạo, đừng để lại một cái dở dang
  // trong danh sách của cô.

  async function luu() {
    if (!nhap) return;

    const nut = $('ai-luu');
    nut.disabled = true;
    nut.textContent = 'Đang lưu…';

    const { data: lo, error: e1 } = await db.from('lo_trinh').insert({
      ten: nhap.ten,
      mo_ta: nhap.mo_ta,
      muc_tieu: nhap.muc_tieu,
      ky_nang: nhap.ky_nang,
      so_tuan: nhap.tuan.length
    }).select('id').single();

    if (e1 || !lo) {
      nut.disabled = false; nut.textContent = 'Áp dụng';
      return toast('Không lưu được: ' + ((e1 && e1.message) || 'lỗi không rõ'), 'bad');
    }

    try {
      for (const t of nhap.tuan) {
        const { data: tu, error: e2 } = await db.from('lo_trinh_tuan').insert({
          lo_trinh_id: lo.id, tuan: t.tuan, tieu_de: t.tieu_de, ghi_chu: t.ghi_chu
        }).select('id').single();
        if (e2 || !tu) throw new Error((e2 && e2.message) || 'không tạo được tuần ' + t.tuan);

        const { error: e3 } = await db.from('lo_trinh_viec').insert(
          t.viec.map(function (v, i) {
            return {
              tuan_id: tu.id, kind: v.kind, target: v.target,
              label: v.label, amount: v.amount, order_index: i + 1
            };
          }));
        if (e3) throw new Error(e3.message);
      }
    } catch (e) {
      await db.from('lo_trinh').delete().eq('id', lo.id);
      nut.disabled = false; nut.textContent = 'Áp dụng';
      return toast('Lưu dở dang nên mình bỏ luôn: ' + e.message, 'bad');
    }

    nhap = null;
    dong();
    toast('Đã tạo lộ trình. Xem lại rồi sửa chỗ nào chưa vừa ý nhé.');

    // Mở luôn lộ trình vừa tạo cho cô xem và sửa ngay
    if (typeof window.napDs === 'function') await window.napDs();
    if (typeof window.mo === 'function') window.mo(lo.id);
  }

  // ---------- nối ----------

  document.addEventListener('DOMContentLoaded', function () {
    const nut = $('lt-ai');
    if (!nut) return;

    nut.addEventListener('click', mo);
    $('ai-chay').addEventListener('click', chay);
    $('ai-huy').addEventListener('click', dong);
    $('ai-dong').addEventListener('click', dong);

    $('ai-che').addEventListener('click', function (e) {
      if (e.target === $('ai-che')) dong();
    });

    $('ai-goiy').addEventListener('click', function (e) {
      const c = e.target.closest('.ai-chip');
      if (!c) return;
      $('ai-yeu').value = c.textContent;
      $('ai-yeu').focus();
    });

    // Ctrl+Enter trong ô yêu cầu thì chạy luôn
    $('ai-yeu').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) chay();
    });
  });
})();
