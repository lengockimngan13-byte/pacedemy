-- ============================================================
-- Pacedemy — mở kho, khoá phần nâng cao
--
-- Chủ trương của cô: kho từ vựng và kho đề mở cho mọi người đăng ký,
-- để người lạ xem được chất lượng rồi mới quyết có học không.
-- Chỉ hai thứ dành riêng cho học viên trong lớp:
--   1. Từ vựng nâng cao
--   2. Lộ trình học cô viết
--
-- Lưu ý: RLS giấu cả DÒNG, nên phía trình duyệt không đếm được còn
-- bao nhiêu từ bị khoá. Nếu không nói ra, người xem tưởng chủ đề chỉ
-- có bấy nhiêu từ. Vì vậy có thêm hàm dem_tu_khoa().
-- ============================================================

-- Học viên của cô = có tên trong một lớp bất kỳ. Giáo viên thì đương nhiên.
-- Phải là SECURITY DEFINER, vì chính bảng class_members cũng có RLS.
create or replace function public.la_hoc_vien() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.class_members where student_id = auth.uid())
      or public.is_teacher();
$$;

-- ---------- 1. Từ vựng nâng cao ----------

alter table public.vocabulary
  add column if not exists nang_cao boolean not null default false;

-- Lấy sẵn cấp độ 3 làm nâng cao cho cô khỏi phải đánh dấu lại từ đầu
update public.vocabulary set nang_cao = true where level >= 3 and nang_cao = false;

alter policy vocab_read on public.vocabulary
  using ( (not nang_cao) or public.la_hoc_vien() );

create or replace function public.dem_tu_khoa()
returns table (topic_id integer, so_khoa bigint)
language sql security definer stable set search_path = public as $$
  select v.topic_id, count(*)
  from public.vocabulary v
  where v.nang_cao and not public.la_hoc_vien()
  group by v.topic_id;
$$;

-- ---------- 2. Lộ trình ----------
-- Người được cô gán lộ trình vẫn đọc được lộ trình đó dù chưa vào lớp nào.

alter policy lo_trinh_doc on public.lo_trinh
  using (
    public.la_hoc_vien()
    or exists (
      select 1 from public.hoc_vien_lo_trinh h
      where h.lo_trinh_id = lo_trinh.id and h.student_id = auth.uid()
    )
  );

alter policy lo_trinh_tuan_doc on public.lo_trinh_tuan
  using (
    public.la_hoc_vien()
    or exists (
      select 1 from public.hoc_vien_lo_trinh h
      where h.lo_trinh_id = lo_trinh_tuan.lo_trinh_id and h.student_id = auth.uid()
    )
  );

alter policy lo_trinh_viec_doc on public.lo_trinh_viec
  using (
    public.la_hoc_vien()
    or exists (
      select 1 from public.lo_trinh_tuan t
      join public.hoc_vien_lo_trinh h on h.lo_trinh_id = t.lo_trinh_id
      where t.id = lo_trinh_viec.tuan_id and h.student_id = auth.uid()
    )
  );

-- ---------- 3. Mở cửa các trang học ----------
-- gate.js mặc định chỉ mở noi.html. Kho có mở mấy mà cửa đóng thì
-- người chưa vào lớp vẫn bị đá về app.html. Sửa lại được trong
-- Teacher Studio → Chi phí AI, không cần chạy SQL.

insert into site_settings (key, value) values ('trang_mo',
  '["noi.html","tu-dien.html","vocab.html","topic.html","flashcard.html","study.html",
    "so-tu.html","part5.html","practice.html","read.html","listen.html",
    "listen-practice.html","shadow.html","extra.html","game.html","progress.html",
    "class.html","leaderboard.html"]'::jsonb)
on conflict (key) do update set value = excluded.value;
