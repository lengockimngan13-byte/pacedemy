// ============================================================
// Pacedemy — điền giải thích cho cả bốn phương án
//
// Giao diện chữa bài đã dựng sẵn chỗ hiện giải thích từng phương án
// từ lâu; thiếu là thiếu DỮ LIỆU. Câu nào chưa có thì game hiện dấu
// gạch ngang — học viên thấy ba phương án sai mà không biết sai ở đâu.
//
// Chạy theo lô 8 câu một lượt, có thể dừng giữa chừng. Đi theo id
// tăng dần chứ không dựa vào điều kiện lọc: câu nào AI trả về thiếu
// phương án thì mình bỏ qua không lưu, nếu chỉ dựa vào bộ lọc thì
// vòng lặp hỏi mãi đúng mấy câu đó.
// ============================================================

const GiaiDapAn = (function () {

  const $ = function (id) { return document.getElementById(id); };
  const LO = 8;

  let dangChay = false;
  let dungLai = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function dem() {
    const [{ count: tong }, { count: xong }] = await Promise.all([
      db.from('questions').select('id', { count: 'exact', head: true }).eq('is_active', true),
      db.from('questions').select('id', { count: 'exact', head: true })
        .eq('is_active', true).not('options_vi', 'is', null)
    ]);
    return { tong: tong || 0, xong: xong || 0 };
  }

  async function veDem() {
    const d = await dem();
    const con = d.tong - d.xong;
    $('gd-dem').innerHTML =
      '<b>' + d.xong + '</b> câu đã có giải thích bốn phương án · ' +
      '<b>' + con + '</b> câu chưa có. ' +
      (con ? 'Câu chưa có thì lúc chữa bài chỉ hiện dấu gạch ngang.' : 'Xong hết rồi.');
    return con;
  }

  function bao(msg) { $('gd-tien').innerHTML = msg; }

  async function token() {
    const { data } = await db.auth.getSession();
    return data && data.session && data.session.access_token;
  }

  async function chay() {
    if (dangChay) { dungLai = true; return; }

    dangChay = true; dungLai = false;
    $('gd-chay').textContent = 'Dừng lại';

    const tk = await token();
    if (!tk) { xong(); return bao('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.'); }

    let daXong = 0, boQua = 0, moc = 0;

    while (!dungLai) {
      let q = db.from('questions')
        .select('id, question_text, options, correct_answer, topic_tag')
        .eq('is_active', true).is('options_vi', null);
      if (moc) q = q.gt('id', moc);

      const { data: ds, error } = await q.order('id').limit(LO);

      if (error) { bao('Lỗi đọc đề: ' + esc(error.message)); break; }
      if (!ds || !ds.length) {
        bao(daXong
          ? 'Xong. Đã điền <b>' + daXong + '</b> câu' +
            (boQua ? ', bỏ qua ' + boQua + ' câu AI trả về thiếu phương án' : '') + '.'
          : 'Mọi câu đều đã có giải thích rồi.');
        break;
      }

      let res;
      try {
        res = await fetch('/api/giai-dap-an', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
          body: JSON.stringify({ cau: ds })
        });
      } catch (e) { bao('Mất kết nối, bạn thử lại sau nhé.'); break; }

      let o = {};
      try { o = await res.json(); } catch (e) {}

      if (!res.ok) { bao(esc(o.loi || loiMay(res.status))); break; }

      for (const r of (o.ket_qua || [])) {
        const { error: e2 } = await db.from('questions')
          .update({ options_vi: r.options_vi }).eq('id', r.id);
        if (!e2) daXong++;
      }

      boQua += (ds.length - (o.ket_qua || []).length);
      moc = ds[ds.length - 1].id;

      bao('Đã điền <b>' + daXong + '</b> câu' +
          (boQua ? ' · bỏ qua ' + boQua : '') + '…');
    }

    if (dungLai) bao($('gd-tien').innerHTML + ' <i>Đã dừng.</i>');
    await veDem();
    xong();
  }

  function xong() {
    dangChay = false; dungLai = false;
    $('gd-chay').textContent = 'Điền cho các câu còn thiếu';
  }

  function loiMay(status) {
    if (status === 403) return 'Chỉ tài khoản giáo viên dùng được.';
    if (status === 404) return 'Chưa có đường dẫn này. Worker cần deploy bản mới.';
    if (status === 429) return 'Hết lượt dùng AI hôm nay.';
    return 'Máy chủ trả về lỗi ' + status + '.';
  }

  // Xem thử một câu đã điền, để cô kiểm chất lượng trước khi chạy cả kho
  async function xemThu() {
    const { data } = await db.from('questions')
      .select('question_text, options, options_vi, correct_answer, topic_tag')
      .not('options_vi', 'is', null).order('id', { ascending: false }).limit(1);

    if (!data || !data.length) return bao('Chưa có câu nào để xem.');

    const c = data[0];
    const o = c.options || {}, v = c.options_vi || {};

    $('gd-thu').innerHTML =
      '<p class="gd-thu-cau">' + esc(c.question_text) +
        ' <span class="gd-thu-dang">' + esc(c.topic_tag || '') + '</span></p>' +
      ['A', 'B', 'C', 'D'].filter(function (k) { return o[k]; }).map(function (k) {
        return '<div class="gd-thu-op' + (k === c.correct_answer ? ' dung' : '') + '">' +
          '<b>' + esc(o[k]) + '</b><span>' + esc(v[k] || '—') + '</span></div>';
      }).join('');
    $('gd-thu').classList.remove('hidden');
  }

  let daNoi = false;

  async function moLai() {
    if (!daNoi) {
      $('gd-chay').addEventListener('click', chay);
      $('gd-thu-nut').addEventListener('click', xemThu);
      daNoi = true;
    }
    await veDem();
  }

  return { moLai: moLai };
})();
