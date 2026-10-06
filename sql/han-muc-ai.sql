-- ============================================================
-- Pacedemy — hạn mức dùng AI mỗi người mỗi ngày
-- ĐÃ CHẠY trên Supabase ngày 07/10/2026. Bản ghi, không chạy lại.
--
-- Mỗi lần gọi AI hoặc Azure là tốn tiền thật. Không có hạn mức thì
-- một em bấm liên tục, hoặc một người viết script gọi thẳng vào
-- đường dẫn, cũng đủ làm hoá đơn tăng vọt — mà cô không biết cho tới
-- lúc nhận bill.
--
-- Đếm ở Postgres chứ không ở trình duyệt: chặn phía trình duyệt thì
-- ai mở công cụ nhà phát triển cũng bỏ qua được, mà tiền vẫn mất.
--
-- Năm quỹ riêng. AI và Azure là hai nhà cung cấp, hai hoá đơn — gộp
-- chung thì không biết chỗ nào đang ngốn.
--
-- Đổi mức: ghi vào site_settings khoá "han_muc_ai", ví dụ
--   {"cham-noi": 50, "phat-am": 50}
-- Không phải deploy lại.
-- ============================================================

create table if not exists public.dung_ai (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ngay    date not null default current_date,
  viec    text not null,
  so_lan  integer not null default 0,
  primary key (user_id, ngay, viec)
);

alter table public.dung_ai enable row level security;

create policy dung_ai_doc on public.dung_ai for select
  using (auth.uid() = user_id or is_teacher());

create or replace function public.ai_muc(p_viec text)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (value ->> p_viec)::int from site_settings where key = 'han_muc_ai'),
    case p_viec
      when 'cham-noi' then 30     -- chấm chữ bằng AI
      when 'phat-am'  then 30     -- chấm phát âm bằng Azure
      when 'tu-dien'  then 40     -- tra từ ngoài kho
      when 'lo-trinh' then 20     -- chỉ giáo viên
      when 'de-noi'   then 20     -- chỉ giáo viên
      else 30
    end);
$$;

-- Xin một lượt. Trả về còn lại bao nhiêu, hết thì -1.
-- Một lệnh duy nhất nên hai lần bấm cùng lúc cũng không đếm hụt.
-- Giáo viên không bị chặn: cô soạn bài cần làm liên tục, và cô là
-- người trả tiền nên tự biết điểm dừng.
create or replace function public.ai_xin_luot(p_viec text)
returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); muc integer; con integer;
begin
  if uid is null then return -1; end if;
  if is_teacher() then return 9999; end if;

  muc := ai_muc(p_viec);

  insert into dung_ai (user_id, ngay, viec, so_lan)
  values (uid, current_date, p_viec, 1)
  on conflict (user_id, ngay, viec)
  do update set so_lan = dung_ai.so_lan + 1
  returning so_lan into con;

  -- Vượt mức thì trả lại lượt vừa cộng, để ngày mai không bị lệch
  if con > muc then
    update dung_ai set so_lan = so_lan - 1
    where user_id = uid and ngay = current_date and viec = p_viec;
    return -1;
  end if;

  return muc - con;
end $$;

-- Cô xem đang tốn tới đâu: tổng lượt gọi theo ngày.
create or replace function public.ai_thong_ke(p_ngay integer default 30)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x ->> 'ngay' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'ngay', ngay,
      'tong', sum(so_lan),
      'theo_viec', jsonb_object_agg(viec, so_lan),
      'so_nguoi', count(distinct user_id)
    ) x
    from dung_ai
    where is_teacher() and ngay > current_date - p_ngay
    group by ngay
  ) z;
$$;

grant execute on function public.ai_muc(text) to authenticated;
grant execute on function public.ai_xin_luot(text) to authenticated;
grant execute on function public.ai_thong_ke(integer) to authenticated;
