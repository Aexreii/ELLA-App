import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../utils/api";
import { useScale } from "../utils/scaling";

export default function TeacherBooks() {
  const navigation = useNavigation();
  const route = useRoute();
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  // currUser can be passed as a route param or we fall back to fetching it
  const { currUser: routeUser } = route.params ?? {};

  const [classData, setClassData] = useState(null);
  const [teacherBooks, setTeacherBooks] = useState([]);
  const [currUser, setCurrUser] = useState(routeUser ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchData);
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Get User Profile
      const userResp = await api.auth.getUser();
      if (!userResp.success) return;
      const user = userResp.user;
      setCurrUser(user);

      const classId = user.classEnrolled ?? null;
      if (!classId) {
        setLoading(false);
        return;
      }

      // 2. Fetch the class doc to get teacher info
      const classResp = await api.class.getDetails(classId);
      if (!classResp.success) {
        setLoading(false);
        return;
      }
      const classInfo = classResp.class;
      setClassData(classInfo);

      const teacherId = classInfo.teacherID ?? classInfo.teacherId ?? null;
      if (!teacherId) {
        setTeacherBooks([]);
        setLoading(false);
        return;
      }

      // 3. Fetch books that belong to this teacher
      const booksResp = await api.books.getCatalog({ source: 'Teacher' });
      if (booksResp.success) {
         const filtered = booksResp.books.filter(b => b.uploadedBy === teacherId);
         setTeacherBooks(filtered);
      }
    } catch (err) {
      console.log("TeacherBooks fetch error:", err);
    } finally {
      setLoading(false);
    }
  };


  const handleOpenBook = (book) => {
    if (!currUser) return;
    navigation.navigate("OpenBook", { book, currUser });
  };

  const s = getStyles(scale, verticalScale);

  return (
    <View style={s.container}>
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
        <Text style={s.pageTitle}>Teacher's Books</Text>

        {classData ? (
          <Text style={s.classCode}>
            Class: {classData.teacherName ?? "Your Teacher"} · Code:{" "}
            {classData.code ?? classData.id}
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator
            color="#FF9149"
            size="large"
            style={{ marginTop: verticalScale(40) }}
          />
        ) : !classData ? (
          /* ── Not enrolled ── */
          <View style={s.emptyContainer}>
            <Ionicons
              name="school-outline"
              size={scale(48)}
              color="#ddd"
              style={{ marginBottom: verticalScale(12) }}
            />
            <Text style={s.emptyText}>You're not enrolled in a class yet.</Text>
            <Text style={s.emptySubText}>
              Ask your teacher for a class code to enroll!
            </Text>
          </View>
        ) : teacherBooks.length === 0 ? (
          /* ── Enrolled but no books uploaded yet ── */
          <View style={s.emptyContainer}>
            <Ionicons
              name="book-outline"
              size={scale(48)}
              color="#ddd"
              style={{ marginBottom: verticalScale(12) }}
            />
            <Text style={s.emptyText}>No books uploaded yet.</Text>
            <Text style={s.emptySubText}>
              Your teacher hasn't added any books to this class yet.
            </Text>
          </View>
        ) : (
          /* ── Book grid ── */
          <View style={s.bookGrid}>
            {teacherBooks.map((book, i) => (
              <TouchableOpacity
                key={book.id}
                style={s.bookCard}
                activeOpacity={0.75}
                onPress={() => handleOpenBook(book)}
              >
                {/* Cover */}
                <View style={s.coverWrap}>
                  <RNImage
                    source={{ uri: book.cover }}
                    style={s.coverImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Info */}
                <View style={s.bookInfo}>
                  {/* Number badge */}
                  <View style={s.numberBadge}>
                    <Text style={s.numberText}>{i + 1}</Text>
                  </View>

                  <View style={s.bookTextGroup}>
                    <Text style={s.bookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.writer ? (
                      <Text style={s.bookAuthor} numberOfLines={1}>
                        {book.writer}
                      </Text>
                    ) : null}
                    {book.difficulty ? (
                      <View style={s.difficultyBadge}>
                        <Text style={s.difficultyText}>{book.difficulty}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={scale(18)}
                    color="#aaa"
                  />
                </View>
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
    container: {
      flex: 1,
      backgroundColor: "#f2f2f2",
      marginTop: verticalScale(30),
    },

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
    pageTitle: {
      fontFamily: "Mochi",
      fontSize: scale(24),
      color: "#1a1a2e",
      marginBottom: verticalScale(4),
    },
    classCode: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#888",
      marginBottom: verticalScale(28),
      textAlign: "center",
    },

    // ── Book grid (same card style as ManageClass student rows) ──
    bookGrid: { width: "100%" },

    bookCard: {
      backgroundColor: "#fff",
      borderRadius: scale(14),
      marginBottom: verticalScale(10),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },

    // Book cover thumbnail
    coverWrap: {
      width: "100%",
      height: verticalScale(150),
      borderRadius: scale(10),
      overflow: "hidden",
      marginBottom: verticalScale(10),
      backgroundColor: "#ddd",
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },

    // Row below cover: number badge + text + chevron
    bookInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    numberBadge: {
      width: scale(26),
      height: scale(26),
      borderRadius: scale(13),
      backgroundColor: "#EAF4FF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: scale(10),
    },
    numberText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      fontWeight: "bold",
      color: "#60B5FF",
    },
    bookTextGroup: { flex: 1 },
    bookTitle: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      fontWeight: "bold",
      color: "#1a1a2e",
    },
    bookAuthor: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#888",
      marginTop: verticalScale(2),
    },
    difficultyBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#FFF3EA",
      borderRadius: scale(8),
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(2),
      marginTop: verticalScale(4),
    },
    difficultyText: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      color: "#FF9149",
      fontWeight: "bold",
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
