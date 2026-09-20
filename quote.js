// ============================================================
// Pacedemy — câu quote "phản động lực" (demotivational meme) hiện
// mỗi ngày ở trang học. Đổi câu tự động qua ngày, không lặp lại
// liên tiếp trong tuần vì danh sách đủ dài.
//
// Ngân muốn thêm/bớt/sửa câu: chỉ cần sửa mảng QUOTES bên dưới,
// mỗi dòng một câu, không cần đụng vào app.js.
// ============================================================

const QUOTES = [
  "Don't give up on your dreams. Just keep sleeping.",
  "Work is for servants. You're clearly management material — of your bed.",
  "Practice makes perfect, right? But nobody's perfect, so why practice?",
  "Tomorrow you will start studying. Tomorrow you always say that.",
  "TOEIC 990 is just a number. So is your current score. Coincidence?",
  "You miss 100% of the questions you don't read.",
  "A vocabulary word a day keeps... nothing away, you still forgot it by dinner.",
  "Rome wasn't built in a day, and neither is your Part 5 accuracy, apparently.",
  "The early bird gets the worm. You get the snooze button.",
  "Some people study 2 hours a day. You study the ceiling.",
  "Your streak called. It wants to know if you're still alive.",
  "Success is 1% inspiration, 99% closing this app and doing something else.",
  "You can't spell 'procrastination' without 'nation' — a whole nation of people like you.",
  "Every expert was once a beginner. Every beginner was once scrolling instead of studying.",
  "Winners never quit. Quitters never study Part 6. Coincidence?",
  "Today's forecast: 100% chance of opening the app and closing it again.",
  "Hard work pays off eventually. Naps pay off immediately.",
  "You don't need luck for TOEIC. You need the 30 minutes you're not using right now.",
  "Champions train when no one's watching. You train when the deadline's watching.",
  "Reading Part 7 builds character. Not studying builds nothing, but it's more comfortable.",
  "The best time to study was yesterday. The second best time is definitely not now.",
  "They say knowledge is power. Naps are also power, in a different way.",
  "If at first you don't succeed, redefine success.",
  "Your future self is counting on you. Your present self is counting sheep.",
  "Discipline is doing what needs to be done, even if you don't want to. So... maybe later.",
  "One does not simply get 900+ by thinking about it really hard.",
  "You are one flashcard away from either giving up or giving in. Pick one.",
  "The grammar rules don't care about your feelings. Neither does the deadline.",
  "A goal without a plan is just a wish. A plan without action is just a to-do list you'll ignore.",
  "Consistency beats motivation. Motivation left the chat weeks ago.",
];

(function () {
  const el = document.getElementById('greet-quote');
  if (!el) return;

  // Mốc cố định để có ngày tham chiếu — đổi mốc này sẽ đổi thứ tự
  // câu hiện ra theo ngày, không ảnh hưởng gì khác.
  const anchor = new Date(2026, 0, 1);
  const today = new Date();
  const dayIndex = Math.floor((today - anchor) / 86400000);
  const idx = ((dayIndex % QUOTES.length) + QUOTES.length) % QUOTES.length;

  el.textContent = '"' + QUOTES[idx] + '"';
})();
