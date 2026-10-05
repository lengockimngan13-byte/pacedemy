-- ĐÃ CHẠY trên Supabase (05/10/2026)
--
-- Từ điển tra được mọi từ, không chỉ từ trong kho của cô Ngân.
-- Ba lớp, lớp nào trả lời được thì dừng ở đó:
--
--   1. Kho vocabulary — từ cô tự soạn. Nghĩa theo cách cô dạy, ví dụ
--      lấy từ ngữ cảnh TOEIC, có ghi chú giảng bài. Tin được.
--   2. Từ điển mở Wiktionary qua dictionaryapi.dev — phiên âm, file
--      phát âm, loại từ, định nghĩa tiếng Anh. Miễn phí, không cần khoá.
--   3. AI viết phần tiếng Việt dựa trên dữ liệu lớp 2. Chỉ chạy khi
--      đã cài khoá AI_KEY cho Worker.
--
-- Bảng dưới đây vừa là nơi lưu kết quả lớp 2 và 3, vừa là bộ nhớ đệm:
-- tra một lần rồi thì cả lớp tra lại đều lấy từ đệm, không tốn thêm.
--
-- Để riêng khỏi bảng vocabulary có chủ đích: vocabulary là phần cô tự
-- soạn, tin được; bảng này là phần máy dựng, phải duyệt mới tin. Tách
-- ra thì học viên nhìn thấy rõ đâu là bài giảng của cô, đâu là tra cứu
-- tự động, và cô duyệt xong thì chuyển sang kho chính.

create table if not exists public.tu_dien_ngoai (
  id            bigint generated always as identity primary key,
  tu            text not null unique,
  phien_am      text,
  loai_tu       text,
  am_thanh      text,
  nghia_ngan    text,
  dinh_nghia_vi text,
  vi_du         jsonb,
  ghi_chu       text,
  dong_nghia    text,
  nguon         text not null default 'auto',   -- 'wiktionary' | 'ai' | 'co'
  da_duyet      boolean not null default false,
  lan_tra       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tu_dien_ngoai_duyet_idx
  on public.tu_dien_ngoai (da_duyet, lan_tra desc, updated_at desc);

alter table public.tu_dien_ngoai enable row level security;

-- Ai đăng nhập cũng đọc được, vì đây chính là nội dung từ điển.
create policy tu_dien_ngoai_doc on public.tu_dien_ngoai
  for select to authenticated using (true);

-- Chỉ giáo viên sửa và xoá. Worker ghi bằng khoá service nên không vướng RLS.
create policy tu_dien_ngoai_gv_sua on public.tu_dien_ngoai
  for update to authenticated
  using (public.is_teacher()) with check (public.is_teacher());

create policy tu_dien_ngoai_gv_xoa on public.tu_dien_ngoai
  for delete to authenticated using (public.is_teacher());

-- Đếm xem từ nào học viên tra nhiều, để cô biết nên duyệt từ nào trước
create or replace function public.tang_lan_tra(p_tu text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tu_dien_ngoai
  set lan_tra = lan_tra + 1, updated_at = now()
  where tu = lower(btrim(p_tu));
$$;

grant execute on function public.tang_lan_tra(text) to authenticated, service_role;
