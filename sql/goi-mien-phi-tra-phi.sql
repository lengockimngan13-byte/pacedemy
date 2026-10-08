-- ============================================================
-- Pacedemy — bản miễn phí và bản đầy đủ
--
-- Vì sao cần: mấy việc gọi AI tốn tiền thật theo từng lượt. Trần chi
-- tiêu (tran-chi-tieu-ai.sql) giữ cho hoá đơn không vỡ, nhưng nó chặn
-- CẢ LỚP khi chạm trần — không phân biệt ai đóng tiền ai không. File
-- này thêm một lớp nữa: việc tốn tiền thì chỉ học viên có bản đầy đủ
-- dùng được, còn bản miễn phí dùng những phần chạy hẳn trong trình
-- duyệt nên tốn 0đ.
--
-- Ba đường để có bản đầy đủ, theo thứ tự thường gặp:
--   1. Đang là thành viên active của một lớp — em đóng tiền học lớp
--      rồi, không bắt trả thêm.
--   2. Cô bật gói trả phí cho em (có hoặc không ngày hết hạn).
--   3. Là giáo viên.
--
-- Chạy file này sau tran-chi-tieu-ai.sql.
-- ============================================================

-- ---------- 1. Hai cột trong hồ sơ ----------

alter table public.profiles
  add column if not exists goi text not null default 'free'
    check (goi in ('free', 'tra-phi')),
  add column if not exists goi_het_han date;

comment on column public.profiles.goi is
  'free | tra-phi — gói cô đặt tay. Không phải đường duy nhất: xem la_tra_phi().';
comment on column public.profiles.goi_het_han is
  'Để trống nghĩa là không hạn. Hết hạn thì tự về bản miễn phí, không cần cron.';

-- ---------- 2. Người này có bản đầy đủ không ----------
--
-- Không lưu kết quả vào cột nào. Tính lại mỗi lần hỏi, nên gói hết hạn
-- là tự hết ngay hôm sau, không cần việc chạy định kỳ nào dọn.

create or replace function public.la_tra_phi() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and (
        p.role = 'teacher'
        or (p.goi = 'tra-phi' and (p.goi_het_han is null or p.goi_het_han >= current_date))
        or exists (select 1 from class_members m
                    where m.student_id = p.id and m.status = 'active')
      )
  );
$$;

-- ---------- 3. Việc nào cần bản đầy đủ ----------
--
-- Đọc từ site_settings để cô tích bỏ tích trên trang Chi phí AI, có
-- hiệu lực ngay, không phải deploy lại. Chưa đặt gì thì mặc định là ba
-- việc tốn tiền theo lượt.

create or replace function public.ai_can_tra_phi(p_viec text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value ? p_viec from site_settings where key = 'viec_tra_phi'),
    p_viec in ('cham-noi', 'phat-am', 'tu-dien'));
$$;

-- ---------- 4. Chặn trong ai_xin_luot ----------
--
-- Chặn ở BƯỚC 0, trước khi trừ hạn mức ngày: nếu trừ trước rồi mới
-- chặn thì em không dùng được gì mà vẫn mất lượt.
--
-- Trả về:
--    >= 0  còn bấy nhiêu lượt hôm nay   ·   9999  giáo viên
--      -1  riêng em hết lượt hôm nay
--      -2  cả hệ thống chạm trần chi tiêu
--      -3  việc này cần bản đầy đủ, em đang ở bản miễn phí

create or replace function public.ai_xin_luot(p_viec text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  muc integer; con integer; gia integer;
  ngay_roi integer; thang_roi integer;
  la_co boolean;
begin
  if uid is null then return -1; end if;

  la_co := is_teacher();

  -- 0. gói
  if ai_can_tra_phi(p_viec) and not la_tra_phi() then
    return -3;
  end if;

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

-- ---------- 5. Trang web hỏi mình đang ở bản nào ----------

create or replace function public.goi_cua_toi() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tra_phi', la_tra_phi(),
    'goi', (select goi from profiles where id = auth.uid()),
    'het_han', (select goi_het_han from profiles where id = auth.uid()),
    'trong_lop', exists (select 1 from class_members
                          where student_id = auth.uid() and status = 'active')
  );
$$;

grant execute on function public.goi_cua_toi() to authenticated;
grant execute on function public.la_tra_phi() to authenticated;

-- ---------- 6. Chặn học viên tự nâng gói ----------
--
-- profiles_update_own cho em tự sửa hồ sơ mình, và nó chỉ chặn cột
-- role. Nghĩa là một em biết dùng công cụ nhà phát triển có thể tự đặt
-- goi = 'tra-phi'. Chính sách RLS không so sánh được giá trị cũ với
-- giá trị mới theo từng cột, nên phải dùng trigger.
--
-- Trả lại giá trị cũ thay vì báo lỗi: như vậy em lưu mục tiêu hay nền
-- trong hồ sơ vẫn lưu được bình thường, chỉ hai cột gói là không đổi.
--
-- auth.uid() is null là lúc chạy bằng khoá bí mật phía máy chủ (sau
-- này cổng thanh toán sẽ cần) — chỗ đó đã phải có khoá rồi nên để qua.

create or replace function public.giu_nguyen_goi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.goi is distinct from old.goi
      or new.goi_het_han is distinct from old.goi_het_han)
     and auth.uid() is not null
     and not public.is_teacher()
  then
    new.goi := old.goi;
    new.goi_het_han := old.goi_het_han;
  end if;
  return new;
end;
$$;

create or replace trigger profiles_giu_goi
  before update on public.profiles
  for each row execute function public.giu_nguyen_goi();

-- ---------- Kiểm lại ----------
--
-- select full_name, role, goi, goi_het_han from profiles;
-- select la_tra_phi();                    -- chạy dưới phiên của em nào
-- select ai_can_tra_phi('cham-noi');      -- true nếu việc này cần bản đầy đủ
-- select goi_cua_toi();
