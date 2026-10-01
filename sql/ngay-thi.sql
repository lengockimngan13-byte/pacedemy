-- ============================================================
-- Pacedemy — thêm ngày thi vào hồ sơ học viên
--
-- Dùng cho thẻ "Chặng đường tới mục tiêu" ở trang học: đếm ngược
-- số ngày còn lại và chia nhỏ số điểm còn thiếu ra theo tuần.
--
-- target_score và current_score đã có sẵn trong bảng profiles nên
-- không cần thêm. Câu lệnh này chạy lại nhiều lần cũng không sao.
--
-- ĐÃ CHẠY trên Supabase ngày 01/10/2026 — file này giữ lại để xem.
-- ============================================================

alter table public.profiles
  add column if not exists exam_date date;

comment on column public.profiles.exam_date is
  'Ngày thi TOEIC học viên tự đặt, dùng để đếm ngược trên trang học.';

-- Kiểm tra lại cho chắc
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('target_score', 'current_score', 'exam_date');
