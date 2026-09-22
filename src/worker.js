// ============================================================
// Pacedemy — Worker phục vụ file nghe và ảnh từ Cloudflare R2
//
//   GET  /media/<đường-dẫn>      → lấy file từ R2 (hỗ trợ tua audio)
//   PUT  /api/media/<đường-dẫn>  → tải file lên R2, CHỈ giáo viên
//   Mọi đường dẫn khác           → trả trang web tĩnh trong thư mục pacedemy/
//
// Kiểm tra giáo viên: hỏi Supabase xem người đang đăng nhập là ai,
// rồi đọc cột role trong bảng profiles. Không cần khoá bí mật nào.
// ============================================================

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB mỗi file

const TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/media/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return text('Phương thức không hỗ trợ.', 405);
      }
      const key = keyFrom(url.pathname.slice('/media/'.length));
      if (!key) return text('Đường dẫn không hợp lệ.', 400);
      return serveMedia(request, env, key);
    }

    if (url.pathname.startsWith('/api/media/')) {
      if (request.method !== 'PUT') return text('Phương thức không hỗ trợ.', 405);
      const key = keyFrom(url.pathname.slice('/api/media/'.length));
      if (!key) return text('Tên file không hợp lệ.', 400);
      return uploadMedia(request, env, key);
    }

    return env.ASSETS.fetch(request);
  }
};

// Giải mã và chặn tên file nguy hiểm (../, ký tự điều khiển)
function keyFrom(raw) {
  let key;
  try { key = decodeURIComponent(raw); } catch (e) { return null; }
  if (!key || key.length > 512) return null;
  if (/[\u0000-\u001f\\]/.test(key)) return null;
  if (key.split('/').some(function (p) { return p === '' || p === '.' || p === '..'; })) return null;
  return key;
}

function typeOf(key, given) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  if (given && (given.startsWith('audio/') || given.startsWith('image/'))) return given;
  return TYPES[ext] || null;
}

function text(msg, status) {
  return new Response(msg, { status: status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

// ---------- Phát file ----------

async function serveMedia(request, env, key) {
  const obj = await env.MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
  if (obj === null) return text('Không tìm thấy file.', 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=86400');
  if (!headers.get('content-type')) headers.set('content-type', typeOf(key, '') || 'application/octet-stream');

  // Trình duyệt đã có bản mới nhất
  if (!('body' in obj)) return new Response(null, { status: 304, headers: headers });

  let status = 200;
  if (request.headers.has('range') && obj.range) {
    let offset = obj.range.offset;
    let length = obj.range.length;
    if (obj.range.suffix !== undefined) {
      length = Math.min(obj.range.suffix, obj.size);
      offset = obj.size - length;
    }
    if (offset === undefined) offset = 0;
    if (length === undefined) length = obj.size - offset;
    status = 206;
    headers.set('content-range', 'bytes ' + offset + '-' + (offset + length - 1) + '/' + obj.size);
    headers.set('content-length', String(length));
  } else {
    headers.set('content-length', String(obj.size));
  }

  return new Response(request.method === 'HEAD' ? null : obj.body, { status: status, headers: headers });
}

// ---------- Tải file lên ----------

async function uploadMedia(request, env, key) {
  if (!(await isTeacher(request, env))) {
    return text('Chỉ tài khoản giáo viên mới tải file lên được. Bạn thử đăng nhập lại.', 403);
  }

  const size = parseInt(request.headers.get('content-length') || '0', 10);
  if (!size) return text('File trống.', 400);
  if (size > MAX_BYTES) return text('File quá lớn, tối đa 50 MB.', 413);

  const type = typeOf(key, request.headers.get('content-type') || '');
  if (!type) return text('Chỉ nhận file âm thanh hoặc hình ảnh.', 415);

  await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
  return new Response(JSON.stringify({ key: key }), {
    status: 200, headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function isTeacher(request, env) {
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
  } catch (e) {
    return false;
  }
}
