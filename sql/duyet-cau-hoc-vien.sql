-- ============================================================
-- Pacedemy — câu học viên tự đặt phải qua kiểm mới được làm đề ôn
--
-- Trước đây học viên viết gì cũng lưu, rồi chính câu sai đó quay lại
-- làm câu ôn — luyện đi luyện lại cái sai của mình. Nay câu phải qua
-- hai vòng: web lọc rác, rồi cô duyệt.
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
-- ============================================================

alter table public.tu_cua_toi
  add column if not exists cau_trang_thai text not null default 'nhap',
  add column if not exists cau_gop_y      text,
  add column if not exists cau_sua_lai    text,
  add column if not exists cau_duyet_luc  timestamptz,
  add column if not exists so_lan_on      int not null default 0,
  add column if not exists so_lan_dung    int not null default 0;

alter table public.tu_cua_toi drop constraint if exists tu_cua_toi_trang_thai_hop_le;
alter table public.tu_cua_toi add constraint tu_cua_toi_trang_thai_hop_le
  check (cau_trang_thai in ('nhap', 'cho', 'dat', 'sua'));

comment on column public.tu_cua_toi.cau_trang_thai is
  'nhap = chua gui, cho = cho co duyet, dat = co duyet dung, sua = co bao can sua';
comment on column public.tu_cua_toi.cau_sua_lai is
  'Ban co sua lai, hoc vien doc de biet dung phai viet the nao';

create index if not exists tu_cua_toi_cho_duyet
  on public.tu_cua_toi (cau_trang_thai) where cau_trang_thai = 'cho';

-- Cô được sửa trạng thái và ghi góp ý cho câu của học viên
create policy tu_cua_toi_co_duyet on public.tu_cua_toi
  for update using (is_teacher()) with check (is_teacher());

-- Câu đã lỡ lưu trước đây thì xếp vào hàng chờ, khỏi đem ra làm đề ôn
update public.tu_cua_toi
set cau_trang_thai = 'cho'
where cau_cua_toi is not null
  and trim(cau_cua_toi) <> ''
  and cau_trang_thai = 'nhap';

-- Xem còn bao nhiêu câu chờ duyệt
select cau_trang_thai, count(*)
from public.tu_cua_toi
where cau_cua_toi is not null
group by cau_trang_thai;
