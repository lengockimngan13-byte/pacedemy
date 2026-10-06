// ============================================================
// Pacedemy — nhờ AI soạn nháp một lộ trình học
//
//   POST /api/lo-trinh-ai   { yeu_cau, so_tuan }   CHỈ giáo viên
//
// Trả về bản NHÁP, không ghi gì xuống cơ sở dữ liệu. Cô xem rồi mới
// bấm Áp dụng. Đây là chỗ khác hẳn so với để AI tự tạo thẳng: lộ
// trình là thứ học viên theo hàng tuần, sai một việc là em làm lệch
// cả tuần.
//
// Hai thứ bắt buộc phải kiểm trước khi trả về:
//
//   1. Dạng Part 5 phải trùng ĐÚNG tên trong bảng question_tags. Sai
//      một chữ là việc đó đếm mãi 0/30 mà không ai hiểu vì sao.
//   2. Không giao bài kho chưa có. Giao 45 câu nghe trong khi kho
//      chưa có bài nghe nào thì em nhìn mãi một dòng không nhúc nhích.
//
// Nên trước khi gọi AI, mình hỏi kho đang có gì rồi đưa cả danh sách
// vào lời nhắc; xong còn lọc lại lần nữa lúc nhận kết quả. AI sai thì
// mình bỏ việc đó, chứ không để lọt ra màn hình của cô.
// ============================================================

import { laGiaoVien } from './tu-dien.js';

const KIND = ['vocab', 'part5', 'listen', 'read', 'mock'];

export async function soanLoTrinh(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);

  if (!(await laGiaoVien(request, env))) {
    return json({ loi: 'Chỉ giáo viên dùng được.' }, 403);
  }

  if (!env.AI_KEY) {
    return json({ loi: 'Chưa cài khoá AI. Chạy: npx wrangler secret put AI_KEY' }, 400);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const yeuCau = String((body && body.yeu_cau) || '').trim().slice(0, 1000);
  if (!yeuCau) return json({ loi: 'Chưa nói muốn lộ trình thế nào.' }, 400);

  const soTuan = Math.min(16, Math.max(1, parseInt((body && body.so_tuan) || 4, 10) || 4));

  const kho = await hoiKho(request, env);
  if (!kho) return json({ loi: 'Không đọc được kho bài hiện có.' }, 502);

  let nhap;
  try { nhap = await hoiAi(env, yeuCau, soTuan, kho); }
  catch (e) { return json({ loi: String((e && e.message) || e) }, 502); }

  if (!nhap) return json({ loi: 'AI không trả về được lộ trình. Bạn thử viết yêu cầu rõ hơn.' }, 502);

  return json(locLai(nhap, soTuan, kho));
}

// ---------- hỏi kho đang có gì ----------

async function hoiKho(request, env) {
  try {
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/lo_trinh_kho', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_KEY,
        authorization: request.headers.get('authorization') || ''
      },
      body: '{}'
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

// ---------- lời nhắc ----------

export function nhacHe(soTuan, kho) {
  const chuDe = (kho.chu_de || [])
    .map(function (t) { return '  ' + t.id + ' = ' + t.ten + ' (' + t.so_tu + ' từ)'; })
    .join('\n');

  const dang = (kho.dang_part5 || [])
    .map(function (t) { return '  "' + t.tag + '" (' + t.so_cau + ' câu)'; })
    .join('\n');

  const theoPart = kho.so_cau_theo_part || {};
  const co = function (p) { return parseInt(theoPart[String(p)] || 0, 10); };

  return [
'Bạn là giáo viên TOEIC người Việt, đang soạn lộ trình học cho một học viên.',
'Trả lời DUY NHẤT một khối JSON, không lời dẫn, không dấu ```.',
'',
'{',
'  "ten": "tên lộ trình, ngắn gọn",',
'  "mo_ta": "2-3 câu: dành cho em nào, đi theo hướng gì",',
'  "muc_tieu": 650,',
'  "ky_nang": "all" hoặc "listening" hoặc "reading",',
'  "tuan": [',
'    {',
'      "tuan": 1,',
'      "tieu_de": "tên tuần, ngắn",',
'      "ghi_chu": "một câu nói vì sao tuần này học thứ đó, hoặc để rỗng",',
'      "viec": [',
'        {"kind": "part5", "target": "Chia từ loại", "amount": 30},',
'        {"kind": "vocab", "target": "1", "amount": 25}',
'      ]',
'    }',
'  ]',
'}',
'',
'Đúng ' + soTuan + ' tuần, mỗi tuần 2 đến 4 việc.',
'',
'kind chỉ được là một trong: vocab, part5, listen, read, mock.',
'  vocab  — target là SỐ ID chủ đề trong danh sách dưới, viết dạng chuỗi. amount là số từ.',
'  part5  — target là tên dạng, chép ĐÚNG NGUYÊN VĂN từ danh sách dưới, không sửa một chữ.',
'           Để rỗng "" nghĩa là trộn tất cả các dạng. amount là số câu.',
'  listen — target là "1" "2" "3" "4", hoặc "" cho cả Part 1 đến 4. amount là số câu.',
'  read   — target là "6" hoặc "7", hoặc "" cho cả hai. amount là số câu.',
'  mock   — target "", amount là số bài thi thử (1 hoặc 2).',
'',
'Chủ đề từ vựng có trong kho:',
chuDe || '  (chưa có chủ đề nào)',
'',
'Các dạng Part 5 có trong kho — chép đúng nguyên văn, kể cả dấu:',
dang || '  (chưa có dạng nào)',
'',
'Kho bài hiện có: Part 5 có ' + co(5) + ' câu, Part 6 có ' + co(6) + ' câu, ' +
  'Part 7 có ' + co(7) + ' câu, bài nghe có ' + (kho.so_bai_nghe || 0) + ' bài, ' +
  'bộ đề thi thử có ' + (kho.so_bo_de || 0) + ' bộ.',
'',
'Quy tắc bắt buộc:',
'- KHÔNG giao việc mà kho chưa có bài. Phần nào đang 0 thì bỏ hẳn, đừng đưa vào.',
'- Số lượng phải vừa sức một tuần, và không được vượt quá số bài kho đang có.',
'- Sắp theo thứ tự học được: nền trước, khó sau. Tuần giữa nên có một lần đo lại.',
'- Viết tiếng Việt tự nhiên, giọng cô giáo nói với học viên, không dịch máy.',
'- ghi_chu nói lý do sư phạm thật, không nói chung chung kiểu "tuần này rất quan trọng".'
  ].join('\n');
}

async function hoiAi(env, yeuCau, soTuan, kho) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.AI_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.AI_MODEL_LT || env.AI_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: nhacHe(soTuan, kho),
      messages: [{ role: 'user', content: 'Yêu cầu của cô giáo: ' + yeuCau }]
    })
  });

  if (!r.ok) {
    if (r.status === 401) throw new Error('Khoá AI không đúng.');
    if (r.status === 429) throw new Error('AI đang quá tải, bạn thử lại sau một chút.');
    throw new Error('AI trả về lỗi ' + r.status + '.');
  }

  const data = await r.json();
  const chu = (((data.content || [])[0] || {}).text || '').trim();
  const dau = chu.indexOf('{'), cuoi = chu.lastIndexOf('}');
  if (dau < 0 || cuoi < dau) return null;

  try { return JSON.parse(chu.slice(dau, cuoi + 1)); } catch (e) { return null; }
}

// ---------- lọc lại kết quả ----------
// Đây mới là chỗ quyết định nháp dùng được hay không. AI chép sai một
// chữ trong tên dạng là việc đó đếm mãi 0/30, mà nhìn vào thì không
// thấy gì bất thường.

export function locLai(o, soTuan, kho) {
  const tenDang = {};
  (kho.dang_part5 || []).forEach(function (x) {
    tenDang[chuanHoa(x.tag)] = { tag: x.tag, so: x.so_cau };
  });

  const chuDe = {};
  (kho.chu_de || []).forEach(function (x) {
    chuDe[String(x.id)] = { ten: x.ten, so: x.so_tu };
  });

  const theoPart = kho.so_cau_theo_part || {};
  const coPart = function (p) { return parseInt(theoPart[String(p)] || 0, 10); };

  const bo = [];   // việc bị loại, nói thẳng cho cô biết
  const tuan = [];

  for (const t of (Array.isArray(o.tuan) ? o.tuan : []).slice(0, soTuan)) {
    const viec = [];

    for (const v of (Array.isArray(t.viec) ? t.viec : [])) {
      const kind = KIND.indexOf(v.kind) >= 0 ? v.kind : null;
      if (!kind) { bo.push('một việc không rõ loại'); continue; }

      let target = v.target == null ? '' : String(v.target).trim();
      let amount = Math.max(1, Math.min(500, parseInt(v.amount, 10) || 20));
      let nhan;

      if (kind === 'vocab') {
        const c = chuDe[target];
        if (!c) { bo.push('chủ đề từ vựng không có trong kho'); continue; }
        if (!c.so) { bo.push('chủ đề «' + c.ten + '» chưa có từ nào'); continue; }
        amount = Math.min(amount, c.so);
        nhan = 'Từ vựng · ' + c.ten;

      } else if (kind === 'part5') {
        if (target) {
          const d = tenDang[chuanHoa(target)];
          if (!d) { bo.push('dạng Part 5 «' + target + '» không có trong kho'); continue; }
          if (!d.so) { bo.push('dạng «' + d.tag + '» chưa có câu nào'); continue; }
          target = d.tag;                       // lấy đúng tên trong kho
          amount = Math.min(amount, d.so);
          nhan = 'Part 5 · ' + d.tag;
        } else {
          if (!coPart(5)) { bo.push('kho chưa có câu Part 5'); continue; }
          amount = Math.min(amount, coPart(5));
          nhan = 'Part 5 · tất cả các dạng';
        }

      } else if (kind === 'listen') {
        if (!(kho.so_bai_nghe || 0)) { bo.push('kho chưa có bài nghe nào'); continue; }
        if (['1', '2', '3', '4'].indexOf(target) < 0) target = '';
        nhan = target ? 'Nghe Part ' + target : 'Nghe Part 1 đến 4';

      } else if (kind === 'read') {
        if (target !== '6' && target !== '7') target = '';
        const so = target ? coPart(parseInt(target, 10)) : coPart(6) + coPart(7);
        if (!so) { bo.push('kho chưa có câu Part ' + (target || '6 và 7')); continue; }
        amount = Math.min(amount, so);
        nhan = target ? 'Đọc Part ' + target : 'Đọc Part 6 và 7';

      } else {
        if (!(kho.so_bo_de || 0)) { bo.push('chưa có bộ đề thi thử nào'); continue; }
        target = '';
        amount = Math.min(amount, 3);
        nhan = 'Thi thử full test';
      }

      viec.push({ kind: kind, target: target || null, label: nhan, amount: amount });
    }

    if (!viec.length) continue;

    tuan.push({
      tuan: tuan.length + 1,
      tieu_de: chuoi(t.tieu_de, 120) || 'Tuần ' + (tuan.length + 1),
      ghi_chu: chuoi(t.ghi_chu, 400) || null,
      viec: viec
    });
  }

  return {
    ten: chuoi(o.ten, 120) || 'Lộ trình mới',
    mo_ta: chuoi(o.mo_ta, 800) || null,
    muc_tieu: Number.isFinite(parseInt(o.muc_tieu, 10)) ? parseInt(o.muc_tieu, 10) : null,
    ky_nang: ['all', 'listening', 'reading'].indexOf(o.ky_nang) >= 0 ? o.ky_nang : 'all',
    tuan: tuan,
    bo_bot: [...new Set(bo)].slice(0, 8)
  };
}

// So tên dạng thì bỏ qua hoa thường và khoảng trắng thừa, còn dấu
// tiếng Việt thì giữ: "Giới từ" và "Gioi tu" là hai thứ khác nhau.
function chuanHoa(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function chuoi(s, n) {
  const x = String(s == null ? '' : s).trim();
  return x ? x.slice(0, n) : '';
}

function json(o, status) {
  return new Response(JSON.stringify(o), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
