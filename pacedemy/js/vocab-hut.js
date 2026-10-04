// ============================================================
// Pacedemy — từ học viên tra trong từ điển mà kho chưa có
//
// Mỗi lần học viên tra hụt, trang từ điển gọi hàm ghi_tra_cuu_hut.
// Ở đây gom lại thành danh sách việc cần làm, xếp theo số lượt tra:
// từ nào nhiều người tra nhất thì cô thêm trước.
//
// Đây là chỗ người học nói cho cô biết họ đang vướng gì, không phải
// đoán. Nên nó đáng giá hơn một danh sách từ vựng mua sẵn.
// ============================================================

const VocabHut = (function () {

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function khiNao(iso) {
    const t = new Date(iso).getTime();
    const phut = Math.round((Date.now() - t) / 60000);
    if (phut < 60) return phut <= 1 ? 'vừa xong' : phut + ' phút trước';
    const gio = Math.round(phut / 60);
    if (gio < 24) return gio + ' giờ trước';
    const ngay = Math.round(gio / 24);
    if (ngay < 30) return ngay + ' ngày trước';
    return new Date(iso).toLocaleDateString('vi-VN');
  }

  async function nap() {
    const { data, error } = await db.from('tra_cuu_hut')
      .select('id, tu, lan, lan_cuoi, da_them')
      .eq('da_them', false)
      .order('lan', { ascending: false })
      .order('lan_cuoi', { ascending: false })
      .limit(200);

    if (error) {
      $('hut-list').innerHTML = '<p class="empty">Không đọc được danh sách: ' + esc(error.message) + '</p>';
      return;
    }

    if (!data || !data.length) {
      $('hut-list').innerHTML =
        '<p class="empty">Chưa có từ nào bị tra hụt. Kho đang đủ dùng cho học viên.</p>';
      return;
    }

    $('hut-list').innerHTML = '<div class="hut-ds">' + data.map(function (r) {
      return '<div class="hut-mot" data-id="' + r.id + '">' +
               '<div class="hut-tu">' +
                 '<b>' + esc(r.tu) + '</b>' +
                 '<span>' + r.lan + ' lượt tra · gần nhất ' + khiNao(r.lan_cuoi) + '</span>' +
               '</div>' +
               '<div class="hut-nut">' +
                 '<button class="btn-sm" type="button" data-chep="' + esc(r.tu) + '">Chép từ</button>' +
                 '<button class="btn-sm test" type="button" data-xong="' + r.id + '">Đã thêm</button>' +
                 '<button class="btn-sm" type="button" data-bo="' + r.id + '" ' +
                   'title="Không định thêm từ này">Bỏ qua</button>' +
               '</div>' +
             '</div>';
    }).join('') + '</div>';
  }

  async function danhDauXong(id, el) {
    const { error } = await db.from('tra_cuu_hut').update({ da_them: true }).eq('id', id);
    if (error) {
      if (typeof toast === 'function') toast('Không đổi được: ' + error.message, 'bad');
      return;
    }
    el.remove();
    if (!document.querySelector('.hut-mot')) nap();
  }

  async function xoa(id, el) {
    const { error } = await db.from('tra_cuu_hut').delete().eq('id', id);
    if (error) {
      if (typeof toast === 'function') toast('Không xoá được: ' + error.message, 'bad');
      return;
    }
    el.remove();
    if (!document.querySelector('.hut-mot')) nap();
  }

  let daNoi = false;

  function noi() {
    $('hut-list').addEventListener('click', async function (e) {
      const chep = e.target.closest('[data-chep]');
      if (chep) {
        try {
          await navigator.clipboard.writeText(chep.dataset.chep);
          chep.textContent = 'Đã chép';
          setTimeout(function () { chep.textContent = 'Chép từ'; }, 1400);
        } catch (err) {
          if (typeof toast === 'function') toast('Trình duyệt không cho chép tự động', 'bad');
        }
        return;
      }

      const xong = e.target.closest('[data-xong]');
      if (xong) {
        danhDauXong(parseInt(xong.dataset.xong, 10), xong.closest('.hut-mot'));
        return;
      }

      const bo = e.target.closest('[data-bo]');
      if (bo) {
        if (!confirm('Xoá «' + bo.closest('.hut-mot').querySelector('b').textContent +
                     '» khỏi danh sách? Nếu học viên tra lại thì nó hiện ra lần nữa.')) return;
        xoa(parseInt(bo.dataset.bo, 10), bo.closest('.hut-mot'));
      }
    });
  }

  async function moLai() {
    if (!daNoi) { noi(); daNoi = true; }
    await nap();
  }

  return { moLai: moLai };
})();
