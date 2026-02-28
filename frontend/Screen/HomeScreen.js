import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image as RNImage,
  Modal,
  Animated,
  Dimensions,
  BackHandler,
  Alert,
  ScrollView,
} from "react-native";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ImageBackground } from "react-native";
import Sidebar from "../components/Sidebar";
import { getLastUnfinishedBook, getRecommendedBooks } from "../libUtil";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

//This is for the backend Database.
import { Students, books } from "../Data/data";

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    PixelifySans: require("../assets/fonts/PixelifySans-Regular.ttf"),
    PixelifySansBold: require("../assets/fonts/PixelifySans-Bold.ttf"),
    Poppins: require("../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../assets/fonts/Poppins-Bold.ttf"),
    Mochi: require("../assets/fonts/MochiyPopOne.ttf"),
  });

  const currUser = Students[0]; //change this if we have a backend.

  const { recommended, teacherMaterials, studentUploads, appBooks } =
    getRecommendedBooks(currUser);

  const currBook = getLastUnfinishedBook(currUser);

  const currRoute = 1;

  const characterImages = {
    pink: require("../assets/animations/jump_pink.gif"),
    dino: require("../assets/animations/jump_dino.gif"),
    owl: require("../assets/animations/jump_owl.gif"),
  };

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

  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-290))[0];

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      setIsExitDialogOpen(true);
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const handleExitApp = () => {
    BackHandler.exitApp();
  };

  const handleExitDialogClose = () => {
    setIsExitDialogOpen(false);
  };

  const handleOpenBook = (book, currUser) => {
    navigation.navigate("OpenBook", { book, currUser });
  };

  return (
    <ImageBackground
      source={require("../assets/backgrounds/page.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleMenuPress}
            style={styles.avatarContainer}
          >
            <Image
              source={characterImages[currUser.character]}
              style={styles.characterImage}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>ELLA</Text>
            <Text style={styles.subTitle}>Your English Buddy</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Image
              source={require("../assets/icons/diamond.png")}
              style={styles.diamondIcon}
              resizeMode="contain"
            />
            <Text style={styles.amountText}>{currUser.points}</Text>
          </View>
        </View>
        <View style={{ height: 30 }} />
        <View styles={styles.content}>
          <Text style={styles.readText}>Let's Read!</Text>
          <View style={styles.readTextSpacing} />
        </View>
        <Sidebar
          isMenuOpen={isMenuOpen}
          slideAnim={slideAnim}
          handleMenuPress={handleMenuPress}
          currUser={currUser}
          characterImages={characterImages}
          setIsExitDialogOpen={setIsExitDialogOpen}
        />
        {/* Catalog section */}
        <View style={{ height: 60 }} />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.lastRead}>
            <TouchableOpacity
              style={styles.firstBook}
              onPress={() => handleOpenBook(currBook, currUser)}
            >
              <RNImage
                source={{ uri: currBook.cover }}
                style={styles.bookImages}
              />
              <Text style={styles.bookTitle}>{currBook.title}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.catalog}>
            {/* Recommended */}
            <Text style={styles.catalogTitle}>Recommended</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommended.map((book) => (
                <TouchableOpacity
                  key={book.bookId}
                  style={styles.bookCard}
                  onPress={() => handleOpenBook(book, currUser)}
                >
                  <RNImage
                    source={{ uri: book.cover }}
                    style={styles.bookImage}
                  />
                  <Text style={styles.bookLabel}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Teacher Uploads */}
            <Text style={styles.catalogTitle}>Teacher Uploads</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {teacherMaterials.map((book) => (
                <TouchableOpacity
                  key={book.bookId}
                  style={styles.bookCard}
                  onPress={() => handleOpenBook(book, currUser)}
                >
                  <RNImage
                    source={{ uri: book.cover }}
                    style={styles.bookImage}
                  />
                  <Text style={styles.bookLabel}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Student Uploads */}
            <Text style={styles.catalogTitle}>Student Uploads</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {studentUploads.map((book) => (
                <TouchableOpacity
                  key={book.bookId}
                  style={styles.bookCard}
                  onPress={() => handleOpenBook(book, currUser)}
                >
                  <RNImage
                    source={{ uri: book.cover }}
                    style={styles.bookImage}
                  />
                  <Text style={styles.bookLabel}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Books from Ella */}
            <Text style={styles.catalogTitle}>Books from Ella</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {appBooks.map((book) => (
                <TouchableOpacity
                  key={book.bookId}
                  style={styles.bookCard}
                  onPress={() => handleOpenBook(book, currUser)}
                >
                  <RNImage
                    source={{ uri: book.cover }}
                    style={styles.bookImage}
                  />
                  <Text style={styles.bookLabel}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.activeFooterButton]}
            onPress={() => {}}
          >
            <Ionicons
              name="library-outline"
              size={24}
              color={currRoute === 1 ? "#FF9149" : "#fff"}
            />
            <Text
              style={[styles.footerButtonText, styles.activeFooterButtonText]}
            >
              Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => navigation.navigate("Prizes", currUser)}
          >
            <Ionicons
              name="diamond-outline"
              size={24}
              color={currRoute === 0 ? "#FF9149" : "#fff"}
            />
            <Text style={styles.footerButtonText} color="#FF9149">
              Prizes
            </Text>
          </TouchableOpacity>
        </View>
        {/* Exit Confirmation Dialog */}
        <Modal
          visible={isExitDialogOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={handleExitDialogClose}
        >
          <View style={styles.exitDialogOverlay}>
            <View style={styles.exitDialogContainer}>
              <Text style={styles.exitDialogTitle}>Stop Reading?</Text>

              <View style={styles.exitDialogButtons}>
                <TouchableOpacity
                  style={styles.exitDialogButtonYes}
                  onPress={handleExitApp}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.exitDialogButtonText}>Yes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exitDialogButtonNo}
                  onPress={handleExitDialogClose}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.exitDialogButtonText} color="#fff">
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

//Styling
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(96, 181, 255, 0.85)", // optional blue overlay for readability
    width: "100%",
    alignItems: "center",
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "95%",
    marginBottom: 30,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 30,
  },
  characterImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  headerText: {
    flexDirection: "column",
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontFamily: "PixelifySans",
    fontSize: 24,
    textAlign: "center",
    color: "#fff",
  },
  subTitle: {
    fontFamily: "PixelifySans",
    fontSize: 12,
    textAlign: "center",
    color: "#fff",
  },
  menu: {
    fontSize: 40,
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  readText: {
    fontFamily: "Mochi",
    fontSize: 36,
    color: "#fff",
    textAlign: "center",
  },
  readTextSpacing: {
    height: 20,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)", // translucent dark blue
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 50, // makes it pill-shaped
    paddingVertical: 1,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  diamondIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  amountText: {
    color: "white",
    fontSize: 10,
    fontFamily: "Mochi",
  },
  lastRead: {
    alignItems: "center",
  },
  firstBook: {
    borderRadius: 15,
    width: "60%",
    alignItems: "center",
  },
  bookImages: {
    width: "100%",
    height: 130,
    borderRadius: 10,
  },
  bookImage: {
    width: "100%",
    height: 130,
    borderRadius: 10,
  },
  bookTitle: {
    fontFamily: "Poppins",
    fontSize: 16,
    color: "#000000ff",
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  catalog: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  section: {
    marginBottom: 25,
  },
  catalogTitle: {
    fontFamily: "Mochi",
    fontSize: 16,
    color: "#FF9149",
    marginBottom: 10,
    textAlign: "left",
  },
  carousel: {
    flexDirection: "row",
    gap: 10,
  },
  bookCard: {
    width: 110,
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    margin: 10,
  },
  bookCover: {
    width: "100%",
    height: 120,
  },
  bookLabel: {
    fontFamily: "Poppins",
    fontSize: 10,
    color: "#000000ff",
    textAlign: "center",
    paddingHorizontal: 5,
    marginTop: 5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: "row",
    backgroundColor: "#60B5FF",
    paddingHorizontal: 20,
    justifyContent: "space-around",
    alignItems: "center",
  },
  footerButton: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeFooterButton: {
    // Active state styling
  },
  footerButtonText: {
    fontFamily: "Poppins",
    fontSize: 12,
    marginTop: 5,
  },
  activeFooterButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  exitDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitDialogContainer: {
    backgroundColor: "#FF9149",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "70%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exitDialogTitle: {
    fontFamily: "PixelifySans",
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  exitDialogButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  exitDialogButtonYes: {
    backgroundColor: "#FF4444",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
    justifyContent: "center",
  },
  exitDialogButtonNo: {
    backgroundColor: "#4444FF",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
    justifyContent: "center",
  },
  exitDialogButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "PixelifySans",
    fontWeight: "bold",
    marginLeft: 5,
  },
});
