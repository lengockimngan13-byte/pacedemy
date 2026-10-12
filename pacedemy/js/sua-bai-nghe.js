// ============================================================
// Pacedemy — sửa một bài nghe đã lưu
//
// Trước module này, bài nghe lưu rồi là coi như xong: muốn đổi một chữ
// trong tên bài, sửa một lỗi chính tả trong lời thoại, đổi đáp án gõ
// nhầm, hay chuyển bài sang đề khác thì chỉ còn cách xoá đi nhập lại
// cả bài. Mà xoá là mất luôn câu hỏi, mất luôn file đã gắn.
//
// Ở đây sửa tại chỗ. Không có nút Lưu: gõ xong bấm ra ngoài ô là ghi
// xuống, và có một dòng nhỏ báo "Đã lưu 14:32" để cô thấy rõ là đã
// ghi — chứ không lưu im re rồi cô ngồi đoán.
//
// Dùng:
//   SuaBaiNghe.mo(khung, idBai, {
//     onDoiTen: function (ten) {},     // tên bài vừa đổi, để cập nhật dòng ngoài
//     onXoa:    function () {},        // vừa xoá xong
//     onDong:   function () {}
//   });
// ============================================================

const SuaBaiNghe = (function () {

  let dangLuu = 0;

  const PART_TEN = {
    1: 'Part 1 — Mô tả tranh',
    2: 'Part 2 — Hỏi đáp',
    3: 'Part 3 — Hội thoại ngắn',
    4: 'Part 4 — Bài nói ngắn'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gio() {
    const d = new Date();
    const p = d.getMinutes();
    return d.getHours() + ':' + (p < 10 ? '0' : '') + p;
  }

  // ---------- dòng báo đã lưu ----------

  function theCua(el) {
    return el && el.closest ? el.closest('[data-the]') : null;
  }

  function bao(the, trangThai, chu) {
    if (!the) return;
    let o = the.querySelector(':scope > .sbn-dau > .sv-trangthai');
    if (!o) {
      const dau = the.querySelector(':scope > .sbn-dau');
      if (!dau) return;
      o = document.createElement('span');
      o.className = 'sv-trangthai';
      dau.appendChild(o);
    }
    o.className = 'sv-trangthai ' + trangThai;
    o.textContent = chu;

    clearTimeout(the.__hen);
    if (trangThai === 'xong') {
      the.__hen = setTimeout(function () { bao(the, 'im', ''); }, 4000);
    }
  }

  // bang  — 'listening_sets' hoặc 'questions'
  // Trả về true nếu ghi được
  async function ghi(bang, id, patch, el) {
    const the = theCua(el);
    bao(the, 'dang', 'Đang lưu…');
    dangLuu++;

    const { error } = await db.from(bang).update(patch).eq('id', id);

    dangLuu--;

    if (error) {
      // Xoá giá trị đã nhớ để lần bấm ra ngoài sau còn thử lưu lại,
      // đừng nuốt mất lần sửa của cô
      if (el) el.dataset.cu = '\u0000';
      bao(the, 'hong', 'Chưa lưu được');
      toast('Không lưu được: ' + error.message, 'bad');
      return false;
    }

    bao(the, 'xong', 'Đã lưu ' + gio());
    return true;
  }

  // Gắn cơ chế tự lưu cho một ô nhập
  function noVaoO(el, bang, id, cot, bien, sauKhiLuu) {
    if (!el) return;
    el.dataset.cu = el.value;

    el.addEventListener('blur', async function () {
      if (el.value === el.dataset.cu) return;
      const moi = el.value;
      el.dataset.cu = moi;

      const patch = {};
      patch[cot] = bien ? bien(moi) : (moi.trim() || null);

      const ok = await ghi(bang, id, patch, el);
      if (ok && sauKhiLuu) sauKhiLuu(moi);
    });

    if (el.tagName === 'INPUT' && el.type !== 'number') {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
    }
  }

  // ---------- vẽ phần thân ----------

  function oChu(nhan, giaTri, dai, goiY) {
    return '<label class="sbn-o' + (dai ? ' sbn-o-dai' : '') + '">' +
      '<span>' + esc(nhan) + '</span>' +
      (dai
        ? '<textarea rows="5" placeholder="' + esc(goiY || '') + '">' + esc(giaTri) + '</textarea>'
        : '<input type="text" value="' + esc(giaTri) + '" placeholder="' + esc(goiY || '') + '">') +
      '</label>';
  }

  function veFile(r) {
    const coAnh = r.part === 1 || r.part === 3 || r.part === 4;

    let h = '<div class="sbn-file">';

    h += '<div class="sbn-file-o">' +
      '<span class="sbn-file-nhan">Âm thanh</span>' +
      (r.audio_url
        ? '<audio controls preload="none" src="' + esc(r.audio_url) + '" style="width:100%;max-width:320px"></audio>'
        : '<span class="tag-cold" style="font-size:0.78rem">chưa có audio</span>') +
      '<label class="btn-sm" style="cursor:pointer;margin:0">' +
        (r.audio_url ? 'Đổi audio' : 'Chọn audio') +
        '<input type="file" accept="audio/*" data-kind="audio" hidden>' +
      '</label>' +
    '</div>';

    if (coAnh) {
      h += '<div class="sbn-file-o">' +
        '<span class="sbn-file-nhan">Ảnh</span>' +
        (r.image_url
          ? '<img src="' + esc(r.image_url) + '" alt="" class="sbn-anh">'
          : '<span class="' + (r.part === 1 ? 'tag-cold' : 'stat-lab') + '" style="font-size:0.78rem">' +
            (r.part === 1 ? 'Part 1 cần có ảnh' : 'không bắt buộc') + '</span>') +
        '<label class="btn-sm" style="cursor:pointer;margin:0">' +
          (r.image_url ? 'Đổi ảnh' : 'Chọn ảnh') +
          '<input type="file" accept="image/*" data-kind="image" hidden>' +
        '</label>' +
        (r.image_url
          ? '<button class="btn-sm" type="button" data-bo-anh>Bỏ ảnh</button>'
          : '') +
      '</div>';
    }

    return h + '</div>';
  }

  function veCau(q, i, part) {
    const chuCai = part === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
    const opts = q.options && typeof q.options === 'object' ? q.options : {};

    let h = '<div class="sbn-cau" data-the data-cau="' + q.id + '">' +
      '<div class="sbn-dau">' +
        '<b>Câu ' + (i + 1) + '</b>' +
        (q.is_active === false ? '<span class="tag-cold" style="font-size:0.76rem">đang ẩn</span>' : '') +
      '</div>';

    if (part === 3 || part === 4) {
      h += oChu('Câu hỏi in trên đề', q.question_text || '', false, 'vd Why is the man calling?');
    }

    h += '<div class="sbn-pa">';
    chuCai.forEach(function (k) {
      h += '<label class="sbn-pa-o' + (q.correct_answer === k ? ' sbn-dung' : '') + '" data-pa="' + k + '">' +
        '<span>' + k + '</span>' +
        '<input type="text" value="' + esc(opts[k] || '') + '" data-opt="' + k + '">' +
        '<button class="sbn-chon" type="button" data-dap-an="' + k + '" ' +
          'title="Đặt ' + k + ' làm đáp án đúng">' +
          (q.correct_answer === k ? 'đáp án đúng' : 'chọn') +
        '</button>' +
      '</label>';
    });
    h += '</div>';

    h += oChu('Giải thích', q.explanation || '', true,
      'Chỗ nào trong bài nghe cho ra đáp án, và vì sao các phương án kia sai');
    h += '<div class="sbn-hang2">' +
      oChu('Nghĩa phương án đúng', q.translation_vi || '') +
      oChu('Từ cần nghe bắt được', q.key_point || '', false, 'cụm tiếng Anh = nghĩa tiếng Việt') +
    '</div>';
    h += oChu('Dạng câu', q.topic_tag || '', false, 'vd Câu hỏi về chi tiết');

    h += '<div class="sbn-cau-nut">' +
      '<button class="btn-sm" type="button" data-an-cau>' +
        (q.is_active === false ? 'Hiện lại câu này' : 'Ẩn câu này') +
      '</button>' +
      '<button class="btn-sm" type="button" data-xoa-cau>Xoá câu này</button>' +
    '</div>';

    return h + '</div>';
  }

  // ---------- mở bảng sửa ----------

  async function mo(root, setId, opts) {
    opts = opts || {};
    root.innerHTML = '<p class="empty">Đang mở bài…</p>';

    const { data: r, error } = await db.from('listening_sets')
      .select('id, part, title, test_no, difficulty, audio_url, image_url, transcript, transcript_vi, is_active')
      .eq('id', setId).single();

    if (error || !r) {
      root.innerHTML = '<p class="empty">Không mở được bài này: ' +
        esc(error ? error.message : 'không tìm thấy') + '</p>';
      return;
    }

    const { data: qs } = await db.from('questions')
      .select('id, question_text, options, correct_answer, explanation, translation_vi, key_point, topic_tag, order_index, is_active')
      .eq('set_id', setId).order('order_index').order('id');

    const cau = qs || [];

    let html = '<div class="sbn" data-the>' +
      '<div class="sbn-dau">' +
        '<b>' + esc(PART_TEN[r.part] || 'Part ' + r.part) + '</b>' +
        '<span class="stat-lab">' + cau.length + ' câu</span>' +
      '</div>' +

      oChu('Tên bài', r.title || '', false, 'Tên ngắn để cô nhận ra bài này') +

      '<div class="sbn-hang3">' +
        '<label class="sbn-o">' +
          '<span>Thuộc đề</span>' +
          '<select data-de><option value="">— chưa xếp đề —</option></select>' +
        '</label>' +
        '<label class="sbn-o">' +
          '<span>Part</span>' +
          '<select data-part>' +
            [1, 2, 3, 4].map(function (p) {
              return '<option value="' + p + '"' + (r.part === p ? ' selected' : '') + '>' +
                esc(PART_TEN[p]) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<label class="sbn-o">' +
          '<span>Độ khó</span>' +
          '<select data-kho>' +
            [[1, 'Dễ'], [2, 'Vừa'], [3, 'Khó']].map(function (x) {
              return '<option value="' + x[0] + '"' + ((r.difficulty || 2) === x[0] ? ' selected' : '') + '>' +
                x[1] + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
      '</div>' +

      veFile(r) +

      '<div class="sbn-hang2">' +
        oChu('Lời thoại tiếng Anh', r.transcript || '', true) +
        oChu('Lời thoại tiếng Việt', r.transcript_vi || '', true) +
      '</div>' +

      '<h4 class="sbn-tieu">Các câu hỏi của bài</h4>' +
      (cau.length
        ? cau.map(function (q, i) { return veCau(q, i, r.part); }).join('')
        : '<p class="empty">Bài này chưa có câu hỏi nào.</p>') +

      '<div class="sbn-nut">' +
        '<button class="btn-sm" type="button" data-an-bai>' +
          (r.is_active === false ? 'Hiện lại bài này' : 'Ẩn bài này') +
        '</button>' +
        '<button class="btn-sm" type="button" data-xoa-bai>Xoá cả bài</button>' +
        '<button class="btn-sm" type="button" data-dong>Đóng</button>' +
      '</div>' +
    '</div>';

    root.innerHTML = html;
    const khung = root.querySelector('.sbn');

    // ---- các ô của bài ----

    const oTen = khung.querySelector(':scope > .sbn-o input');
    noVaoO(oTen, 'listening_sets', r.id, 'title',
      function (v) { return v.trim(); },
      function (v) { if (opts.onDoiTen) opts.onDoiTen(v.trim()); });

    const selDe = khung.querySelector('select[data-de]');
    BoDe.doOSelect(selDe, r.test_no);
    selDe.addEventListener('change', async function () {
      const v = selDe.value === '' ? null : parseInt(selDe.value, 10);
      await ghi('listening_sets', r.id, { test_no: v }, selDe);
      if (opts.onDoiDe) opts.onDoiDe(v);
    });

    const selPart = khung.querySelector('select[data-part]');
    selPart.addEventListener('change', async function () {
      const p = parseInt(selPart.value, 10);
      const ok = await ghi('listening_sets', r.id, { part: p }, selPart);
      if (!ok) return;
      // Câu hỏi cũng ghi part riêng, phải đổi theo không thì lệch nhau
      await db.from('questions').update({ part: p }).eq('set_id', r.id);
      toast('Đã chuyển bài sang Part ' + p + '. Mở lại để thấy đúng số phương án.', 'good');
      if (opts.onDoiPart) opts.onDoiPart(p);
    });

    const selKho = khung.querySelector('select[data-kho]');
    selKho.addEventListener('change', function () {
      ghi('listening_sets', r.id, { difficulty: parseInt(selKho.value, 10) }, selKho);
    });

    const oLoi = khung.querySelectorAll(':scope > .sbn-hang2 textarea');
    noVaoO(oLoi[0], 'listening_sets', r.id, 'transcript');
    noVaoO(oLoi[1], 'listening_sets', r.id, 'transcript_vi');

    // ---- file audio / ảnh ----

    khung.querySelectorAll('.sbn-file input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () { doiFile(inp, r, opts, root, setId); });
    });

    const boAnh = khung.querySelector('[data-bo-anh]');
    if (boAnh) {
      boAnh.addEventListener('click', async function () {
        if (!confirm('Bỏ ảnh khỏi bài này?')) return;
        const ok = await ghi('listening_sets', r.id, { image_url: null }, boAnh);
        if (ok) mo(root, setId, opts);
      });
    }

    // ---- từng câu hỏi ----

    cau.forEach(function (q, i) {
      const the = khung.querySelector('[data-cau="' + q.id + '"]');
      if (!the) return;

      const chuCai = r.part === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];

      if (r.part === 3 || r.part === 4) {
        noVaoO(the.querySelector('.sbn-o input'), 'questions', q.id, 'question_text');
      }

      // Bốn phương án nằm chung một cột jsonb, nên phải đọc lại cả cột
      // rồi ghi xuống, không ghi lẻ từng chữ cái được
      const hienTai = Object.assign({}, q.options || {});

      chuCai.forEach(function (k) {
        const inp = the.querySelector('input[data-opt="' + k + '"]');
        if (!inp) return;
        inp.dataset.cu = inp.value;

        inp.addEventListener('blur', async function () {
          if (inp.value === inp.dataset.cu) return;
          inp.dataset.cu = inp.value;
          const v = inp.value.trim();
          if (v) hienTai[k] = v; else delete hienTai[k];
          await ghi('questions', q.id, { options: hienTai }, inp);
        });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
        });
      });

      the.querySelectorAll('[data-dap-an]').forEach(function (b) {
        b.addEventListener('click', async function () {
          const k = b.dataset.dapAn;
          if (!(hienTai[k] || '').trim()) {
            toast('Phương án ' + k + ' đang trống, chưa đặt làm đáp án được.', 'bad');
            return;
          }
          const ok = await ghi('questions', q.id, { correct_answer: k }, b);
          if (!ok) return;
          the.querySelectorAll('.sbn-pa-o').forEach(function (o) {
            const la = o.dataset.pa === k;
            o.classList.toggle('sbn-dung', la);
            const n = o.querySelector('.sbn-chon');
            if (n) n.textContent = la ? 'đáp án đúng' : 'chọn';
          });
        });
      });

      const oCau = the.querySelectorAll('.sbn-o');
      // thứ tự các ô: [câu hỏi nếu có] giải thích, nghĩa, từ khoá, dạng câu
      const lech = (r.part === 3 || r.part === 4) ? 1 : 0;
      noVaoO(oCau[lech] && oCau[lech].querySelector('textarea'), 'questions', q.id, 'explanation');
      noVaoO(oCau[lech + 1] && oCau[lech + 1].querySelector('input'), 'questions', q.id, 'translation_vi');
      noVaoO(oCau[lech + 2] && oCau[lech + 2].querySelector('input'), 'questions', q.id, 'key_point');
      noVaoO(oCau[lech + 3] && oCau[lech + 3].querySelector('input'), 'questions', q.id, 'topic_tag');

      the.querySelector('[data-an-cau]').addEventListener('click', async function () {
        const dangHien = q.is_active !== false;
        const ok = await ghi('questions', q.id, { is_active: !dangHien }, this);
        if (ok) mo(root, setId, opts);
      });

      the.querySelector('[data-xoa-cau]').addEventListener('click', async function () {
        if (!confirm('Xoá câu ' + (i + 1) + ' của bài này? Không hoàn tác được.')) return;
        const { error: e } = await db.from('questions').delete().eq('id', q.id);
        if (e) { toast('Không xoá được: ' + e.message, 'bad'); return; }
        toast('Đã xoá câu hỏi.', 'good');
        mo(root, setId, opts);
      });
    });

    // ---- nút của cả bài ----

    khung.querySelector('[data-an-bai]').addEventListener('click', async function () {
      const dangHien = r.is_active !== false;
      const ok = await ghi('listening_sets', r.id, { is_active: !dangHien }, this);
      if (ok) {
        if (opts.onDoiHien) opts.onDoiHien(!dangHien);
        mo(root, setId, opts);
      }
    });

    khung.querySelector('[data-xoa-bai]').addEventListener('click', async function () {
      if (!confirm('Xoá hẳn bài "' + (r.title || '') + '" cùng ' + cau.length +
                   ' câu hỏi của nó? Không hoàn tác được.')) return;
      await db.from('questions').delete().eq('set_id', r.id);
      const { error: e } = await db.from('listening_sets').delete().eq('id', r.id);
      if (e) { toast('Không xoá được: ' + e.message, 'bad'); return; }
      toast('Đã xoá bài nghe.', 'good');
      root.innerHTML = '';
      if (opts.onXoa) opts.onXoa();
    });

    khung.querySelector('[data-dong]').addEventListener('click', function () {
      root.innerHTML = '';
      if (opts.onDong) opts.onDong();
    });
  }

  // Đổi file audio hoặc ảnh của bài. Tên file tự sinh theo id bài nên
  // không bao giờ trùng với bài khác, và nằm trong ngăn của đúng đề.
  async function doiFile(inp, r, opts, root, setId) {
    const f = inp.files && inp.files[0];
    if (!f) return;

    const kind = inp.dataset.kind;
    const label = inp.parentElement;
    const chuCu = label.childNodes[0].nodeValue;
    label.childNodes[0].nodeValue = 'Đang tải… ';

    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const nganDe = r.test_no == null ? 'le' : 'de-' + r.test_no;
    const key = 'listen/' + nganDe + '/p' + r.part +
                '/set-' + r.id + '-' + kind + '-' + Date.now() + '.' + ext;

    const { error: upErr } = await uploadMedia(key, f);

    if (upErr) {
      label.childNodes[0].nodeValue = chuCu;
      toast('Không tải lên được: ' + upErr.message, 'bad');
      return;
    }

    const patch = {};
    patch[kind === 'audio' ? 'audio_url' : 'image_url'] = mediaUrl(key);

    const { error: dbErr } = await db.from('listening_sets').update(patch).eq('id', r.id);

    if (dbErr) {
      label.childNodes[0].nodeValue = chuCu;
      toast('Tải lên xong nhưng không gắn được vào bài: ' + dbErr.message, 'bad');
      return;
    }

    toast('Đã gắn ' + (kind === 'audio' ? 'audio' : 'ảnh') + ' vào bài.', 'good');
    mo(root, setId, opts);
  }

  window.addEventListener('beforeunload', function (e) {
    if (dangLuu > 0) { e.preventDefault(); e.returnValue = ''; }
  });

  return { mo: mo };
})();
