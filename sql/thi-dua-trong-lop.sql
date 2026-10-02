-- ============================================================
-- Pacedemy — streak theo tuần và thi đua trong lớp
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
--
-- 1) Sửa lỗi cũ: web gọi cột active_days của leaderboard_weekly nhưng
--    view chưa có cột đó, nên bảng xếp hạng chỉ hiện dòng báo lỗi.
--    Cột mới phải thêm vào CUỐI thì create or replace mới chạy được.
-- 2) Thêm leaderboard_lop để xếp hạng trong từng lớp.
-- ============================================================

create or replace view public.leaderboard_weekly as
select
  p.id,
  p.full_name,
  p.avatar_url,
  (coalesce(sum(a.xp_earned), 0))::int as weekly_xp,
  (count(a.id))::int as sessions,
  rank() over (order by coalesce(sum(a.xp_earned), 0) desc) as rank,
  (count(distinct ((a.submitted_at at time zone 'Asia/Ho_Chi_Minh')::date)))::int as active_days,
  p.streak_days
from profiles p
  left join attempts a
    on a.user_id = p.id
   and a.submitted_at > (now() - interval '7 days')
where p.role = 'student'
group by p.id, p.full_name, p.avatar_url, p.streak_days
having coalesce(sum(a.xp_earned), 0) > 0;


-- Học viên chỉ thấy lớp mình đang học, giáo viên thấy hết.
-- Không lọc bỏ người tuần nay chưa học, để nhìn ra đủ lớp.
create or replace view public.leaderboard_lop as
select
  cm.class_id,
  p.id,
  p.full_name,
  p.avatar_url,
  p.streak_days,
  (coalesce(sum(a.xp_earned), 0))::int as weekly_xp,
  (count(distinct ((a.submitted_at at time zone 'Asia/Ho_Chi_Minh')::date)))::int as active_days,
  rank() over (
    partition by cm.class_id
    order by coalesce(sum(a.xp_earned), 0) desc
  ) as rank
from class_members cm
  join profiles p on p.id = cm.student_id and p.role = 'student'
  left join attempts a
    on a.user_id = p.id
   and a.submitted_at > (now() - interval '7 days')
where cm.status = 'active'
  and (
    is_teacher()
    or cm.class_id in (
      select c2.class_id from class_members c2
      where c2.student_id = auth.uid() and c2.status = 'active'
    )
  )
group by cm.class_id, p.id, p.full_name, p.avatar_url, p.streak_days;

grant select on public.leaderboard_lop to authenticated;


-- Kiểm tra lại
select table_name, string_agg(column_name, ', ' order by ordinal_position) as cot
from information_schema.columns
where table_schema = 'public'
  and table_name in ('leaderboard_weekly', 'leaderboard_lop')
group by table_name;
