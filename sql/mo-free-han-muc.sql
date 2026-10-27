-- ============================================================
-- Pacedemy — giai đoạn đầu: mở tất cả cho mọi người, chặn bằng hạn mức
--
-- Cô quyết định chưa bán gói nào. Nhưng "miễn phí cho người dùng"
-- không có nghĩa là miễn phí cho cô: mỗi lần gọi AI là tiền thật ra
-- khỏi ví cô. Nên bỏ cửa trả phí, và siết lại bằng hai lớp:
--
--   1. Hạn mức mỗi người mỗi ngày — một người không đốt hết của cả lớp
--   2. Trần chi tiêu cả hệ thống — tổng tiền một ngày, một tháng
--
-- Đơn giá đang cài (ai_don_gia): chấm nói 60đ, chấm phát âm 47đ,
-- tra từ MỚI 70đ. Từ đã có trong bảng đệm tu_dien_ngoai thì không
-- tốn gì và không trừ lượt, nên con số 15 lượt tra từ rộng hơn vẻ
-- ngoài rất nhiều.
--
-- Một học viên dùng kịch khung cả ba việc ≈ 2.355đ/ngày.
-- Trần 25.000đ/ngày ≈ mười học viên cùng dùng kịch khung.
-- ============================================================

insert into site_settings (key, value) values ('viec_tra_phi', '[]'::jsonb)
on conflict (key) do update set value = excluded.value;

insert into site_settings (key, value) values ('han_muc_ai',
  '{"cham-noi": 10, "phat-am": 15, "tu-dien": 15,
    "lo-trinh": 20, "de-noi": 20, "giai-dap-an": 200}'::jsonb)
on conflict (key) do update set value = excluded.value;

insert into site_settings (key, value) values ('tran_ai',
  '{"tien_ngay": 25000, "tien_thang": 400000}'::jsonb)
on conflict (key) do update set value = excluded.value;
