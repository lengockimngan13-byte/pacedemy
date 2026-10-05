// ============================================================
// Pacedemy — phát âm cho cả kho từ
//
// Hai cách, cô Ngân chọn:
//
//   A. Tìm file ghi âm có sẵn (Wiktionary) — miễn phí, nhưng chỉ
//      khoảng một nửa số từ có, và mỗi từ một người đọc nên giọng
//      không đều nhau.
//
//   B. Tự tạo file bằng giọng neural rồi lưu vào kho của Pacedemy —
//      tốn vài nghìn đồng cho cả kho, nhưng phủ 100% số từ, giọng
//      giống hệt nhau ở mọi từ, và file nằm trên máy chủ của mình.
//      Đây mới là cách ra được từ điển giống Cambridge, Oxford.
//
// Cách B tốt hơn hẳn, A chỉ để dùng khi chưa có khoá giọng đọc.
// ============================================================

const VocabAm = (function () {

  const $ = function (id) { return document.getElementById(id); };
  const LO_TIM = 20;      // tìm file có sẵn: mỗi lượt 20 từ
  const LO_TAO = 12;      // tự tạo file: mỗi lượt 12 từ cho nhẹ

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
      db.from('vocabulary').select('id', { count: 'exact', head: true })
        .like('am_thanh', 'http%')
    ]);
    const [{ count: cuaMinh }] = await Promise.all([
      db.from('vocabulary').select('id', { count: 'exact', head: true })
        .like('am_thanh', '/media/phat-am/%')
    ]);
    return { tong: tong || 0, ngoai: co || 0, cuaMinh: cuaMinh || 0 };
  }

  async function veDem() {
    const d = await dem();
    const roi = d.ngoai + d.cuaMinh;
    const thieu = d.tong - roi;

    $('am-dem').innerHTML =
      '<b>' + d.cuaMinh + '</b> từ dùng file của Pacedemy · ' +
      '<b>' + d.ngoai + '</b> từ dùng file Wiktionary · ' +
      '<b>' + thieu + '</b> từ còn để máy đọc. Tổng ' + d.tong + ' từ.';

    return { thieu: thieu, chuaCoCuaMinh: d.tong - d.cuaMinh };
  }

  function bao(msg) { $('am-tien').innerHTML = msg; }

  function batDau(nhan) {
    dangChay = true; dungLai = false;
    $('am-tim').disabled = true;
    $('am-tao').disabled = true;
    $(nhan).disabled = false;
    $(nhan).textContent = 'Dừng lại';
  }

  function ketThuc() {
    dangChay = false; dungLai = false;
    $('am-tim').disabled = false;
    $('am-tao').disabled = false;
    $('am-tim').textContent = 'Tìm file có sẵn';
    $('am-tao').textContent = 'Tự tạo file cho cả kho';
  }

  async function token() {
    const { data } = await db.auth.getSession();
    return data && data.session && data.session.access_token;
  }

  // ---------- A. Tìm file có sẵn ----------

  async function tim() {
    if (dangChay) { dungLai = true; return; }
    batDau('am-tim');

    const tk = await token();
    if (!tk) { bao('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.'); ketThuc(); return; }

    let daXong = 0, daCo = 0;

    while (!dungLai) {
      const { data: ds, error } = await db.from('vocabulary')
        .select('id, word').is('am_thanh', null).order('id').limit(LO_TIM);

      if (error) { bao('Lỗi đọc kho: ' + esc(error.message)); break; }
      if (!ds || !ds.length) { bao('Xong. Không còn từ nào chưa dò.'); break; }

      let res;
      try {
        res = await fetch('/api/am-thanh', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
          body: JSON.stringify({ tu_list: ds.map(function (x) { return x.word; }) })
        });
      } catch (e) { bao('Mất kết nối, bạn thử lại sau nhé.'); break; }

      if (!res.ok) { bao(loiMay(res.status)); break; }

      const o = await res.json();
      const map = {};
      for (const r of (o.ket_qua || [])) map[r.tu] = r.am_thanh;

      for (const w of ds) {
        const am = map[String(w.word).toLowerCase()];
        // Từ không có file vẫn phải đánh dấu, nếu không vòng lặp cứ
        // hỏi đi hỏi lại đúng mấy từ đó mãi không hết.
        await db.from('vocabulary').update({ am_thanh: am || 'khong-co' }).eq('id', w.id);
        if (am) daCo++;
        daXong++;
      }

      bao('Đã dò <b>' + daXong + '</b> từ — ' + daCo + ' từ có file sẵn.');
    }

    if (dungLai) bao($('am-tien').innerHTML + ' <i>Đã dừng.</i>');
    await veDem();
    ketThuc();
  }

  // ---------- B. Tự tạo file ----------

  async function tao() {
    if (dangChay) { dungLai = true; return; }

    const giong = $('am-giong').value;
    const lamLai = $('am-lai') && $('am-lai').checked;
    batDau('am-tao');

    const tk = await token();
    if (!tk) { bao('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.'); ketThuc(); return; }

    let daXong = 0, loi = 0, moc = 0, may = '';

    while (!dungLai) {
      // Từ nào đang dùng file của Pacedemy rồi thì bỏ qua, còn lại
      // đều tạo — kể cả từ đang dùng file Wiktionary, vì giọng mình
      // tự tạo đều hơn. Tích "tạo lại" thì làm hết, dùng khi đổi giọng.
      // Luôn đi theo id tăng dần. Nếu chỉ dựa vào điều kiện lọc thì từ
      // nào tạo lỗi sẽ nằm lại, vòng lặp hỏi mãi đúng mấy từ đó.
      let q = db.from('vocabulary').select('id, word');
      if (!lamLai) q = q.not('am_thanh', 'like', '/media/phat-am/%');
      if (moc) q = q.gt('id', moc);

      const { data: ds, error } = await q.order('id').limit(LO_TAO);

      if (error) { bao('Lỗi đọc kho: ' + esc(error.message)); break; }
      if (!ds || !ds.length) {
        bao(daXong
          ? 'Xong. Đã tạo <b>' + daXong + '</b> file' +
            (loi ? ', ' + loi + ' từ không tạo được' : '') +
            (may ? ' · giọng ' + esc(tenMay(may)) : '') + '.'
          : 'Cả kho đã có file của Pacedemy rồi, không cần tạo thêm.');
        break;
      }

      let res;
      try {
        res = await fetch('/api/tao-am', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
          body: JSON.stringify({
            tu_list: ds.map(function (x) { return x.word; }),
            giong: giong,
            lam_lai: !!lamLai
          })
        });
      } catch (e) { bao('Mất kết nối, bạn thử lại sau nhé.'); break; }

      if (!res.ok) {
        let m = loiMay(res.status);
        try { const o = await res.json(); if (o.loi) m = esc(o.loi); } catch (e) {}
        bao(m);
        break;
      }

      const o = await res.json();
      if (o.may) may = o.may;

      const map = {};
      for (const r of (o.ket_qua || [])) map[r.tu] = r.am_thanh;

      for (const w of ds) {
        const am = map[String(w.word).toLowerCase()];
        if (am) {
          await db.from('vocabulary').update({ am_thanh: am }).eq('id', w.id);
          daXong++;
        } else {
          loi++;
        }
      }

      moc = ds[ds.length - 1].id;

      bao('Đã tạo <b>' + daXong + '</b> file' + (loi ? ' · ' + loi + ' từ lỗi' : '') +
          (may ? ' · giọng ' + esc(tenMay(may)) : '') + '…');
    }

    if (dungLai) bao($('am-tien').innerHTML + ' <i>Đã dừng.</i>');
    await veDem();
    ketThuc();
  }

  function tenMay(m) {
    if (m === 'azure') return 'Azure neural';
    if (String(m).indexOf('aura') >= 0) return 'Cloudflare Aura';
    if (String(m).indexOf('melotts') >= 0) return 'Cloudflare MeloTTS';
    return m;
  }

  function loiMay(status) {
    if (status === 403) return 'Chỉ tài khoản giáo viên dùng được.';
    if (status === 404) return 'Chưa có đường dẫn này. Worker cần deploy bản mới: <code>npx wrangler deploy</code>';
    return 'Máy chủ trả về lỗi ' + status + '.';
  }

  let daNoi = false;

  async function moLai() {
    if (!daNoi) {
      $('am-tim').addEventListener('click', tim);
      $('am-tao').addEventListener('click', tao);
      daNoi = true;
    }
    await veDem();
  }

  return { moLai: moLai };
})();
