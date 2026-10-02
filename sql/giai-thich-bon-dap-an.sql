-- ============================================================
-- Pacedemy — nghĩa tiếng Việt của cả bốn phương án
--
-- Khi chữa bài, chỉ nói đáp án đúng là gì thì học viên vẫn không biết
-- ba phương án kia nghĩa gì, lần sau gặp lại vẫn phân vân. Cột này giữ
-- nghĩa của từng phương án, khoá theo A B C D.
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
-- Phần UPDATE bên dưới mới điền cho 19 câu dạng Cụm động từ. Các dạng
-- còn lại cột này vẫn trống, lúc đó game chỉ hiện dấu gạch ngang.
-- ============================================================

alter table public.questions add column if not exists options_vi jsonb;

comment on column public.questions.options_vi is
  'Nghia tieng Viet cua tung phuong an, khoa A B C D. Dung khi chua bai.';

-- Xem còn bao nhiêu câu chưa có nghĩa cho các phương án
select topic_tag,
       count(*) as tong,
       count(*) filter (where options_vi is not null) as da_co
from public.questions
where part = 5 and is_active
group by topic_tag
order by da_co, topic_tag;
