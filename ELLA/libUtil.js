// THIS FILE SERVES AS THE LOGIC AREA OF THE APPLICATION
// Difficulty order for filtering

const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function getRecommendedBooks(user, books = []) {
  if (!user) {
    return {
      recommended: [],
      teacherMaterials: [],
      studentUploads: [],
      appBooks: [],
    };
  }

  // If a local progress array exists on the user object use it, else treat as empty
  const completedBookIds = (user.progress ?? []).map((p) => p.bookId);

  let maxDifficulty = "Beginner";
  if (user.points >= 400) maxDifficulty = "Advanced";
  else if (user.points >= 200) maxDifficulty = "Intermediate";

  // All books are eligible for recommended (including app/Ella books)
  const recommended = books
    .filter((b) => !completedBookIds.includes(b.id))
    .filter(
      (b) => difficultyOrder[b.difficulty] <= difficultyOrder[maxDifficulty],
    )
    .slice(0, 5);

  // Match both "Teacher" and "teacher" in case of inconsistent casing
  const teacherMaterials = books.filter(
    (b) => b.source === "Teacher" || b.source === "teacher",
  );

  const studentUploads = books.filter(
    (b) => b.source === "user" || b.source === "User" || b.source === "student",
  );

  // Match "app", "App", "ella", "Ella"
  const appBooks = books.filter(
    (b) =>
      b.source === "app" ||
      b.source === "App" ||
      b.source === "ella" ||
      b.source === "Ella",
  );

  return { recommended, teacherMaterials, studentUploads, appBooks };
}

export function getLastUnfinishedBook(user, books = []) {
  if (!user?.lastReadBook) return null;
  return books.find((b) => b.id === user.lastReadBook) ?? null;
}
