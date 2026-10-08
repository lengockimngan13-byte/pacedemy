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

    // Ba con số âm, ba chuyện khác hẳn nhau, nên phải nói khác nhau:
    //   -1  riêng người này hết lượt hôm nay
    //   -2  cả hệ thống chạm trần chi tiêu — em học viên không có lỗi gì
    //   -3  việc này thuộc bản trả phí, mà người này đang ở bản miễn phí
    if (con === -3) {
      return {
        ok: false,
        can_tra_phi: true,
        loi: 'Phần này thuộc bản đầy đủ. Bản miễn phí vẫn có phần đọc theo câu mẫu, ' +
             'dùng bao nhiêu cũng được.'
      };
    }

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
  // 402 cho chuyện "cần bản trả phí", 429 cho "hết lượt", 401 cho
  // "chưa đăng nhập". Trang web nhìn mã này để biết hiện gì.
  const ma = kq.can_tra_phi ? 402 : (kq.het ? 429 : 401);

  return new Response(JSON.stringify({
    loi: kq.loi,
    het_luot: !!kq.het,
    cham_tran: !!kq.tran,
    can_tra_phi: !!kq.can_tra_phi
  }), {
    status: ma,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
