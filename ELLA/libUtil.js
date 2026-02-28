import { books } from "./Data/data";

//THIS FILE WILL SERVE AS THE LOGIC AREA OF THE APPLICATION
//THIS WILL FORMULATE THE BOOKS
// DIFFIULTY ORDER
// SCORING SYSTEM OF THE STUDENTS
// GO GUYS KAYA TO!

// Difficulty order for filtering

const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function getRecommendedBooks(user) {
  const completedBookIds = user.progress.map((p) => p.bookId);

  // Determine max difficulty based on points
  let maxDifficulty = "Beginner";
  if (user.points >= 400) maxDifficulty = "Advanced";
  else if (user.points >= 200) maxDifficulty = "Intermediate";

  // Filter books not yet completed and within difficulty
  const recommended = books
    .filter((b) => !completedBookIds.includes(b.bookId))
    .filter(
      (b) => difficultyOrder[b.difficulty] <= difficultyOrder[maxDifficulty],
    )
    .slice(0, 5); // only top 5

  // Teacher and student uploads will always be fully shown
  const teacherMaterials = books.filter((b) => b.source === "Teacher");
  const studentUploads = books.filter((b) => b.source === "user");
  const appBooks = books.filter((b) => b.source === "app");

  return { recommended, teacherMaterials, studentUploads, appBooks };
}

//return last unread book
export function getLastUnfinishedBook(user) {
  if (!user.progress || user.progress.length === 0) return null;

  // 1️⃣ Find all unfinished books
  const unfinished = user.progress.filter(
    (p) => p.sentencesRead < p.totalSentences,
  );

  if (unfinished.length > 0) {
    // return the latest unfinished book (last in array)
    const latestUnfinished = unfinished[unfinished.length - 1];
    return books.find((b) => b.bookId === latestUnfinished.bookId) || null;
  }

  // 2️⃣ If no unfinished books: return last read book (most recent)
  const lastReadProgress = user.progress[user.progress.length - 1];
  return books.find((b) => b.bookId === lastReadProgress.bookId) || null;
}
