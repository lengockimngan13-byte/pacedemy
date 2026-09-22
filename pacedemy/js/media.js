// ============================================================
// Pacedemy — tải file nghe và ảnh lên Cloudflare R2
// Đi qua Worker (src/worker.js), Worker tự kiểm tra tài khoản giáo viên.
// File nằm ở địa chỉ: https://www.pacedemy.com/media/<đường-dẫn>
// ============================================================

function mediaPath(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function mediaUrl(key) {
  return location.origin + '/media/' + mediaPath(key);
}

// Trả về { error } giống kiểu của Supabase để chỗ gọi không phải đổi nhiều
async function uploadMedia(key, file) {
  const { data } = await db.auth.getSession();
  const token = data && data.session && data.session.access_token;
  if (!token) return { error: { message: 'Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.' } };

  try {
    const res = await fetch('/api/media/' + mediaPath(key), {
      method: 'PUT',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': file.type || 'application/octet-stream'
      },
      body: file
    });
    if (!res.ok) {
      const msg = await res.text();
      return { error: { message: msg || ('Lỗi ' + res.status) } };
    }
    return { error: null, url: mediaUrl(key) };
  } catch (e) {
    return { error: { message: 'Mất kết nối, bạn thử lại nhé.' } };
  }
}
