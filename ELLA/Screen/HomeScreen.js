import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image as RNImage,
  Modal,
  Animated,
  BackHandler,
  Alert,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { ImageBackground } from "react-native";
import Sidebar from "../components/Sidebar";
import AppHeader from "../components/AppHeader";
import { getLastUnfinishedBook, getRecommendedBooks } from "../utils/libUtil";
import { useScale } from "../utils/scaling";
import { auth } from "../firebase";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  const [currUser, setCurrUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [currRoute, setCurrRoute] = useState(1);

  const [enrolledClassId, setEnrolledClassId] = useState(null);
  const [classTeacherId, setClassTeacherId] = useState(null);

  const navigation = useNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-290))[0];

  const characterImages = {
    pink: require("../assets/animations/jump_pink.gif"),
    dino: require("../assets/animations/jump_dino.gif"),
    owl: require("../assets/animations/jump_owl.gif"),
  };

  // ── Derived data ───────────────────────────────────────────
  const isTeacher = currUser?.role === "Teacher";
  const isEnrolled = !!enrolledClassId;

  // ── FIX: only check uploadedById — teacherId doesn't exist on book docs ──
  const teacherOwnBooks = books.filter(
    (b) =>
      (b.source === "Teacher" || b.source === "teacher") &&
      b.uploadedById === currUser?.uid,
  );

  // Student view: books from libUtil
  const { recommended, teacherMaterials, studentUploads, appBooks } = currUser
    ? getRecommendedBooks(currUser, books)
    : {
        recommended: [],
        teacherMaterials: [],
        studentUploads: [],
        appBooks: [],
      };

  const myStudentUploads = studentUploads.filter(
    (b) => b.uploadedById === currUser?.uid,
  );

  const studentBooks = studentUploads;

  const enrolledTeacherBooks =
    isEnrolled && classTeacherId
      ? teacherMaterials.filter((b) => b.uploadedById === classTeacherId)
      : [];

  const ellaBooks = appBooks;

  // Last unfinished book (student only)
  const currBook =
    !isTeacher && currUser
      ? getLastUnfinishedBook(currUser, books) || books[0] || null
      : null;

  // ── Sidebar ────────────────────────────────────────────────
  const handleMenuPress = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: -290,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // ── Back button ────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      setIsExitDialogOpen(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, []);

  // ── Re-fetch user every time screen is focused ──
  useFocusEffect(
    React.useCallback(() => {
      setCurrRoute(1);
      fetchUserData();
    }, []),
  );

  // ── Fetch user + class info ────────────────────────────────
  // ── FIX: mirrors ManageClass.js logic — fetch class doc by ID from
  // classEnrolled field, then read teacherId from the class doc ──
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const db = getFirestore();
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      setCurrUser({ uid: user.uid, ...data });

      const classId = data.classEnrolled ?? null;
      setEnrolledClassId(classId);

      if (classId) {
        const classSnap = await getDoc(doc(db, "classes", classId));
        if (classSnap.exists()) {
          setClassTeacherId(classSnap.data().teacherID ?? null);
        } else {
          setClassTeacherId(null);
        }
      } else {
        setClassTeacherId(null);
      }
    } catch (error) {
      console.log("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // ── Fetch books ────────────────────────────────────────────
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const db = getFirestore();
        const booksSnapshot = await getDocs(collection(db, "books"));
        setBooks(booksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.log("Error fetching books:", error);
      }
    };
    fetchBooks();
  }, []);

  const handleOpenBook = (book, user) =>
    navigation.navigate("OpenBook", { book, currUser: user });

  const handleUploadBook = () => {
    navigation.navigate("UploadBook", { currUser });
  };

  const s = getStyles(scale, verticalScale);

  // ── Loading state ──────────────────────────────────────────
  if (!currUser) {
    return (
      <ImageBackground
        source={require("../assets/backgrounds/page.png")}
        style={s.background}
        resizeMode="cover"
      >
        <View
          style={[
            s.container,
            { justifyContent: "center", paddingTop: insets.top },
          ]}
        >
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      </ImageBackground>
    );
  }

  // ── Teacher view ───────────────────────────────────────────
  if (isTeacher) {
    return (
      <ImageBackground
        source={require("../assets/backgrounds/page.png")}
        style={s.background}
        resizeMode="cover"
      >
        <View style={s.container}>
          <View style={[s.content, { paddingTop: insets.top }]}>
            <AppHeader
              currUser={currUser}
              characterImages={characterImages}
              onAvatarPress={handleMenuPress}
            />

            <Sidebar
              isMenuOpen={isMenuOpen}
              slideAnim={slideAnim}
              handleMenuPress={handleMenuPress}
              currUser={currUser}
              characterImages={characterImages}
              setIsExitDialogOpen={setIsExitDialogOpen}
            />

            <View style={{ height: verticalScale(25) }} />
            <View style={s.readTextContainer}>
              <Text style={s.readText}>Let's Read!</Text>
            </View>
            <View style={{ height: verticalScale(20) }} />

            {/* ── Teacher Materials Grid ── */}
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={s.teacherScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.catalogTitle}>Materials</Text>

              {teacherOwnBooks.length === 0 ? (
                <View style={s.emptyMaterials}>
                  <Ionicons
                    name="book-outline"
                    size={scale(48)}
                    color="rgba(0, 0, 0, 0.5)"
                  />
                  <Text style={s.emptyMaterialsText}>
                    No materials uploaded yet.
                  </Text>
                  <Text style={s.emptyMaterialsSub}>
                    Tap "Upload Books" to add your first book!
                  </Text>
                </View>
              ) : (
                <View style={s.teacherGrid}>
                  {teacherOwnBooks.map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      style={s.teacherBookCard}
                      onPress={() => handleOpenBook(book, currUser)}
                    >
                      <RNImage
                        source={{ uri: book.cover }}
                        style={s.teacherBookImage}
                      />
                      <Text style={s.teacherBookLabel} numberOfLines={2}>
                        {book.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ height: verticalScale(130) }} />
            </ScrollView>
          </View>

          {/* ── Upload Books button ── */}
          <TouchableOpacity
            style={s.uploadButton}
            onPress={handleUploadBook}
            activeOpacity={0.85}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={scale(18)}
              color="#fff"
              style={{ marginRight: scale(8) }}
            />
            <Text style={s.uploadButtonText}>Upload Books</Text>
          </TouchableOpacity>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.footerButton}
              onPress={() => setCurrRoute(1)}
            >
              <Ionicons
                name="library-outline"
                size={scale(24)}
                color={currRoute === 1 ? "#FF9149" : "#fff"}
              />
              <Text
                style={[
                  s.footerButtonText,
                  currRoute === 1 && s.activeFooterButtonText,
                ]}
              >
                Library
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.footerButton}
              onPress={() => {
                setCurrRoute(0);
                navigation.navigate("Prizes", { currUser });
              }}
            >
              <Ionicons
                name="diamond-outline"
                size={scale(24)}
                color={currRoute === 0 ? "#FF9149" : "#fff"}
              />
              <Text
                style={[
                  s.footerButtonText,
                  currRoute === 0 && s.activeFooterButtonText,
                ]}
              >
                Prizes
              </Text>
            </TouchableOpacity>
          </View>

          <ExitModal
            visible={isExitDialogOpen}
            onClose={() => setIsExitDialogOpen(false)}
            scale={scale}
            verticalScale={verticalScale}
            s={s}
          />
        </View>
      </ImageBackground>
    );
  }

  // ── Student view ───────────────────────────────────────────
  return (
    <ImageBackground
      source={require("../assets/backgrounds/page.png")}
      style={s.background}
      resizeMode="cover"
    >
      <View style={s.container}>
        <View style={[s.content, { paddingTop: insets.top }]}>
          <AppHeader
            currUser={currUser}
            characterImages={characterImages}
            onAvatarPress={handleMenuPress}
          />

          <View style={{ height: verticalScale(25) }} />
          <View style={s.readTextContainer}>
            <Text style={s.readText}>Let's Read!</Text>
          </View>

          <Sidebar
            isMenuOpen={isMenuOpen}
            slideAnim={slideAnim}
            handleMenuPress={handleMenuPress}
            currUser={{ ...currUser, classEnrolled: enrolledClassId }}
            characterImages={characterImages}
            setIsExitDialogOpen={setIsExitDialogOpen}
          />

          <View style={{ height: verticalScale(65) }} />

          <ScrollView contentContainerStyle={s.scrollContainer}>
            {/* ── Last unfinished book ── */}
            {currBook && (
              <View style={s.lastRead}>
                <TouchableOpacity
                  style={s.firstBook}
                  onPress={() => handleOpenBook(currBook, currUser)}
                >
                  <RNImage
                    source={{ uri: currBook.cover }}
                    style={s.bookImages}
                  />
                  <Text style={s.bookTitle}>{currBook.title}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Book categories ── */}
            <View style={s.catalog}>
              {[
                { label: "Recommended", data: recommended },
                ...(isEnrolled && enrolledTeacherBooks.length > 0
                  ? [{ label: "Teacher Materials", data: enrolledTeacherBooks }]
                  : []),
                { label: "Student Uploads", data: studentBooks },
                { label: "Books from Ella", data: ellaBooks },
                { label: "My Uploads", data: myStudentUploads },
              ]
                .filter(({ data }) => data && data.length > 0)
                .map(({ label, data }) => (
                  <View key={label}>
                    <Text style={s.catalogTitle}>{label}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {data.map((book) => (
                        <TouchableOpacity
                          key={book.id}
                          style={s.bookCard}
                          onPress={() => handleOpenBook(book, currUser)}
                        >
                          <RNImage
                            source={{ uri: book.cover }}
                            style={s.bookImage}
                          />
                          <Text style={s.bookLabel}>{book.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
            </View>
          </ScrollView>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <TouchableOpacity
            style={s.footerButton}
            onPress={() => setCurrRoute(1)}
          >
            <Ionicons
              name="library-outline"
              size={scale(24)}
              color={currRoute === 1 ? "#FF9149" : "#fff"}
            />
            <Text
              style={[
                s.footerButtonText,
                currRoute === 1 && s.activeFooterButtonText,
              ]}
            >
              Library
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.footerButton}
            onPress={() => {
              setCurrRoute(0);
              navigation.navigate("Prizes", { currUser });
            }}
          >
            <Ionicons
              name="diamond-outline"
              size={scale(24)}
              color={currRoute === 0 ? "#FF9149" : "#fff"}
            />
            <Text
              style={[
                s.footerButtonText,
                currRoute === 0 && s.activeFooterButtonText,
              ]}
            >
              Prizes
            </Text>
          </TouchableOpacity>
        </View>

        <ExitModal
          visible={isExitDialogOpen}
          onClose={() => setIsExitDialogOpen(false)}
          scale={scale}
          verticalScale={verticalScale}
          s={s}
        />
      </View>
    </ImageBackground>
  );
}

// ── Extracted Exit Modal ────────────────────────────────────
function ExitModal({ visible, onClose, scale, verticalScale, s }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.exitDialogOverlay}>
        <View style={s.exitDialogContainer}>
          <Text style={s.exitDialogTitle}>Stop Reading?</Text>
          <View style={s.exitDialogButtons}>
            <TouchableOpacity
              style={s.exitDialogButtonYes}
              onPress={() => {
                onClose();
                BackHandler.exitApp();
              }}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={s.exitDialogButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exitDialogButtonNo} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={s.exitDialogButtonText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    background: { flex: 1, width: "100%", height: "100%" },
    container: { flex: 1 },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: verticalScale(70),
    },

    loadingText: {
      fontFamily: "PixelifySans",
      fontSize: scale(16),
      textAlign: "center",
      color: "#fff",
    },
    readTextContainer: { alignItems: "center" },
    readText: {
      fontFamily: "Mochi",
      fontSize: scale(36),
      color: "#fff",
      textAlign: "center",
    },

    // ── Teacher grid ──
    teacherScrollContent: {
      paddingHorizontal: scale(16),
      paddingTop: verticalScale(10),
      alignItems: "flex-start",
    },
    teacherGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: "100%",
    },
    teacherBookCard: {
      width: "33%",
      padding: scale(6),
      alignItems: "center",
      marginBottom: verticalScale(8),
    },
    teacherBookImage: {
      width: "100%",
      aspectRatio: 0.75,
      borderRadius: scale(8),
      backgroundColor: "#ddd",
    },
    teacherBookLabel: {
      fontFamily: "Poppins",
      fontSize: scale(11),
      color: "#000",
      textAlign: "center",
      marginTop: verticalScale(4),
      paddingHorizontal: scale(2),
    },
    emptyMaterials: {
      alignItems: "center",
      width: "100%",
      paddingVertical: verticalScale(40),
    },
    emptyMaterialsText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "rgba(0, 0, 0, 0.8)",
      textAlign: "center",
      marginTop: verticalScale(10),
    },
    emptyMaterialsSub: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "rgba(0, 0, 0, 0.5)",
      textAlign: "center",
      marginTop: verticalScale(4),
    },

    // ── Upload button ──
    uploadButton: {
      position: "absolute",
      bottom: verticalScale(78),
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FF9149",
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(30),
      borderRadius: scale(25),
      borderWidth: 1.5,
      borderColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    uploadButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      fontWeight: "bold",
      color: "#fff",
    },

    // ── Student view ──
    lastRead: { alignItems: "center" },
    firstBook: {
      borderRadius: scale(15),
      width: "70%",
      alignItems: "center",
    },
    bookImages: {
      width: "100%",
      height: verticalScale(150),
      borderRadius: scale(10),
      borderColor: "#60B5FF",
      borderWidth: 2,
    },
    bookTitle: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      color: "#000",
    },
    scrollContainer: { paddingBottom: verticalScale(20) },
    catalog: {
      flex: 1,
      width: "100%",
      paddingHorizontal: scale(20),
      marginTop: verticalScale(10),
    },
    catalogTitle: {
      fontFamily: "Mochi",
      fontSize: scale(18),
      color: "#FF9149",
      marginTop: verticalScale(15),
      marginBottom: verticalScale(15),
      textAlign: "left",
    },
    bookCard: {
      width: scale(110),
      minHeight: verticalScale(160),
      borderRadius: scale(10),
      overflow: "visible",
      alignItems: "center",
      margin: scale(10),
    },
    bookImage: {
      width: scale(120),
      height: verticalScale(160),
      borderRadius: scale(10),
    },
    bookLabel: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#000",
      textAlign: "center",
      paddingHorizontal: scale(5),
      marginTop: verticalScale(5),
      width: scale(110),
      flexWrap: "wrap",
    },

    // ── Footer ──
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: verticalScale(70),
      flexDirection: "row",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(20),
      justifyContent: "space-around",
      alignItems: "center",
    },
    footerButton: {
      alignItems: "center",
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
    },
    footerButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      marginTop: verticalScale(5),
      color: "#fff",
    },
    activeFooterButtonText: { color: "#FF9149", fontWeight: "bold" },

    // ── Exit dialog ──
    exitDialogOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    exitDialogContainer: {
      backgroundColor: "#FF9149",
      borderRadius: scale(20),
      padding: scale(30),
      alignItems: "center",
      width: "70%",
      elevation: 5,
    },
    exitDialogTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(18),
      color: "#fff",
      fontWeight: "bold",
      marginBottom: verticalScale(20),
      textAlign: "center",
    },
    exitDialogButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    exitDialogButtonYes: {
      backgroundColor: "#FF4444",
      borderRadius: scale(15),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
      flexDirection: "row",
      alignItems: "center",
      minWidth: scale(80),
      justifyContent: "center",
    },
    exitDialogButtonNo: {
      backgroundColor: "#4444FF",
      borderRadius: scale(15),
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(20),
      flexDirection: "row",
      alignItems: "center",
      minWidth: scale(80),
      justifyContent: "center",
    },
    exitDialogButtonText: {
      color: "#fff",
      fontSize: scale(14),
      fontFamily: "PixelifySans",
      fontWeight: "bold",
      marginLeft: scale(5),
    },
  });
