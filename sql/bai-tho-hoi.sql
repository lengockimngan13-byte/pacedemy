-- ============================================================
-- Pacedemy — bài "Thỏ hỏi, mình đáp"
--
-- Bài tập kiểu Part 2 nhưng đọc thay vì nghe: thỏ đứng trong một bối
-- cảnh công sở, hỏi một câu, học viên chọn câu đáp lại đúng. Câu đúng
-- luôn chứa từ đang học.
--
-- Khoá theo từ (viết thường) để khớp với sổ từ của học viên: từ nào
-- có bài thì lúc ôn hiện bài này, từ nào chưa có thì vẫn ôn bằng kiểu
-- điền chỗ trống.
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
-- Kèm 18 bài đầu tiên cho các cụm động từ, soạn sẵn trong lúc dựng.
-- Soạn thêm thì vào Teacher Studio › Bài Thỏ hỏi.
-- ============================================================

create table if not exists public.cau_hoi_tho (
  id         bigint generated always as identity primary key,
  tu         text not null,
  boi_canh   text not null default 'van-phong',
  cau_hoi    text not null,
  dap_an     jsonb not null,      -- [{"t":"...","ok":true}, {"t":"..."}, {"t":"..."}]
  giai_thich text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cau_hoi_tho_theo_tu
  on public.cau_hoi_tho (lower(tu)) where is_active;

alter table public.cau_hoi_tho enable row level security;

-- Học viên nào đăng nhập cũng đọc được, chỉ cô mới thêm sửa xoá
create policy cht_doc on public.cau_hoi_tho
  for select using (auth.uid() is not null);

create policy cht_co_sua on public.cau_hoi_tho
  for all using (is_teacher()) with check (is_teacher());

comment on table public.cau_hoi_tho is
  'Bai tap Part 2 dang doc: tho hoi, hoc vien chon cau dap lai co chua tu dang hoc.';
comment on column public.cau_hoi_tho.boi_canh is
  'van-phong | kho-hang | phong-hop | san-bay | le-tan | nha-may';


-- Xem đã có bài cho những từ nào
select tu, boi_canh, cau_hoi
from public.cau_hoi_tho
where is_active
order by tu;
