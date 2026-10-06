// ============================================================
// Pacedemy — chấm bài nói
//
//   POST /api/cham-noi      { de, cau_noi }        → ngữ pháp, từ vựng, mạch lạc
//   POST /api/cham-phat-am  audio + ?text=...      → điểm phát âm thật
//   POST /api/de-noi-ai     { kieu, so_de, ... }   → soạn đề nói, CHỈ giáo viên
//
// Bốn con số trong màn kết quả KHÔNG cùng một loại, và chỗ này quan
// trọng:
//
//   Ngữ pháp, Từ vựng, Mạch lạc — AI đọc câu em viết ra rồi chấm.
//     Chấm chữ, không liên quan tới giọng.
//
//   Phát âm — phải gửi file ghi âm lên Azure Pronunciation Assessment.
//     Nó chấm tới từng âm tiết, chỉ ra đúng từ nào đọc sai. Không có
//     khoá Azure thì mình KHÔNG hiện điểm phát âm, chứ không lấy độ
//     tin cậy của bộ nhận diện rồi gọi đó là điểm phát âm — nhiều app
//     làm vậy và con số đó vô nghĩa.
//
// Azure chấm từ file gửi lên nên chạy được cả trên iPhone, chỗ mà
// Web Speech API của trình duyệt không hỗ trợ.
// ============================================================

import { laGiaoVien } from './tu-dien.js';
import { xinLuot, tuChoi } from './han-muc.js';

// ============================================================
// 1. Chấm ngữ pháp, từ vựng, mạch lạc
// ============================================================

const NHAC_CHAM =
'Bạn là cô giáo tiếng Anh người Việt, đang chấm một câu nói của học viên.\n' +
'Trả lời DUY NHẤT một khối JSON, không lời dẫn, không dấu ```.\n\n' +
'{\n' +
'  "ngu_phap": 0-100,\n' +
'  "tu_vung": 0-100,\n' +
'  "mach_lac": 0-100,\n' +
'  "dung_cum_tu": true hoặc false,\n' +
'  "nhan_xet": "nhận xét bằng tiếng Việt, 2-3 câu",\n' +
'  "cau_goi_y": "một câu tiếng Anh tốt hơn mà học viên nói được, không quá dài",\n' +
'  "loi": [{"sai": "phần sai trong câu của em", "dung": "sửa thành", "vi_sao": "một câu ngắn"}]\n' +
'}\n\n' +
'Cách chấm:\n' +
'- ngu_phap: thì, hoà hợp chủ ngữ động từ, mạo từ, giới từ. Sai một lỗi nhỏ vẫn 70-80; ' +
'sai khiến người nghe hiểu lệch thì dưới 60.\n' +
'- tu_vung: có dùng đúng cụm từ được yêu cầu không, từ chọn có tự nhiên không. ' +
'Không dùng cụm từ được yêu cầu thì tu_vung không quá 60.\n' +
'- mach_lac: câu có trả lời đúng tình huống không, có đủ ý không. Nói đúng ngữ pháp ' +
'nhưng lạc đề thì mach_lac thấp.\n' +
'- Câu quá ngắn kiểu lặp lại đề bài thì mach_lac dưới 50.\n\n' +
'Giọng nhận xét: cô giáo nói với học viên. Nói thẳng sai ở đâu và sửa thế nào. ' +
'Khen thì khen đúng chỗ làm được. KHÔNG nịnh, KHÔNG xưng hô thân mật kiểu người yêu, ' +
'KHÔNG dùng emoji. Gọi học viên là "em".\n' +
'loi để mảng rỗng nếu câu không có lỗi nào đáng sửa.';

export async function chamNoi(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);
  if (!(await aiCo(env))) return json({ loi: 'Chưa cài khoá AI.' }, 400);

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const cau = String((body && body.cau_noi) || '').trim().slice(0, 1200);
  if (!cau) return json({ loi: 'Chưa nghe được em nói gì.' }, 400);

  // Xin lượt TRƯỚC khi gọi AI, vì gọi rồi mới chặn là đã mất tiền
  const luot = await xinLuot(request, env, 'cham-noi');
  if (!luot.ok) return tuChoi(luot);

  const de = (body && body.de) || {};

  const vao =
    'Tình huống: ' + String(de.tinh_huong || '').slice(0, 400) + '\n' +
    'Cụm từ bắt buộc dùng: ' + String(de.cum_tu || '').slice(0, 120) +
      (de.nghia_vi ? ' (' + String(de.nghia_vi).slice(0, 120) + ')' : '') + '\n' +
    (de.goi_y ? 'Gợi ý cô đã cho: ' + String(de.goi_y).slice(0, 300) + '\n' : '') +
    '\nCâu học viên nói: ' + cau;

  let o;
  try { o = await hoiAi(env, NHAC_CHAM, vao, 1200); }
  catch (e) { return json({ loi: String((e && e.message) || e) }, 502); }

  if (!o) return json({ loi: 'Không chấm được, bạn thử nói lại.' }, 502);

  const d = function (x) {
    const n = parseInt(x, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  };

  const loi = Array.isArray(o.loi)
    ? o.loi.filter(function (x) { return x && x.sai && x.dung; }).slice(0, 5)
    : [];

  return json({
    ngu_phap: d(o.ngu_phap),
    tu_vung: d(o.tu_vung),
    mach_lac: d(o.mach_lac),
    dung_cum_tu: !!o.dung_cum_tu,
    nhan_xet: chuoi(o.nhan_xet, 900),
    cau_goi_y: chuoi(o.cau_goi_y, 400),
    loi: loi
  });
}

// ============================================================
// 2. Chấm phát âm bằng Azure
// ============================================================
//
// Gửi thẳng file ghi âm lên, kèm câu tham chiếu trong header dạng
// base64. Azure trả về điểm theo từng từ, mình lấy những từ dưới 60
// để chỉ cho em biết đọc hụt chỗ nào.
//
// File phải là WAV PCM 16kHz mono — trang web tự đổi trước khi gửi,
// vì trình duyệt ghi ra webm hoặc mp4 tuỳ máy.

export async function chamPhatAm(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);

  if (!env.TTS_KEY || !env.TTS_REGION) {
    return json({
      loi: 'Chưa cài khoá Azure nên chưa chấm được phát âm.',
      chua_cai: true
    }, 400);
  }

  // Azure tính tiền theo giây nên cũng phải vào hạn mức, nhưng để
  // quỹ RIÊNG với phần chấm chữ. Hai dịch vụ, hai nhà cung cấp, hai
  // hoá đơn — gộp chung thì không biết chỗ nào đang ngốn.
  const luot = await xinLuot(request, env, 'phat-am');
  if (!luot.ok) return tuChoi(luot);

  const url = new URL(request.url);
  const text = (url.searchParams.get('text') || '').trim().slice(0, 500);

  const am = await request.arrayBuffer();
  if (!am || am.byteLength < 2000) return json({ loi: 'Đoạn ghi âm quá ngắn.' }, 400);
  if (am.byteLength > 6 * 1024 * 1024) return json({ loi: 'Đoạn ghi âm quá dài.' }, 400);

  // Không có câu tham chiếu thì Azure chấm kiểu nói tự do: vẫn có
  // accuracy, fluency, prosody, chỉ không có completeness.
  const cauHinh = {
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    EnableProsodyAssessment: 'True'
  };
  if (text) {
    cauHinh.ReferenceText = text;
    cauHinh.Dimension = 'Comprehensive';
  }

  const diaChi = 'https://' + env.TTS_REGION +
    '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1' +
    '?language=en-US&format=detailed';

  let r;
  try {
    r = await fetch(diaChi, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.TTS_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': b64(JSON.stringify(cauHinh)),
        Accept: 'application/json'
      },
      body: am
    });
  } catch (e) {
    return json({ loi: 'Không gọi được Azure.' }, 502);
  }

  if (!r.ok) {
    if (r.status === 401 || r.status === 403) return json({ loi: 'Khoá Azure không đúng.' }, 502);
    return json({ loi: 'Azure trả về lỗi ' + r.status + '.' }, 502);
  }

  let data;
  try { data = await r.json(); } catch (e) { return json({ loi: 'Azure trả về dữ liệu lạ.' }, 502); }

  if (data.RecognitionStatus && data.RecognitionStatus !== 'Success') {
    return json({ loi: 'Không nghe rõ. Em thử nói to và gần micro hơn.', nghe_khong_ro: true }, 200);
  }

  const nb = (data.NBest || [])[0];
  if (!nb) return json({ loi: 'Không nghe được gì.', nghe_khong_ro: true }, 200);

  const pa = nb.PronunciationAssessment || {};

  // Những từ đọc hụt, để chỉ đúng chỗ cho em sửa
  const tuYeu = (nb.Words || [])
    .map(function (w) {
      const a = (w.PronunciationAssessment || {});
      return { tu: w.Word, diem: Math.round(a.AccuracyScore || 0), loi: a.ErrorType };
    })
    .filter(function (w) { return w.diem < 60 || (w.loi && w.loi !== 'None'); })
    .slice(0, 8);

  return json({
    nghe_duoc: nb.Display || nb.Lexical || '',
    phat_am: Math.round(pa.PronScore || pa.AccuracyScore || 0),
    chinh_xac: Math.round(pa.AccuracyScore || 0),
    troi_chay: Math.round(pa.FluencyScore || 0),
    ngu_dieu: pa.ProsodyScore == null ? null : Math.round(pa.ProsodyScore),
    day_du: pa.CompletenessScore == null ? null : Math.round(pa.CompletenessScore),
    tu_yeu: tuYeu
  });
}

// ============================================================
// 3. Nhờ AI soạn đề nói
// ============================================================

const NHAC_DE =
'Bạn là giáo viên tiếng Anh người Việt, đang soạn đề luyện NÓI cho học viên Việt Nam.\n' +
'Trả lời DUY NHẤT một khối JSON, không lời dẫn, không dấu ```.\n\n' +
'{ "de": [ {\n' +
'  "tinh_huong": "một câu tiếng Anh mô tả tình huống, dưới 16 chữ",\n' +
'  "tinh_huong_vi": "câu đó bằng tiếng Việt",\n' +
'  "cum_tu": "cụm từ học viên phải dùng trong câu trả lời",\n' +
'  "loai_cum": "verb + noun | phrasal verb | idiom | verb phrase",\n' +
'  "phien_am": "/phiên âm IPA của cả cụm/",\n' +
'  "nghia_vi": "nghĩa tiếng Việt của cụm, ngắn",\n' +
'  "goi_y": "một câu tiếng Việt mách em nên nói theo hướng nào",\n' +
'  "muc_do": 1 hoặc 2 hoặc 3\n' +
'} ] }\n\n' +
'Yêu cầu:\n' +
'- tinh_huong phải là một TÌNH HUỐNG cần phản ứng, không phải câu hỏi kiến thức. ' +
'Đọc xong học viên biết ngay mình phải nói gì.\n' +
'- cum_tu là cụm thật sự hay dùng, không phải từ đơn. Mỗi đề một cụm khác nhau.\n' +
'- goi_y mách hướng nói, KHÔNG nói hộ câu trả lời.\n' +
'- phien_am viết đúng IPA, bọc trong hai dấu gạch chéo.\n' +
'- Tiếng Việt tự nhiên, không dịch máy.';

export async function soanDeNoi(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);
  if (!(await laGiaoVien(request, env))) return json({ loi: 'Chỉ giáo viên dùng được.' }, 403);
  if (!(await aiCo(env))) return json({ loi: 'Chưa cài khoá AI.' }, 400);

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const luot = await xinLuot(request, env, 'de-noi');
  if (!luot.ok) return tuChoi(luot);

  const kieu = (body && body.kieu) === 'giao-tiep' ? 'giao-tiep' : 'toeic';
  const soDe = Math.min(10, Math.max(1, parseInt((body && body.so_de) || 5, 10) || 5));
  const chuDe = String((body && body.chu_de) || '').trim().slice(0, 200);
  const tuCo = Array.isArray(body && body.tu_co) ? body.tu_co.slice(0, 20) : [];
  const them = String((body && body.yeu_cau) || '').trim().slice(0, 500);

  const vao =
    'Soạn ' + soDe + ' đề.\n' +
    'Kiểu: ' + (kieu === 'toeic'
      ? 'bối cảnh công sở, kinh doanh, đi lại, mua bán — đúng kiểu ngữ cảnh đề TOEIC'
      : 'giao tiếp đời thường: bạn bè, gia đình, nhà hàng, hỏi đường, đi khám, thuê nhà') + '\n' +
    (chuDe ? 'Chủ đề: ' + chuDe + '\n' : '') +
    (tuCo.length
      ? 'Ưu tiên dùng những cụm từ sau, mỗi cụm một đề: ' + tuCo.join(', ') + '\n'
      : '') +
    (them ? 'Yêu cầu thêm của cô: ' + them + '\n' : '');

  let o;
  try { o = await hoiAi(env, NHAC_DE, vao, 3000); }
  catch (e) { return json({ loi: String((e && e.message) || e) }, 502); }

  const ds = (o && Array.isArray(o.de) ? o.de : [])
    .map(function (d) {
      const t = chuoi(d.tinh_huong, 300);
      const c = chuoi(d.cum_tu, 120);
      if (!t || !c) return null;
      const m = parseInt(d.muc_do, 10);
      return {
        kieu: kieu,
        tinh_huong: t,
        tinh_huong_vi: chuoi(d.tinh_huong_vi, 300) || null,
        cum_tu: c,
        loai_cum: chuoi(d.loai_cum, 60) || null,
        phien_am: chuoi(d.phien_am, 160) || null,
        nghia_vi: chuoi(d.nghia_vi, 160) || null,
        goi_y: chuoi(d.goi_y, 400) || null,
        muc_do: m >= 1 && m <= 3 ? m : 2,
        nguon: 'ai',
        da_duyet: false
      };
    })
    .filter(Boolean)
    .slice(0, soDe);

  if (!ds.length) return json({ loi: 'AI không soạn được đề nào. Thử viết yêu cầu rõ hơn.' }, 502);

  return json({ de: ds });
}

// ---------- dùng chung ----------

async function aiCo(env) { return !!env.AI_KEY; }

async function hoiAi(env, nhac, vao, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.AI_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.AI_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 1200,
      system: nhac,
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

function b64(s) {
  const u = new TextEncoder().encode(s);
  let b = '';
  for (let i = 0; i < u.length; i++) b += String.fromCharCode(u[i]);
  return btoa(b);
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
