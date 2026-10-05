// ============================================================
// Pacedemy — lấy file phát âm cho cả kho từ
//
// Giọng máy trong điện thoại mỗi máy một kiểu, và nhiều máy đọc
// tiếng Anh bằng giọng Việt. File ghi âm người thật thì ai nghe
// cũng giống nhau, nên đáng công đi lấy một lần cho cả kho.
//
// Không phải từ nào cũng có file. Từ nào không có thì vẫn để máy
// đọc như cũ, không sao cả.
// ============================================================

const VocabAm = (function () {

  const $ = function (id) { return document.getElementById(id); };
  const LO = 20;                  // mỗi lượt gọi hỏi 20 từ

  let dangChay = false;
  let dungLai = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function dem() {
    const [{ count: tong }, { count: co }] = await Promise.all([
      db.from('vocabulary').select('id', { count: 'exact', head: true }),
      db.from('vocabulary').select('id', { count: 'exact', head: true }).not('am_thanh', 'is', null)
    ]);
    return { tong: tong || 0, co: co || 0 };
  }

  async function veDem() {
    const d = await dem();
    const thieu = d.tong - d.co;
    $('am-dem').innerHTML =
      '<b>' + d.co + '</b> trên ' + d.tong + ' từ đã có file phát âm.' +
      (thieu
        ? ' Còn <b>' + thieu + '</b> từ đang dùng giọng máy.'
        : ' Cả kho đã có file.');
    $('am-chay').disabled = !thieu;
    return thieu;
  }

  function bao(msg) {
    $('am-tien').innerHTML = msg;
  }

  async function chay() {
    if (dangChay) { dungLai = true; return; }

    dangChay = true;
    dungLai = false;
    $('am-chay').textContent = 'Dừng lại';

    const { data } = await db.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) { bao('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.'); xong(); return; }

    let daXong = 0, daCo = 0, khongCo = 0;

    while (!dungLai) {
      const { data: ds, error } = await db.from('vocabulary')
        .select('id, word').is('am_thanh', null).order('id').limit(LO);

      if (error) { bao('Lỗi đọc kho: ' + esc(error.message)); break; }
      if (!ds || !ds.length) { bao('Xong. Không còn từ nào thiếu file.'); break; }

      let res;
      try {
        res = await fetch('/api/am-thanh', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
          body: JSON.stringify({ tu_list: ds.map(function (x) { return x.word; }) })
        });
      } catch (e) { bao('Mất kết nối, bạn thử lại sau nhé.'); break; }

      if (!res.ok) {
        bao('Máy chủ trả về lỗi ' + res.status + '. Có thể Worker chưa được deploy bản mới.');
        break;
      }

      const o = await res.json();
      const map = {};
      for (const r of (o.ket_qua || [])) map[r.tu] = r.am_thanh;

      // Từ không có file vẫn phải đánh dấu, nếu không vòng lặp sẽ
      // hỏi đi hỏi lại đúng mấy từ đó mãi không hết.
      for (const w of ds) {
        const am = map[String(w.word).toLowerCase()];
        await db.from('vocabulary')
          .update({ am_thanh: am || 'khong-co' }).eq('id', w.id);
        if (am) daCo++; else khongCo++;
        daXong++;
      }

      bao('Đã xử lý <b>' + daXong + '</b> từ — ' + daCo + ' từ có file, ' +
          khongCo + ' từ không có, vẫn để máy đọc.');
    }

    if (dungLai) bao($('am-tien').innerHTML + ' <i>Đã dừng.</i>');
    await veDem();
    xong();
  }

  function xong() {
    dangChay = false;
    dungLai = false;
    $('am-chay').textContent = 'Bắt đầu lấy';
  }

  let daNoi = false;

  async function moLai() {
    if (!daNoi) {
      $('am-chay').addEventListener('click', chay);
      daNoi = true;
    }
    await veDem();
  }

  return { moLai: moLai };
})();
