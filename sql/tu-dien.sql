-- ĐÃ CHẠY trên Supabase (04/10/2026)
--
-- Phần từ điển lấy nguồn từ chính bảng vocabulary, không cần bảng mới.
-- Chỉ thêm một bảng ghi lại việc học viên tra mà kho chưa có từ đó.
-- Danh sách này chính là thứ tự ưu tiên bổ sung từ cho cô Ngân:
-- từ nào nhiều người tra nhất thì thêm trước.

create table if not exists public.tra_cuu_hut (
  id        bigint generated always as identity primary key,
  tu        text not null unique,
  lan       integer not null default 1,
  lan_dau   timestamptz not null default now(),
  lan_cuoi  timestamptz not null default now(),
  da_them   boolean not null default false
);

create index if not exists tra_cuu_hut_lan_idx
  on public.tra_cuu_hut (da_them, lan desc, lan_cuoi desc);

alter table public.tra_cuu_hut enable row level security;

-- Chỉ giáo viên đọc và sửa danh sách này.
create policy tra_cuu_hut_gv_doc on public.tra_cuu_hut
  for select using (public.is_teacher());

create policy tra_cuu_hut_gv_sua on public.tra_cuu_hut
  for update using (public.is_teacher()) with check (public.is_teacher());

create policy tra_cuu_hut_gv_xoa on public.tra_cuu_hut
  for delete using (public.is_teacher());

-- Học viên không ghi thẳng vào bảng, chỉ cộng dồn qua hàm này.
-- SECURITY DEFINER để khỏi phải mở quyền ghi cả bảng cho học viên.
create or replace function public.ghi_tra_cuu_hut(p_tu text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tu text;
begin
  v_tu := lower(btrim(coalesce(p_tu, '')));

  if v_tu = '' or length(v_tu) > 40 then
    return;
  end if;
  if v_tu !~ '^[a-z][a-z''\- ]*$' then
    return;
  end if;

  insert into public.tra_cuu_hut (tu) values (v_tu)
  on conflict (tu) do update
    set lan = public.tra_cuu_hut.lan + 1,
        lan_cuoi = now(),
        da_them = false;
end;
$$;

grant execute on function public.ghi_tra_cuu_hut(text) to authenticated;
