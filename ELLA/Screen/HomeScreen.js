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
import { getLastUnfinishedBook, getRecommendedBooks } from "../libUtil";
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

  const { recommended, teacherMaterials, studentUploads, appBooks } = currUser
    ? getRecommendedBooks(currUser, books)
    : {
        recommended: [],
        teacherMaterials: [],
        studentUploads: [],
        appBooks: [],
      };

  const currBook = currUser
    ? getLastUnfinishedBook(currUser, books) || books[0] || null
    : null;

  const characterImages = {
    pink: require("../assets/animations/jump_pink.gif"),
    dino: require("../assets/animations/jump_dino.gif"),
    owl: require("../assets/animations/jump_owl.gif"),
  };

  const navigation = useNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-290))[0];

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

  // Reset footer to Library tab whenever HomeScreen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      setCurrRoute(1);
    }, []),
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No authenticated user");
          return;
        }
        const db = getFirestore();
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setCurrUser({ id: user.uid, ...docSnap.data() });
        else console.log("No user document found!");
      } catch (error) {
        console.log("Error fetching user:", error);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const db = getFirestore();
        const booksSnapshot = await getDocs(collection(db, "books"));
        setBooks(
          booksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (error) {
        console.log("Error fetching books:", error);
      }
    };
    fetchBooks();
  }, []);

  const handleOpenBook = (book, currUser) =>
    navigation.navigate("OpenBook", { book, currUser });

  const s = getStyles(scale, verticalScale);

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

  return (
    <ImageBackground
      source={require("../assets/backgrounds/page.png")}
      style={s.background}
      resizeMode="cover"
    >
      {/* FIX: Root container has NO paddingTop — footer stays anchored correctly */}
      <View style={s.container}>
        {/* FIX: insets.top applied only to the content area above the footer */}
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
            currUser={currUser}
            characterImages={characterImages}
            setIsExitDialogOpen={setIsExitDialogOpen}
          />

          <View style={{ height: verticalScale(65) }} />
          <ScrollView contentContainerStyle={s.scrollContainer}>
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

            <View style={s.catalog}>
              {[
                { label: "Recommended", data: recommended },
                { label: "Teacher Uploads", data: teacherMaterials },
                { label: "Student Uploads", data: studentUploads },
                { label: "Books from Ella", data: appBooks },
              ].map(({ label, data }) => (
                <View key={label}>
                  <Text style={s.catalogTitle}>{label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        {/* Footer — anchored to bottom of root container, no insets */}
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

        <Modal
          visible={isExitDialogOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsExitDialogOpen(false)}
        >
          <View style={s.exitDialogOverlay}>
            <View style={s.exitDialogContainer}>
              <Text style={s.exitDialogTitle}>Stop Reading?</Text>
              <View style={s.exitDialogButtons}>
                <TouchableOpacity
                  style={s.exitDialogButtonYes}
                  onPress={() => {
                    setIsExitDialogOpen(false);
                    BackHandler.exitApp();
                  }}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.exitDialogButtonText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.exitDialogButtonNo}
                  onPress={() => setIsExitDialogOpen(false)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={s.exitDialogButtonText}>No</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    background: { flex: 1, width: "100%", height: "100%" },

    // Root container — no padding, so footer absolute position is always correct
    container: { flex: 1 },

    // Inner content area — takes up all space above the footer
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
    lastRead: { alignItems: "center" },
    firstBook: { borderRadius: scale(15), width: "60%", alignItems: "center" },
    bookImages: {
      width: "100%",
      height: verticalScale(130),
      borderRadius: scale(10),
    },
    bookTitle: {
      fontFamily: "Poppins",
      fontSize: scale(16),
      color: "#000000ff",
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
      fontSize: scale(16),
      color: "#FF9149",
      marginBottom: verticalScale(10),
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
      width: scale(110),
      height: verticalScale(120),
      borderRadius: scale(10),
    },
    bookLabel: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      color: "#000000ff",
      textAlign: "center",
      paddingHorizontal: scale(5),
      marginTop: verticalScale(5),
      width: scale(110),
      flexWrap: "wrap",
    },

    // Footer — position absolute, anchored to bottom, no insets
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
