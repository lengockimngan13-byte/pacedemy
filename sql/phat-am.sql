-- ĐÃ CHẠY trên Supabase (05/10/2026)
--
-- File ghi âm người thật cho từng từ.
-- Giọng máy trong điện thoại mỗi máy một kiểu, có máy còn đọc tiếng
-- Anh bằng giọng tiếng Việt. Có file thì mọi máy nghe cùng một giọng,
-- giọng máy chỉ còn là phương án dự phòng.
--
-- Từ nào dò rồi mà không có file thì ghi 'khong-co' để lần sau khỏi
-- dò lại. Phía web bỏ qua giá trị đó, không đi tải.

alter table public.vocabulary
  add column if not exists am_thanh text;

comment on column public.vocabulary.am_thanh is
  'Đường dẫn file phát âm. Có thì phát file, không thì để máy đọc.';
