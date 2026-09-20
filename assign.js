// ============================================================
// Pacedemy — tính tiến độ bài tập, dùng chung cho trang lớp và trang học
// ============================================================

// Lấy các bài tập còn mở của một lớp, kèm đầu việc bên trong
async function fetchAssignments(classIds) {
  if (!classIds || !classIds.length) return [];

  const { data: rows } = await db
    .from('assignments')
    .select('id, class_id, title, note, due_date, is_active, created_at')
    .in('class_id', classIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!rows || !rows.length) return [];

  const { data: items } = await db
    .from('assignment_items')
    .select('id, assignment_id, kind, target, label, amount')
    .in('assignment_id', rows.map(function (a) { return a.id; }));

  for (const a of rows) {
    a.items = (items || []).filter(function (i) { return i.assignment_id === a.id; });
  }

  return rows;
}

// Đếm việc từng em đã làm được kể từ lúc bài tập được giao.
// Trả về { user_id: { item_id: số đã làm } }
async function countProgress(assignment, userIds) {
  const out = {};
  for (const u of userIds) out[u] = {};

  if (!assignment.items.length || !userIds.length) return out;

  const since = assignment.created_at;

  const needVocab  = assignment.items.some(function (i) { return i.kind === 'vocab'; });
  const needAnswer = assignment.items.some(function (i) { return i.kind !== 'vocab'; });

  // ---- Phần từ vựng ----
  // Đếm số từ trong chủ đề mà em đã học tới, tính cả từ học trước đó.
  if (needVocab) {
    const { data: prog } = await db
      .from('vocab_progress').select('user_id, vocabulary_id').in('user_id', userIds);

    const vids = [...new Set((prog || []).map(function (p) { return p.vocabulary_id; }))];

    const topicOf = {};
    if (vids.length) {
      const { data: vs } = await db.from('vocabulary').select('id, topic_id').in('id', vids);
      for (const v of (vs || [])) topicOf[v.id] = String(v.topic_id);
    }

    for (const it of assignment.items) {
      if (it.kind !== 'vocab') continue;
      for (const p of (prog || [])) {
        if (!it.target || topicOf[p.vocabulary_id] === String(it.target)) {
          out[p.user_id][it.id] = (out[p.user_id][it.id] || 0) + 1;
        }
      }
    }
  }

  // ---- Phần luyện đề và luyện nghe ----
  if (needAnswer) {
    const { data: atts } = await db
      .from('attempts').select('id, user_id')
      .in('user_id', userIds).gte('started_at', since);

    const aids = (atts || []).map(function (a) { return a.id; });

    if (aids.length) {
      const userOf = {};
      for (const a of (atts || [])) userOf[a.id] = a.user_id;

      const { data: ans } = await db
        .from('attempt_answers').select('attempt_id, question_id').in('attempt_id', aids);

      const qids = [...new Set((ans || []).map(function (x) { return x.question_id; }))];

      const qInfo = {};
      if (qids.length) {
        const { data: qs } = await db
          .from('questions').select('id, part, topic_tag').in('id', qids);
        for (const q of (qs || [])) qInfo[q.id] = q;
      }

      for (const it of assignment.items) {
        if (it.kind === 'vocab') continue;

        for (const x of (ans || [])) {
          const q = qInfo[x.question_id];
          const u = userOf[x.attempt_id];
          if (!q || !u) continue;

          let hit = false;
          if (it.kind === 'part5') {
            hit = q.part === 5 && (!it.target || q.topic_tag === it.target);
          } else if (it.kind === 'listen') {
            hit = it.target ? (q.part === parseInt(it.target, 10)) : (q.part >= 1 && q.part <= 4);
          }

          if (hit) out[u][it.id] = (out[u][it.id] || 0) + 1;
        }
      }
    }
  }

  return out;
}

// Phần trăm hoàn thành của một em với một bài tập
function assignPercent(assignment, done) {
  if (!assignment.items.length) return 0;
  let sum = 0;
  for (const it of assignment.items) {
    const d = Math.min(done[it.id] || 0, it.amount);
    sum += d / it.amount;
  }
  return Math.round(sum / assignment.items.length * 100);
}

function dueText(d) {
  if (!d) return 'Không đặt hạn';
  const due = new Date(d + 'T23:59:59');
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0)  return 'Quá hạn ' + (-days) + ' ngày';
  if (days === 0) return 'Hạn hôm nay';
  if (days === 1) return 'Còn 1 ngày';
  return 'Còn ' + days + ' ngày';
}
