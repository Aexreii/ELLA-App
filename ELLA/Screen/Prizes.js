import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation, useRoute } from "@react-navigation/native";
import Sidebar from "../components/Sidebar";
import useAppFonts from "../hook/useAppFonts";

// FIX: Import auth and db from firebase.js — same pattern as all other screens
import { auth } from "../firebase";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

const STICKER_COST = 50;

// Sticker catalog — add image sources here when ready
const STICKERS = [
  { id: "1", name: "Star Sticker", emoji: "⭐" },
  { id: "2", name: "Heart Sticker", emoji: "❤️" },
  { id: "3", name: "Fire Sticker", emoji: "🔥" },
  { id: "4", name: "Crown Sticker", emoji: "👑" },
  { id: "5", name: "Rainbow Sticker", emoji: "🌈" },
  { id: "6", name: "Moon Sticker", emoji: "🌙" },
  { id: "7", name: "Sun Sticker", emoji: "☀️" },
  { id: "8", name: "Flower Sticker", emoji: "🌸" },
];

export default function Prizes() {
  const navigation = useNavigation();
  const route = useRoute();

  // FIX: currUser is passed as { currUser } from HomeScreen, not as raw params
  const { currUser: initialUser } = route.params || {};
  const [currUser, setCurrUser] = useState(initialUser || {});

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-300))[0];

  // Sticker modal state
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Track owned stickers locally
  const [ownedStickers, setOwnedStickers] = useState(
    currUser?.ownedStickers || [],
  );

  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;

  const characterImages = {
    pink: require("../assets/animations/jump_pink.gif"),
    dino: require("../assets/animations/jump_dino.gif"),
    owl: require("../assets/animations/jump_owl.gif"),
  };

  const handleMenuPress = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleStickerPress = (sticker) => {
    setSelectedSticker(sticker);
    setModalVisible(true);
  };

  const handleBuy = async () => {
    if (!selectedSticker) return;

    const currentPoints = currUser?.points ?? 0;

    if (currentPoints < STICKER_COST) {
      Alert.alert(
        "Not Enough Points",
        `You need ${STICKER_COST} points to buy this sticker. You have ${currentPoints} points.`,
      );
      return;
    }

    if (ownedStickers.includes(selectedSticker.id)) {
      Alert.alert("Already Owned", "You already own this sticker!");
      return;
    }

    try {
      setPurchasing(true);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to buy stickers.");
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, "users", user.uid);

      const newPoints = currentPoints - STICKER_COST;
      const newOwnedStickers = [...ownedStickers, selectedSticker.id];

      await updateDoc(userRef, {
        points: newPoints,
        ownedStickers: newOwnedStickers,
      });

      // Update local state so UI reflects immediately
      setCurrUser((prev) => ({ ...prev, points: newPoints }));
      setOwnedStickers(newOwnedStickers);

      setModalVisible(false);
      Alert.alert("Purchased!", `You got the ${selectedSticker.name}! 🎉`);
    } catch (error) {
      console.log("Error buying sticker:", error);
      Alert.alert("Error", error.message);
    } finally {
      setPurchasing(false);
    }
  };

  const renderSticker = ({ item }) => {
    const owned = ownedStickers.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.stickerCard, owned && styles.stickerCardOwned]}
        onPress={() => handleStickerPress(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.stickerEmoji}>{item.emoji}</Text>
        <Text style={styles.stickerName}>{item.name}</Text>
        {owned ? (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>Owned</Text>
          </View>
        ) : (
          <View style={styles.costBadge}>
            <Image
              source={require("../assets/icons/diamond.png")}
              style={styles.costIcon}
            />
            <Text style={styles.costText}>{STICKER_COST}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.avatarContainer}
        >
          <Image
            source={characterImages[currUser?.character]}
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
          <Text style={styles.amountText}>{currUser?.points ?? 0}</Text>
        </View>
      </View>

      {/* Sticker Gallery */}
      <Text style={styles.sectionTitle}>Sticker Shop</Text>
      <Text style={styles.sectionSubtitle}>
        Each sticker costs{" "}
        <Text style={{ color: "#FF9149", fontFamily: "PoppinsBold" }}>
          {STICKER_COST} points
        </Text>
      </Text>

      <FlatList
        data={STICKERS}
        renderItem={renderSticker}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.stickerGrid}
        style={{ width: "100%" }}
      />

      {/* Sticker Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedSticker && (
              <>
                <Text style={styles.modalEmoji}>{selectedSticker.emoji}</Text>
                <Text style={styles.modalTitle}>{selectedSticker.name}</Text>
                <Text style={styles.modalDesc}>
                  A fun sticker to show off your achievement!
                </Text>

                <View style={styles.modalCostRow}>
                  <Image
                    source={require("../assets/icons/diamond.png")}
                    style={styles.modalCostIcon}
                  />
                  <Text style={styles.modalCostText}>
                    {STICKER_COST} points
                  </Text>
                </View>

                <Text style={styles.modalBalance}>
                  Your balance:{" "}
                  <Text
                    style={{
                      color:
                        (currUser?.points ?? 0) >= STICKER_COST
                          ? "#4CAF50"
                          : "#E53935",
                    }}
                  >
                    {currUser?.points ?? 0} points
                  </Text>
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalBuyButton,
                      ((currUser?.points ?? 0) < STICKER_COST ||
                        ownedStickers.includes(selectedSticker?.id)) &&
                        styles.modalBuyButtonDisabled,
                    ]}
                    onPress={handleBuy}
                    disabled={
                      purchasing ||
                      (currUser?.points ?? 0) < STICKER_COST ||
                      ownedStickers.includes(selectedSticker?.id)
                    }
                  >
                    <Text style={styles.modalBuyText}>
                      {purchasing
                        ? "Buying..."
                        : ownedStickers.includes(selectedSticker?.id)
                          ? "Owned"
                          : "Buy"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sidebar */}
      <Sidebar
        isMenuOpen={isMenuOpen}
        slideAnim={slideAnim}
        handleMenuPress={handleMenuPress}
        currUser={currUser}
        characterImages={characterImages}
        setIsExitDialogOpen={setIsExitDialogOpen}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Ionicons name="library-outline" size={24} color="#fff" />
          <Text style={styles.footerButtonText}>Library</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, styles.activeFooterButton]}
          onPress={() => {}}
        >
          <Ionicons name="diamond-outline" size={24} color="#FF9149" />
          <Text
            style={[styles.footerButtonText, styles.activeFooterButtonText]}
          >
            Prizes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: "#60B5FF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
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
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 50,
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
  sectionTitle: {
    fontFamily: "Mochi",
    fontSize: 24,
    color: "#FF9149",
    marginTop: 10,
  },
  sectionSubtitle: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  stickerGrid: {
    paddingHorizontal: 10,
    paddingBottom: 90,
    alignItems: "center",
  },
  stickerCard: {
    width: 100,
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  stickerCardOwned: {
    borderColor: "#FF9149",
    backgroundColor: "#fff5ee",
  },
  stickerEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  stickerName: {
    fontFamily: "Poppins",
    fontSize: 10,
    color: "#333",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#60B5FF",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  costIcon: {
    width: 10,
    height: 10,
    marginRight: 3,
  },
  costText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins",
  },
  ownedBadge: {
    backgroundColor: "#FF9149",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  ownedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    width: "80%",
    alignItems: "center",
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: "Mochi",
    fontSize: 22,
    color: "#333",
    marginBottom: 6,
  },
  modalDesc: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  modalCostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  modalCostIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  modalCostText: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#FF9149",
  },
  modalBalance: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#444",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ccc",
  },
  modalCancelText: {
    fontFamily: "Poppins",
    fontSize: 15,
    color: "#555",
  },
  modalBuyButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: "#FF9149",
  },
  modalBuyButtonDisabled: {
    backgroundColor: "#ccc",
  },
  modalBuyText: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: "#fff",
  },
  // Footer
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
  activeFooterButton: {},
  footerButtonText: {
    fontFamily: "Poppins",
    fontSize: 12,
    marginTop: 5,
    color: "#fff",
  },
  activeFooterButtonText: {
    color: "#FF9149",
    fontWeight: "bold",
  },
});
