import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigation, useRoute } from "@react-navigation/native";
import Sidebar from "../components/Sidebar";
import AppHeader from "../components/AppHeader";
import useAppFonts from "../hook/useAppFonts";
import { auth } from "../firebase";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { useScale } from "../utils/scaling";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  // ── Dynamic sticker state ──────────────────────────────
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(true);

  const fontsLoaded = useAppFonts();

  const characterImages = {
    pink: require("../assets/animations/jump_pink.gif"),
    dino: require("../assets/animations/jump_dino.gif"),
    owl: require("../assets/animations/jump_owl.gif"),
  };

  // ── Fetch stickers from Firestore ──────────────────────
  useEffect(() => {
    const fetchStickers = async () => {
      try {
        const db = getFirestore();
        const snap = await getDocs(collection(db, "stickers"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by cost ascending so cheapest appear first
        data.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
        setStickers(data);
      } catch (e) {
        console.log("Fetch stickers error:", e);
        Alert.alert("Error", "Failed to load stickers. Please try again.");
      } finally {
        setLoadingStickers(false);
      }
    };
    fetchStickers();
  }, []);

  if (!fontsLoaded) return null;

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
    const stickerCost = selectedSticker.cost ?? 0;

    if (currentPoints < stickerCost) {
      Alert.alert(
        "Not Enough Points",
        `You need ${stickerCost} points. You have ${currentPoints}.`,
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
      const newPoints = currentPoints - stickerCost;
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
    const stickerCost = item.cost ?? 0;

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
        {/* Sticker image from Firestore imageUrl */}
        <Image
          source={{ uri: item.imageUrl }}
          style={s.stickerImage}
          contentFit="contain"
        />

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
            <Text style={s.costText}>{stickerCost}</Text>
          </View>
        )}

        {!owned && <View style={s.lockedOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.content, { paddingTop: insets.top }]}>
        <AppHeader
          currUser={currUser}
          characterImages={characterImages}
          onAvatarPress={handleMenuPress}
        />

        <Text style={s.sectionTitle}>Sticker Shop</Text>
        <Text style={s.sectionSubtitle}>
          Spend your points on exclusive stickers!
        </Text>

        {loadingStickers ? (
          <ActivityIndicator
            color="#FF9149"
            size="large"
            style={{ marginTop: verticalScale(40) }}
          />
        ) : stickers.length === 0 ? (
          <Text style={s.emptyText}>No stickers available yet. 🎴</Text>
        ) : (
          <FlatList
            data={stickers}
            renderItem={renderSticker}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={s.stickerGrid}
            style={{ width: "100%" }}
          />
        )}
      </View>

      {/* ── Sticker Detail Modal ── */}
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
                {/* Show image if owned, blurred placeholder if not */}
                <View style={s.modalImageWrapper}>
                  {ownedStickers.includes(selectedSticker.id) ? (
                    <Image
                      source={{ uri: selectedSticker.imageUrl }}
                      style={s.modalImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={s.modalImageLocked}>
                      <Ionicons
                        name="lock-closed"
                        size={scale(36)}
                        color="#bbb"
                      />
                    </View>
                  )}
                </View>

                <Text style={s.modalTitle}>{selectedSticker.name}</Text>
                <Text style={s.modalDesc}>
                  A fun sticker to show off your achievement!
                </Text>

                <View style={s.modalCostRow}>
                  <Image
                    source={require("../assets/icons/diamond.png")}
                    style={s.modalCostIcon}
                  />
                  <Text style={s.modalCostText}>
                    {selectedSticker.cost ?? 0} points
                  </Text>
                </View>

                <Text style={s.modalBalance}>
                  Your balance:{" "}
                  <Text
                    style={{
                      color:
                        (currUser?.points ?? 0) >= (selectedSticker.cost ?? 0)
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
                      ((currUser?.points ?? 0) < (selectedSticker.cost ?? 0) ||
                        ownedStickers.includes(selectedSticker?.id)) &&
                        s.modalBuyButtonDisabled,
                    ]}
                    onPress={handleBuy}
                    disabled={
                      purchasing ||
                      (currUser?.points ?? 0) < (selectedSticker.cost ?? 0) ||
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

      {/* ── Footer ── */}
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
    container: { flex: 1, backgroundColor: "#fff" },
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
    emptyText: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#aaa",
      marginTop: verticalScale(40),
      textAlign: "center",
    },

    stickerGrid: {
      paddingHorizontal: scale(10),
      paddingBottom: verticalScale(20),
      alignItems: "center",
    },
    stickerCard: {
      width: scale(100),
      height: verticalScale(130),
      borderRadius: scale(16),
      margin: scale(8),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      overflow: "hidden",
      paddingVertical: verticalScale(8),
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

    // ── Sticker image (from URL) ──
    stickerImage: {
      width: scale(52),
      height: scale(52),
      marginBottom: verticalScale(4),
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

    // ── Modal ──
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
    modalImageWrapper: {
      width: scale(100),
      height: scale(100),
      marginBottom: verticalScale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    modalImage: {
      width: scale(100),
      height: scale(100),
    },
    modalImageLocked: {
      width: scale(100),
      height: scale(100),
      borderRadius: scale(16),
      backgroundColor: "#f0f0f0",
      alignItems: "center",
      justifyContent: "center",
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
    activeFooterButton: {},
    footerButtonText: {
      fontFamily: "Poppins",
      fontSize: scale(12),
      marginTop: verticalScale(5),
      color: "#fff",
    },
    activeFooterButtonText: { color: "#FF9149", fontWeight: "bold" },
  });
