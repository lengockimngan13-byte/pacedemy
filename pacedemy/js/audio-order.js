// ============================================================
// Pacedemy — tải mp3 theo thứ tự chuẩn của đề TOEIC
//
// Một đề Listening có 54 file: Part 1 sáu câu, Part 2 hai mươi lăm câu,
// Part 3 mười ba bài, Part 4 mười bài. Số câu của chúng là cố định,
// nên chỉ cần chọn file đúng thứ tự, công cụ tự đặt tên q1.mp3, q7.mp3,
// q32.mp3… theo số câu đầu tiên của từng bài. JSON do AI trả về cũng
// dùng đúng cách đặt tên này, nên hai bên tự khớp.
//
// Dùng: AudioOrder.mount(khung, { onUpload: async function (name, file) { return lỗi hoặc null } })
// ============================================================

const AudioOrder = (function () {

  // Số câu đầu tiên của từng bài, theo đúng cấu trúc đề TOEIC
  function slots() {
    const out = [];
    for (let n = 1; n <= 6; n++) out.push({ n: n, part: 1 });
    for (let n = 7; n <= 31; n++) out.push({ n: n, part: 2 });
    for (let n = 32; n <= 68; n += 3) out.push({ n: n, part: 3 });
    for (let n = 71; n <= 98; n += 3) out.push({ n: n, part: 4 });
    return out;
  }

  const ALL = slots();

  function label(s) {
    if (s.part <= 2) return 'Part ' + s.part + ' · câu ' + s.n;
    return 'Part ' + s.part + ' · bài câu ' + s.n + '-' + (s.n + 2);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(root, opts) {
    let items = [];   // { file, name, done }
    let startAt = 0;  // vị trí bắt đầu trong ALL

    root.innerHTML =
      '<div class="ao">' +
        '<div class="pc-row">' +
          '<label class="btn btn-line">Chọn các file mp3' +
            '<input type="file" accept="audio/*" multiple hidden></label>' +
          '<span class="pc-hint">Bắt đầu từ ' +
            '<select class="ao-start">' +
              ALL.map(function (s, i) { return '<option value="' + i + '">' + label(s) + '</option>'; }).join('') +
            '</select>' +
          '</span>' +
        '</div>' +
        '<p class="pc-hint">File được xếp theo tên, nên nếu tên file đã đúng thứ tự trong đề thì không phải chỉnh gì. ' +
        'Sai chỗ nào thì dùng nút mũi tên để đổi chỗ, hoặc bỏ file đó ra.</p>' +
        '<div class="ao-list"></div>' +
        '<div class="pc-row ao-send hidden">' +
          '<button class="btn btn-ink ao-upload" type="button">Tải tất cả mp3 lên</button>' +
          '<span class="pc-hint ao-note"></span>' +
        '</div>' +
      '</div>';

    const q = function (sel) { return root.querySelector(sel); };

    function rename() {
      items.forEach(function (it, i) {
        const s = ALL[startAt + i];
        it.slot = s || null;
        it.name = s ? 'q' + s.n + '.mp3' : '';
      });
    }

    function draw() {
      rename();
      q('.ao-send').classList.toggle('hidden', !items.length);
      q('.ao-list').innerHTML = items.map(function (it, i) {
        return '<div class="ao-item' + (it.done ? ' is-done' : '') + '">' +
          '<span class="ao-name">' + (it.name ? esc(it.name) : '<i>thừa file</i>') + '</span>' +
          '<span class="ao-slot">' + (it.slot ? esc(label(it.slot)) : 'ngoài cấu trúc đề') + '</span>' +
          '<span class="ao-file">' + esc(it.file.name) + '</span>' +
          (it.done ? '<span class="pc-ok">Đã tải lên</span>' :
            '<span class="ao-btns">' +
              '<button class="btn-sm" type="button" data-up="' + i + '" aria-label="Lên">↑</button>' +
              '<button class="btn-sm" type="button" data-down="' + i + '" aria-label="Xuống">↓</button>' +
              '<button class="btn-sm" type="button" data-del="' + i + '">Bỏ</button>' +
            '</span>') +
        '</div>';
      }).join('');

      q('.ao-list').querySelectorAll('button[data-up]').forEach(function (b) {
        b.addEventListener('click', function () {
          const i = +b.dataset.up;
          if (i > 0) { const t = items[i - 1]; items[i - 1] = items[i]; items[i] = t; draw(); }
        });
      });
      q('.ao-list').querySelectorAll('button[data-down]').forEach(function (b) {
        b.addEventListener('click', function () {
          const i = +b.dataset.down;
          if (i < items.length - 1) { const t = items[i + 1]; items[i + 1] = items[i]; items[i] = t; draw(); }
        });
      });
      q('.ao-list').querySelectorAll('button[data-del]').forEach(function (b) {
        b.addEventListener('click', function () { items.splice(+b.dataset.del, 1); draw(); });
      });
    }

    q('.ao input[type=file]').addEventListener('change', function () {
      const fs = Array.from(this.files).sort(function (a, b) {
        return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
      });
      items = items.filter(function (it) { return it.done; })
        .concat(fs.map(function (f) { return { file: f, name: '', done: false }; }));
      draw();
    });

    q('.ao-start').addEventListener('change', function () { startAt = +this.value; draw(); });

    q('.ao-upload').addEventListener('click', async function () {
      const todo = items.filter(function (it) { return !it.done && it.name; });
      if (!todo.length) { q('.ao-note').textContent = 'Không có file nào để tải.'; return; }

      this.disabled = true;
      let ok = 0; const fail = [];
      for (let i = 0; i < todo.length; i++) {
        q('.ao-note').textContent = 'Đang tải ' + (i + 1) + '/' + todo.length + '…';
        const err = await opts.onUpload(todo[i].name, todo[i].file);
        if (err) fail.push(todo[i].name + ' (' + err + ')');
        else { todo[i].done = true; ok++; }
      }
      this.disabled = false;
      draw();
      q('.ao-note').textContent = 'Xong ' + ok + '/' + todo.length + ' file.' +
        (fail.length ? ' Lỗi: ' + fail.join('; ') : '');
    });
  }

  return { mount: mount, slots: slots };
})();
