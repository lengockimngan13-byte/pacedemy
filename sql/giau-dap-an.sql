-- ============================================================
-- Pacedemy — giấu đáp án, chặn lấy dữ liệu hàng loạt (Part 5)
--
-- Vấn đề: trang luyện và game Thỏ hỏi đều tải VỀ MÁY cả 670 câu Part 5
-- kèm đáp án, giải thích, bản dịch, từ khoá — rồi mới bốc ra mười mấy
-- câu để hiện. Một lần gọi là lấy sạch phần cô đổ công nhất. Học viên
-- mở tab Network cũng thấy đáp án trước khi chọn.
--
-- Cách sửa, ba lớp:
--   1. Xin câu qua hàm máy chủ — câu gửi về không có đáp án.
--   2. Chấm từng câu một, trả đáp án kèm giải thích của đúng câu đó.
--   3. Khoá luôn đường đọc thẳng bảng, không thì hai lớp trên vô nghĩa.
--
-- Không chặn được tuyệt đối: ai kiên nhẫn gọi từng câu vẫn gom dần
-- được. Nên có bộ đếm nhịp — lấy hàng loạt thì chậm hẳn và để dấu vết.
-- ============================================================

-- ---------- Bộ đếm nhịp ----------

create table if not exists public.cham_nhip (
  user_id uuid not null,
  gio     timestamptz not null,
  so      integer not null default 0,
  primary key (user_id, gio)
);

alter table public.cham_nhip enable row level security;

create policy cham_nhip_gv on public.cham_nhip
  for select to authenticated using (public.is_teacher());

-- Một buổi luyện 10 câu tốn 20 lượt (10 lúc xin đề, 10 lúc chấm), nên
-- 600 là ba chục buổi trong một giờ — không học viên thật nào chạm tới.
create or replace function public.dem_nhip(p_them integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_so integer;
begin
  if public.is_teacher() then return true; end if;

  insert into public.cham_nhip (user_id, gio, so)
  values (auth.uid(), date_trunc('hour', now()), p_them)
  on conflict (user_id, gio) do update set so = cham_nhip.so + p_them
  returning so into v_so;

  return v_so <= 600;
end;
$$;

-- ---------- Xin câu để luyện: KHÔNG kèm đáp án ----------

create or replace function public.cau_luyen(
  p_part integer default 5,
  p_tag  text    default null,
  p_so   integer default 10
)
returns table (
  id bigint, question_text text, options jsonb,
  topic_tag text, difficulty integer
)
language plpgsql security definer stable set search_path = public as $$
declare v_so integer := least(greatest(coalesce(p_so, 10), 1), 50);
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để luyện bài.';
  end if;

  if not public.dem_nhip(v_so) then
    raise exception 'Bạn đang lấy bài quá nhanh. Nghỉ một lát rồi quay lại nhé.';
  end if;

  return query
    select q.id, q.question_text, q.options, q.topic_tag, q.difficulty
    from public.questions q
    where q.part = p_part
      and q.is_active
      and q.set_id is null and q.rset_id is null
      and (p_tag is null or p_tag = '' or q.topic_tag = p_tag)
    order by random()
    limit v_so;
end;
$$;

-- ---------- Chấm một câu, trả về đáp án và giải thích ----------

create or replace function public.cham_cau(p_id bigint, p_chon text)
returns table (
  dung boolean, dap_an text, explanation text,
  translation_vi text, key_point text
)
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  if not public.dem_nhip(1) then
    raise exception 'Bạn đang chấm bài quá nhanh. Nghỉ một lát rồi quay lại nhé.';
  end if;

  select * into q from public.questions
   where questions.id = p_id and questions.is_active;

  if not found then
    raise exception 'Không tìm thấy câu hỏi này.';
  end if;

  return query select
    upper(coalesce(p_chon, '')) = upper(q.correct_answer),
    q.correct_answer, q.explanation, q.translation_vi, q.key_point;
end;
$$;

-- ---------- Khung nhìn chỉ có cột an toàn ----------
-- Cho mấy chỗ chỉ cần đếm câu hoặc xem dạng bài: trang Part 5, Tiến
-- độ, Bài tập được giao.

create or replace view public.cau_mo
with (security_invoker = off) as
  select id, part, topic_tag, difficulty, order_index,
         set_id, rset_id, test_no, is_active
  from public.questions
  where is_active;

grant select on public.cau_mo to authenticated;

-- ---------- Bài cho game Thỏ hỏi ----------
-- Game chấm ngay trong máy vì con thỏ đang rơi, chờ máy chủ là hỏng
-- nhịp chơi. Nên vẫn gửi kèm đáp án — nhưng chỉ chừng ấy câu cho một
-- lượt chơi, không phải cả kho như trước.

create or replace function public.cau_tho(
  p_tags text[] default null,
  p_so   integer default 15
)
returns table (
  id bigint, question_text text, options jsonb, options_vi jsonb,
  correct_answer text, explanation text, topic_tag text,
  translation_vi text, key_point text
)
language plpgsql security definer stable set search_path = public as $$
declare v_so integer := least(greatest(coalesce(p_so, 15), 1), 40);
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để chơi.';
  end if;

  if not public.dem_nhip(v_so) then
    raise exception 'Bạn đang lấy bài quá nhanh. Nghỉ một lát rồi quay lại nhé.';
  end if;

  return query
    select q.id, q.question_text, q.options, q.options_vi,
           q.correct_answer, q.explanation, q.topic_tag,
           q.translation_vi, q.key_point
    from public.questions q
    where q.part = 5 and q.is_active
      and q.set_id is null and q.rset_id is null
      and (p_tags is null or q.topic_tag = any(p_tags))
      and q.options ? q.correct_answer
    order by random()
    limit v_so;
end;
$$;

revoke execute on function public.cau_luyen(integer, text, integer) from anon;
revoke execute on function public.cham_cau(bigint, text) from anon;
revoke execute on function public.cau_tho(text[], integer) from anon;
revoke execute on function public.dem_nhip(integer) from anon, authenticated;

-- ---------- Khoá đường đọc thẳng ----------
-- Chặn đúng phần đã chuyển sang hàm: câu Part 5 đứng lẻ. Câu của
-- Part 1-4, 6, 7 nằm trong bài nghe hoặc bài đọc vẫn đọc thẳng được,
-- vì mấy trang đó chưa chuyển — chặn bây giờ là gãy bài đang chạy.

alter policy quest_read on public.questions
  using (
    is_active and (
      public.is_teacher()
      or not (part = 5 and set_id is null and rset_id is null)
    )
  );
