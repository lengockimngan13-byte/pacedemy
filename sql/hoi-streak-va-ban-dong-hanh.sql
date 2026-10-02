-- ============================================================
-- Pacedemy — Hội Streak (ngày nghỉ phép) và Bạn đồng hành (chuỗi đôi)
--
-- ĐÃ CHẠY trên Supabase ngày 03/10/2026 — file này giữ lại để xem.
-- Chạy theo đúng thứ tự bốn khối dưới đây.
-- ============================================================


-- ---------- 1. Ngày nghỉ phép ----------

alter table public.profiles add column if not exists freeze_count int not null default 0;
alter table public.profiles add column if not exists freeze_used_on date;

-- streak_days trong bảng chỉ đổi khi học viên quay lại học. Nghỉ ba hôm
-- mà chưa vào thì cột đó vẫn giữ số cũ, hiện ra là nói dối. Hàm này tính
-- xem chuỗi còn sống thật hay không.
create or replace function public.chuoi_con_song(p_last date, p_streak int, p_freeze int)
returns int language sql stable as $$
  select case
    when p_last is null then 0
    when p_last >= current_date - 1 then coalesce(p_streak, 0)
    when p_last = current_date - 2 and coalesce(p_freeze, 0) > 0 then coalesce(p_streak, 0)
    else 0
  end;
$$;

grant execute on function public.chuoi_con_song(date, int, int) to authenticated;


-- ---------- 2. add_xp biết dùng ngày nghỉ phép ----------
-- Qua mốc 7/14/30/60/100/180/365 thì được thưởng một ngày nghỉ phép,
-- giữ tối đa ba cái. Nghỉ đúng một ngày thì tự tiêu một cái để cứu chuỗi.
-- Tất cả nằm trong hàm nên không gian lận từ phía web được.

create or replace function public.add_xp(p_xp integer)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  v_user   uuid := auth.uid();
  v_last   date;
  v_streak int;
  v_freeze int;
  v_moi    int;
  v_cuu    boolean := false;
  v_moc    int[] := array[7, 14, 30, 60, 100, 180, 365];
begin
  if v_user is null then raise exception 'Chua dang nhap'; end if;
  if p_xp is null or p_xp < 0 or p_xp > 100 then raise exception 'So diem khong hop le'; end if;

  select last_active, coalesce(streak_days, 0), coalesce(freeze_count, 0)
    into v_last, v_streak, v_freeze
  from public.profiles where id = v_user for update;

  if v_last = current_date then
    v_moi := v_streak;
  elsif v_last = current_date - 1 then
    v_moi := v_streak + 1;
  elsif v_last = current_date - 2 and v_freeze > 0 then
    v_moi    := v_streak + 1;
    v_freeze := v_freeze - 1;
    v_cuu    := true;
  else
    v_moi := 1;
  end if;

  if v_moi > v_streak and v_moi = any(v_moc) then
    v_freeze := least(3, v_freeze + 1);
  end if;

  update public.profiles set
    total_xp       = total_xp + p_xp,
    streak_days    = v_moi,
    freeze_count   = v_freeze,
    freeze_used_on = case when v_cuu then current_date else freeze_used_on end,
    last_active    = current_date
  where id = v_user;
end; $$;


-- ---------- 3. Bảng bạn đồng hành ----------
-- Cặp lưu một chiều, a_id luôn nhỏ hơn b_id, nên không trùng cặp.

create table if not exists public.study_buddies (
  id         bigint generated always as identity primary key,
  a_id       uuid not null references public.profiles(id) on delete cascade,
  b_id       uuid not null references public.profiles(id) on delete cascade,
  moi_boi    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  constraint study_buddies_thu_tu check (a_id < b_id),
  constraint study_buddies_mot_cap unique (a_id, b_id)
);

alter table public.study_buddies enable row level security;

create policy buddy_doc on public.study_buddies
  for select using (auth.uid() in (a_id, b_id) or is_teacher());

create policy buddy_moi on public.study_buddies
  for insert with check (
    auth.uid() in (a_id, b_id) and moi_boi = auth.uid() and status = 'pending'
  );

-- Chỉ người được mời mới bấm nhận được
create policy buddy_duyet on public.study_buddies
  for update using (auth.uid() in (a_id, b_id) and moi_boi <> auth.uid())
  with check (status = 'active');

create policy buddy_huy on public.study_buddies
  for delete using (auth.uid() in (a_id, b_id));


-- ---------- 4. Tính chuỗi đôi ----------
-- co_hoc không mở cho học viên gọi thẳng, để khỏi soi được ngày học của
-- người khác. Chỉ hai hàm bên dưới gọi nó.

create or replace function public.co_hoc(p_user uuid, p_ngay date)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.attempts
    where user_id = p_user
      and submitted_at is not null
      and (submitted_at at time zone 'Asia/Ho_Chi_Minh')::date = p_ngay
  );
$$;

-- Đếm lùi số ngày liên tiếp mà CẢ HAI đều có học. Hôm nay chưa ai học thì
-- đếm từ hôm qua, không phạt sớm. Đứt chuỗi đôi KHÔNG đụng tới chuỗi riêng.
create or replace function public.chuoi_doi(p_ban uuid)
returns int language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_co boolean;
  d    date;
  n    int := 0;
begin
  if v_me is null or p_ban is null or p_ban = v_me then return 0; end if;

  select exists (
    select 1 from public.study_buddies
    where status = 'active'
      and a_id = least(v_me, p_ban) and b_id = greatest(v_me, p_ban)
  ) into v_co;

  if not v_co then return 0; end if;

  d := current_date;
  if not (public.co_hoc(v_me, d) and public.co_hoc(p_ban, d)) then
    d := current_date - 1;
  end if;

  while n < 400 and public.co_hoc(v_me, d) and public.co_hoc(p_ban, d) loop
    n := n + 1;
    d := d - 1;
  end loop;

  return n;
end; $$;

-- Gom mọi thứ về bạn đồng hành vào một lời gọi
create or replace function public.ban_dong_hanh()
returns table (
  cap_id bigint, ban_id uuid, ban_ten text, trang_thai text,
  toi_moi boolean, chuoi int, toi_hom_nay boolean, ban_hom_nay boolean
)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  r    record;
begin
  if v_me is null then return; end if;

  select sb.id,
         case when sb.a_id = v_me then sb.b_id else sb.a_id end as ban,
         sb.status,
         (sb.moi_boi = v_me) as toi_gui
    into r
  from public.study_buddies sb
  where v_me in (sb.a_id, sb.b_id)
  order by (sb.status = 'active') desc, sb.created_at desc
  limit 1;

  if r is null then return; end if;

  cap_id      := r.id;
  ban_id      := r.ban;
  ban_ten     := (select full_name from public.profiles where id = r.ban);
  trang_thai  := r.status;
  toi_moi     := r.toi_gui;
  chuoi       := case when r.status = 'active' then public.chuoi_doi(r.ban) else 0 end;
  toi_hom_nay := public.co_hoc(v_me, current_date);
  ban_hom_nay := case when r.status = 'active'
                      then public.co_hoc(r.ban, current_date) else false end;

  return next;
end; $$;

revoke execute on function public.co_hoc(uuid, date) from authenticated, anon;
grant execute on function public.chuoi_doi(uuid) to authenticated;
grant execute on function public.ban_dong_hanh() to authenticated;
