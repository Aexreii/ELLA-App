import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
} from "firebase/firestore";
import { useScale } from "../utils/scaling";

// Derives a reading level label from completed book difficulties
function getReadingLevel(sessions) {
  if (!sessions || sessions.length === 0) return "Beginner";
  const diffMap = { Easy: 1, Intermediate: 2, Hard: 3 };
  const completed = sessions.filter((s) => s.completed);
  if (completed.length === 0) return "Beginner";
  const avg =
    completed.reduce((sum, s) => sum + (diffMap[s.difficulty] ?? 1), 0) /
    completed.length;
  if (avg >= 2.5) return "Advanced";
  if (avg >= 1.5) return "Intermediate";
  return "Beginner";
}

// Formats total seconds into "Xh Ymins" or "Ymins"
function formatTime(seconds) {
  if (!seconds || seconds === 0) return "0 mins";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}hr${h > 1 ? "s" : ""} ${m}mins`;
  return `${m} min${m !== 1 ? "s" : ""}`;
}

export default function UserProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { currUser, characterImages } = route.params;
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState(null);
  const [enrolledClass, setEnrolledClass] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);

  const isTeacher = currUser?.role === "Teacher";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // ── Fetch book progress ────────────────────────────────
      const progressSnap = await getDocs(
        query(collection(db, "bookProgress"), where("userId", "==", uid)),
      );
      const progressDocs = progressSnap.docs.map((d) => d.data());

      const booksCompleted = progressDocs.filter((p) => p.completed).length;
      const totalTimeSeconds = progressDocs.reduce(
        (sum, p) => sum + (p.totalTimeSeconds ?? 0),
        0,
      );

      // ── Fetch reading sessions (for difficulty/level) ──────
      const sessionsSnap = await getDocs(
        query(collection(db, "readingSessions"), where("userId", "==", uid)),
      );
      const sessionDocs = sessionsSnap.docs.map((d) => d.data());

      // ── Fetch stickers from user doc ───────────────────────
      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.data();
      const stickersUnlocked = userData?.ownedStickers?.length ?? 0;

      // ── Fetch enrolled class name (students only) ──────────
      if (!isTeacher && currUser?.enrolledClasses?.length > 0) {
        const classId = currUser.enrolledClasses[0];
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (classSnap.exists()) {
          const classData = classSnap.data();
          // Fetch teacher name
          let teacherName = "Unknown";
          if (classData.teacherId) {
            const teacherSnap = await getDoc(
              doc(db, "users", classData.teacherId),
            );
            if (teacherSnap.exists()) teacherName = teacherSnap.data().name;
          }
          setEnrolledClass({
            id: classId,
            name: classData.name,
            code: classData.code,
            teacherName,
          });
        }
      }

      // ── Teacher: count managed classes ────────────────────
      let managedClassCount = 0;
      if (isTeacher) {
        const classesSnap = await getDocs(
          query(collection(db, "classes"), where("teacherId", "==", uid)),
        );
        managedClassCount = classesSnap.size;
      }

      setStats({
        booksRead: booksCompleted,
        readingLevel: getReadingLevel(sessionDocs),
        stickersUnlocked,
        readingTime: formatTime(totalTimeSeconds),
        managedClassCount,
      });
    } catch (error) {
      console.log("Error fetching profile stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
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
            console.log("Logout error:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Profile</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ── */}
        <View style={s.avatarContainer}>
          <View style={s.avatarRing}>
            <Image
              source={characterImages[currUser?.character]}
              style={s.avatar}
              contentFit="cover"
            />
          </View>
        </View>

        {/* ── Name & Role ── */}
        <Text style={s.name}>{currUser?.name}</Text>
        <Text style={s.role}>{currUser?.role}</Text>

        {/* ── Enrolled Class (students) / Classes Managed (teachers) ── */}
        <View style={s.classCard}>
          {isTeacher ? (
            <View style={s.classRow}>
              <Text style={s.classLabel}>Classes Managed: </Text>
              <Text style={s.classValue}>
                {loading ? "—" : (stats?.managedClassCount ?? 0)}
              </Text>
            </View>
          ) : enrolledClass ? (
            <>
              <View style={s.classRow}>
                <Text style={s.classLabel}>Enrolled Class: </Text>
                <Text style={s.classValue}>
                  {enrolledClass.teacherName} ({enrolledClass.code})
                </Text>
              </View>
              <TouchableOpacity
                style={s.changeButton}
                onPress={() => {
                  /* TODO: open enroll modal to change class */
                }}
              >
                <Text style={s.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.classRow}>
              <Text style={s.classLabel}>Enrolled Class: </Text>
              <Text style={s.classValueMuted}>Not enrolled</Text>
            </View>
          )}
        </View>

        {/* ── Reading Statistics ── */}
        <View style={s.statsCard}>
          <Text style={s.statsTitle}>Reading Statistics</Text>

          {loading ? (
            <ActivityIndicator
              color="#FF9149"
              size="small"
              style={{ marginVertical: verticalScale(20) }}
            />
          ) : (
            <>
              <StatRow
                label="Number of Books Read"
                value={String(stats?.booksRead ?? 0)}
                s={s}
              />
              <StatRow
                label="Reading Level"
                value={stats?.readingLevel ?? "Beginner"}
                s={s}
              />
              <StatRow
                label="Number of Stickers Unlocked"
                value={String(stats?.stickersUnlocked ?? 0)}
                s={s}
              />
              <StatRow
                label="Reading Time"
                value={stats?.readingTime ?? "0 mins"}
                s={s}
                last
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Log Out button ── */}
      <View
        style={[s.footer, { paddingBottom: insets.bottom + verticalScale(10) }]}
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
    </View>
  );
}

// ── Reusable stat row ──────────────────────────────────────
function StatRow({ label, value, s, last = false }) {
  return (
    <View style={[s.statRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f2f2f2",
    },

    // ── Header ──
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(14),
    },
    backButton: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(22),
      color: "#fff",
      textAlign: "center",
      flex: 1,
    },

    scrollContent: {
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(30),
      paddingBottom: verticalScale(20),
    },

    // ── Avatar ──
    avatarContainer: {
      marginBottom: verticalScale(16),
    },
    avatarRing: {
      width: scale(110),
      height: scale(110),
      borderRadius: scale(55),
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
    },
    avatar: {
      width: scale(90),
      height: scale(90),
      borderRadius: scale(45),
    },

    // ── Name & Role ──
    name: {
      fontFamily: "Poppins",
      fontSize: scale(20),
      fontWeight: "bold",
      color: "#1a1a2e",
      textAlign: "center",
    },
    role: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#888",
      textAlign: "center",
      marginBottom: verticalScale(20),
    },

    // ── Class Card ──
    classCard: {
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(16),
      marginBottom: verticalScale(16),
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
      fontSize: scale(13),
      fontWeight: "bold",
      color: "#333",
    },
    classValue: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#333",
    },
    classValueMuted: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#aaa",
    },
    changeButton: {
      marginTop: verticalScale(10),
      backgroundColor: "#FF9149",
      paddingVertical: verticalScale(6),
      paddingHorizontal: scale(24),
      borderRadius: scale(20),
    },
    changeButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#fff",
      fontWeight: "bold",
    },

    // ── Stats Card ──
    statsCard: {
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(16),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    statsTitle: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      fontWeight: "bold",
      color: "#FF9149",
      textAlign: "center",
      marginBottom: verticalScale(12),
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: verticalScale(10),
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
    },

    // ── Footer / Logout ──
    footer: {
      paddingHorizontal: scale(40),
      paddingTop: verticalScale(12),
      backgroundColor: "#f2f2f2",
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
  });
