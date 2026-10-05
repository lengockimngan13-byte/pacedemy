-- ĐÃ CHẠY trên Supabase (05/10/2026)
--
-- Thẻ từ điển kiểu đầy đủ chứ không chỉ một dòng nghĩa. Ba cột mới:
--
--   dinh_nghia_vi : câu định nghĩa trọn vẹn bằng tiếng Việt. Khác với
--                   meaning_vi vốn chỉ là nghĩa ngắn dùng làm thẻ ghi nhớ.
--                   Bỏ trống thì thẻ tự lùi về dùng meaning_vi.
--
--   vi_du         : nhiều ví dụ, mỗi ví dụ một cặp {"vi": ..., "en": ...}.
--                   Bỏ trống thì thẻ tự lùi về cặp example_en/example_vi.
--
--   ghi_chu       : phần cô Ngân giảng thêm — phân biệt từ dễ nhầm, bẫy
--                   ngữ pháp. Bọc **hai dấu sao** để in đậm.
--                   Đây là chỗ từ điển ngoài không có.

alter table public.vocabulary
  add column if not exists dinh_nghia_vi text,
  add column if not exists vi_du jsonb,
  add column if not exists ghi_chu text;

comment on column public.vocabulary.dinh_nghia_vi is
  'Câu định nghĩa đầy đủ bằng tiếng Việt, hiện ở thẻ từ điển';
comment on column public.vocabulary.vi_du is
  'Mảng ví dụ [{"vi": "...", "en": "..."}], thay cho cặp example_en/example_vi khi có nhiều ví dụ';
comment on column public.vocabulary.ghi_chu is
  'Ghi chú của giáo viên: phân biệt từ dễ nhầm, bẫy ngữ pháp';

-- Ví dụ cũ đưa vào mảng để thẻ mới có sẵn dữ liệu
update vocabulary
set vi_du = jsonb_build_array(jsonb_build_object('vi', example_vi, 'en', example_en))
where vi_du is null and example_en is not null;
