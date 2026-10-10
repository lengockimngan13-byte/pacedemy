// ============================================================
// Pacedemy — báo cáo một lượt làm bài, chia theo từng dạng câu
//
//   bao-cao.html?id=<id trong bảng attempts>
//
// Học viên xem lượt của mình, cô xem được của mọi học viên. Phân
// quyền do RLS lo, trang này không tự kiểm tra lại.
//
// ---- Ba chỗ cố ý KHÔNG làm giống mấy app khác ----
//
// 1. KHÔNG hiện điểm TOEIC quy đổi ở đây. Muốn quy ra thang 10–990
//    thì phải có cả phần Nghe lẫn phần Đọc đủ số câu như đề thật.
//    Lấy 40 câu Part 5 rồi nhân lên thành "890 điểm" là con số bịa,
//    mà học viên lại dựa vào đó để quyết định có đi thi hay chưa.
//    Trang này nói số câu đúng thật, và nói thẳng nó là bài luyện.
//
// 2. Dạng nào chưa đủ 3 câu thì KHÔNG tính phần trăm. Đúng 1/1 câu
//    không có nghĩa là "mạnh 100% dạng này". Mấy dạng đó gom riêng
//    xuống cuối, ghi rõ là chưa đủ dữ liệu.
//
// 3. Không có nút chia sẻ ra ngoài. Một tấm thẻ đẹp có ảnh và con số
//    to nhìn y như bảng điểm thật — mà đây là bài luyện trên web của
//    cô. In ra PDF cho cô và học viên xem thì được, đẩy ra mạng xã
//    hội như một kết quả thi thì không.
// ============================================================

const $ = function (id) { return document.getElementById(id); };

// Ngưỡng màu, lấy ý từ mấy bảng điểm quen thuộc: xanh là vững,
// vàng là lung lay, đỏ là chưa có nền.
const NGUONG_TOT = 80;
const NGUONG_YEU = 30;

// Dưới mức này thì phần trăm không nói lên điều gì
const TOI_THIEU = 3;

let me = null;
let laCo = false;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mau(pct) {
  if (pct >= NGUONG_TOT) return 'tot';
  if (pct >= NGUONG_YEU) return 'vua';
  return 'yeu';
}

function ngayGio(iso) {
  const d = new Date(iso);
  const hai = function (n) { return (n < 10 ? '0' : '') + n; };
  return hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear() +
         ' · ' + hai(d.getHours()) + ':' + hai(d.getMinutes());
}

function phut(giay) {
  const g = Math.max(0, Math.round(giay || 0));
  if (g < 60) return g + ' giây';
  const p = Math.floor(g / 60);
  return p + ' phút' + (g % 60 ? ' ' + (g % 60) + ' giây' : '');
}

// Mã lượt làm cho dễ nhắc tới nhau: "bài LT-0042" thay vì "cái bài
// em làm hôm thứ ba ấy".
function maLuot(id) {
  return 'LT-' + String(id).padStart(4, '0');
}

// ---------- nạp ----------

(async function () {
  me = await requireLogin();
  if (!me) return;

  const id = parseInt(new URLSearchParams(location.search).get('id'), 10);
  if (!id) return hong('Thiếu mã lượt làm bài.');

  const { data: mine } = await db.from('profiles').select('role').eq('id', me.id).maybeSingle();
  laCo = !!(mine && mine.role === 'teacher');

  const { data: att, error } = await db.from('attempts')
    .select('id, user_id, mode, part, started_at, submitted_at, total_questions, ' +
            'correct_count, seconds_used, estimated_score')
    .eq('id', id).maybeSingle();

  if (error) return hong('Không đọc được lượt làm bài: ' + error.message);
  if (!att) return hong('Không tìm thấy lượt làm bài này, hoặc bạn không có quyền xem.');
  if (!att.submitted_at) return hong('Bài này chưa nộp nên chưa có báo cáo.');

  const { data: ds } = await db.from('attempt_answers')
    .select('question_id, exam_question_id, is_correct, seconds_spent')
    .eq('attempt_id', id);

  const cau = ds || [];
  if (!cau.length) return hong('Lượt này không lưu chi tiết từng câu nên chưa dựng được báo cáo.');

  // Câu đến từ hai kho khác nhau: luyện đề lấy từ bảng questions, thi
  // thử lấy từ exam_questions. Mỗi dòng chỉ điền một trong hai cột,
  // nên phải tra cả hai chỗ rồi gộp lại.
  const nhan = await trimNhan(cau);

  let ten = 'Học viên';
  if (att.user_id === me.id) {
    const { data: p } = await db.from('profiles').select('full_name').eq('id', me.id).maybeSingle();
    ten = (p && p.full_name) || 'Học viên';
  } else if (laCo) {
    const { data: p } = await db.from('profiles').select('full_name').eq('id', att.user_id).maybeSingle();
    ten = (p && p.full_name) || 'Học viên';
  }

  ve(att, cau, nhan, ten);
})();

// Tra nhãn dạng cho từng câu, từ cả hai kho. Khoá trả về là chuỗi
// "q:123" hoặc "e:45" để hai kho không đụng id nhau.
async function trimNhan(cau) {
  const nhan = {};

  const lo = async function (bang, cot, chon) {
    const ids = cau.map(function (x) { return x[cot]; }).filter(Boolean);
    if (!ids.length) return;
    const dau = bang === 'questions' ? 'q:' : 'e:';
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await db.from(bang).select(chon).in('id', ids.slice(i, i + 200));
      (data || []).forEach(function (q) { nhan[dau + q.id] = q; });
    }
  };

  await lo('questions', 'question_id', 'id, part, skill_group, topic_tag');
  // exam_questions không có cột skill_group, chỉ có topic_tag
  await lo('exam_questions', 'exam_question_id', 'id, part, topic_tag');

  return nhan;
}

// Lấy nhãn của một dòng, bất kể nó đến từ kho nào
function nhanCua(nhan, x) {
  return (x.question_id ? nhan['q:' + x.question_id] : null) ||
         (x.exam_question_id ? nhan['e:' + x.exam_question_id] : null) || null;
}

function hong(msg) {
  $('bc-tai').classList.add('hidden');
  $('bc-hong').classList.remove('hidden');
  $('bc-hong-chu').textContent = msg;
}

// ---------- gom số ----------

function gom(cau, nhan, lay) {
  const o = {};
  cau.forEach(function (x) {
    const q = nhanCua(nhan, x);
    const k = (q && lay(q)) || null;
    if (!k) return;
    if (!o[k]) o[k] = { ten: k, n: 0, ok: 0 };
    o[k].n++;
    if (x.is_correct) o[k].ok++;
  });

  return Object.keys(o).map(function (k) {
    const r = o[k];
    r.pct = Math.round(r.ok / r.n * 100);
    return r;
  });
}

// ---------- vẽ ----------

function ve(att, cau, nhan, ten) {
  const tong = cau.length;
  const dung = cau.filter(function (x) { return x.is_correct; }).length;
  const pct = Math.round(dung / tong * 100);

  $('bc-ten').textContent = ten;
  $('bc-ma').textContent = maLuot(att.id);
  $('bc-ngay').textContent = ngayGio(att.submitted_at);
  $('bc-so').textContent = dung + '/' + tong;
  $('bc-so').className = 'bc-so ' + mau(pct);
  $('bc-pct').textContent = pct + '% số câu đúng';

  const giay = att.seconds_used || cau.reduce(function (s, x) { return s + (x.seconds_spent || 0); }, 0);
  const tbCau = tong ? Math.round(giay / tong) : 0;
  $('bc-thoigian').textContent = phut(giay) + (tbCau ? ' · trung bình ' + tbCau + ' giây một câu' : '');

  veNhom(gom(cau, nhan, function (q) { return q.skill_group; }));
  veDang(gom(cau, nhan, function (q) { return q.topic_tag; }));

  $('bc-tai').classList.add('hidden');
  $('bc-noi-dung').classList.remove('hidden');
}

// Ba nhóm lớn: Ngữ pháp, Từ vựng, Từ loại
function veNhom(ds) {
  if (!ds.length) { $('bc-nhom-o').classList.add('hidden'); return; }

  ds.sort(function (a, b) { return b.n - a.n; });

  $('bc-nhom').innerHTML = ds.map(function (x) {
    return '<div class="bc-nhom-o">' +
      '<div class="bc-nhom-dau"><span>' + esc(x.ten) + '</span>' +
        '<b class="' + mau(x.pct) + '">' + x.pct + '%</b>' +
      '</div>' +
      '<div class="bc-thanh"><span class="' + mau(x.pct) + '" style="width:' + x.pct + '%"></span></div>' +
      '<p class="bc-nho">' + x.ok + '/' + x.n + ' câu đúng</p>' +
    '</div>';
  }).join('');
}

// Từng dạng câu, chỗ có giá trị nhất của cả trang
function veDang(ds) {
  const du = ds.filter(function (x) { return x.n >= TOI_THIEU; });
  const thieu = ds.filter(function (x) { return x.n < TOI_THIEU; });

  if (!du.length && !thieu.length) { $('bc-dang-o').classList.add('hidden'); return; }

  // Yếu nhất lên đầu: học viên mở báo cáo ra là thấy ngay chỗ cần làm
  du.sort(function (a, b) { return a.pct - b.pct || b.n - a.n; });

  $('bc-dang').innerHTML = du.map(function (x) {
    return '<div class="bc-dang">' +
      '<div class="bc-dang-dau">' +
        '<span class="bc-dang-ten">' + esc(x.ten) + '</span>' +
        '<b class="' + mau(x.pct) + '">' + x.pct + '%</b>' +
      '</div>' +
      '<div class="bc-thanh"><span class="' + mau(x.pct) + '" style="width:' + x.pct + '%"></span></div>' +
      '<div class="bc-dang-chan">' +
        '<span class="bc-nho">' + x.ok + '/' + x.n + ' câu đúng</span>' +
        (x.pct < NGUONG_TOT
          ? '<a class="bc-luyen" href="practice.html?part=5&dang=' +
            encodeURIComponent(x.ten) + '">Luyện dạng này →</a>'
          : '') +
      '</div>' +
    '</div>';
  }).join('');

  // Mấy dạng mới gặp một hai câu: nói rõ là chưa đủ để kết luận, chứ
  // không im lặng bỏ đi — học viên đếm lại thấy thiếu câu sẽ thắc mắc.
  if (thieu.length) {
    $('bc-thieu').innerHTML =
      '<p class="bc-nho">Mấy dạng dưới đây bài này chỉ gặp một hai câu, chưa đủ để kết luận mạnh yếu: ' +
      thieu.map(function (x) {
        return '<b>' + esc(x.ten) + '</b> (' + x.ok + '/' + x.n + ')';
      }).join(' · ') + '.</p>';
    $('bc-thieu').classList.remove('hidden');
  }

  veTomTat(du);
}

// Một đoạn chữ nói thẳng nên làm gì. Bảng số đẹp mà không có câu kết
// thì học viên nhìn xong vẫn không biết tối nay học gì.
function veTomTat(du) {
  if (!du.length) return;

  const yeu = du.filter(function (x) { return x.pct < NGUONG_YEU; });
  const vua = du.filter(function (x) { return x.pct >= NGUONG_YEU && x.pct < NGUONG_TOT; });
  const tot = du.filter(function (x) { return x.pct >= NGUONG_TOT; });

  const ten = function (ds, n) {
    return ds.slice(0, n).map(function (x) { return '<b>' + esc(x.ten) + '</b>'; }).join(', ');
  };

  let chu = '';

  if (yeu.length) {
    chu += 'Chưa có nền ở ' + ten(yeu, 3) +
           (yeu.length > 3 ? ' và ' + (yeu.length - 3) + ' dạng nữa' : '') +
           '. Mấy dạng này nên học lại luật trước khi luyện thêm đề — làm nhiều mà chưa nắm luật thì ' +
           'chỉ đang đoán. ';
  }
  if (vua.length) {
    chu += (yeu.length ? '' : 'Bài này ') + 'Lung lay ở ' + ten(vua, 3) +
           (vua.length > 3 ? ' và ' + (vua.length - 3) + ' dạng nữa' : '') +
           ' — hiểu rồi nhưng chưa chắc tay, luyện thêm là lên. ';
  }
  if (tot.length) {
    chu += 'Vững ở ' + ten(tot, 3) +
           (tot.length > 3 ? ' và ' + (tot.length - 3) + ' dạng nữa' : '') + '. ';
  }

  $('bc-tomtat-chu').innerHTML = chu.trim();
  $('bc-tomtat').classList.remove('hidden');
}

$('bc-in').addEventListener('click', function () { window.print(); });
