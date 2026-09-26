// ============================================================
// Pacedemy — danh sách có ô đánh dấu để làm hàng loạt
//
// Dùng chung cho các trang Nhập đề: hiện danh sách đã có, cho chọn
// từng dòng hoặc chọn tất cả, rồi tạm ẩn / mở lại / đổi số Test / xoá
// cả loạt trong một lần bấm.
//
// Cách dùng:
//   BulkList.render(khungHTML, {
//     items: [{ id, active, html }],      // html là phần mô tả một dòng
//     noun: 'câu',                        // dùng trong câu thông báo
//     onSetActive: async (ids, active) => lỗi hoặc null,
//     onSetTest:   async (ids, testNo) => lỗi hoặc null,   // bỏ qua nếu không cần
//     onDelete:    async (ids) => lỗi hoặc null,
//     onDone:      () => {}               // gọi lại sau khi xong, thường là tải lại danh sách
//   });
// ============================================================

const BulkList = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(root, opts) {
    const items = opts.items || [];
    const noun = opts.noun || 'mục';

    if (!items.length) {
      root.innerHTML = '<p class="empty">' + esc(opts.emptyText || 'Chưa có gì ở đây.') + '</p>';
      return;
    }

    root.innerHTML =
      '<div class="bulk-bar">' +
        '<label class="bulk-all">' +
          '<input type="checkbox" class="bulk-master"> Chọn tất cả' +
        '</label>' +
        '<span class="bulk-count">' + items.length + ' ' + esc(noun) + '</span>' +
        '<span class="bulk-acts hidden">' +
          '<button class="btn-sm" type="button" data-act="hide">Tạm ẩn</button>' +
          '<button class="btn-sm" type="button" data-act="show">Mở lại</button>' +
          (opts.onSetTest ? '<button class="btn-sm" type="button" data-act="test">Đổi số Test</button>' : '') +
          '<button class="btn-sm bulk-del" type="button" data-act="del">Xoá</button>' +
        '</span>' +
      '</div>' +
      '<div class="bulk-rows">' +
        items.map(function (it) {
          return '<div class="bulk-row' + (it.active ? '' : ' is-off') + '">' +
            '<label class="bulk-pick"><input type="checkbox" class="bulk-one" value="' + esc(it.id) + '"></label>' +
            '<div class="bulk-main">' + it.html + '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    const master = root.querySelector('.bulk-master');
    const boxes = Array.prototype.slice.call(root.querySelectorAll('.bulk-one'));
    const acts = root.querySelector('.bulk-acts');
    const count = root.querySelector('.bulk-count');

    function chosen() {
      return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    }

    function refresh() {
      const n = chosen().length;
      acts.classList.toggle('hidden', n === 0);
      count.textContent = n ? ('Đã chọn ' + n + ' / ' + items.length) : (items.length + ' ' + noun);
      master.checked = n === items.length;
      master.indeterminate = n > 0 && n < items.length;

      boxes.forEach(function (b) {
        b.closest('.bulk-row').classList.toggle('is-picked', b.checked);
      });
    }

    master.addEventListener('change', function () {
      boxes.forEach(function (b) { b.checked = master.checked; });
      refresh();
    });

    boxes.forEach(function (b) { b.addEventListener('change', refresh); });

    // Giữ Shift rồi bấm để chọn cả dải, tiện khi xoá một loạt câu liền nhau
    let last = null;
    boxes.forEach(function (b, i) {
      b.addEventListener('click', function (e) {
        if (e.shiftKey && last !== null) {
          const [a, z] = last < i ? [last, i] : [i, last];
          for (let k = a; k <= z; k++) boxes[k].checked = b.checked;
          refresh();
        }
        last = i;
      });
    });

    acts.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const ids = chosen();
        if (!ids.length) return;

        let run = null;
        let done = '';

        if (btn.dataset.act === 'hide') {
          run = function () { return opts.onSetActive(ids, false); };
          done = 'Đã tạm ẩn ' + ids.length + ' ' + noun + '.';
        } else if (btn.dataset.act === 'show') {
          run = function () { return opts.onSetActive(ids, true); };
          done = 'Đã mở lại ' + ids.length + ' ' + noun + '.';
        } else if (btn.dataset.act === 'test') {
          const v = prompt('Đổi ' + ids.length + ' ' + noun + ' đã chọn sang Test số mấy?\n' +
                           '(để trống rồi bấm OK là gỡ số Test)');
          if (v === null) return;
          const n = v.trim() === '' ? null : parseInt(v, 10);
          if (n !== null && (isNaN(n) || n < 1)) { toast('Số Test không hợp lệ.', 'bad'); return; }
          run = function () { return opts.onSetTest(ids, n); };
          done = 'Đã đổi số Test cho ' + ids.length + ' ' + noun + '.';
        } else {
          if (!confirm('Xoá hẳn ' + ids.length + ' ' + noun + ' đã chọn?\n' +
                       'Việc này không hoàn tác được.')) return;
          run = function () { return opts.onDelete(ids); };
          done = 'Đã xoá ' + ids.length + ' ' + noun + '.';
        }

        acts.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        const err = await run();
        acts.querySelectorAll('button').forEach(function (x) { x.disabled = false; });

        if (err) { toast('Không làm được: ' + err, 'bad'); return; }
        toast(done, 'good');
        if (opts.onDone) opts.onDone();
      });
    });

    refresh();
  }

  return { render: render, esc: esc };
})();
