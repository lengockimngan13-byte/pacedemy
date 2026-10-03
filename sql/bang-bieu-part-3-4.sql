-- ĐÃ CHẠY trên Supabase (04/10/2026)
--
-- Bảng, biểu đồ, sơ đồ của Part 3 và Part 4 lưu dưới dạng DỮ LIỆU
-- chứ không phải file ảnh. Lý do: cô soạn thẳng trong Teacher Studio,
-- sửa một ô không phải làm lại cả ảnh, và trên điện thoại chữ vẫn sắc nét.
--
-- Dạng dữ liệu, xem js/do-hoa.js:
--   { "kieu": "bang",  "tieu_de": "...", "cot": [...], "hang": [[...]] }
--   { "kieu": "cot" | "duong", "don_vi": "...", "muc": [{"ten":"Q1","gia_tri":48}] }
--   { "kieu": "tron",  "muc": [{"ten":"Marketing","gia_tri":40}] }
--   { "kieu": "so-do", "so_cot": 3, "o": [{"ten":"Room A","nhan":"Sales"}] }
--   { "kieu": "phieu", "dong": [{"nhan":"Discount","gia_tri":"25% OFF"}] }

alter table public.listening_sets
  add column if not exists graphic jsonb;

comment on column public.listening_sets.graphic is
  'Bảng/biểu đồ/sơ đồ kèm bài nghe Part 3-4, lưu dạng dữ liệu để web tự vẽ';

alter table public.exam_listening
  add column if not exists graphic jsonb;

comment on column public.exam_listening.graphic is
  'Bảng/biểu đồ/sơ đồ kèm bài nghe Part 3-4, lưu dạng dữ liệu để web tự vẽ';
