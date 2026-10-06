// ============================================================
// Pacedemy — tab Lộ trình trong hồ sơ học viên
//
// Hai câu hỏi cô cần trả lời khi mở hồ sơ một em:
//
//   1. Em đang ở chặng nào, tuần này phải làm gì, làm tới đâu rồi.
//   2. Em có theo đều không, hay chỉ học dồn một hôm rồi mất hút.
//
// Câu 2 quan trọng không kém câu 1: hai em cùng làm 100 câu một tuần,
// một em rải năm buổi, một em làm hết trong một tối, kết quả thi khác
// hẳn nhau. Nên chỗ "theo đều" đếm số NGÀY có học chứ không đếm bài.
//
// Tiến độ không lưu sẵn mà đếm lại từ dữ liệu thật mỗi lần mở, nên
// không có chuyện đánh dấu đã xong cho có.
// ============================================================

const StudentLoTrinh = (function () {

  const $ = function (id) { return document.getElementById(id); };

  let sid = null;
  let dsLo = [];       // các lộ trình mẫu còn dùng được
  let dang = [];       // các lộ trình em này đang theo, kèm tiến độ

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dat(id) { sid = id; }

  // ---------- nạp ----------

  async function nap() {
    await LoTrinh.napChon();

    const [{ data: mau }, theo] = await Promise.all([
      db.from('lo_trinh').select('id, ten, ky_nang, so_tuan, muc_tieu')
        .eq('is_active', true).order('id'),
      LoTrinh.cuaEm(sid)
    ]);

    dsLo = mau || [];
    dang = [];

    for (const t of theo) {
      try { dang.push(await LoTrinh.tienDo(t.id)); }
      catch (e) { /* lộ trình lỗi thì bỏ qua, đừng để hỏng cả trang */ }
    }

    return dang;
  }

  // ---------- vẽ tab ----------

  async function tab() {
    $('body').innerHTML = '<p class="empty">Đang tải lộ trình…</p>';
    await nap();

    let html = '';

    if (!dang.length) {
      html += '<div class="tbox">' +
        '<h3>Em này chưa có lộ trình</h3>' +
        '<p style="margin:0 0 14px;font-size:0.94rem;line-height:1.65">' +
          'Gắn một lộ trình để em biết mỗi tuần cần làm gì, và để cô theo dõi ' +
          'em có đi đúng nhịp không. Tuần 1 tính từ ngày bắt đầu bên dưới.</p>' +
        formGiao() + '</div>';
    } else {
      for (const d of dang) html += veMot(d);
      html += '<div class="tbox"><h3>Giao thêm một lộ trình nữa</h3>' +
        '<p style="margin:0 0 14px;font-size:0.9rem;line-height:1.6;color:var(--ink-soft)">' +
          'Dùng khi muốn một lộ trình dài chạy nền và một lộ trình ngắn chữa ' +
          'đúng một kỹ năng đang yếu.</p>' + formGiao() + '</div>';
    }

    $('body').innerHTML = html;
    noi();
  }

  function formGiao() {
    return '<div class="lt-giao">' +
      '<label class="sn-o" style="flex:2 1 220px"><span>Lộ trình</span>' +
        '<select id="g-lo">' +
          dsLo.map(function (l) {
            return '<option value="' + l.id + '">' + esc(l.ten) +
              ' · ' + l.so_tuan + ' tuần</option>';
          }).join('') +
        '</select></label>' +
      '<label class="sn-o"><span>Bắt đầu từ</span>' +
        '<input type="date" id="g-ngay" value="' + homNay() + '"></label>' +
      '<label class="sn-o"><span>Nhịp — buổi mỗi tuần</span>' +
        '<input type="number" id="g-nhip" min="1" max="7" value="5"></label>' +
      '<button class="btn btn-gold" id="g-ok" type="button">Giao lộ trình</button>' +
    '</div>';
  }

  function homNay() {
    const d = new Date();
    const p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function veMot(d) {
    const tuan = d.tuan || [];
    const nay = tuan.find(function (t) { return t.tuan === d.tuan_nay; });

    const tongCan = tuan.reduce(function (s, t) {
      return s + t.viec.reduce(function (a, v) { return a + v.amount; }, 0); }, 0);
    const tongLam = tuan.reduce(function (s, t) {
      return s + t.viec.reduce(function (a, v) { return a + Math.min(v.lam, v.amount); }, 0); }, 0);

    return '<div class="tbox" data-hv="' + d.id + '">' +
      '<div class="lt-soan-dau">' +
        '<h3 style="margin:0">' + esc(d.ten) +
          (d.muc_tieu ? ' · nhắm ' + d.muc_tieu : '') + '</h3>' +
        '<button class="btn-sm" type="button" data-go>Gỡ lộ trình</button>' +
      '</div>' +

      '<p style="margin:6px 0 16px;font-size:0.88rem;color:var(--ink-soft)">' +
        'Đang ở <b>tuần ' + d.tuan_nay + '</b> trên ' + d.so_tuan + ' · ' +
        'bắt đầu ' + LoTrinh.ngayVN(d.bat_dau) + ' · ' +
        'cả lộ trình xong ' + LoTrinh.phanTram(tongLam, tongCan) + '%' +
      '</p>' +

      '<h4 class="lt-h4" style="margin-top:0">Em có theo đều không</h4>' +
      LoTrinh.veDeu(d.deu, d.buoi_moi_tuan) +

      (nay
        ? '<h4 class="lt-h4">Tuần này</h4>' + LoTrinh.veTuan(nay, d.tuan_nay, false)
        : '') +

      '<details class="lt-xem"><summary>Xem cả ' + d.so_tuan + ' tuần</summary>' +
        tuan.map(function (t) { return LoTrinh.veTuan(t, d.tuan_nay, false); }).join('') +
      '</details>' +
    '</div>';
  }

  // ---------- giao / gỡ ----------

  async function giao() {
    const lo = parseInt($('g-lo').value, 10);
    const ngay = $('g-ngay').value;
    const nhip = Math.min(7, Math.max(1, parseInt($('g-nhip').value, 10) || 5));

    if (!lo || !ngay) return toast('Chọn lộ trình và ngày bắt đầu đã.', 'bad');

    const { error } = await db.from('hoc_vien_lo_trinh').insert({
      student_id: sid, lo_trinh_id: lo, bat_dau: ngay,
      buoi_moi_tuan: nhip, created_by: me ? me.id : null
    });

    if (error) return toast('Không giao được: ' + error.message, 'bad');
    toast('Đã giao lộ trình');
    tab();
  }

  async function go(hvId) {
    if (!confirm('Gỡ lộ trình này khỏi em đó? Những việc cô lồng thêm cũng mất theo.')) return;
    const { error } = await db.from('hoc_vien_lo_trinh').delete().eq('id', hvId);
    if (error) return toast('Không gỡ được: ' + error.message, 'bad');
    toast('Đã gỡ');
    tab();
  }

  function noi() {
    const ok = $('g-ok');
    if (ok) ok.addEventListener('click', giao);

    $('body').querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        go(parseInt(b.closest('[data-hv]').dataset.hv, 10));
      });
    });
  }

  // ---------- lồng bài từ chỗ hay sai ----------
  //
  // Cô đang nhìn bảng dạng hay sai, thấy em yếu chỗ nào thì bấm thẳng
  // ở đó. Việc được thêm vào tuần em đang học, không phải tuần 1 —
  // thêm vào tuần đã qua thì em không bao giờ thấy.

  async function long(tag, part) {
    if (!dang.length) {
      // Chưa nạp lần nào thì nạp, biết đâu em có lộ trình rồi
      await nap();
    }

    if (!dang.length) {
      toast('Em này chưa có lộ trình. Vào tab Lộ trình giao một cái trước đã.', 'bad');
      return;
    }

    const d = dang[0];
    const kind = part === 5 ? 'part5'
               : (part >= 1 && part <= 4) ? 'listen'
               : (part === 6 || part === 7) ? 'read' : 'part5';

    const soCu = prompt(
      'Lồng thêm bài cho «' + tag + '» vào tuần ' + d.tuan_nay + ' của lộ trình "' +
      d.ten + '".\n\nSố câu muốn em làm thêm trong tuần này:', '20');

    if (soCu === null) return;
    const amount = Math.max(1, parseInt(soCu, 10) || 20);

    const label = kind === 'part5' ? 'Part 5 · ' + tag
                : kind === 'listen' ? 'Nghe Part ' + part + ' · ' + tag
                : 'Đọc Part ' + part + ' · ' + tag;

    const { error } = await db.from('viec_rieng').insert({
      hv_lt_id: d.id,
      tuan: d.tuan_nay,
      kind: kind,
      // Chỉ Part 5 mới lọc được theo dạng; các part khác chưa gắn dạng
      // vào từng câu nên để trống, em làm chung cả part.
      target: kind === 'part5' ? tag : String(part),
      label: label,
      amount: amount,
      ly_do: 'Em đang yếu dạng này'
    });

    if (error) return toast('Không lồng được: ' + error.message, 'bad');

    // Nạp lại để lần bấm sau tính đúng tuần
    dang = [];
    toast('Đã lồng ' + amount + ' câu «' + tag + '» vào tuần ' + d.tuan_nay);
  }

  return { dat: dat, tab: tab, long: long, nap: nap };
})();
