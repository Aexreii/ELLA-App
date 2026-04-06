import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth } from "../firebase";
import { useScale } from "../utils/scaling";

const characterImages = {
  pink: require("../assets/animations/jump_pink.gif"),
  dino: require("../assets/animations/jump_dino.gif"),
  owl: require("../assets/animations/jump_owl.gif"),
};

export default function ManageClass() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchClassData);
    return unsubscribe;
  }, [navigation]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const classesSnap = await getDocs(
        query(collection(db, "classes"), where("teacherID", "==", uid)),
      );

      if (classesSnap.empty) {
        setLoading(false);
        return;
      }

      const classDoc = classesSnap.docs[0];
      const data = classDoc.data();
      setClassData({ id: classDoc.id, ...data });

      if (data.students && data.students.length > 0) {
        const profiles = await Promise.all(
          data.students.map(async (studentId) => {
            const snap = await getDoc(doc(db, "users", studentId));
            return snap.exists() ? { id: studentId, ...snap.data() } : null;
          }),
        );
        setStudents(profiles.filter(Boolean));
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.log("ManageClass fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>ELLA</Text>
          <Text style={s.headerSub}>Your English Buddy</Text>
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.classTitle}>Class</Text>

        {classData && <Text style={s.classCode}>Code: {classData.code}</Text>}
        {loading ? (
          <ActivityIndicator
            color="#FF9149"
            size="large"
            style={{ marginTop: verticalScale(40) }}
          />
        ) : !classData ? (
          <View style={s.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={scale(48)}
              color="#ddd"
              style={{ marginBottom: verticalScale(12) }}
            />
            <Text style={s.emptyText}>You haven't created a class yet.</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons
              name="person-add-outline"
              size={scale(48)}
              color="#ddd"
              style={{ marginBottom: verticalScale(12) }}
            />
            <Text style={s.emptyText}>No students enrolled yet.</Text>
            <Text style={s.emptySubText}>
              Share the class code with your students!
            </Text>
          </View>
        ) : (
          <View style={s.studentList}>
            {students.map((student, i) => (
              <TouchableOpacity
                key={student.id}
                style={s.studentRow}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("UserProfile", {
                    currUser: student,
                    characterImages,
                    // ── Tell UserProfile a teacher is viewing ──
                    isTeacherViewing: true,
                    classId: classData.id,
                  })
                }
              >
                {/* Avatar */}
                <View style={s.avatarWrap}>
                  <Image
                    source={
                      characterImages[student.character] ?? characterImages.pink
                    }
                    style={s.avatar}
                    contentFit="cover"
                  />
                </View>

                {/* Info */}
                <View style={s.studentInfo}>
                  <Text style={s.studentIndex}>{i + 1}.</Text>
                  <Text style={s.studentName}>{student.name}</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={scale(18)}
                  color="#aaa"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f2f2f2" },

    // ── Header ──
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
    },
    backBtn: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(22),
      color: "#fff",
    },
    headerSub: {
      fontFamily: "PixelifySans",
      fontSize: scale(11),
      color: "#fff",
    },

    // ── Content ──
    content: {
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(36),
      paddingBottom: verticalScale(40),
    },
    classTitle: {
      fontFamily: "Mochi",
      fontSize: scale(34),
      color: "#1a1a2e",
      marginBottom: verticalScale(4),
    },
    classCode: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#888",
      marginBottom: verticalScale(28),
    },

    // ── Student List ──
    studentList: { width: "100%" },
    studentRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: scale(14),
      marginBottom: verticalScale(10),
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(20),
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatarWrap: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(21),
      backgroundColor: "#f0f0f0",
      borderWidth: 1.5,
      borderColor: "#60B5FF",
      overflow: "hidden",
      marginRight: scale(12),
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: { width: scale(38), height: scale(38) },
    studentInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: scale(6),
    },
    studentIndex: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#aaa",
      lineHeight: scale(20),
    },
    studentName: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      fontWeight: "bold",
      color: "#1a1a2e",
      textDecorationLine: "underline",
      lineHeight: scale(20),
    },

    // ── Empty States ──
    emptyContainer: {
      alignItems: "center",
      marginTop: verticalScale(50),
    },
    emptyText: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#aaa",
      textAlign: "center",
    },
    emptySubText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#ccc",
      textAlign: "center",
      marginTop: verticalScale(6),
    },
  });
