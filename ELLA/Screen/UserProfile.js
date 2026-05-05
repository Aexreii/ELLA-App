import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { useScale } from "../utils/scaling";
import Ellalert, { useEllAlert } from "../components/Alerts";

// ── Cloudinary config ──────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dygbbqapd";
const CLOUDINARY_UPLOAD_PRESET = "ella_books";

// ── Helpers ────────────────────────────────────────────────

function getReadingLevel(completedBooks) {
  if (!completedBooks || completedBooks.length === 0) return "Beginner";

  const diffMap = { Easy: 1, Intermediate: 2, Hard: 3 };
  const count = completedBooks.length;
  const avg =
    completedBooks.reduce((sum, b) => sum + (diffMap[b.difficulty] ?? 1), 0) /
    count;
  if (avg >= 20.5 || (avg >= 10.0 && count >= 50)) return "Advanced";
  if (avg >= 10.5 || count >= 30) return "Intermediate";
  return "Beginner";
}

const getReadingLevelFromBooks = getReadingLevel;

function formatTime(seconds) {
  if (!seconds || seconds === 0) return "0 mins";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}hr${h > 1 ? "s" : ""} ${m}mins`;
  return `${m} min${m !== 1 ? "s" : ""}`;
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "0 mins";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getDayName(dayIndex) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayIndex];
}

function daysSince(date) {
  if (!date) return null;
  const now = new Date();
  const diff = now - date;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const dates = sessions
    .map((s) => {
      const d = s.startedAt?.toDate
        ? s.startedAt.toDate()
        : new Date(s.startedAt);
      return d.toISOString().slice(0, 10);
    })
    .filter(Boolean);
  const uniqueDates = [...new Set(dates)].sort().reverse();
  if (uniqueDates.length === 0) return 0;

  let streak = 0;
  let current = new Date();
  current.setHours(0, 0, 0, 0);

  for (const dateStr of uniqueDates) {
    const d = new Date(dateStr);
    const diff = Math.round((current - d) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      current = d;
    } else {
      break;
    }
  }
  return streak;
}

function getMostActiveDay(sessions) {
  if (!sessions || sessions.length === 0) return "—";
  const counts = [0, 0, 0, 0, 0, 0, 0];
  sessions.forEach((s) => {
    const d = s.startedAt?.toDate
      ? s.startedAt.toDate()
      : new Date(s.startedAt);
    if (d) counts[d.getDay()]++;
  });
  const maxIdx = counts.indexOf(Math.max(...counts));
  return getDayName(maxIdx);
}

function getLastActive(sessions) {
  if (!sessions || sessions.length === 0) return null;
  const dates = sessions
    .map((s) =>
      s.startedAt?.toDate ? s.startedAt.toDate() : new Date(s.startedAt),
    )
    .filter(Boolean);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function getAvgSessionDuration(sessions) {
  const valid = sessions.filter((s) => s.startedAt && s.endedAt);
  if (valid.length === 0) return 0;
  const total = valid.reduce((sum, s) => {
    const start = s.startedAt?.toDate
      ? s.startedAt.toDate()
      : new Date(s.startedAt);
    const end = s.endedAt?.toDate ? s.endedAt.toDate() : new Date(s.endedAt);
    return sum + (end - start) / 1000;
  }, 0);
  return Math.round(total / valid.length);
}

// ── Built-in avatar options ────────────────────────────────
const BUILTIN_AVATARS = [
  {
    key: "pink",
    label: "Pink",
    source: require("../assets/animations/jump_pink.gif"),
  },
  {
    key: "dino",
    label: "Dino",
    source: require("../assets/animations/jump_dino.gif"),
  },
  {
    key: "owl",
    label: "Owl",
    source: require("../assets/animations/jump_owl.gif"),
  },
];

export default function UserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    currUser,
    characterImages,
    isTeacherViewing = false,
    classId,
  } = route.params;
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const isOwnProfile =
    (currUser?.uid ?? currUser?.id) === auth.currentUser?.uid;
  const isTeacher = currUser?.role === "Teacher";

  const [stats, setStats] = useState(null);
  const [enrolledClass, setEnrolledClass] = useState(null);
  const [completedBooks, setCompletedBooks] = useState([]);
  const [abandonedBooks, setAbandonedBooks] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedBooks, setUploadedBooks] = useState([]);
  const [classAggregates, setClassAggregates] = useState(null);
  const [classAggLoading, setClassAggLoading] = useState(false);
  const [activeTeacherTab, setActiveTeacherTab] = useState("overview");

  // ── Name editing state ─────────────────────────────────
  const [displayName, setDisplayName] = useState(currUser?.name ?? "");
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // ── Avatar state ───────────────────────────────────────
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    currUser?.customAvatarUrl ?? null,
  );
  const [selectedCharacter, setSelectedCharacter] = useState(
    currUser?.character ?? "pink",
  );
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageSourceModalVisible, setImageSourceModalVisible] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchClassAggregates = async (uid) => {
    try {
      setClassAggLoading(true);
      const db = getFirestore();

      const classesSnap = await getDocs(
        query(collection(db, "classes"), where("teacherID", "==", uid)),
      );
      if (classesSnap.empty) return;

      let allStudentIds = [];
      classesSnap.docs.forEach((d) => {
        const students = d.data().students ?? [];
        allStudentIds = [...allStudentIds, ...students];
      });
      const uniqueStudentIds = [...new Set(allStudentIds)];
      if (uniqueStudentIds.length === 0) return;

      const bookDifficultyCache = {};
      const sessionsByStudent = {};
      const progressByStudent = {};

      await Promise.all(
        uniqueStudentIds.map(async (sid) => {
          const [sessSnap, progSnap, userSnap] = await Promise.all([
            getDocs(
              query(
                collection(db, "readingSessions"),
                where("userId", "==", sid),
              ),
            ),
            getDocs(
              query(collection(db, "userProgress"), where("userId", "==", sid)),
            ),
            getDoc(doc(db, "users", sid)),
          ]);
          sessionsByStudent[sid] = sessSnap.docs.map((d) => d.data());
          progressByStudent[sid] = progSnap.docs.map((d) => d.data());
          progressByStudent[sid]._userData = userSnap.exists()
            ? userSnap.data()
            : {};
        }),
      );

      const allBookIds = new Set();
      for (const sid of uniqueStudentIds) {
        const progress = progressByStudent[sid] ?? [];
        progress.forEach((p) => {
          if (p.bookId) allBookIds.add(p.bookId);
        });
      }

      await Promise.all(
        [...allBookIds].map(async (bookId) => {
          if (bookDifficultyCache[bookId] !== undefined) return;
          try {
            const snap = await getDoc(doc(db, "books", bookId));
            bookDifficultyCache[bookId] = snap.exists() ? snap.data() : null;
          } catch {
            bookDifficultyCache[bookId] = null;
          }
        }),
      );

      const levelCounts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
      let totalBooksCompleted = 0;
      const bookReadCounts = {};
      const atRiskStudents = [];
      let studentsWithData = 0;

      for (const sid of uniqueStudentIds) {
        const sessions = sessionsByStudent[sid] ?? [];
        const progress = progressByStudent[sid] ?? [];
        const userData = progress._userData ?? {};

        const completedBookObjs = progress
          .filter((p) => p.completed && p.bookId)
          .map((p) => bookDifficultyCache[p.bookId])
          .filter(Boolean);

        const level = getReadingLevelFromBooks(completedBookObjs);
        levelCounts[level] = (levelCounts[level] ?? 0) + 1;

        const booksCompleted = progress.filter((p) => p.completed).length;
        totalBooksCompleted += booksCompleted;
        studentsWithData++;

        progress
          .filter((p) => p.completed && p.bookId)
          .forEach((p) => {
            bookReadCounts[p.bookId] = (bookReadCounts[p.bookId] ?? 0) + 1;
          });

        const lastActive = getLastActive(sessions);
        const days = lastActive ? daysSince(lastActive) : 999;
        if (days >= 7) {
          atRiskStudents.push({
            id: sid,
            name: userData.name ?? "Unknown",
            daysSince: days,
          });
        }
      }

      const bookEntries = Object.entries(bookReadCounts);
      let mostReadBook = null;
      let leastReadBook = null;

      if (bookEntries.length > 0) {
        bookEntries.sort((a, b) => b[1] - a[1]);
        const [mostId, mostCount] = bookEntries[0];
        const [leastId, leastCount] = bookEntries[bookEntries.length - 1];

        mostReadBook = {
          title: bookDifficultyCache[mostId]?.title ?? mostId,
          count: mostCount,
        };
        leastReadBook = {
          title: bookDifficultyCache[leastId]?.title ?? leastId,
          count: leastCount,
        };
      }

      setClassAggregates({
        levelDistribution: levelCounts,
        avgBooksCompleted:
          studentsWithData > 0
            ? (totalBooksCompleted / studentsWithData).toFixed(1)
            : "0",
        mostReadBook,
        leastReadBook,
        atRiskStudents: atRiskStudents.sort(
          (a, b) => b.daysSince - a.daysSince,
        ),
        totalStudents: uniqueStudentIds.length,
      });
    } catch (err) {
      console.log("Class aggregate error:", err);
    } finally {
      setClassAggLoading(false);
    }
  };

  // ── STUDENT: fast single-doc fetch from userStats ──────
  const fetchStudentStats = async (uid) => {
    const db = getFirestore();

    // Fetch userStats + user doc in parallel (need user doc for avatar/stickers)
    const [statsSnap, userSnap, classSnap] = await Promise.all([
      getDoc(doc(db, "userStats", uid)),
      getDoc(doc(db, "users", uid)),
      // We need classEnrolled from user doc first — do it after
      Promise.resolve(null),
    ]);

    const userData = userSnap.exists() ? userSnap.data() : {};

    // Sync avatar state
    if (userData?.customAvatarUrl !== undefined) {
      setCustomAvatarUrl(userData.customAvatarUrl ?? null);
    }
    if (userData?.character) {
      setSelectedCharacter(userData.character);
    }

    // Fetch enrolled class if present
    const classIdFromUser = userData?.classEnrolled ?? null;
    if (classIdFromUser) {
      const enrolledClassSnap = await getDoc(
        doc(db, "classes", classIdFromUser),
      );
      if (enrolledClassSnap.exists()) {
        const classData = enrolledClassSnap.data();
        setEnrolledClass({
          id: enrolledClassSnap.id,
          code: classData.code || enrolledClassSnap.id,
          teacherName: classData.teacherName || "Unknown Teacher",
          teacherId: classData.teacherId,
        });
      }
    }

    if (!statsSnap.exists()) {
      // userStats doc not yet created (user hasn't read anything)
      // Fall back to showing zeroes — backfill will handle existing data
      setStats({
        booksRead: 0,
        readingLevel: "Beginner",
        stickersUnlocked: userData?.ownedStickers?.length ?? 0,
        readingTime: "0 mins",
        streak: 0,
        mostActiveDay: "—",
        lastActiveDate: null,
        daysSinceLastSession: null,
        avgSessionDuration: "0 mins",
        sessionsStarted: 0,
        sessionsCompleted: 0,
        engagementRate: 0,
        abandonedCount: 0,
      });
      setCompletedBooks([]);
      setAbandonedBooks([]);
      return;
    }

    const s = statsSnap.data();

    // lastActiveDate comes back as a Firestore Timestamp
    const lastActiveDate = s.lastActiveDate?.toDate
      ? s.lastActiveDate.toDate()
      : s.lastActiveDate
        ? new Date(s.lastActiveDate)
        : null;

    const daysSinceLastSession = lastActiveDate
      ? daysSince(lastActiveDate)
      : null;

    setCompletedBooks(s.completedBooks ?? []);
    setAbandonedBooks(s.abandonedBooks ?? []);

    setStats({
      booksRead: s.booksCompleted ?? 0,
      readingLevel: getReadingLevel(s.completedBooks ?? []),
      stickersUnlocked: userData?.ownedStickers?.length ?? 0,
      readingTime: formatTime(s.totalTimeSeconds ?? 0),
      streak: s.streak ?? 0,
      mostActiveDay: s.mostActiveDay ?? "—",
      lastActiveDate,
      daysSinceLastSession,
      avgSessionDuration: formatDuration(s.avgSessionDurationSecs ?? 0),
      sessionsStarted: s.sessionsStarted ?? 0,
      sessionsCompleted: s.sessionsCompleted ?? 0,
      engagementRate:
        (s.sessionsStarted ?? 0) > 0
          ? Math.round(((s.sessionsCompleted ?? 0) / s.sessionsStarted) * 100)
          : 0,
      abandonedCount: (s.abandonedBookIds ?? []).length,
    });
  };

  // ── TEACHER: original multi-query approach (unchanged) ─
  const fetchTeacherStats = async (uid) => {
    const db = getFirestore();

    const [userSnap, teacherResults] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      Promise.all([
        getDocs(
          query(collection(db, "classes"), where("teacherID", "==", uid)),
        ),
        getDocs(
          query(
            collection(db, "books"),
            where("source", "==", "Teacher"),
            where("uploadedById", "==", uid),
          ),
        ),
      ]),
    ]);

    const userData = userSnap.exists() ? userSnap.data() : {};

    if (userData?.customAvatarUrl !== undefined) {
      setCustomAvatarUrl(userData.customAvatarUrl ?? null);
    }
    if (userData?.character) {
      setSelectedCharacter(userData.character);
    }

    const [classesSnap, booksSnap] = teacherResults;
    const managedClassCount = classesSnap.size;
    let totalStudents = 0;
    classesSnap.docs.forEach((d) => {
      totalStudents += d.data().students?.length ?? 0;
    });
    const booksUploaded = booksSnap.size;
    setUploadedBooks(booksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    setStats({
      managedClassCount,
      totalStudents,
      booksUploaded,
    });

    // Kick off class aggregates separately (heavy query)
    fetchClassAggregates(uid);
  };

  // ── Router: pick the right fetch based on role ─────────
  const fetchStats = async () => {
    try {
      const uid = currUser?.uid ?? currUser?.id;
      if (!uid) return;

      if (isTeacher) {
        await fetchTeacherStats(uid);
      } else {
        await fetchStudentStats(uid);
      }
    } catch (error) {
      console.log("Error fetching profile stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Upload avatar to Cloudinary ────────────────────────
  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: `avatar_${Date.now()}.jpg`,
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    const data = await response.json();
    if (!data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
  };

  const pickFromGallery = async () => {
    setImageSourceModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        type: "warning",
        title: "Permission Needed",
        message: "Please allow access to your photos.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) await handleUploadAvatar(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    setImageSourceModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert({
        type: "warning",
        title: "Permission Needed",
        message: "Please allow access to your camera.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) await handleUploadAvatar(result.assets[0].uri);
  };

  const handleUploadAvatar = async (uri) => {
    setAvatarModalVisible(false);
    try {
      setUploadingAvatar(true);
      const url = await uploadToCloudinary(uri);
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), {
        customAvatarUrl: url,
        character: "custom",
      });
      setCustomAvatarUrl(url);
      showAlert({
        type: "success",
        title: "Success!",
        message: "Your avatar has been updated.",
      });
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSelectBuiltinAvatar = async (key) => {
    try {
      setUploadingAvatar(true);
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), {
        character: key,
        customAvatarUrl: null,
      });
      setSelectedCharacter(key);
      setCustomAvatarUrl(null);
      setAvatarModalVisible(false);
      showAlert({
        type: "success",
        title: "Avatar Updated!",
        message: `You selected the ${key} character.`,
      });
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to update avatar. Please try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const currentAvatarSource = customAvatarUrl
    ? { uri: customAvatarUrl }
    : (characterImages?.[selectedCharacter] ?? characterImages?.pink);

  const handleUnenroll = () => {
    if (!enrolledClass) return;
    showAlert({
      type: "confirm",
      title: "Leave Class",
      message: "Are you sure you want to leave the class?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setUnenrolling(true);
              const db = getFirestore();
              const uid = auth.currentUser?.uid;
              if (!uid) return;
              await updateDoc(doc(db, "classes", enrolledClass.id), {
                students: arrayRemove(uid),
              });
              await updateDoc(doc(db, "users", uid), { classEnrolled: null });
              setEnrolledClass(null);
              showAlert({
                type: "success",
                title: "Success",
                message: "You have successfully left the class.",
              });
            } catch (err) {
              showAlert({
                type: "error",
                title: "Error",
                message: "Failed to leave the class. Please try again.",
              });
            } finally {
              setUnenrolling(false);
            }
          },
        },
      ],
    });
  };

  const handleRemoveStudent = () => {
    showAlert({
      type: "confirm",
      title: "Remove Student",
      message: `Remove ${currUser?.name ?? "this student"} from the class?`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemoving(true);
              const db = getFirestore();
              const studentId = currUser?.id;
              if (!studentId || !classId) return;
              await updateDoc(doc(db, "classes", classId), {
                students: arrayRemove(studentId),
              });
              await updateDoc(doc(db, "users", studentId), {
                classEnrolled: null,
              });
              showAlert({
                type: "success",
                title: "Removed",
                message: `${currUser?.name ?? "Student"} has been removed from the class.`,
                buttons: [
                  {
                    text: "OK",
                    style: "default",
                    onPress: () => navigation.goBack(),
                  },
                ],
              });
            } catch (err) {
              showAlert({
                type: "error",
                title: "Error",
                message: "Failed to remove student. Please try again.",
              });
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    });
  };

  // ── Save edited name ───────────────────────────────────
  const handleSaveName = async () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showAlert({
        type: "warning",
        title: "Invalid Name",
        message: "Name cannot be empty.",
      });
      return;
    }
    if (trimmed === displayName) {
      setNameModalVisible(false);
      return;
    }
    try {
      setSavingName(true);
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), { name: trimmed });
      setDisplayName(trimmed);
      setNameModalVisible(false);
      showAlert({
        type: "success",
        title: "Name Updated!",
        message: "Your name has been changed.",
      });
    } catch (e) {
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to update name. Please try again.",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = () => {
    showAlert({
      type: "confirm",
      title: "Log Out",
      message: "Are you sure you want to log out?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              await signOut(auth);
              navigation.reset({ index: 0, routes: [{ name: "StartUp" }] });
            } catch (error) {
              showAlert({
                type: "error",
                title: "Error",
                message: "Failed to log out. Please try again.",
              });
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    });
  };

  const s = getStyles(scale, verticalScale);

  // ── Teacher tab content ────────────────────────────────
  const renderTeacherOverview = () => (
    <>
      <View style={s.quickStatsRow}>
        <QuickStatCard
          icon="book-outline"
          iconColor="#60B5FF"
          value={String(stats?.booksUploaded ?? 0)}
          label="Books Uploaded"
          s={s}
        />
        <QuickStatCard
          icon="people-outline"
          iconColor="#FF9149"
          value={String(stats?.totalStudents ?? 0)}
          label="Students"
          s={s}
        />
      </View>

      <View style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Ionicons name="stats-chart" size={scale(16)} color="#FF9149" />
          <Text style={s.sectionTitle}>Class Overview</Text>
        </View>
        {classAggLoading ? (
          <ActivityIndicator
            color="#FF9149"
            style={{ marginVertical: verticalScale(16) }}
          />
        ) : classAggregates ? (
          <>
            <StatRow
              label="Avg Books Completed"
              value={classAggregates.avgBooksCompleted}
              s={s}
            />
            <StatRow
              label="Most Read Book"
              value={
                classAggregates.mostReadBook
                  ? `${classAggregates.mostReadBook.title} (${classAggregates.mostReadBook.count}x)`
                  : "—"
              }
              s={s}
            />
            <StatRow
              label="Least Read Book"
              value={
                classAggregates.leastReadBook
                  ? `${classAggregates.leastReadBook.title} (${classAggregates.leastReadBook.count}x)`
                  : "—"
              }
              s={s}
              last
            />
          </>
        ) : (
          <Text style={s.noBooks}>No class data available.</Text>
        )}
      </View>

      <View style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Ionicons name="bar-chart-outline" size={scale(16)} color="#FF9149" />
          <Text style={s.sectionTitle}>Reading Level Distribution</Text>
        </View>
        {classAggLoading ? (
          <ActivityIndicator
            color="#FF9149"
            style={{ marginVertical: verticalScale(16) }}
          />
        ) : classAggregates ? (
          <LevelDistributionBar
            distribution={classAggregates.levelDistribution}
            total={classAggregates.totalStudents}
            s={s}
            scale={scale}
            verticalScale={verticalScale}
          />
        ) : (
          <Text style={s.noBooks}>No data available.</Text>
        )}
      </View>

      <View style={s.sectionCard}>
        <View style={s.sectionHeader}>
          <Ionicons name="library-outline" size={scale(16)} color="#FF9149" />
          <Text style={s.sectionTitle}>Uploaded Books</Text>
        </View>
        {loading ? (
          <ActivityIndicator
            color="#FF9149"
            style={{ marginVertical: verticalScale(16) }}
          />
        ) : uploadedBooks.length === 0 ? (
          <Text style={s.noBooks}>No books uploaded yet. 📚</Text>
        ) : (
          uploadedBooks.map((book, i) => (
            <View
              key={book.id}
              style={[
                s.bookRow,
                i === uploadedBooks.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={s.bookRowLeft}>
                <Ionicons
                  name="book-outline"
                  size={scale(16)}
                  color="#60B5FF"
                  style={{ marginRight: scale(10) }}
                />
                <Text style={s.bookRowTitle} numberOfLines={2}>
                  {book.title}
                </Text>
              </View>
              <View
                style={[
                  s.difficultyBadge,
                  {
                    backgroundColor: getDifficultyColor(book.difficulty) + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    s.difficultyBadgeText,
                    { color: getDifficultyColor(book.difficulty) },
                  ]}
                >
                  {book.difficulty}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderAtRisk = () => (
    <View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <Ionicons name="warning-outline" size={scale(16)} color="#E53935" />
        <Text style={[s.sectionTitle, { color: "#E53935" }]}>
          At-Risk Students
        </Text>
      </View>
      <Text style={s.atRiskSubtitle}>Students inactive for 7+ days</Text>
      {classAggLoading ? (
        <ActivityIndicator
          color="#FF9149"
          style={{ marginVertical: verticalScale(16) }}
        />
      ) : !classAggregates || classAggregates.atRiskStudents.length === 0 ? (
        <View style={s.allGoodBanner}>
          <Ionicons name="checkmark-circle" size={scale(28)} color="#4CAF50" />
          <Text style={s.allGoodText}>All students are active! 🎉</Text>
        </View>
      ) : (
        classAggregates.atRiskStudents.map((student, i) => (
          <View
            key={student.id}
            style={[
              s.atRiskRow,
              i === classAggregates.atRiskStudents.length - 1 && {
                borderBottomWidth: 0,
              },
            ]}
          >
            <View style={s.atRiskLeft}>
              <View style={s.atRiskAvatar}>
                <Text style={s.atRiskAvatarText}>
                  {(student.name?.[0] ?? "?").toUpperCase()}
                </Text>
              </View>
              <Text style={s.atRiskName}>{student.name}</Text>
            </View>
            <View
              style={[
                s.atRiskBadge,
                student.daysSince >= 14 && s.atRiskBadgeSevere,
              ]}
            >
              <Text style={s.atRiskBadgeText}>
                {student.daysSince === 999
                  ? "Never"
                  : `${student.daysSince}d ago`}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <Ellalert config={alertConfig} onClose={closeAlert} />

      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isOwnProfile
            ? "My Profile"
            : `${currUser?.name ?? "Student"}'s Profile`}
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarContainer}>
          <View style={s.avatarRing}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#FF9149" size="large" />
            ) : (
              <Image
                source={currentAvatarSource}
                style={s.avatar}
                contentFit="cover"
              />
            )}
          </View>
          {isOwnProfile && (
            <TouchableOpacity
              style={s.changeAvatarBtn}
              onPress={() => setAvatarModalVisible(true)}
              disabled={uploadingAvatar}
            >
              <Ionicons name="camera" size={scale(14)} color="#fff" />
              <Text style={s.changeAvatarText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.nameRow}>
          <Text style={s.name}>{displayName}</Text>
          {isOwnProfile && (
            <TouchableOpacity
              style={s.editNameBtn}
              onPress={() => {
                setEditingName(displayName);
                setNameModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={scale(14)} color="#60B5FF" />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{currUser?.role}</Text>
        </View>

        {/* ── TEACHER VIEW ── */}
        {isTeacher ? (
          <>
            <View style={s.tabBar}>
              {["overview", "at-risk"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    s.tabItem,
                    activeTeacherTab === tab && s.tabItemActive,
                  ]}
                  onPress={() => setActiveTeacherTab(tab)}
                >
                  <Text
                    style={[
                      s.tabLabel,
                      activeTeacherTab === tab && s.tabLabelActive,
                    ]}
                  >
                    {tab === "overview" ? "Overview" : "At-Risk"}
                    {tab === "at-risk" &&
                      classAggregates?.atRiskStudents?.length > 0 && (
                        <Text style={s.tabBadge}>
                          {" "}
                          {classAggregates.atRiskStudents.length}
                        </Text>
                      )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator
                color="#FF9149"
                style={{ marginTop: verticalScale(40) }}
              />
            ) : activeTeacherTab === "overview" ? (
              renderTeacherOverview()
            ) : (
              renderAtRisk()
            )}
          </>
        ) : (
          /* ── STUDENT VIEW ── */
          <>
            <View style={s.classCard}>
              {loading ? (
                <View style={s.classRow}>
                  <Text style={s.classLabel}>Enrolled Class: </Text>
                  <ActivityIndicator
                    color="#FF9149"
                    size="small"
                    style={{ marginLeft: scale(5) }}
                  />
                </View>
              ) : enrolledClass ? (
                <>
                  <View style={s.classRow}>
                    <Text style={s.classLabel}>Enrolled Class: </Text>
                    <Text style={s.classValue}>
                      {`Ms./Mr. ${enrolledClass.teacherName} (${enrolledClass.code})`}
                    </Text>
                  </View>
                  {isOwnProfile && (
                    <TouchableOpacity
                      style={[s.removeButton, unenrolling && { opacity: 0.6 }]}
                      onPress={handleUnenroll}
                      disabled={unenrolling}
                    >
                      {unenrolling ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.removeButtonText}>Leave Class</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {isTeacherViewing && (
                    <TouchableOpacity
                      style={[s.removeButton, removing && { opacity: 0.6 }]}
                      onPress={handleRemoveStudent}
                      disabled={removing}
                    >
                      {removing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.removeButtonText}>
                          Remove from Class
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={s.classRow}>
                  <Text style={s.classLabel}>Enrolled Class: </Text>
                  <Text style={s.classValueMuted}>Not enrolled</Text>
                </View>
              )}
            </View>

            <View style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons
                  name="book-outline"
                  size={scale(16)}
                  color="#FF9149"
                />
                <Text style={s.sectionTitle}>Reading Statistics</Text>
              </View>
              {loading ? (
                <ActivityIndicator
                  color="#FF9149"
                  style={{ marginVertical: verticalScale(20) }}
                />
              ) : (
                <>
                  <StatRow
                    label="Books Read"
                    value={String(stats?.booksRead ?? 0)}
                    s={s}
                  />
                  <StatRow
                    label="Reading Level"
                    value={stats?.readingLevel ?? "Beginner"}
                    s={s}
                  />
                  <StatRow
                    label="Total Reading Time"
                    value={stats?.readingTime ?? "0 mins"}
                    s={s}
                  />
                  <StatRow
                    label="Stickers Unlocked"
                    value={String(stats?.stickersUnlocked ?? 0)}
                    s={s}
                    last
                  />
                </>
              )}
            </View>

            {isTeacherViewing && (
              <View style={s.sectionCard}>
                <View style={s.sectionHeader}>
                  <Ionicons
                    name="pulse-outline"
                    size={scale(16)}
                    color="#FF9149"
                  />
                  <Text style={s.sectionTitle}>Reading Behavior</Text>
                </View>
                {loading ? (
                  <ActivityIndicator
                    color="#FF9149"
                    style={{ marginVertical: verticalScale(20) }}
                  />
                ) : (
                  <>
                    <StatRow
                      label="Reading Streak"
                      value={`🔥 ${stats?.streak ?? 0} day${stats?.streak !== 1 ? "s" : ""}`}
                      s={s}
                    />
                    <StatRow
                      label="Most Active Day"
                      value={stats?.mostActiveDay ?? "—"}
                      s={s}
                    />
                    <StatRow
                      label="Avg Session Duration"
                      value={stats?.avgSessionDuration ?? "—"}
                      s={s}
                    />
                    <StatRow
                      label="Engagement Rate"
                      value={`${stats?.engagementRate ?? 0}% (${stats?.sessionsCompleted ?? 0}/${stats?.sessionsStarted ?? 0})`}
                      s={s}
                    />
                    <StatRow
                      label="Last Active"
                      value={
                        stats?.daysSinceLastSession === null
                          ? "Never"
                          : stats?.daysSinceLastSession === 0
                            ? "Today"
                            : `${stats?.daysSinceLastSession}d ago`
                      }
                      s={s}
                      last
                    />
                  </>
                )}
              </View>
            )}

            <View style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={scale(16)}
                  color="#4CAF50"
                />
                <Text style={[s.sectionTitle, { color: "#4CAF50" }]}>
                  Completed Books
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator
                  color="#FF9149"
                  style={{ marginVertical: verticalScale(16) }}
                />
              ) : completedBooks.length === 0 ? (
                <Text style={s.noBooks}>
                  No books completed yet. Keep reading! 📖
                </Text>
              ) : (
                completedBooks.map((book, i) => (
                  <View
                    key={book.id}
                    style={[
                      s.bookRow,
                      i === completedBooks.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={s.bookRowLeft}>
                      <Ionicons
                        name="checkmark-circle"
                        size={scale(16)}
                        color="#4CAF50"
                        style={{ marginRight: scale(10) }}
                      />
                      <Text style={s.bookRowTitle} numberOfLines={2}>
                        {book.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.difficultyBadge,
                        {
                          backgroundColor:
                            getDifficultyColor(book.difficulty) + "22",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.difficultyBadgeText,
                          { color: getDifficultyColor(book.difficulty) },
                        ]}
                      >
                        {book.difficulty}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {abandonedBooks.length > 0 && (
              <View style={s.sectionCard}>
                <View style={s.sectionHeader}>
                  <Ionicons
                    name="bookmark-outline"
                    size={scale(16)}
                    color="#FF9149"
                  />
                  <Text style={s.sectionTitle}>Still Reading</Text>
                </View>
                {abandonedBooks.map((book, i) => (
                  <View
                    key={book.id}
                    style={[
                      s.bookRow,
                      i === abandonedBooks.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={s.bookRowLeft}>
                      <Ionicons
                        name="time-outline"
                        size={scale(16)}
                        color="#FF9149"
                        style={{ marginRight: scale(10) }}
                      />
                      <Text style={s.bookRowTitle} numberOfLines={2}>
                        {book.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.difficultyBadge,
                        {
                          backgroundColor:
                            getDifficultyColor(book.difficulty) + "22",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.difficultyBadgeText,
                          { color: getDifficultyColor(book.difficulty) },
                        ]}
                      >
                        {book.difficulty}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {isOwnProfile && (
        <View
          style={[
            s.footer,
            { paddingBottom: insets.bottom + verticalScale(10) },
          ]}
        >
          <TouchableOpacity
            style={[s.logoutButton, loggingOut && { opacity: 0.6 }]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={scale(20)}
                  color="#fff"
                  style={{ marginRight: scale(8) }}
                />
                <Text style={s.logoutText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Name Edit Modal ── */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <View style={s.nameModalContainer}>
            <Text style={s.avatarModalTitle}>Edit Name</Text>
            <TextInput
              style={s.nameInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Enter your name"
              placeholderTextColor="#bbb"
              maxLength={40}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <View style={s.nameModalButtons}>
              <TouchableOpacity
                style={s.nameModalCancel}
                onPress={() => setNameModalVisible(false)}
                disabled={savingName}
              >
                <Text style={s.avatarModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nameModalSave, savingName && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.nameModalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.avatarModalContainer}>
            <Text style={s.avatarModalTitle}>Change Avatar</Text>
            <TouchableOpacity
              style={s.uploadPhotoBtn}
              onPress={() => {
                setAvatarModalVisible(false);
                setImageSourceModalVisible(true);
              }}
            >
              <Ionicons
                name="camera-outline"
                size={scale(22)}
                color="#fff"
                style={{ marginRight: scale(8) }}
              />
              <Text style={s.uploadPhotoBtnText}>Upload Your Photo</Text>
            </TouchableOpacity>
            <Text style={s.avatarOrText}>— or choose a character —</Text>
            <View style={s.builtinAvatarRow}>
              {BUILTIN_AVATARS.map((av) => {
                const isSelected =
                  !customAvatarUrl && selectedCharacter === av.key;
                return (
                  <TouchableOpacity
                    key={av.key}
                    style={[
                      s.builtinAvatarOption,
                      isSelected && s.builtinAvatarOptionSelected,
                    ]}
                    onPress={() => handleSelectBuiltinAvatar(av.key)}
                  >
                    <Image
                      source={av.source}
                      style={s.builtinAvatarImage}
                      contentFit="contain"
                    />
                    <Text style={s.builtinAvatarLabel}>{av.label}</Text>
                    {isSelected && (
                      <View style={s.builtinAvatarCheck}>
                        <Ionicons
                          name="checkmark-circle"
                          size={scale(16)}
                          color="#FF9149"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={s.avatarModalCancel}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={s.avatarModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Source Modal */}
      <Modal
        visible={imageSourceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageSourceModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageSourceModalVisible(false)}
        >
          <View style={s.imageSourceContainer}>
            <Text style={s.avatarModalTitle}>Upload From</Text>
            <TouchableOpacity
              style={s.imageSourceOption}
              onPress={pickFromGallery}
            >
              <Ionicons
                name="images-outline"
                size={scale(24)}
                color="#FF9149"
              />
              <Text style={s.imageSourceOptionText}>Photo Gallery</Text>
            </TouchableOpacity>
            <View style={s.imageSourceDivider} />
            <TouchableOpacity
              style={s.imageSourceOption}
              onPress={pickFromCamera}
            >
              <Ionicons
                name="camera-outline"
                size={scale(24)}
                color="#FF9149"
              />
              <Text style={s.imageSourceOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.avatarModalCancel}
              onPress={() => setImageSourceModalVisible(false)}
            >
              <Text style={s.avatarModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Helper components ─────────────────────────────────────

function StatRow({ label, value, s, last = false }) {
  return (
    <View style={[s.statRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function QuickStatCard({ icon, iconColor, value, label, s }) {
  return (
    <View style={s.quickStatCard}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={s.quickStatValue}>{value}</Text>
      <Text style={s.quickStatLabel}>{label}</Text>
    </View>
  );
}

function LevelDistributionBar({
  distribution,
  total,
  s,
  scale,
  verticalScale,
}) {
  const levels = [
    { key: "Beginner", color: "#60B5FF" },
    { key: "Intermediate", color: "#FF9149" },
    { key: "Advanced", color: "#4CAF50" },
  ];
  return (
    <View>
      {levels.map((lv) => {
        const count = distribution[lv.key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <View key={lv.key} style={{ marginBottom: verticalScale(10) }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={s.statLabel}>{lv.key}</Text>
              <Text style={s.statValue}>
                {count} student{count !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { width: `${pct}%`, backgroundColor: lv.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function getDifficultyColor(difficulty) {
  if (difficulty === "Easy") return "#4CAF50";
  if (difficulty === "Hard") return "#E53935";
  return "#FF9149";
}

// ── Styles ────────────────────────────────────────────────
const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f4f6fb" },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(18),
    },
    backButton: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(20),
      color: "#fff",
      textAlign: "center",
      flex: 1,
    },

    scrollContent: {
      alignItems: "center",
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(20),
      paddingBottom: verticalScale(24),
    },

    avatarContainer: { alignItems: "center", marginBottom: verticalScale(10) },
    avatarRing: {
      width: scale(100),
      height: scale(100),
      borderRadius: scale(50),
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "#60B5FF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
      overflow: "hidden",
    },
    avatar: { width: scale(84), height: scale(84), borderRadius: scale(42) },
    changeAvatarBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FF9149",
      borderRadius: scale(20),
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(12),
      marginTop: verticalScale(8),
      gap: scale(4),
    },
    changeAvatarText: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#fff",
      fontWeight: "bold",
    },

    name: {
      fontFamily: "Poppins",
      fontSize: scale(20),
      fontWeight: "bold",
      color: "#1a1a2e",
      textAlign: "center",
      marginBottom: verticalScale(4),
    },
    rolePill: {
      backgroundColor: "#60B5FF22",
      borderRadius: scale(20),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(3),
      marginBottom: verticalScale(16),
    },
    rolePillText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#60B5FF",
      fontWeight: "bold",
    },

    tabBar: {
      flexDirection: "row",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(4),
      marginBottom: verticalScale(14),
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    tabItem: {
      flex: 1,
      paddingVertical: verticalScale(8),
      alignItems: "center",
      borderRadius: scale(10),
    },
    tabItemActive: { backgroundColor: "#FF9149" },
    tabLabel: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#aaa",
      fontWeight: "bold",
    },
    tabLabelActive: { color: "#fff" },
    tabBadge: { color: "#fff", fontWeight: "bold" },

    quickStatsRow: {
      flexDirection: "row",
      gap: scale(10),
      width: "100%",
      marginBottom: verticalScale(12),
    },
    quickStatCard: {
      flex: 1,
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(14),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
      gap: verticalScale(4),
    },
    quickStatValue: {
      fontFamily: "Poppins",
      fontSize: scale(22),
      fontWeight: "bold",
      color: "#1a1a2e",
    },
    quickStatLabel: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      color: "#aaa",
      textAlign: "center",
    },

    sectionCard: {
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(16),
      marginBottom: verticalScale(12),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
      marginBottom: verticalScale(12),
    },
    sectionTitle: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      fontWeight: "bold",
      color: "#FF9149",
    },

    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: verticalScale(9),
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    statLabel: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      fontWeight: "bold",
      color: "#333",
      flex: 1,
    },
    statValue: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#555",
      marginLeft: scale(8),
      textAlign: "right",
    },

    noBooks: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#aaa",
      textAlign: "center",
      paddingVertical: verticalScale(12),
    },
    bookRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: verticalScale(9),
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    bookRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    bookRowTitle: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#333",
      flex: 1,
    },
    difficultyBadge: {
      borderRadius: scale(8),
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(2),
      marginLeft: scale(8),
    },
    difficultyBadgeText: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      fontWeight: "bold",
    },

    atRiskSubtitle: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#aaa",
      marginBottom: verticalScale(10),
    },
    atRiskRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    atRiskLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    atRiskAvatar: {
      width: scale(32),
      height: scale(32),
      borderRadius: scale(16),
      backgroundColor: "#FF914922",
      alignItems: "center",
      justifyContent: "center",
      marginRight: scale(10),
    },
    atRiskAvatarText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      fontWeight: "bold",
      color: "#FF9149",
    },
    atRiskName: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#1a1a2e",
      flex: 1,
    },
    atRiskBadge: {
      backgroundColor: "#FF914922",
      borderRadius: scale(10),
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(3),
    },
    atRiskBadgeSevere: { backgroundColor: "#E5393522" },
    atRiskBadgeText: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      fontWeight: "bold",
      color: "#E53935",
    },
    allGoodBanner: {
      alignItems: "center",
      paddingVertical: verticalScale(20),
      gap: verticalScale(8),
    },
    allGoodText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#4CAF50",
      fontWeight: "bold",
    },

    barTrack: {
      height: verticalScale(8),
      backgroundColor: "#f0f0f0",
      borderRadius: scale(4),
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: scale(4) },

    classCard: {
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(16),
      marginBottom: verticalScale(12),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    classRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    classLabel: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#333",
      lineHeight: 22,
    },
    classValue: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#333",
      lineHeight: 22,
      fontWeight: "bold",
    },
    classValueMuted: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#aaa",
    },
    removeButton: {
      marginTop: verticalScale(10),
      backgroundColor: "#E53935",
      paddingVertical: verticalScale(6),
      paddingHorizontal: scale(28),
      borderRadius: scale(20),
    },
    removeButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#fff",
      fontWeight: "bold",
    },

    footer: {
      paddingHorizontal: scale(40),
      paddingTop: verticalScale(12),
      backgroundColor: "#f4f6fb",
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FF9149",
      borderRadius: scale(25),
      paddingVertical: verticalScale(14),
      borderWidth: 1.5,
      borderColor: "#e07030",
    },
    logoutText: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      fontWeight: "bold",
      color: "#fff",
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: scale(8),
      marginBottom: verticalScale(4),
    },
    editNameBtn: {
      width: scale(26),
      height: scale(26),
      borderRadius: scale(13),
      backgroundColor: "#60B5FF22",
      alignItems: "center",
      justifyContent: "center",
    },

    nameModalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(20),
      padding: scale(24),
      width: "88%",
      alignItems: "center",
      elevation: 10,
    },
    nameInput: {
      width: "100%",
      borderWidth: 1.5,
      borderColor: "#60B5FF",
      borderRadius: scale(12),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#1a1a2e",
      marginBottom: verticalScale(18),
      backgroundColor: "#f8fbff",
    },
    nameModalButtons: {
      flexDirection: "row",
      gap: scale(10),
      width: "100%",
    },
    nameModalCancel: {
      flex: 1,
      paddingVertical: verticalScale(11),
      borderRadius: scale(12),
      backgroundColor: "#f2f2f2",
      alignItems: "center",
    },
    nameModalSave: {
      flex: 1,
      paddingVertical: verticalScale(11),
      borderRadius: scale(12),
      backgroundColor: "#FF9149",
      alignItems: "center",
    },
    nameModalSaveText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      fontWeight: "bold",
      color: "#fff",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarModalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(24),
      padding: scale(24),
      width: "88%",
      alignItems: "center",
      elevation: 10,
    },
    avatarModalTitle: {
      fontFamily: "Mochi",
      fontSize: scale(20),
      color: "#FF9149",
      marginBottom: verticalScale(16),
    },
    uploadPhotoBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#60B5FF",
      borderRadius: scale(25),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(24),
      width: "100%",
      marginBottom: verticalScale(16),
    },
    uploadPhotoBtnText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(14),
      color: "#fff",
    },
    avatarOrText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#aaa",
      marginBottom: verticalScale(14),
    },
    builtinAvatarRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: scale(12),
      marginBottom: verticalScale(20),
    },
    builtinAvatarOption: {
      alignItems: "center",
      borderRadius: scale(16),
      borderWidth: 2,
      borderColor: "#eee",
      padding: scale(8),
      width: scale(72),
      position: "relative",
    },
    builtinAvatarOptionSelected: {
      borderColor: "#FF9149",
      backgroundColor: "#fff5ee",
    },
    builtinAvatarImage: { width: scale(48), height: scale(48) },
    builtinAvatarLabel: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      color: "#555",
      marginTop: verticalScale(4),
    },
    builtinAvatarCheck: {
      position: "absolute",
      top: scale(4),
      right: scale(4),
    },
    avatarModalCancel: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(32),
      borderRadius: scale(20),
      backgroundColor: "#f2f2f2",
    },
    avatarModalCancelText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#888",
    },
    imageSourceContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(16),
      padding: scale(24),
      width: "75%",
      alignItems: "center",
    },
    imageSourceOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: verticalScale(12),
      width: "100%",
      gap: scale(12),
    },
    imageSourceOptionText: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#1a1a2e",
    },
    imageSourceDivider: {
      height: 1,
      backgroundColor: "#f0f0f0",
      width: "100%",
    },
  });
