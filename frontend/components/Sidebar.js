import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";

export default function Sidebar({
  isMenuOpen,
  slideAnim,
  handleMenuPress,
  currUser,
  characterImages,
  setIsExitDialogOpen,
}) {
  const navigation = useNavigation();
  return (
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

          <TouchableOpacity
            style={[styles.userSection, { paddingHorizontal: 20 }]}
            onPress={() => console.log("User settings pressed")}
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
    shadowOffset: {
      width: 2,
      height: 0,
    },
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
});
