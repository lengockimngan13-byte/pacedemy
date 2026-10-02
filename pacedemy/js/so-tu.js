// ============================================================
// Pacedemy — Sổ từ của tôi
//
// Nhặt từ ra từ chính cái đề học viên vừa làm, rồi đưa vào vòng ôn.
// Học từ trong đúng bối cảnh đề thi thì lúc vào phòng thi mới nhận ra,
// chứ thuộc nghĩa tiếng Việt không thôi là một chuyện khác.
//
// Dùng chung cho các trang có màn kết: luyện Part 5, game, thi thử.
//
//   SoTu.moiNhat(root, dsCauSai);   // hiện khối mời thêm từ
//
// dsCauSai là mảng { q, chose } giống hệt thứ practice.js đang giữ.
// ============================================================

const SoTu = (function () {

  // Giãn cách Leitner, khớp GAP_MINUTES trong js/study.js
  const GAP = { 1: 10, 2: 1440, 3: 4320, 4: 10080, 5: 30240 };

  // Chỉ nhặt từ những dạng mà đáp án là một từ vựng thật.
  // Dạng ngữ pháp thì đáp án là một hình thái, nhặt vào sổ từ vô nghĩa.
  const DANG_TU = [
    'Giới từ', 'Từ nối', 'Chọn từ đúng nghĩa', 'Cụm từ cố định', 'Cụm động từ',
    'Danh từ', 'Tính từ', 'Trạng từ'
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dienVao(text, tu) {
    return String(text || '').replace(/_{2,}/g, tu || '');
  }

  // Lọc ra những câu sai mà đáng nhặt từ
  function locTu(ds) {
    const ra = [];
    const da = {};

    for (const s of (ds || [])) {
      const q = s.q || s;
      if (!q || !q.options || !q.correct_answer) continue;
      if (DANG_TU.indexOf(q.topic_tag) === -1) continue;

      const tu = String(q.options[q.correct_answer] || '').trim();
      if (!tu || tu.length > 40) continue;

      const khoa = tu.toLowerCase();
      if (da[khoa]) continue;
      da[khoa] = true;

      ra.push({
        tu: tu,
        cau: dienVao(q.question_text, tu),
        cau_vi: q.translation_vi || null,
        ghi_chu: q.explanation || q.key_point || null,
        nguon_qid: q.id || null
      });
    }

    return ra;
  }

  // Những từ đã nằm trong sổ rồi thì khỏi mời lại
  async function locDaCo(uid, ds) {
    if (!ds.length) return ds;

    const { data } = await db.from('tu_cua_toi')
      .select('tu').eq('user_id', uid);

    const co = {};
    for (const r of (data || [])) co[String(r.tu).toLowerCase()] = true;

    return ds.filter(function (x) { return !co[x.tu.toLowerCase()]; });
  }

  async function them(uid, x) {
    const han = new Date(Date.now() + GAP[1] * 60000);

    const { error } = await db.from('tu_cua_toi').insert({
      user_id: uid,
      tu: x.tu,
      cau: x.cau,
      cau_vi: x.cau_vi,
      ghi_chu: x.ghi_chu,
      nguon_qid: x.nguon_qid,
      box: 1,
      next_review: han.toISOString()
    });

    return error;
  }

  // ---------- Khối mời thêm từ ở màn kết ----------

  async function moiNhat(root, dsCauSai) {
    if (!root) return;

    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    let ds = locTu(dsCauSai);
    ds = await locDaCo(user.id, ds);

    if (!ds.length) { root.innerHTML = ''; return; }

    root.innerHTML =
      '<div class="st-moi">' +
        '<p class="st-h">Nhặt từ ra từ đề vừa làm</p>' +
        '<p class="st-p">Mấy từ này nằm trong câu bạn làm sai. Thêm vào sổ là chúng ' +
          'vào vòng ôn, và ôn lại bằng đúng câu bạn đã gặp.</p>' +
        '<div class="st-ds">' +
          ds.map(function (x, i) {
            return '<label class="st-o">' +
                     '<input type="checkbox" checked data-i="' + i + '">' +
                     '<span class="st-tu">' + esc(x.tu) + '</span>' +
                     '<span class="st-cau">' + esc(x.cau) + '</span>' +
                   '</label>';
          }).join('') +
        '</div>' +
        '<div class="st-nut">' +
          '<button class="btn btn-gold" id="st-them">Thêm vào sổ từ</button>' +
          '<a class="btn btn-line" href="so-tu.html">Mở sổ từ</a>' +
        '</div>' +
      '</div>';

    const nut = document.getElementById('st-them');

    nut.addEventListener('click', async function () {
      const chon = Array.prototype.slice
        .call(root.querySelectorAll('.st-o input:checked'))
        .map(function (b) { return ds[parseInt(b.dataset.i, 10)]; });

      if (!chon.length) { toast('Bạn chưa chọn từ nào.', 'bad'); return; }

      nut.disabled = true;
      nut.textContent = 'Đang thêm…';

      let loi = 0;
      for (const x of chon) {
        const e = await them(user.id, x);
        if (e) loi++;
      }

      nut.disabled = false;
      nut.textContent = 'Thêm vào sổ từ';

      if (loi === chon.length) {
        toast('Không thêm được từ nào. Bạn thử lại nhé.', 'bad');
        return;
      }

      toast('Đã thêm ' + (chon.length - loi) + ' từ vào sổ.', 'good');

      root.innerHTML =
        '<div class="st-moi st-xong">' +
          '<p class="st-h">Đã vào sổ từ</p>' +
          '<p class="st-p">' + (chon.length - loi) + ' từ sẽ hiện lại để ôn sau mười phút nữa, ' +
            'rồi giãn dần ra một ngày, ba ngày, một tuần.</p>' +
          '<a class="btn btn-line" href="so-tu.html">Mở sổ từ</a>' +
        '</div>';
    });
  }

  // ---------- Soi nhanh câu học viên tự đặt ----------
  //
  // Đây CHỈ là vòng lọc rác: bắt câu cụt, câu chép lại, câu viết bằng
  // tiếng Việt, câu không có từ cần dùng. Nó KHÔNG phải máy chấm ngữ
  // pháp — câu qua được vòng này vẫn phải chờ cô duyệt mới được đem ra
  // làm đề ôn.
  function kiemCau(cau, tu, cauGoc) {
    const c = String(cau || '').trim();
    if (!c) return { ok: false, loi: 'Bạn chưa viết gì cả.' };

    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(c)) {
      return { ok: false, loi: 'Câu này đang có chữ tiếng Việt. Bạn viết hẳn một câu tiếng Anh nhé.' };
    }

    const chu = c.split(/\s+/).filter(Boolean);
    if (chu.length < 5) {
      return { ok: false, loi: 'Câu ngắn quá — mới ' + chu.length +
        ' chữ. Viết đủ một câu có chủ ngữ và động từ, ít nhất 5 chữ.' };
    }
    if (chu.length > 40) {
      return { ok: false, loi: 'Câu dài quá. Một câu gọn thì dễ nhớ hơn, bạn rút lại dưới 40 chữ nhé.' };
    }

    // Có dùng đúng từ không, tính cả dạng chia đuôi
    const an = String(tu || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|\\W)' + an.replace(/\s+/g, '\\s+') + '\\w*', 'i');
    if (!re.test(c)) {
      return { ok: false, loi: 'Câu chưa có từ «' + tu + '». Cả bài là để tập dùng từ đó mà.' };
    }

    if (!/^[A-Z"\u2018\u201c]/.test(c)) {
      return { ok: false, loi: 'Câu tiếng Anh viết hoa chữ đầu nhé.' };
    }
    if (!/[.!?]["\u2019\u201d]?$/.test(c)) {
      return { ok: false, loi: 'Câu còn thiếu dấu chấm cuối.' };
    }

    const gon = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    if (cauGoc && gon(c) === gon(cauGoc)) {
      return { ok: false, loi: 'Đây đúng là câu trong đề. Bạn thử viết một câu của riêng mình, ' +
        'gắn với công việc hay đời sống của bạn.' };
    }

    return { ok: true };
  }

  return { moiNhat: moiNhat, locTu: locTu, kiemCau: kiemCau, GAP: GAP, esc: esc, dienVao: dienVao };
})();
