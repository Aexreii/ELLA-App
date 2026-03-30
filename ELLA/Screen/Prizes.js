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
import AppHeader from "../components/AppHeader";
import useAppFonts from "../hook/useAppFonts";
import { auth } from "../firebase";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { useScale } from "../utils/scaling";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STICKER_COST = 50;

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
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  const { currUser: initialUser } = route.params || {};
  const [currUser, setCurrUser] = useState(initialUser || {});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-300))[0];
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
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

  const handleBuy = async () => {
    if (!selectedSticker) return;
    const currentPoints = currUser?.points ?? 0;
    if (currentPoints < STICKER_COST) {
      Alert.alert(
        "Not Enough Points",
        `You need ${STICKER_COST} points. You have ${currentPoints}.`,
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
        Alert.alert("Error", "You must be logged in.");
        return;
      }
      const db = getFirestore();
      const newPoints = currentPoints - STICKER_COST;
      const newOwnedStickers = [...ownedStickers, selectedSticker.id];
      await updateDoc(doc(db, "users", user.uid), {
        points: newPoints,
        ownedStickers: newOwnedStickers,
      });
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

  const s = getStyles(scale, verticalScale);

  const renderSticker = ({ item }) => {
    const owned = ownedStickers.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          s.stickerCard,
          owned ? s.stickerCardOwned : s.stickerCardLocked,
        ]}
        onPress={() => {
          setSelectedSticker(item);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={s.stickerEmoji}>{item.emoji}</Text>
        <Text style={[s.stickerName, !owned && s.stickerNameLocked]}>
          {item.name}
        </Text>
        {owned ? (
          <View style={s.ownedBadge}>
            <Text style={s.ownedBadgeText}>Owned</Text>
          </View>
        ) : (
          <View style={s.costBadge}>
            <Image
              source={require("../assets/icons/diamond.png")}
              style={s.costIcon}
            />
            <Text style={s.costText}>{STICKER_COST}</Text>
          </View>
        )}
        {!owned && <View style={s.lockedOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    // FIX: Root container has NO paddingTop so footer stays anchored correctly
    <View style={s.container}>
      {/* FIX: insets.top only on the content area, not the root */}
      <View style={[s.content, { paddingTop: insets.top }]}>
        <AppHeader
          currUser={currUser}
          characterImages={characterImages}
          onAvatarPress={handleMenuPress}
        />

        <Text style={s.sectionTitle}>Sticker Shop</Text>
        <Text style={s.sectionSubtitle}>
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
          contentContainerStyle={s.stickerGrid}
          style={{ width: "100%" }}
        />
      </View>

      {/* Sticker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            {selectedSticker && (
              <>
                <Text
                  style={
                    ownedStickers.includes(selectedSticker.id)
                      ? s.modalEmoji
                      : s.modalEmojiLocked
                  }
                >
                  {ownedStickers.includes(selectedSticker.id)
                    ? selectedSticker.emoji
                    : "?"}
                </Text>
                <Text style={s.modalTitle}>{selectedSticker.name}</Text>
                <Text style={s.modalDesc}>
                  A fun sticker to show off your achievement!
                </Text>
                <View style={s.modalCostRow}>
                  <Image
                    source={require("../assets/icons/diamond.png")}
                    style={s.modalCostIcon}
                  />
                  <Text style={s.modalCostText}>{STICKER_COST} points</Text>
                </View>
                <Text style={s.modalBalance}>
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
                <View style={s.modalButtons}>
                  <TouchableOpacity
                    style={s.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.modalBuyButton,
                      ((currUser?.points ?? 0) < STICKER_COST ||
                        ownedStickers.includes(selectedSticker?.id)) &&
                        s.modalBuyButtonDisabled,
                    ]}
                    onPress={handleBuy}
                    disabled={
                      purchasing ||
                      (currUser?.points ?? 0) < STICKER_COST ||
                      ownedStickers.includes(selectedSticker?.id)
                    }
                  >
                    <Text style={s.modalBuyText}>
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

      <Sidebar
        isMenuOpen={isMenuOpen}
        slideAnim={slideAnim}
        handleMenuPress={handleMenuPress}
        currUser={currUser}
        characterImages={characterImages}
        setIsExitDialogOpen={setIsExitDialogOpen}
      />

      {/* Footer — anchored to bottom of root container, no insets */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.footerButton}
          onPress={() => navigation.navigate("HomeScreen")}
        >
          <Ionicons name="library-outline" size={scale(24)} color="#fff" />
          <Text style={s.footerButtonText}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.footerButton, s.activeFooterButton]}
          onPress={() => {}}
        >
          <Ionicons name="diamond-outline" size={scale(24)} color="#FF9149" />
          <Text style={[s.footerButtonText, s.activeFooterButtonText]}>
            Prizes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    // Root container — no padding so absolute footer is always correct
    container: { flex: 1, backgroundColor: "#fff" },

    // Inner content area — takes up all space above the footer
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: verticalScale(70),
    },

    sectionTitle: {
      fontFamily: "Mochi",
      fontSize: scale(24),
      color: "#FF9149",
      marginTop: verticalScale(10),
    },
    sectionSubtitle: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#666",
      marginBottom: verticalScale(10),
    },
    stickerGrid: {
      paddingHorizontal: scale(10),
      paddingBottom: verticalScale(20),
      alignItems: "center",
    },

    stickerCard: {
      width: scale(100),
      height: verticalScale(120),
      borderRadius: scale(16),
      margin: scale(8),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      overflow: "hidden",
    },
    stickerCardOwned: { backgroundColor: "#fff5ee", borderColor: "#FF9149" },
    stickerCardLocked: { backgroundColor: "#f5f5f5", borderColor: "#ddd" },
    lockedOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(180, 180, 180, 0.55)",
    },

    stickerEmoji: { fontSize: scale(36), marginBottom: verticalScale(4) },
    stickerEmojiLocked: {
      fontSize: scale(36),
      marginBottom: verticalScale(4),
      color: "#aaa",
    },
    stickerName: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      color: "#333",
      textAlign: "center",
      paddingHorizontal: scale(4),
    },
    stickerNameLocked: { color: "#aaa" },

    costBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#60B5FF",
      borderRadius: scale(20),
      paddingHorizontal: scale(6),
      paddingVertical: 2,
      marginTop: verticalScale(4),
    },
    costIcon: { width: scale(10), height: scale(10), marginRight: scale(3) },
    costText: { color: "#fff", fontSize: scale(10), fontFamily: "Poppins" },
    ownedBadge: {
      backgroundColor: "#FF9149",
      borderRadius: scale(20),
      paddingHorizontal: scale(8),
      paddingVertical: 2,
      marginTop: verticalScale(4),
    },
    ownedBadgeText: {
      color: "#fff",
      fontSize: scale(10),
      fontFamily: "Poppins",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: "#fff",
      borderRadius: scale(24),
      padding: scale(30),
      width: "80%",
      alignItems: "center",
      elevation: 10,
    },
    modalEmoji: { fontSize: scale(64), marginBottom: verticalScale(10) },
    modalEmojiLocked: {
      fontSize: scale(64),
      marginBottom: verticalScale(10),
      color: "#bbb",
    },
    modalTitle: {
      fontFamily: "Mochi",
      fontSize: scale(22),
      color: "#333",
      marginBottom: verticalScale(6),
    },
    modalDesc: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#666",
      textAlign: "center",
      marginBottom: verticalScale(16),
    },
    modalCostRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(6),
    },
    modalCostIcon: {
      width: scale(16),
      height: scale(16),
      marginRight: scale(6),
    },
    modalCostText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(16),
      color: "#FF9149",
    },
    modalBalance: {
      fontFamily: "Poppins",
      fontSize: scale(13),
      color: "#444",
      marginBottom: verticalScale(20),
    },
    modalButtons: { flexDirection: "row", gap: scale(12) },
    modalCancelButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(24),
      borderRadius: scale(20),
      borderWidth: 1.5,
      borderColor: "#ccc",
    },
    modalCancelText: {
      fontFamily: "Poppins",
      fontSize: scale(15),
      color: "#555",
    },
    modalBuyButton: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(28),
      borderRadius: scale(20),
      backgroundColor: "#FF9149",
    },
    modalBuyButtonDisabled: { backgroundColor: "#ccc" },
    modalBuyText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(15),
      color: "#fff",
    },

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
    activeFooterButton: {},
    footerButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      marginTop: verticalScale(5),
      color: "#fff",
    },
    activeFooterButtonText: { color: "#FF9149", fontWeight: "bold" },
  });
