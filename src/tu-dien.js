// ============================================================
// Pacedemy — tra từ ngoài kho
//
//   POST /api/tu-dien   body { tu: "procurement" }
//
// Ba lớp, lớp nào trả lời được thì dừng ở đó:
//
//   1. Bảng đệm tu_dien_ngoai — từ đã tra rồi. Nhanh và không tốn gì.
//   2. Từ điển mở (Wiktionary qua dictionaryapi.dev) — phiên âm, file
//      phát âm, loại từ, định nghĩa tiếng Anh. Miễn phí, không cần khoá.
//   3. AI viết phần tiếng Việt dựa trên dữ liệu lớp 2 — nghĩa ngắn,
//      câu định nghĩa, hai ví dụ có dịch, và ghi chú cho người học
//      TOEIC. Chỉ chạy khi cô Ngân đã cài khoá AI_KEY.
//
// Lớp 3 tốn tiền nhưng chỉ tốn một lần cho mỗi từ, vì kết quả ghi
// xuống bảng đệm. Lần sau cả lớp tra cùng từ đó đều lấy từ đệm.
//
// Không có khoá AI thì vẫn chạy, chỉ là thẻ chỉ có phần tiếng Anh.
// ============================================================

const TU_DIEN_MO = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// Nhãn loại từ cho khớp với kho của cô
const LOAI = {
  noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv',
  preposition: 'prep', conjunction: 'conj', pronoun: 'pron',
  interjection: 'interj', phrase: 'phr'
};

export async function traTu(request, env) {
  if (request.method !== 'POST') {
    return json({ loi: 'Phương thức không hỗ trợ.' }, 405);
  }

  // Phải đăng nhập mới tra, khỏi bị người lạ gọi cho tốn tiền
  const uid = await aiDang(request, env);
  if (!uid) return json({ loi: 'Bạn cần đăng nhập.' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const tu = chuanHoa(body && body.tu);
  if (!tu) return json({ loi: 'Từ không hợp lệ.' }, 400);

  // ---- lớp 1: bảng đệm ----
  const co = await docDem(env, tu);
  if (co) {
    demThem(env, tu);               // cộng lượt tra, không cần chờ
    return json({ the: co, nguon: co.nguon, tu_dem: true });
  }

  // ---- lớp 2: từ điển mở ----
  const anh = await layTuDienMo(tu);
  if (!anh) {
    return json({ loi: 'Không tìm thấy từ này.', khong_co: true }, 404);
  }

  // ---- lớp 3: AI viết phần tiếng Việt ----
  let viet = null;
  if (env.AI_KEY) {
    try { viet = await nhoAiDich(env, tu, anh); } catch (e) { viet = null; }
  }

  const the = {
    tu: tu,
    phien_am: anh.phien_am || null,
    loai_tu: anh.loai_tu || null,
    am_thanh: anh.am_thanh || null,
    dong_nghia: anh.dong_nghia || null,
    dinh_nghia_en: anh.dinh_nghia_en || null,
    vi_du_en: anh.vi_du_en || null,
    nghia_ngan: viet ? viet.nghia_ngan : null,
    dinh_nghia_vi: viet ? viet.dinh_nghia_vi : null,
    vi_du: viet ? viet.vi_du : null,
    ghi_chu: viet ? viet.ghi_chu : null,
    nguon: viet ? 'ai' : 'wiktionary'
  };

  ghiDem(env, the);                 // ghi đệm, không cần chờ
  return json({ the: the, nguon: the.nguon, tu_dem: false });
}

// ---------- Chuẩn hoá ----------

function chuanHoa(raw) {
  const t = String(raw || '').trim().toLowerCase();
  if (!t || t.length > 40) return null;
  if (!/^[a-z][a-z'\- ]*$/.test(t)) return null;   // chỉ nhận từ tiếng Anh
  return t;
}

// ---------- Lớp 1: bảng đệm ----------

function hSupa(env, dungService) {
  const k = dungService && env.SUPABASE_SERVICE_KEY
    ? env.SUPABASE_SERVICE_KEY : env.SUPABASE_KEY;
  return { apikey: k, authorization: 'Bearer ' + k, 'content-type': 'application/json' };
}

async function docDem(env, tu) {
  try {
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/tu_dien_ngoai?select=*&tu=eq.' +
                          encodeURIComponent(tu), { headers: hSupa(env) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) { return null; }
}

async function ghiDem(env, the) {
  if (!env.SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(env.SUPABASE_URL + '/rest/v1/tu_dien_ngoai?on_conflict=tu', {
      method: 'POST',
      headers: Object.assign(hSupa(env, true), { prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify({
        tu: the.tu,
        phien_am: the.phien_am,
        loai_tu: the.loai_tu,
        am_thanh: the.am_thanh,
        nghia_ngan: the.nghia_ngan,
        dinh_nghia_vi: the.dinh_nghia_vi,
        vi_du: the.vi_du,
        ghi_chu: the.ghi_chu,
        dong_nghia: the.dong_nghia,
        nguon: the.nguon,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) { /* ghi đệm hụt thì thôi, lần sau tra lại */ }
}

async function demThem(env, tu) {
  if (!env.SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(env.SUPABASE_URL + '/rest/v1/rpc/tang_lan_tra', {
      method: 'POST', headers: hSupa(env, true), body: JSON.stringify({ p_tu: tu })
    });
  } catch (e) { /* không quan trọng */ }
}

// ---------- Lớp 2: từ điển mở ----------

async function layTuDienMo(tu) {
  let data;
  try {
    const r = await fetch(TU_DIEN_MO + encodeURIComponent(tu), {
      headers: { 'user-agent': 'Pacedemy/1.0 (hoc TOEIC)' }
    });
    if (!r.ok) return null;
    data = await r.json();
  } catch (e) { return null; }

  if (!Array.isArray(data) || !data.length) return null;

  const muc = data[0];
  let phienAm = muc.phonetic || null;
  let amThanh = null;

  for (const p of (muc.phonetics || [])) {
    if (!phienAm && p.text) phienAm = p.text;
    if (!amThanh && p.audio) amThanh = p.audio;
  }

  const nhom = (muc.meanings || [])[0] || {};
  const dinhNghia = (nhom.definitions || [])[0] || {};

  // gom đồng nghĩa từ mọi nhóm nghĩa, lấy tối đa bốn từ
  const dn = [];
  for (const m of (muc.meanings || [])) {
    for (const s of (m.synonyms || [])) if (dn.indexOf(s) < 0 && dn.length < 4) dn.push(s);
  }

  return {
    phien_am: phienAm,
    loai_tu: LOAI[nhom.partOfSpeech] || nhom.partOfSpeech || null,
    am_thanh: amThanh,
    dinh_nghia_en: dinhNghia.definition || null,
    vi_du_en: dinhNghia.example || null,
    dong_nghia: dn.length ? dn.join(', ') : null
  };
}

// ---------- Lớp 3: AI viết phần tiếng Việt ----------

const NHAC =
'Bạn đang viết một mục từ điển Anh - Việt cho học viên Việt Nam đang luyện thi TOEIC.\n' +
'Trả lời DUY NHẤT một khối JSON, không thêm lời dẫn, không thêm dấu ```.\n\n' +
'{\n' +
'  "nghia_ngan": "nghĩa tiếng Việt ngắn gọn, 1-6 chữ, viết thường",\n' +
'  "dinh_nghia_vi": "một câu tiếng Việt trọn vẹn giải thích từ này nghĩa là gì",\n' +
'  "vi_du": [\n' +
'    {"vi": "câu tiếng Việt", "en": "câu tiếng Anh tương ứng"},\n' +
'    {"vi": "câu tiếng Việt", "en": "câu tiếng Anh tương ứng"}\n' +
'  ],\n' +
'  "ghi_chu": "để chuỗi rỗng nếu không có gì đáng lưu ý"\n' +
'}\n\n' +
'Yêu cầu:\n' +
'- Hai câu ví dụ phải đặt trong bối cảnh công sở, kinh doanh, đi lại, mua bán — ' +
'đúng kiểu ngữ cảnh của đề TOEIC. Câu ngắn, tự nhiên, dưới 15 chữ.\n' +
'- ghi_chu chỉ viết khi từ này có chỗ học viên Việt hay sai thật: dễ nhầm với một ' +
'từ gần giống, đi với giới từ cố định, hoặc có bẫy ngữ pháp. Nếu không có thì để rỗng. ' +
'Khi viết, bọc từ cần nhấn trong **hai dấu sao**.\n' +
'- Tiếng Việt tự nhiên, không dịch máy. Không dùng từ Hán Việt nặng nề.';

async function nhoAiDich(env, tu, anh) {
  const vao =
    'Từ: ' + tu + '\n' +
    (anh.loai_tu ? 'Loại từ: ' + anh.loai_tu + '\n' : '') +
    (anh.dinh_nghia_en ? 'Định nghĩa tiếng Anh: ' + anh.dinh_nghia_en + '\n' : '') +
    (anh.vi_du_en ? 'Ví dụ sẵn có: ' + anh.vi_du_en + '\n' : '');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.AI_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.AI_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: NHAC,
      messages: [{ role: 'user', content: vao }]
    })
  });

  if (!r.ok) return null;

  const data = await r.json();
  const chu = (((data.content || [])[0] || {}).text || '').trim();
  const dau = chu.indexOf('{'), cuoi = chu.lastIndexOf('}');
  if (dau < 0 || cuoi < dau) return null;

  let o;
  try { o = JSON.parse(chu.slice(dau, cuoi + 1)); } catch (e) { return null; }
  if (!o || !o.nghia_ngan) return null;

  const vd = Array.isArray(o.vi_du)
    ? o.vi_du.filter(function (x) { return x && x.en; }).slice(0, 3)
    : null;

  return {
    nghia_ngan: String(o.nghia_ngan).trim().slice(0, 120),
    dinh_nghia_vi: o.dinh_nghia_vi ? String(o.dinh_nghia_vi).trim().slice(0, 600) : null,
    vi_du: vd && vd.length ? vd : null,
    ghi_chu: o.ghi_chu && String(o.ghi_chu).trim() ? String(o.ghi_chu).trim().slice(0, 1500) : null
  };
}

// ---------- Người gọi là ai ----------

async function aiDang(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const u = await fetch(env.SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: env.SUPABASE_KEY, authorization: auth }
    });
    if (!u.ok) return null;
    const user = await u.json();
    return user && user.id ? user.id : null;
  } catch (e) { return null; }
}

function json(o, status) {
  return new Response(JSON.stringify(o), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}


// ============================================================
// Lấy file phát âm cho kho từ của cô
//
//   POST /api/am-thanh   body { tu_list: ["invoice", "warehouse", ...] }
//
// Giọng máy mỗi điện thoại một kiểu. File ghi âm thì ai nghe cũng
// giống nhau, nên đáng công đi lấy một lần cho cả kho.
// Chỉ giáo viên gọi được, mỗi lần tối đa 25 từ cho đỡ nặng.
// ============================================================

export async function layAmThanh(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);

  if (!(await laGiaoVien(request, env))) {
    return json({ loi: 'Chỉ giáo viên dùng được.' }, 403);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const ds = Array.isArray(body && body.tu_list) ? body.tu_list.slice(0, 25) : [];
  if (!ds.length) return json({ loi: 'Chưa có từ nào.' }, 400);

  const ra = [];
  for (const raw of ds) {
    const tu = chuanHoa(raw);
    if (!tu) { ra.push({ tu: raw, am_thanh: null }); continue; }
    const anh = await layTuDienMo(tu);
    ra.push({ tu: tu, am_thanh: anh && anh.am_thanh ? anh.am_thanh : null });
  }

  return json({ ket_qua: ra });
}

async function laGiaoVien(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const h = { apikey: env.SUPABASE_KEY, authorization: auth };
  try {
    const u = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: h });
    if (!u.ok) return false;
    const user = await u.json();
    if (!user || !user.id) return false;
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/profiles?select=role&id=eq.' +
                          encodeURIComponent(user.id), { headers: h });
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] && rows[0].role === 'teacher';
  } catch (e) { return false; }
}


// ============================================================
// Tự tạo file phát âm bằng giọng neural, lưu vào R2 của Pacedemy
//
//   POST /api/tao-am   body { tu_list: [...], giong: "US" | "UK" }
//
// Đây mới là cách ra được từ điển giống Cambridge hay Oxford: file
// nằm trên máy chủ của mình, giọng giống hệt nhau ở mọi từ và mọi
// máy, và phủ được 100% số từ chứ không phụ thuộc có ai tình nguyện
// ghi âm từ đó hay chưa.
//
// Cambridge và Oxford thuê người đọc trong phòng thu, mỗi từ hai
// giọng Anh và Mỹ, làm hàng chục năm. Mình không làm nổi chuyện đó,
// nhưng giọng neural bây giờ đọc một từ đơn gần như không phân biệt
// được, mà tốn vài nghìn đồng cho cả kho.
//
// Tạo một lần rồi thôi: file nằm trong R2, lần sau chỉ việc phát.
// ============================================================

const GIONG_AZURE = {
  US: { ten: 'en-US-AvaMultilingualNeural', lang: 'en-US' },
  UK: { ten: 'en-GB-SoniaNeural',           lang: 'en-GB' },
  AU: { ten: 'en-AU-NatashaNeural',         lang: 'en-AU' }
};

// Giọng đọc có sẵn trong Cloudflare, dùng được ngay không cần tài khoản
// nào bên ngoài. Thử lần lượt, cái nào ra tiếng thì lấy — tên model bên
// Cloudflare có thay đổi theo thời gian nên đừng trông vào đúng một cái.
const GIONG_CF = [
  { may: '@cf/deepgram/aura-1',    vao: function (tu) { return { text: tu, speaker: 'asteria' }; } },
  { may: '@cf/myshell-ai/melotts', vao: function (tu) { return { prompt: tu, lang: 'en' }; } }
];

export async function taoAm(request, env) {
  if (request.method !== 'POST') return json({ loi: 'Phương thức không hỗ trợ.' }, 405);

  if (!(await laGiaoVien(request, env))) {
    return json({ loi: 'Chỉ giáo viên dùng được.' }, 403);
  }

  // Có khoá Azure thì dùng Azure: giọng hay hơn và chọn được Anh/Mỹ/Úc.
  // Không có cũng chạy được, bằng giọng sẵn trong Cloudflare.
  const coAzure = !!(env.TTS_KEY && env.TTS_REGION);
  if (!coAzure && !env.AI) {
    return json({
      loi: 'Chưa có giọng đọc nào. Bật Workers AI trong Cloudflare, ' +
           'hoặc đặt khoá TTS_KEY và TTS_REGION.'
    }, 400);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ loi: 'Dữ liệu không đọc được.' }, 400); }

  const kieu = GIONG_AZURE[body && body.giong] ? body.giong : 'US';
  const lamLai = !!(body && body.lam_lai);
  const ds = Array.isArray(body && body.tu_list) ? body.tu_list.slice(0, 15) : [];
  if (!ds.length) return json({ loi: 'Chưa có từ nào.' }, 400);

  // Tên file mang theo tên giọng, nên sau này cô thêm khoá Azure thì file
  // mới nằm riêng, không đè lên file cũ.
  const thuMuc = coAzure ? kieu.toLowerCase() : 'cf';
  const ra = [];
  let may = '';

  for (const raw of ds) {
    const tu = chuanHoa(raw);
    if (!tu) { ra.push({ tu: raw, am_thanh: null, loi: 'từ không hợp lệ' }); continue; }

    const ten = tu.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tu';
    const key = 'phat-am/' + thuMuc + '/' + ten + '.mp3';

    // Đã tạo rồi thì khỏi gọi lại cho tốn, trừ khi cô bảo tạo lại
    if (!lamLai) {
      try {
        const co = await env.MEDIA.head(key);
        if (co) { ra.push({ tu: tu, am_thanh: '/media/' + key, san_co: true }); continue; }
      } catch (e) { /* không có thì tạo mới */ }
    }

    let am;
    try {
      am = coAzure
        ? { mp3: await docBangAzure(env, tu, GIONG_AZURE[kieu]), may: 'azure' }
        : await docBangCloudflare(env, tu);
    } catch (e) {
      ra.push({ tu: tu, am_thanh: null, loi: String((e && e.message) || e) });
      continue;
    }

    if (!am || !am.mp3) { ra.push({ tu: tu, am_thanh: null, loi: 'không tạo được' }); continue; }

    may = am.may;
    await env.MEDIA.put(key, am.mp3, { httpMetadata: { contentType: loaiAm(am.mp3) } });
    ra.push({ tu: tu, am_thanh: '/media/' + key });
  }

  return json({ ket_qua: ra, giong: coAzure ? kieu : 'CF', may: may });
}

async function docBangCloudflare(env, tu) {
  if (!env.AI) throw new Error('Workers AI chưa bật');

  let loiCuoi = '';
  for (const g of GIONG_CF) {
    try {
      const buf = await rutAmThanh(await env.AI.run(g.may, g.vao(tu)));
      // File quá nhỏ là im lặng hoặc lỗi trả về dạng tiếng, đừng lưu
      if (buf && buf.byteLength > 800) return { mp3: buf, may: g.may };
      loiCuoi = g.may + ' trả về file rỗng';
    } catch (e) {
      loiCuoi = g.may + ': ' + String((e && e.message) || e);
    }
  }
  throw new Error(loiCuoi || 'không giọng nào đọc được');
}

// Mỗi model trả về một kiểu khác nhau: có cái trả luồng, có cái trả
// chuỗi base64 trong JSON. Nhận hết cho chắc.
async function rutAmThanh(r) {
  if (!r) return null;
  if (r instanceof ArrayBuffer) return r;
  if (typeof r === 'string') return giaiB64(r);
  if (typeof r.getReader === 'function') return await new Response(r).arrayBuffer();
  if (r.buffer instanceof ArrayBuffer) return r.buffer;
  if (r.audio) return await rutAmThanh(r.audio);
  return null;
}

function giaiB64(s) {
  const chuoi = String(s).replace(/^data:[^,]*,/, '');
  const b = atob(chuoi);
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u.buffer;
}

// Có model trả wav chứ không phải mp3. Ghi sai loại là máy không phát.
function loaiAm(buf) {
  const u = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46) return 'audio/wav';
  if (u[0] === 0x4f && u[1] === 0x67 && u[2] === 0x67) return 'audio/ogg';
  return 'audio/mpeg';
}

async function docBangAzure(env, tu, giong) {
  // Đọc một từ đơn thì nói hơi chậm lại cho rõ âm cuối, đó là chỗ
  // học viên Việt hay nuốt mất.
  const ssml =
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + giong.lang + '">' +
      '<voice name="' + giong.ten + '">' +
        '<prosody rate="-8%">' + thoat(tu) + '</prosody>' +
      '</voice>' +
    '</speak>';

  const r = await fetch(
    'https://' + env.TTS_REGION + '.tts.speech.microsoft.com/cognitiveservices/v1', {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.TTS_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Pacedemy'
      },
      body: ssml
    });

  if (!r.ok) throw new Error('Azure trả về ' + r.status);
  return await r.arrayBuffer();
}

function thoat(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
