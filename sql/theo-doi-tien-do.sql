-- ============================================================
-- Pacedemy — bổ sung cho phần theo dõi tiến độ
--
-- Chạy trong Supabase → SQL Editor → New query → dán vào → Run.
-- Chạy lại nhiều lần cũng không sao, không làm mất dữ liệu cũ.
--
-- Thêm hai thứ vào bảng attempt_answers:
--   exam_question_id — câu hỏi của bộ đề thi thử. Cột question_id cũ
--     chỉ nhận câu trong ngân hàng luyện đề, nên câu thi thử trước
--     giờ lưu rỗng và không truy ngược được.
--   ms_used — số mili giây học viên dừng ở câu đó, để biết câu nào
--     làm lâu, câu nào đoán bừa.
-- ============================================================

-- 1. Cột thời gian mỗi câu
ALTER TABLE public.attempt_answers
  ADD COLUMN IF NOT EXISTS ms_used integer;

-- 2. Cột câu hỏi của đề thi thử, kiểu lấy đúng theo exam_questions.id
DO $$
DECLARE
  id_type text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempt_answers'
      AND column_name = 'exam_question_id'
  ) THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO id_type
    FROM pg_attribute a
    WHERE a.attrelid = 'public.exam_questions'::regclass
      AND a.attname = 'id'
      AND a.attnum > 0;

    EXECUTE format(
      'ALTER TABLE public.attempt_answers ADD COLUMN exam_question_id %s
       REFERENCES public.exam_questions(id) ON DELETE SET NULL', id_type);
  END IF;
END $$;

-- 3. Tra cứu nhanh khi mở một bài làm
CREATE INDEX IF NOT EXISTS attempt_answers_attempt_idx
  ON public.attempt_answers (attempt_id);

CREATE INDEX IF NOT EXISTS attempt_answers_exam_q_idx
  ON public.attempt_answers (exam_question_id);

-- 4. Cho giáo viên đọc bài làm của học viên
--    (học viên vẫn chỉ đọc được bài của chính mình như trước)
DROP POLICY IF EXISTS "teacher reads answers" ON public.attempt_answers;
CREATE POLICY "teacher reads answers" ON public.attempt_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "teacher reads attempts" ON public.attempts;
CREATE POLICY "teacher reads attempts" ON public.attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );
