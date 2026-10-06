// ============================================================
// Pacedemy — trang học bản thử: dựng phần "việc tối nay"
//
// Câu hỏi duy nhất trang này phải trả lời ngay khi mở: TỐI NAY LÀM GÌ.
// Nên thay vì bày hết mọi thứ ra cho em tự chọn, mình chọn sẵn một
// việc và để một nút to. Em muốn làm thứ khác thì vẫn có dòng "Hoặc"
// ngay dưới, nhưng không phải quyết định đầu tiên.
//
// Chọn việc theo thứ tự ưu tiên:
//   1. Việc chưa xong trong tuần này của lộ trình — cô đã giao rồi
//      thì không có gì phải nghĩ thêm.
//   2. Từ tới hạn ôn — bỏ qua là quên thật, nên ưu tiên hơn bài mới.
//   3. Chưa có gì thì mời học từ vựng, phần dễ vào nhất.
// ============================================================

(async function () {

  const $ = function (id) { return document.getElementById(id); };
  if (!$('m-viec')) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let me;
  try {
    const { data } = await db.auth.getUser();
    me = data && data.user;
  } catch (e) { return; }
  if (!me) return;

  const [lt, toiHan, ho] = await Promise.all([ loTrinh(), demToiHan(), hoSo() ]);

  veTho();
  chao((ho.full_name || '').split(' ').pop());
  veChuoi(ho);
  dat(lt, toiHan);

  // ---------- thỏ ----------

  function veTho() {
    const o = $('tho-o');
    if (!o || typeof Tho === 'undefined') return;
    // Khung rộng hơn con thỏ để lúc nghiêng đầu không bị cắt mất tai
    o.innerHTML = '<svg viewBox="-54 -104 108 118">' + Tho.song(0, 6, 1) + '</svg>';
  }

  // ---------- lời chào ----------

  // Ô riêng, không dùng chung với ô app.js ghi vào — dùng chung thì
  // hai bên cùng ghi, ra "Chào buổi sáng, Chào buổi sáng, Khoa".
  function chao(ten) {
    const g = new Date().getHours();
    const buoi = g < 11 ? 'sáng' : g < 14 ? 'trưa' : g < 18 ? 'chiều' : 'tối';
    $('m-chao').textContent = 'Chào buổi ' + buoi + (ten ? ', ' + ten : '') + '.';
  }

  // ---------- lấy dữ liệu ----------

  async function hoSo() {
    try {
      const { data } = await db.from('profiles')
        .select('full_name, streak_days, daily_goal, last_active').eq('id', me.id).single();
      return data || {};
    } catch (e) { return {}; }
  }

  async function loTrinh() {
    if (typeof LoTrinh === 'undefined') return null;
    try {
      const ds = await LoTrinh.cuaEm(me.id);
      if (!ds || !ds.length) return null;
      await LoTrinh.napChon();
      const d = await LoTrinh.tienDo(ds[0].id);
      if (!d) return null;
      const tuan = (d.tuan || []).find(function (t) { return t.tuan === d.tuan_nay; });
      return tuan ? { d: d, tuan: tuan } : null;
    } catch (e) { return null; }
  }

  async function demToiHan() {
    try {
      const { count } = await db.from('vocab_progress')
        .select('vocabulary_id', { count: 'exact', head: true })
        .eq('user_id', me.id).lte('next_review', new Date().toISOString());
      return count || 0;
    } catch (e) { return 0; }
  }

  // ---------- việc tối nay ----------

  function dat(lt, toiHan) {
    let ten, viSao, link, nhan;

    if (lt) {
      const con = lt.tuan.viec.filter(function (v) { return v.lam < v.amount; });
      if (con.length) {
        const v = con[0];
        const thieu = v.amount - v.lam;
        ten = v.label;
        viSao = 'Tuần ' + lt.d.tuan_nay + ' của ' + lt.d.ten +
                ' — còn ' + thieu + ' ' + (LoTrinh.DON_VI[v.kind] || '') + ' là xong việc này.';
        link = LoTrinh.duongDan(v.kind, v.target);
        nhan = 'Bắt đầu';
      } else {
        ten = 'Tuần này xong hết rồi.';
        viSao = 'Làm thêm được thì càng tốt, hoặc nghỉ cho lại sức.';
        link = 'vocab.html';
        nhan = 'Học thêm';
      }
    } else if (toiHan > 0) {
      ten = toiHan + ' từ tới hạn ôn';
      viSao = 'Mấy từ này đang ở ngưỡng sắp quên. Ôn hôm nay là nhớ lâu hơn hẳn.';
      link = 'vocab.html?on=1';
      nhan = 'Ôn ngay';
    } else {
      ten = 'Bắt đầu với một chủ đề từ vựng';
      viSao = 'Mỗi buổi 20 từ là vừa sức, học đều quan trọng hơn học nhiều.';
      link = 'vocab.html';
      nhan = 'Chọn chủ đề';
    }

    $('m-viec').textContent = ten;
    $('m-vi-sao').textContent = viSao;
    $('m-batdau').textContent = nhan;
    $('m-batdau').href = link;

    veHoac(toiHan, lt);
    if (lt) veTuan(lt);
  }

  // Đường khác, để chữ thường chứ không làm nút: đây là lựa chọn phụ,
  // bày ra bằng nút nữa thì lại thành phải chọn.
  function veHoac(toiHan, lt) {
    const ds = [];
    if (lt && toiHan > 0) ds.push(['vocab.html?on=1', 'Ôn ' + toiHan + ' từ tới hạn']);
    ds.push(['listen.html', 'Luyện nghe']);
    ds.push(['part5.html', 'Luyện đọc']);
    ds.push(['noi.html', 'Luyện nói']);

    $('m-hoac').innerHTML = 'Hoặc ' + ds.map(function (x) {
      return '<a href="' + x[0] + '">' + esc(x[1]) + '</a>';
    }).join('');
  }

  // Gộp luôn lời nhắc giữ chuỗi vào đây. Bản cũ có một khung riêng
  // nhắc "bạn chưa học hôm nay", nằm ngay dưới một khung khác cũng
  // bảo đi học — ba chỗ cùng nói một câu thì không chỗ nào được nghe.
  function veChuoi(ho) {
    const n = (ho && ho.streak_days) || 0;
    const homNay = new Date().toISOString().slice(0, 10);
    const daHoc = ho && ho.last_active === homNay;

    if (!n) {
      $('m-chuoi').innerHTML = 'Chưa có chuỗi ngày nào — học hôm nay là bắt đầu chuỗi mới';
      return;
    }

    $('m-chuoi').innerHTML = '<b>' + n + ' ngày</b> học liền nhau' +
      (daHoc ? ', hôm nay có rồi' : ' — hôm nay chưa học, đừng để đứt');
  }

  // ---------- tuần này ----------

  function veTuan(lt) {
    const t = lt.tuan;
    const can = t.viec.reduce(function (s, v) { return s + v.amount; }, 0);
    const lam = t.viec.reduce(function (s, v) { return s + Math.min(v.lam, v.amount); }, 0);
    const pct = can ? Math.round(lam / can * 100) : 0;

    $('m-tuan-ten').textContent = 'Tuần ' + t.tuan + ' · ' + t.tieu_de;

    $('m-tuan').innerHTML =
      '<div class="m-thanh"><span></span></div>' +
      '<p class="m-pct">' + pct + '% việc của tuần</p>' +
      t.viec.map(function (v) {
        const xong = v.lam >= v.amount;
        return '<div class="m-viec-mot' + (xong ? ' xong' : '') + '">' +
          '<a href="' + LoTrinh.duongDan(v.kind, v.target) + '">' + esc(v.label) + '</a>' +
          '<span class="so">' + (xong ? 'xong' : v.lam + '/' + v.amount) + '</span>' +
        '</div>';
      }).join('');

    $('m-tuan-muc').classList.remove('hidden');

    // Đặt bề rộng sau một nhịp để trình duyệt kịp vẽ mốc 0 rồi mới
    // chạy lên. Gán thẳng lúc dựng thì nó nhảy luôn tới đích.
    const thanh = $('m-tuan').querySelector('.m-thanh > span');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { thanh.style.width = pct + '%'; });
    });
  }
})();
