import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
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
import Ellalert, { useEllAlert } from "../components/Alerts"; // ← import

// ── Cloudinary config ──────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dygbbqapd";
const CLOUDINARY_UPLOAD_PRESET = "ella_books";

// ── Helpers ────────────────────────────────────────────────
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

function formatTime(seconds) {
  if (!seconds || seconds === 0) return "0 mins";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}hr${h > 1 ? "s" : ""} ${m}mins`;
  return `${m} min${m !== 1 ? "s" : ""}`;
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

  // ── Ellalert hook ──
  const { alertConfig, showAlert, closeAlert } = useEllAlert();

  const isOwnProfile =
    (currUser?.uid ?? currUser?.id) === auth.currentUser?.uid;
  const isTeacher = currUser?.role === "Teacher";

  const [stats, setStats] = useState(null);
  const [enrolledClass, setEnrolledClass] = useState(null);
  const [completedBooks, setCompletedBooks] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedBooks, setUploadedBooks] = useState([]);

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

  const fetchStats = async () => {
    try {
      const db = getFirestore();
      const uid = currUser?.uid ?? currUser?.id;
      if (!uid) return;

      const progressSnap = await getDocs(
        query(collection(db, "userProgress"), where("userId", "==", uid)),
      );
      const progressDocs = progressSnap.docs.map((d) => ({
        docId: d.id,
        ...d.data(),
      }));

      const booksCompleted = progressDocs.filter((p) => p.completed).length;
      const totalTimeSeconds = progressDocs.reduce(
        (sum, p) => sum + (p.totalTimeSeconds ?? 0),
        0,
      );

      const completedProgressDocs = progressDocs.filter(
        (p) => p.completed && p.bookId,
      );
      const uniqueBookIds = [
        ...new Set(completedProgressDocs.map((p) => p.bookId)),
      ];
      if (uniqueBookIds.length > 0) {
        const bookDocs = await Promise.all(
          uniqueBookIds.map(async (bookId) => {
            const snap = await getDoc(doc(db, "books", bookId));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
          }),
        );
        setCompletedBooks(bookDocs.filter(Boolean));
      }

      const sessionsSnap = await getDocs(
        query(collection(db, "readingSessions"), where("userId", "==", uid)),
      );
      const sessionDocs = sessionsSnap.docs.map((d) => d.data());

      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.data();
      const stickersUnlocked = userData?.ownedStickers?.length ?? 0;

      // Sync latest avatar info from Firestore
      if (userData?.customAvatarUrl !== undefined) {
        setCustomAvatarUrl(userData.customAvatarUrl ?? null);
      }
      if (userData?.character) {
        setSelectedCharacter(userData.character);
      }

      if (!isTeacher) {
        const classIdFromUser = userData?.classEnrolled;
        if (classIdFromUser) {
          const classSnap = await getDoc(doc(db, "classes", classIdFromUser));
          if (classSnap.exists()) {
            const classData = classSnap.data();
            setEnrolledClass({
              id: classSnap.id,
              code: classData.code || classSnap.id,
              teacherName: classData.teacherName || "Unknown Teacher",
              teacherId: classData.teacherId,
            });
          }
        }
      }

      let managedClassCount = 0;
      let booksUploaded = 0;
      let totalStudents = 0;

      if (isTeacher) {
        const classesSnap = await getDocs(
          query(collection(db, "classes"), where("teacherID", "==", uid)),
        );
        managedClassCount = classesSnap.size;
        classesSnap.docs.forEach((d) => {
          totalStudents += d.data().students?.length ?? 0;
        });

        const booksSnap = await getDocs(
          query(
            collection(db, "books"),
            where("source", "==", "Teacher"),
            where("uploadedById", "==", uid),
          ),
        );
        booksUploaded = booksSnap.size;
        setUploadedBooks(
          booksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      }

      setStats({
        booksRead: booksCompleted,
        readingLevel: getReadingLevel(sessionDocs),
        stickersUnlocked,
        readingTime: formatTime(totalTimeSeconds),
        managedClassCount,
        totalStudents,
        booksUploaded,
      });
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

  // ── Pick from gallery ──────────────────────────────────
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
    if (!result.canceled) {
      await handleUploadAvatar(result.assets[0].uri);
    }
  };

  // ── Take photo ─────────────────────────────────────────
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
    if (!result.canceled) {
      await handleUploadAvatar(result.assets[0].uri);
    }
  };

  // ── Upload and save custom avatar ─────────────────────
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
      console.log("Avatar upload error:", e);
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Select a built-in avatar ───────────────────────────
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
      console.log("Select avatar error:", e);
      showAlert({
        type: "error",
        title: "Error",
        message: "Failed to update avatar. Please try again.",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Current avatar source ──────────────────────────────
  const currentAvatarSource = customAvatarUrl
    ? { uri: customAvatarUrl }
    : (characterImages?.[selectedCharacter] ?? characterImages?.pink);

  // ── Unenroll ───────────────────────────────────────────
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
              await updateDoc(doc(db, "users", uid), {
                classEnrolled: null,
              });
              setEnrolledClass(null);
              showAlert({
                type: "success",
                title: "Success",
                message: "You have successfully left the class.",
              });
            } catch (err) {
              console.log("Unenroll error:", err);
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

  // ── Remove student ─────────────────────────────────────
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
              console.log("Remove student error:", err);
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

  // ── Logout ─────────────────────────────────────────────
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
              console.log("Logout error:", error);
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

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Ellalert ── */}
      <Ellalert config={alertConfig} onClose={closeAlert} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isOwnProfile
            ? "User Profile"
            : `${currUser?.name ?? "Student"}'s Profile`}
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Role badge ── */}
        <Text style={s.roleBadge}>{currUser?.role}</Text>

        {/* ── Avatar ── */}
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

          {/* Only own profile can change avatar */}
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

        {/* ── Name & Role ── */}
        <Text style={s.name}>{currUser?.name}</Text>
        <Text style={s.role}>{currUser?.role}</Text>

        {/* ── Class info card ── */}
        <View style={s.classCard}>
          {isTeacher ? (
            <View style={s.classRow}>
              <Text style={s.classLabel}>Class Code: </Text>
              <Text style={s.classValue}>{currUser?.classCode ?? "—"}</Text>
            </View>
          ) : loading ? (
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
                    <Text style={s.removeButtonText}>Remove from Class</Text>
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

        {/* ── Reading / Teaching Statistics ── */}
        <View style={s.statsCard}>
          <Text style={s.statsTitle}>
            {isTeacher ? "Teaching Statistics" : "Reading Statistics"}
          </Text>
          {loading ? (
            <ActivityIndicator
              color="#FF9149"
              size="small"
              style={{ marginVertical: verticalScale(20) }}
            />
          ) : isTeacher ? (
            <>
              <StatRow
                label="Books Uploaded"
                value={String(stats?.booksUploaded ?? 0)}
                s={s}
              />
              <StatRow
                label="Students Handled"
                value={String(stats?.totalStudents ?? 0)}
                s={s}
                last
              />
            </>
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
                label="Stickers Unlocked"
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

        {/* ── Completed / Uploaded Books ── */}
        {isTeacher ? (
          <View style={s.statsCard}>
            <Text style={s.statsTitle}>Uploaded Books</Text>
            {loading ? (
              <ActivityIndicator
                color="#FF9149"
                size="small"
                style={{ marginVertical: verticalScale(20) }}
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
                      size={scale(18)}
                      color="#60B5FF"
                      style={{ marginRight: scale(10) }}
                    />
                    <Text style={s.bookRowTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                  </View>
                  <Text style={s.bookRowDifficulty}>{book.difficulty}</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={s.statsCard}>
            <Text style={s.statsTitle}>Completed Books</Text>
            {loading ? (
              <ActivityIndicator
                color="#FF9149"
                size="small"
                style={{ marginVertical: verticalScale(20) }}
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
                    i === completedBooks.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={s.bookRowLeft}>
                    <Ionicons
                      name="checkmark-circle"
                      size={scale(18)}
                      color="#4CAF50"
                      style={{ marginRight: scale(10) }}
                    />
                    <Text style={s.bookRowTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                  </View>
                  <Text style={s.bookRowDifficulty}>{book.difficulty}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Log Out ── */}
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

      {/* ── Avatar Selection Modal ── */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.avatarModalContainer}>
            <Text style={s.avatarModalTitle}>Change Avatar</Text>

            {/* Upload photo option */}
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

            {/* Built-in avatar row */}
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

      {/* ── Image Source Modal (Camera / Gallery) ── */}
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
    container: { flex: 1, backgroundColor: "#f2f2f2" },

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
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(24),
      paddingBottom: verticalScale(20),
    },

    roleBadge: {
      fontFamily: "PixelifySans",
      fontSize: scale(16),
      color: "#60B5FF",
      textAlign: "center",
      marginBottom: verticalScale(8),
      letterSpacing: 1,
    },

    // ── Avatar ──
    avatarContainer: {
      alignItems: "center",
      marginBottom: verticalScale(14),
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
      overflow: "hidden",
    },
    avatar: {
      width: scale(90),
      height: scale(90),
      borderRadius: scale(45),
    },
    changeAvatarBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FF9149",
      borderRadius: scale(20),
      paddingVertical: verticalScale(5),
      paddingHorizontal: scale(14),
      marginTop: verticalScale(8),
      gap: scale(5),
    },
    changeAvatarText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#fff",
      fontWeight: "bold",
    },

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
      fontSize: scale(16),
      color: "#333",
      lineHeight: 25,
    },
    classValue: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      color: "#333",
      lineHeight: 25,
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

    statsCard: {
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      padding: scale(16),
      marginBottom: verticalScale(16),
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
      paddingVertical: verticalScale(10),
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    bookRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    bookRowTitle: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#333",
      flex: 1,
    },
    bookRowDifficulty: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#aaa",
      marginLeft: scale(8),
    },

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

    // ── Avatar Modal ──
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
    builtinAvatarImage: {
      width: scale(48),
      height: scale(48),
    },
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

    // ── Image Source Modal ──
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
