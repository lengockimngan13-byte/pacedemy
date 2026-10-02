-- ============================================================
-- Pacedemy — Sổ từ của tôi
--
-- Từ học viên nhặt ra từ chính đề mình vừa làm sai. Khác bảng
-- vocabulary ở chỗ bảng kia là giáo trình của cô, còn bảng này mỗi
-- học viên một sổ riêng.
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
-- ============================================================

create table if not exists public.tu_cua_toi (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tu            text not null,
  cau           text,          -- câu gốc đã điền từ vào chỗ trống
  cau_vi        text,          -- bản dịch câu
  ghi_chu       text,          -- giải thích lấy từ đề
  cau_cua_toi   text,          -- câu học viên tự đặt, gắn với việc của mình
  nguon_qid     bigint references public.questions(id) on delete set null,
  box           int not null default 1,
  last_reviewed timestamptz,
  next_review   timestamptz,
  created_at    timestamptz not null default now(),
  constraint tu_cua_toi_khong_trung unique (user_id, tu)
);

create index if not exists tu_cua_toi_den_han
  on public.tu_cua_toi (user_id, next_review);

alter table public.tu_cua_toi enable row level security;

create policy tu_cua_toi_doc on public.tu_cua_toi
  for select using (auth.uid() = user_id or is_teacher());

create policy tu_cua_toi_them on public.tu_cua_toi
  for insert with check (auth.uid() = user_id);

create policy tu_cua_toi_sua on public.tu_cua_toi
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tu_cua_toi_xoa on public.tu_cua_toi
  for delete using (auth.uid() = user_id);


-- Kiểm tra lại
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tu_cua_toi'
order by ordinal_position;
