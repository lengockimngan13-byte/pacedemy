-- ============================================================
-- Pacedemy — trần chi tiêu AI toàn hệ thống
-- ĐÃ CHẠY trên Supabase ngày 09/10/2026. Bản ghi, không chạy lại.
--
-- Hạn mức trong han-muc-ai.sql là MỖI NGƯỜI mỗi ngày: chặn được một
-- em bấm phá, không chặn được một nghìn em cùng dùng trong một tuần
-- web đông khách. Trần này tính theo TIỀN, cho cả hệ thống.
--
-- Tính theo tiền chứ không theo số lượt, vì mỗi loại việc một giá:
-- soạn một lộ trình đắt gấp sáu lần chấm một câu nói. Đếm lượt thì
-- hai ngày cùng 100 lượt có thể lệch nhau sáu lần tiền.
--
-- Trả về của ai_xin_luot:
--    >= 0   còn lại bao nhiêu lượt của riêng người này
--    -1     người này hết lượt hôm nay
--    -2     cả hệ thống chạm trần chi tiêu
--
-- Thứ tự trong hàm quan trọng: kiểm người trước, kiểm trần sau, rồi
-- mới ghi vào sổ chung. Ghi trước mà sau đó từ chối thì sổ chung đội
-- lên bằng những lượt chưa bao giờ chạy.
--
-- Giáo viên không bị hạn mức cá nhân nhưng VẪN tính vào trần chung:
-- nếu không thì cô chạy một lô lớn là trần mất tác dụng, mà cô lại là
-- người trả tiền nên cô cũng cần biết mình đang tiêu tới đâu.
--
-- Xem và chỉnh trong Teacher Studio → Chi phí AI.
-- ============================================================

create table if not exists public.dung_ai_ngay (
  ngay   date not null,
  viec   text not null,
  so_lan integer not null default 0,
  tien   integer not null default 0,
  primary key (ngay, viec)
);

alter table public.dung_ai_ngay enable row level security;
create policy dung_ai_ngay_co on public.dung_ai_ngay for select using (is_teacher());

-- Đơn giá ước tính mỗi lượt, đơn vị đồng. Sửa trong site_settings
-- khoá "don_gia_ai" khi nhà cung cấp đổi giá.
create or replace function public.ai_don_gia(p_viec text)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> p_viec)::int from site_settings where key = 'don_gia_ai'),
    case p_viec
      when 'cham-noi'    then 60
      when 'phat-am'     then 47
      when 'tu-dien'     then 70
      when 'lo-trinh'    then 350
      when 'de-noi'      then 200
      when 'giai-dap-an' then 150
      else 100
    end);
$$;

-- Trần, đơn vị đồng. Sửa trong site_settings khoá "tran_ai".
create or replace function public.ai_tran(p_khoa text)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> p_khoa)::int from site_settings where key = 'tran_ai'),
    case p_khoa
      when 'tien_ngay'  then 200000
      when 'tien_thang' then 3000000
      else 0
    end);
$$;

create or replace function public.ai_xin_luot(p_viec text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  muc integer; con integer; gia integer;
  ngay_roi integer; thang_roi integer;
  la_co boolean;
begin
  if uid is null then return -1; end if;

  la_co := is_teacher();
  gia := ai_don_gia(p_viec);

  -- 1. hạn mức của riêng người này
  if not la_co then
    muc := ai_muc(p_viec);

    insert into dung_ai (user_id, ngay, viec, so_lan)
    values (uid, current_date, p_viec, 1)
    on conflict (user_id, ngay, viec)
    do update set so_lan = dung_ai.so_lan + 1
    returning so_lan into con;

    if con > muc then
      update dung_ai set so_lan = so_lan - 1
      where user_id = uid and ngay = current_date and viec = p_viec;
      return -1;
    end if;
  end if;

  -- 2. trần chi tiêu toàn hệ thống
  select coalesce(sum(tien), 0) into ngay_roi
  from dung_ai_ngay where ngay = current_date;

  select coalesce(sum(tien), 0) into thang_roi
  from dung_ai_ngay where ngay >= date_trunc('month', current_date)::date;

  if ngay_roi + gia > ai_tran('tien_ngay')
     or thang_roi + gia > ai_tran('tien_thang') then
    if not la_co then
      update dung_ai set so_lan = so_lan - 1
      where user_id = uid and ngay = current_date and viec = p_viec;
    end if;
    return -2;
  end if;

  -- 3. ghi vào sổ chung
  insert into dung_ai_ngay (ngay, viec, so_lan, tien)
  values (current_date, p_viec, 1, gia)
  on conflict (ngay, viec)
  do update set so_lan = dung_ai_ngay.so_lan + 1,
                tien   = dung_ai_ngay.tien + gia;

  if la_co then return 9999; end if;
  return muc - con;
end $$;

create or replace function public.ai_chi_tieu(p_ngay integer default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not is_teacher() then null else jsonb_build_object(
    'hom_nay',      (select coalesce(sum(tien), 0) from dung_ai_ngay where ngay = current_date),
    'tran_ngay',    ai_tran('tien_ngay'),
    'thang_nay',    (select coalesce(sum(tien), 0) from dung_ai_ngay
                      where ngay >= date_trunc('month', current_date)::date),
    'tran_thang',   ai_tran('tien_thang'),
    'hom_nay_viec', (select coalesce(jsonb_object_agg(viec, jsonb_build_object('so_lan', so_lan, 'tien', tien)), '{}'::jsonb)
                      from dung_ai_ngay where ngay = current_date),
    'theo_ngay',    (select coalesce(jsonb_agg(jsonb_build_object(
                        'ngay', ngay, 'tien', tien, 'so_lan', so_lan) order by ngay), '[]'::jsonb)
                      from (select ngay, sum(tien) tien, sum(so_lan) so_lan
                              from dung_ai_ngay
                             where ngay > current_date - p_ngay
                             group by ngay) z)
  ) end;
$$;

grant execute on function public.ai_don_gia(text) to authenticated;
grant execute on function public.ai_tran(text) to authenticated;
grant execute on function public.ai_chi_tieu(integer) to authenticated;
