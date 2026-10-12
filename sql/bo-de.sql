-- ============================================================
-- Pacedemy — bộ đề có tên
--
-- Trước đây một đề chỉ là con số trần nằm trong cột test_no của ba
-- bảng rời nhau: questions (Part 5), reading_sets, listening_sets.
-- Nên trên trang học viên chỉ thấy "Test 3", còn trong Teacher Studio
-- cô phải tự nhớ số 3 là đề nào.
--
-- Bảng này cho con số đó một cái tên. Không đặt khoá ngoại sang ba
-- bảng kia: bài nào đã gán số mà chưa kịp đặt tên đề vẫn phải lưu
-- được, không thể để một ràng buộc chặn việc nhập đề của cô.
-- ============================================================

create table if not exists public.bo_de (
  so smallint primary key,
  ten text not null,
  ghi_chu text,
  created_at timestamptz default now()
);

alter table public.bo_de enable row level security;

-- Học viên đọc được tên đề, vì tên đề hiện trên trang chọn bài
create policy bo_de_doc on public.bo_de
  for select to authenticated using (true);

create policy bo_de_sua on public.bo_de
  for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Lấy sẵn các số đề đang dùng, đặt tên tạm để cô sửa lại sau
insert into public.bo_de (so, ten)
select t.so, 'Đề ' || t.so
from (
  select distinct test_no as so from public.listening_sets where test_no is not null
  union
  select distinct test_no from public.reading_sets where test_no is not null
  union
  select distinct test_no from public.questions where test_no is not null
) t
on conflict (so) do nothing;
