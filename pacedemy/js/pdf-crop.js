// ============================================================
// Pacedemy — lấy ảnh từ file PDF đề thi
//
// PDF bản điện tử: bấm "Tự tách ảnh", công cụ tìm các hình nằm sẵn
//   trong file (ảnh Part 1, biểu đồ Part 3-4) và cắt ra theo thứ tự.
// PDF bản scan: mở từng trang, kéo một khung quanh hình để cắt.
// Ảnh cắt xong đặt tên (mặc định q1.jpg, q2.jpg…), bấm tải lên một lần.
//
// Dùng: PdfCrop.mount(khung, { onUpload: async function (name, blob) { return lỗi hoặc null } })
// Bộ đọc PDF (pdf.js) chỉ tải về khi giáo viên mở công cụ.
// ============================================================

const PdfCrop = (function () {
  const LIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const SCALE = 2;          // độ nét khi cắt, gấp đôi kích thước trang
  const MIN_SIDE = 150;     // bỏ qua hình nhỏ hơn (logo, biểu tượng), tính theo điểm ảnh sau SCALE
  const MAX_W = 1400;       // ảnh rộng hơn thì thu nhỏ trước khi tải lên
  let libPromise = null;

  function loadLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = LIB + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIB + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { libPromise = null; reject(new Error('Không tải được bộ đọc PDF, kiểm tra mạng rồi thử lại.')); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  // Nhân ma trận theo cách pdf.js làm (áp m2 trước, rồi m1)
  function mul(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  }

  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

  // Tìm khung của mọi hình được vẽ trên trang, tính bằng điểm ảnh của bản render
  async function imageBoxes(page, viewport, OPS) {
    const ops = await page.getOperatorList();
    const stack = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const boxes = [];
    const paint = [OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintJpegXObject]
      .filter(function (x) { return x !== undefined; });

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];

      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.paintFormXObjectBegin) {
        stack.push(ctm);
        if (args && Array.isArray(args[0]) && args[0].length === 6) ctm = mul(ctm, args[0]);
      }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (paint.indexOf(fn) !== -1) {
        const m = mul(viewport.transform, ctm);
        const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
        const xs = pts.map(function (p) { return p[0]; });
        const ys = pts.map(function (p) { return p[1]; });
        const x = Math.max(0, Math.min.apply(null, xs));
        const y = Math.max(0, Math.min.apply(null, ys));
        const w = Math.min(viewport.width, Math.max.apply(null, xs)) - x;
        const h = Math.min(viewport.height, Math.max.apply(null, ys)) - y;
        if (w > 0 && h > 0) boxes.push({ x: x, y: y, w: w, h: h });
      }
    }
    return boxes;
  }

  function cropToBlob(canvas, box) {
    let w = Math.round(box.w), h = Math.round(box.h);
    const ratio = w > MAX_W ? MAX_W / w : 1;
    const out = document.createElement('canvas');
    out.width = Math.round(w * ratio);
    out.height = Math.round(h * ratio);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, Math.round(box.x), Math.round(box.y), w, h, 0, 0, out.width, out.height);
    return new Promise(function (resolve) { out.toBlob(resolve, 'image/jpeg', 0.86); });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(root, opts) {
    let pdf = null;
    let pageNo = 1;
    let pageCanvas = null;   // bản render nét của trang đang xem
    let crops = [];          // { name, blob, url, done }
    let counter = 0;
    let drag = null;

    root.innerHTML =
      '<div class="pc">' +
        '<div class="pc-row">' +
          '<label class="btn btn-line pc-pick">Chọn file PDF của đề' +
            '<input type="file" accept="application/pdf" hidden></label>' +
          '<span class="pc-status">Chưa chọn file.</span>' +
        '</div>' +
        '<div class="pc-tools hidden">' +
          '<div class="pc-row">' +
            '<button class="btn btn-gold pc-auto" type="button">Tự tách ảnh</button>' +
            '<span class="pc-hint">Quét từ trang <input class="pc-from" type="number" min="1" value="1"> ' +
            'đến <input class="pc-to" type="number" min="1" value="1"></span>' +
          '</div>' +
          '<p class="pc-hint">PDF bản scan thì tự tách không được. Bạn kéo một khung quanh hình trên trang bên dưới để cắt.</p>' +
          '<div class="pc-nav">' +
            '<button class="btn-sm pc-prev" type="button">Trang trước</button>' +
            '<span class="pc-pageno"></span>' +
            '<button class="btn-sm pc-next" type="button">Trang sau</button>' +
          '</div>' +
          '<div class="pc-stage"><canvas class="pc-view"></canvas><div class="pc-sel hidden"></div></div>' +
        '</div>' +
        '<div class="pc-list"></div>' +
        '<div class="pc-row pc-send hidden">' +
          '<button class="btn btn-ink pc-upload" type="button">Tải tất cả ảnh lên</button>' +
          '<span class="pc-hint pc-upnote"></span>' +
        '</div>' +
      '</div>';

    const q = function (sel) { return root.querySelector(sel); };
    const status = function (t) { q('.pc-status').textContent = t; };

    q('.pc-pick input').addEventListener('change', async function () {
      const f = this.files[0];
      if (!f) return;
      status('Đang mở file…');
      try {
        const lib = await loadLib();
        pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
      } catch (e) {
        status(e.message || 'Không mở được file PDF này.');
        return;
      }
      status(f.name + ' · ' + pdf.numPages + ' trang');
      q('.pc-to').value = pdf.numPages;
      q('.pc-to').max = pdf.numPages;
      q('.pc-from').max = pdf.numPages;
      q('.pc-tools').classList.remove('hidden');
      showPage(1);
    });

    async function renderPage(n) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      return { page: page, viewport: viewport, canvas: canvas };
    }

    async function showPage(n) {
      pageNo = Math.min(Math.max(1, n), pdf.numPages);
      q('.pc-pageno').textContent = 'Trang ' + pageNo + '/' + pdf.numPages;
      const r = await renderPage(pageNo);
      pageCanvas = r.canvas;
      const view = q('.pc-view');
      view.width = pageCanvas.width;
      view.height = pageCanvas.height;
      view.getContext('2d').drawImage(pageCanvas, 0, 0);
      q('.pc-sel').classList.add('hidden');
    }

    q('.pc-prev').addEventListener('click', function () { if (pdf) showPage(pageNo - 1); });
    q('.pc-next').addEventListener('click', function () { if (pdf) showPage(pageNo + 1); });

    // ---------- Tự tách ----------
    q('.pc-auto').addEventListener('click', async function () {
      if (!pdf) return;
      const btn = this;
      btn.disabled = true;
      const from = Math.max(1, parseInt(q('.pc-from').value, 10) || 1);
      const to = Math.min(pdf.numPages, parseInt(q('.pc-to').value, 10) || pdf.numPages);
      const OPS = window.pdfjsLib.OPS;
      let found = 0, scanned = 0;

      for (let n = from; n <= to; n++) {
        status('Đang quét trang ' + n + '/' + to + '…');
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: SCALE });
        const all = await imageBoxes(page, viewport, OPS);
        const area = viewport.width * viewport.height;

        // Hình phủ gần kín trang = trang scan, không tách được
        if (all.some(function (b) { return b.w * b.h > area * 0.7; })) { scanned++; continue; }

        const boxes = all
          .filter(function (b) { return b.w >= MIN_SIDE && b.h >= MIN_SIDE; })
          .sort(function (a, b) { return Math.abs(a.y - b.y) > 20 ? a.y - b.y : a.x - b.x; });
        if (!boxes.length) continue;

        const r = await renderPage(n);
        for (const b of boxes) {
          addCrop(await cropToBlob(r.canvas, b));
          found++;
        }
      }

      btn.disabled = false;
      if (found) status('Tách được ' + found + ' ảnh. Kiểm tra tên từng ảnh rồi tải lên.');
      else if (scanned) status('File này là bản scan nên không tự tách được. Bạn kéo khung trên trang để cắt nhé.');
      else status('Không tìm thấy ảnh nào trong khoảng trang đã chọn.');
    });

    // ---------- Kéo khung để cắt ----------
    const stage = q('.pc-stage');
    const sel = q('.pc-sel');

    function toCanvas(e) {
      const rect = q('.pc-view').getBoundingClientRect();
      const k = pageCanvas.width / rect.width;
      return {
        x: Math.min(Math.max(0, e.clientX - rect.left), rect.width) * k,
        y: Math.min(Math.max(0, e.clientY - rect.top), rect.height) * k,
        k: k
      };
    }

    function drawSel(a, b) {
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      sel.style.left = (x / a.k) + 'px';
      sel.style.top = (y / a.k) + 'px';
      sel.style.width = (Math.abs(b.x - a.x) / a.k) + 'px';
      sel.style.height = (Math.abs(b.y - a.y) / a.k) + 'px';
      sel.classList.remove('hidden');
    }

    stage.addEventListener('pointerdown', function (e) {
      if (!pageCanvas) return;
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      drag = { a: toCanvas(e) };
      drawSel(drag.a, drag.a);
    });

    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drawSel(drag.a, toCanvas(e));
    });

    stage.addEventListener('pointerup', async function (e) {
      if (!drag) return;
      const a = drag.a, b = toCanvas(e);
      drag = null;
      const box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
      if (box.w < 30 || box.h < 30) { sel.classList.add('hidden'); return; }
      addCrop(await cropToBlob(pageCanvas, box));
      setTimeout(function () { sel.classList.add('hidden'); }, 250);
    });

    // ---------- Danh sách ảnh đã cắt ----------
    function addCrop(blob) {
      counter++;
      crops.push({ name: 'q' + counter + '.jpg', blob: blob, url: URL.createObjectURL(blob), done: false });
      drawList();
    }

    function drawList() {
      const list = q('.pc-list');
      q('.pc-send').classList.toggle('hidden', !crops.length);
      list.innerHTML = crops.map(function (c, i) {
        return '<div class="pc-item' + (c.done ? ' is-done' : '') + '">' +
          '<img src="' + c.url + '" alt="">' +
          '<input type="text" value="' + esc(c.name) + '" data-i="' + i + '" aria-label="Tên ảnh">' +
          (c.done ? '<span class="pc-ok">Đã tải lên</span>'
                  : '<button class="btn-sm" type="button" data-del="' + i + '">Bỏ</button>') +
        '</div>';
      }).join('');

      list.querySelectorAll('input[data-i]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          let v = inp.value.trim().toLowerCase().replace(/\s+/g, '-');
          if (v && !/\.(jpe?g)$/.test(v)) v += '.jpg';
          crops[+inp.dataset.i].name = v;
          inp.value = v;
        });
      });
      list.querySelectorAll('button[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          const c = crops.splice(+b.dataset.del, 1)[0];
          if (c) URL.revokeObjectURL(c.url);
          drawList();
        });
      });
    }

    q('.pc-upload').addEventListener('click', async function () {
      const todo = crops.filter(function (c) { return !c.done; });
      if (!todo.length) return;

      const names = crops.map(function (c) { return c.name; });
      const dup = names.filter(function (n, i) { return names.indexOf(n) !== i; });
      if (dup.length) { q('.pc-upnote').textContent = 'Có tên bị trùng: ' + dup.join(', ') + '. Đổi tên rồi tải lại.'; return; }
      if (names.some(function (n) { return !n; })) { q('.pc-upnote').textContent = 'Có ảnh chưa đặt tên.'; return; }

      this.disabled = true;
      let ok = 0, fail = [];
      for (let i = 0; i < todo.length; i++) {
        q('.pc-upnote').textContent = 'Đang tải ' + (i + 1) + '/' + todo.length + '…';
        const err = await opts.onUpload(todo[i].name, todo[i].blob);
        if (err) fail.push(todo[i].name + ' (' + err + ')');
        else { todo[i].done = true; ok++; }
      }
      this.disabled = false;
      drawList();
      q('.pc-upnote').textContent = 'Xong ' + ok + '/' + todo.length + ' ảnh.' +
        (fail.length ? ' Lỗi: ' + fail.join('; ') : '');
    });
  }

  return { mount: mount };
})();
