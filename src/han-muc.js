// ============================================================
// Pacedemy — hạn mức dùng AI
//
// Mỗi lần gọi AI là tốn tiền thật. Chặn ở đây, trước khi gọi, chứ
// không chặn ở trình duyệt: ai mở công cụ nhà phát triển cũng bỏ qua
// được phần chặn phía trình duyệt, mà tiền thì vẫn mất.
//
// Đếm trong Postgres bằng một lệnh duy nhất (insert ... on conflict
// do update ... returning), nên hai lần bấm cùng lúc cũng không đếm
// hụt.
//
// Giáo viên không bị hạn mức cá nhân: cô soạn bài thì cần làm liên
// tục. Nhưng cô VẪN tính vào trần chi tiêu chung — nếu không thì cô
// chạy một lô lớn là trần mất tác dụng, mà cô lại là người trả tiền
// nên cô cũng cần biết mình đang tiêu tới đâu.
// ============================================================

export async function xinLuot(request, env, viec) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return { ok: false, loi: 'Bạn cần đăng nhập.' };

  try {
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/ai_xin_luot', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_KEY,
        authorization: auth
      },
      body: JSON.stringify({ p_viec: viec })
    });

    if (!r.ok) {
      // Không hỏi được hạn mức thì cho qua. Chặn oan học viên vì mạng
      // lỗi còn tệ hơn là lỡ một lượt.
      return { ok: true, con: null };
    }

    const con = await r.json();

    // -1 là riêng người này hết lượt, -2 là cả hệ thống chạm trần chi
    // tiêu. Hai chuyện khác hẳn nhau nên phải nói khác nhau: em học
    // viên không có lỗi gì trong trường hợp thứ hai.
    if (con === -1) {
      return {
        ok: false,
        het: true,
        loi: 'Hôm nay em đã dùng hết lượt cho phần này. Mai vào lại nhé — ' +
             'mỗi ngày có hạn mức để giữ chi phí cho cả lớp.'
      };
    }

    if (con === -2) {
      return {
        ok: false,
        het: true,
        tran: true,
        loi: 'Phần này tạm nghỉ tới ngày mai vì hôm nay cả lớp dùng nhiều quá mức ' +
             'dự tính. Mấy phần khác vẫn học bình thường nhé.'
      };
    }

    return { ok: true, con: typeof con === 'number' ? con : null };
  } catch (e) {
    return { ok: true, con: null };
  }
}

export function tuChoi(kq) {
  return new Response(JSON.stringify({
    loi: kq.loi, het_luot: !!kq.het, cham_tran: !!kq.tran
  }), {
    status: kq.het ? 429 : 401,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
