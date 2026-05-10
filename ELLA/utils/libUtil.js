// THIS FILE SERVES AS THE LOGIC AREA OF THE APPLICATION
// Difficulty order for filtering

const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };

// ── Sort helper: higher bookId first ──────────────────────
function sortByBookIdDesc(books) {
  return [...books].sort((a, b) => (b.bookId ?? 0) - (a.bookId ?? 0));
}

export function getRecommendedBooks(user, books = []) {
  if (!user)
    return {
      recommended: [],
      teacherMaterials: [],
      studentUploads: [],
      appBooks: [],
      publicBooks: [],
    };

  const completedBookIds = (user.progress ?? []).map((p) => p.bookId);
  let maxDifficulty = "Beginner";
  if (user.points >= 400) maxDifficulty = "Advanced";
  else if (user.points >= 200) maxDifficulty = "Intermediate";

  const recommended = sortByBookIdDesc(
    books
      .filter((b) => !completedBookIds.includes(b.id))
      .filter(
        (b) => difficultyOrder[b.difficulty] <= difficultyOrder[maxDifficulty],
      ),
  ).slice(0, 5);

  const teacherMaterials = sortByBookIdDesc(
    books.filter(
      (b) =>
        (b.source === "Teacher" || b.source === "teacher") &&
        (b.visibility === "class" || (b.visibility ?? "public") === "public"),
    ),
  );

  const studentUploads = sortByBookIdDesc(
    books.filter(
      (b) =>
        (b.source === "user" ||
          b.source === "User" ||
          b.source === "student") &&
        ((b.visibility ?? "public") !== "private" ||
          b.uploadedById === user.uid),
    ),
  );

  const publicBooks = sortByBookIdDesc(
    books.filter(
      (b) =>
        (b.visibility ?? "public") === "public" && b.uploadedById !== user.uid,
    ),
  );
  const appBooks = sortByBookIdDesc(
    books.filter(
      (b) =>
        b.source === "app" ||
        b.source === "App" ||
        b.source === "ella" ||
        b.source === "Ella",
    ),
  );

  return {
    recommended,
    teacherMaterials,
    studentUploads,
    appBooks,
    publicBooks,
  };
}

export function getLastUnfinishedBook(user, books = []) {
  if (!user?.lastReadBook) return null;
  return books.find((b) => b.id === user.lastReadBook) ?? null;
}
