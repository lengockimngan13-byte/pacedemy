// ============================================================
// Pacedemy — giải thích cả bốn phương án A B C D
//
//   POST /api/giai-dap-an   { cau: [...] }   CHỈ giáo viên
//
// Chữa bài mà chỉ nói đáp án đúng là gì thì học viên vẫn không biết
// ba phương án kia sai ở đâu, lần sau gặp lại vẫn phân vân đúng chỗ
// cũ. Cột options_vi giữ phần giải thích cho từng phương án.
//
// Chỗ quan trọng nhất ở đây là: NỘI DUNG MỖI DÒNG PHỤ THUỘC DẠNG CÂU.
//
//   Dạng về nghĩa — chọn từ đúng nghĩa, cụm động từ, cụm từ cố định:
//     mỗi dòng là nghĩa tiếng Việt. Biết "run over" nghĩa gì mới khỏi
//     chọn nhầm lần sau.
//
//   Dạng về ngữ pháp — chia từ loại, thì, mệnh đề, giới từ:
//     bốn phương án thường cùng một gốc nên nghĩa gần như nhau. Viết
//     nghĩa ra là vô dụng: "finalize = chốt lại, finalization = sự
//     chốt lại". Dòng ở đây phải nói TỪ LOẠI và VÌ SAO không lắp vào
//     chỗ trống này được.
//
// Trộn hai kiểu vào một lời nhắc chung thì AI luôn chọn kiểu dễ hơn
// là viết nghĩa, nên phải tách hẳn và nói rõ dạng nào dùng kiểu nào.
// ============================================================

import { laGiaoVien } from './tu-dien.js';
import { xinLuot, tuChoi } from './han-muc.js';

// Những dạng mà bốn phương án khác nhau ở NGHĨA
const DANG_NGHIA = [
  'Chọn từ đúng nghĩa', 'Cụm động từ', 'Cụm từ cố định', 'Danh từ', 'Tính từ'
];

export async function giaiDapAn(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);
  if (!(await laGiaoVien(request, env))) return json({ loi: 'Chỉ giáo viên dùng được.' }, 403);
  if (!env.AI_KEY) {
    return json({ loi: 'Chưa cài khoá AI. Đặt AI_KEY trong Cloudflare rồi thử lại.' }, 400);
  }

  const luot = await xinLuot(request, env, 'giai-dap-an');
  if (!luot.ok) return tuChoi(luot);

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const cau = Array.isArray(body && body.cau) ? body.cau.slice(0, 10) : [];
  if (!cau.length) return json({ loi: 'Chưa có câu nào.' }, 400);

  const vao = cau.map(function (c, i) {
    const o = c.options || {};
    return 'CÂU ' + (i + 1) + '\n' +
      'id: ' + c.id + '\n' +
      'Dạng: ' + (c.topic_tag || 'chưa gắn dạng') + '\n' +
      'Đề: ' + String(c.question_text || '').slice(0, 400) + '\n' +
      ['A', 'B', 'C', 'D'].filter(function (k) { return o[k]; })
        .map(function (k) { return k + '. ' + o[k]; }).join('\n') + '\n' +
      'Đáp án đúng: ' + c.correct_answer;
  }).join('\n\n');

  let o;
  try { o = await hoiAi(env, vao); }
  catch (e) { return json({ loi: String((e && e.message) || e) }, 502); }

  if (!o || !Array.isArray(o.cau)) {
    return json({ loi: 'AI không trả về được. Thử lại lượt sau.' }, 502);
  }

  // Chỉ nhận câu nào có đủ phương án như đề gốc. Thiếu một dòng là
  // game lại hiện dấu gạch ngang, đúng cái đang phải chữa.
  const ra = [];
  for (const c of cau) {
    const t = o.cau.find(function (x) { return String(x.id) === String(c.id); });
    if (!t || !t.options_vi) continue;

    const can = Object.keys(c.options || {});
    const duoc = {};
    let du = true;

    for (const k of can) {
      const v = chuoi(t.options_vi[k], 220);
      if (!v) { du = false; break; }
      duoc[k] = v;
    }

    if (du) ra.push({ id: c.id, options_vi: duoc });
  }

  return json({ ket_qua: ra, xin: cau.length, duoc: ra.length });
}

const NHAC =
'Bạn là cô giáo TOEIC người Việt, đang viết phần chữa bài cho học viên Việt Nam.\n' +
'Với mỗi câu, viết một dòng ngắn cho TỪNG phương án A B C D.\n' +
'Trả lời DUY NHẤT một khối JSON, không lời dẫn, không dấu ```.\n\n' +
'{ "cau": [ { "id": 123, "options_vi": { "A": "...", "B": "...", "C": "...", "D": "..." } } ] }\n\n' +
'Nội dung mỗi dòng TUỲ THEO DẠNG CÂU:\n\n' +
'1. Dạng về NGHĨA (Chọn từ đúng nghĩa, Cụm động từ, Cụm từ cố định, Danh từ, Tính từ):\n' +
'   mỗi dòng là nghĩa tiếng Việt của phương án đó. Ngắn, 2-8 chữ.\n' +
'   Ví dụ: "hoãn lại" · "mặc vào; bật lên" · "tình cờ gặp"\n\n' +
'2. Dạng về NGỮ PHÁP (Chia từ loại, Động từ - thì và thể, Giới từ, Liên từ và mệnh đề,\n' +
'   Mệnh đề quan hệ, Chủ động - bị động, Danh động từ và nguyên mẫu, So sánh, Đại từ,\n' +
'   Mạo từ và lượng từ, Hoà hợp chủ ngữ động từ, và các dạng ngữ pháp khác):\n' +
'   bốn phương án thường cùng một gốc nên nghĩa gần như nhau — viết nghĩa ra là VÔ DỤNG.\n' +
'   Mỗi dòng phải nói TỪ LOẠI rồi tới VÌ SAO lắp được hay không lắp được vào chỗ trống NÀY.\n' +
'   Ví dụ cho câu "We must ___ the budget":\n' +
'     A finalize: "động từ nguyên thể — đúng, sau must phải là nguyên thể"\n' +
'     B finalization: "danh từ — sau must không đặt danh từ được"\n' +
'     C finalized: "quá khứ/phân từ — must không đi với dạng này"\n' +
'     D finally: "trạng từ — không làm được tân ngữ cho must"\n\n' +
'Quy tắc chung:\n' +
'- Phương án đúng cũng phải có dòng, nói vì sao nó đúng.\n' +
'- Viết đúng số phương án đề cho, không thêm không bớt.\n' +
'- Dưới 25 chữ mỗi dòng. Không lặp lại cả câu đề.\n' +
'- Tiếng Việt tự nhiên, giọng cô giáo nói với học viên, không dịch máy.\n' +
'- Không dùng từ Hán Việt nặng nề, không viết hoa giữa câu.';

async function hoiAi(env, vao) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.AI_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.AI_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: NHAC,
      messages: [{ role: 'user', content: vao }]
    })
  });

  if (!r.ok) {
    if (r.status === 401) throw new Error('Khoá AI không đúng.');
    if (r.status === 429) throw new Error('AI đang quá tải, thử lại sau một chút.');
    throw new Error('AI trả về lỗi ' + r.status + '.');
  }

  const data = await r.json();
  const chu = (((data.content || [])[0] || {}).text || '').trim();
  const dau = chu.indexOf('{'), cuoi = chu.lastIndexOf('}');
  if (dau < 0 || cuoi < dau) return null;

  try { return JSON.parse(chu.slice(dau, cuoi + 1)); } catch (e) { return null; }
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

export { DANG_NGHIA };
