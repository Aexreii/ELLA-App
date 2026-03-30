// THIS FILE SERVES AS THE LOGIC AREA OF THE APPLICATION
// Difficulty order for filtering

const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function getRecommendedBooks(user, books = []) {
  if (!user || !user.progress) {
    return {
      recommended: [],
      teacherMaterials: [],
      studentUploads: [],
      appBooks: [],
    };
  }

  const completedBookIds = user.progress.map((p) => p.bookId);

  let maxDifficulty = "Beginner";
  if (user.points >= 400) maxDifficulty = "Advanced";
  else if (user.points >= 200) maxDifficulty = "Intermediate";

  const recommended = books
    .filter((b) => !completedBookIds.includes(b.id))
    .filter(
      (b) => difficultyOrder[b.difficulty] <= difficultyOrder[maxDifficulty],
    )
    .slice(0, 5);

  const teacherMaterials = books.filter((b) => b.source === "Teacher");
  const studentUploads = books.filter((b) => b.source === "user");
  const appBooks = books.filter((b) => b.source === "app");

  return { recommended, teacherMaterials, studentUploads, appBooks };
}

export function getLastUnfinishedBook(user, books = []) {
  if (!user || !user.progress || user.progress.length === 0) return null;

  const unfinished = user.progress.filter(
    (p) => p.sentencesRead < p.totalSentences,
  );

  if (unfinished.length > 0) {
    const latestUnfinished = unfinished[unfinished.length - 1];
    return books.find((b) => b.id === latestUnfinished.bookId) || null;
  }

  const lastReadProgress = user.progress[user.progress.length - 1];
  return books.find((b) => b.id === lastReadProgress.bookId) || null;
}
