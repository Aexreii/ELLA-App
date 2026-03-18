import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Sidebar({
  isMenuOpen,
  slideAnim,
  handleMenuPress,
  currUser,
  characterImages,
  setIsExitDialogOpen,
}) {
  const navigation = useNavigation();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      setLogoutModalVisible(false);
      handleMenuPress(); // close sidebar
      // Replace entire stack so user can't go back after logout
      navigation.reset({
        index: 0,
        routes: [{ name: "StartUp" }],
      });
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="none"
        onRequestClose={handleMenuPress}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={handleMenuPress}
          />
          <Animated.View
            style={[
              styles.menuContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View style={styles.titleSection}>
              <Text style={styles.menuTitle}>ELLA</Text>
              <Text style={styles.menuSubtitle}>Your English Buddy</Text>
            </View>

            <View style={styles.spacing} />
            <View style={styles.horizontalLine} />

            {/* User section — tap to open logout menu */}
            <TouchableOpacity
              style={[styles.userSection, { paddingHorizontal: 20 }]}
              onPress={() => setLogoutModalVisible(true)}
            >
              <View style={styles.userSettings}>
                <Image
                  source={characterImages[currUser.character]}
                  style={styles.userAvatar}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{currUser.name}</Text>
                <Text style={styles.userRole}>{currUser.role}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#aaa" />
            </TouchableOpacity>

            <View style={styles.horizontalLine} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
              <Text style={styles.menuButtonText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => console.log("Enroll to class pressed")}
            >
              <Ionicons name="add-circle-outline" size={24} color="#333" />
              <Text style={styles.menuButtonText}>Enroll to class</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => console.log("Contact us pressed")}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#333" />
              <Text style={styles.menuButtonText}>Contact us</Text>
            </TouchableOpacity>

            <View style={styles.horizontalLine} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => console.log("About ELLA pressed")}
            >
              <Ionicons name="people-outline" size={24} color="#333" />
              <Text style={styles.menuButtonText}>About ELLA</Text>
            </TouchableOpacity>

            <View style={styles.exitButtonContainer}>
              <TouchableOpacity
                style={styles.exitButton}
                onPress={() => setIsExitDialogOpen(true)}
              >
                <Ionicons name="exit-outline" size={16} color="#fff" />
                <Text style={styles.exitButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutContainer}>
            {/* User info at top of modal */}
            <Image
              source={characterImages[currUser.character]}
              style={styles.logoutAvatar}
            />
            <Text style={styles.logoutName}>{currUser.name}</Text>
            <Text style={styles.logoutRole}>{currUser.role}</Text>

            <View style={styles.logoutDivider} />

            <Text style={styles.logoutQuestion}>Do you want to log out?</Text>

            <View style={styles.logoutButtons}>
              <TouchableOpacity
                style={styles.logoutCancelButton}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.logoutConfirmButton,
                  loggingOut && { opacity: 0.6 },
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutConfirmText}>
                  {loggingOut ? "Logging out..." : "Log Out"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
  },
  modalBackground: {
    flex: 1,
  },
  menuContainer: {
    position: "absolute",
    left: 0,
    bottom: 0,
    top: 0,
    height: "100%",
    width: 290,
    backgroundColor: "white",
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  menuTitle: {
    fontFamily: "PixelifySans",
    fontSize: 48,
    color: "#FF9149",
    textAlign: "center",
    marginBottom: 8,
  },
  menuSubtitle: {
    fontFamily: "PixelifySans",
    fontSize: 14,
    color: "#FF9149",
    textAlign: "center",
    marginBottom: 20,
  },
  spacing: {
    height: 30,
  },
  horizontalLine: {
    height: 1,
    backgroundColor: "#ddd",
    width: "100%",
    marginVertical: 15,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  userSettings: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 25,
    marginLeft: 0,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#000",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: "Poppins",
    fontSize: 19,
    color: "#333",
    fontWeight: "bold",
  },
  userRole: {
    fontFamily: "Poppins",
    fontSize: 11,
    color: "#666",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: "100%",
  },
  menuButtonText: {
    fontFamily: "Poppins",
    fontSize: 16,
    color: "#333",
    marginLeft: 15,
    fontWeight: "bold",
  },
  exitButtonContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  exitButton: {
    backgroundColor: "#FF9149",
    width: 64,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  exitButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "PixelifySans",
    fontWeight: "bold",
    marginLeft: 4,
  },

  // Logout modal
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "78%",
    alignItems: "center",
    elevation: 10,
  },
  logoutAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#FF9149",
    marginBottom: 10,
  },
  logoutName: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  logoutRole: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  logoutDivider: {
    height: 1,
    backgroundColor: "#eee",
    width: "100%",
    marginVertical: 16,
  },
  logoutQuestion: {
    fontFamily: "Poppins",
    fontSize: 15,
    color: "#444",
    marginBottom: 20,
    textAlign: "center",
  },
  logoutButtons: {
    flexDirection: "row",
    gap: 12,
  },
  logoutCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ccc",
  },
  logoutCancelText: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "#555",
  },
  logoutConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#E53935",
  },
  logoutConfirmText: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
});
