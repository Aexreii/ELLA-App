import React, { useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useScale } from "../utils/scaling";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMusic } from "../hook/MusicContext";
import CustomSlider from "../components/CustomSlider";
import { pronounceWord } from "../utils/speechHelper";
import { Audio } from "expo-av";

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------
const VOICES = [
  { name: "en-US-Neural2-F", label: "Aria", gender: "Female", icon: "👩" },
  { name: "en-US-Neural2-C", label: "Clara", gender: "Female", icon: "👧" },
  { name: "en-US-Neural2-A", label: "Adam", gender: "Male", icon: "👦" },
  { name: "en-US-Neural2-D", label: "Dylan", gender: "Male", icon: "👨" },
];

export default function Settings() {
  const navigation = useNavigation();
  const { scale, verticalScale } = useScale();
  const insets = useSafeAreaInsets();

  // Pull everything from context — no local duplicates for audio values
  const { setVolume, soundVolume, setSoundVolume, ttsVoice, setTtsVoice } =
    useMusic();

  // Local state only for UI-only settings (not persisted in context)
  const [musicVolume, setMusicVolume] = React.useState(0.4);
  const [textSize, setTextSize] = React.useState("Medium");
  const [notifications, setNotifications] = React.useState(true);

  const musicDebounce = useRef(null);
  const soundDebounce = useRef(null);

  const handleVoicePreview = async (voiceName) => {
    setTtsVoice(voiceName);
    try {
      const result = await pronounceWord("I love Reading Books!", voiceName);
      if (result?.audio) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${result.audio}` },
          { shouldPlay: true, volume: soundVolume ?? 0.8 },
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) sound.unloadAsync();
        });
      }
    } catch (e) {
      console.log("[TTS preview] error:", e);
    }
  };

  // Music slider — debounced so dragging doesn't spam setVolumeAsync
  const handleMusicChange = useCallback(
    (val) => {
      setMusicVolume(val);
      if (musicDebounce.current) clearTimeout(musicDebounce.current);
      musicDebounce.current = setTimeout(() => setVolume(val), 200);
    },
    [setVolume],
  );

  // Sound FX slider — updates context value (ReadBook reads it on next tap)
  const handleSoundChange = useCallback(
    (val) => {
      if (soundDebounce.current) clearTimeout(soundDebounce.current);
      soundDebounce.current = setTimeout(() => setSoundVolume(val), 200);
    },
    [setSoundVolume],
  );

  const s = getStyles(scale, verticalScale);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={s.body}>
        {/* Audio Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Audio</Text>

          <View style={s.row}>
            <Text style={s.rowLabel}>Music</Text>
            <CustomSlider
              value={musicVolume}
              onValueChange={handleMusicChange}
            />
          </View>

          <View style={s.row}>
            <Text style={s.rowLabel}>Sound</Text>
            <CustomSlider
              value={soundVolume}
              onValueChange={handleSoundChange}
            />
          </View>
        </View>

        <View style={s.divider} />

        {/* Text Size Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Reader Voice</Text>
          <View style={s.voiceGrid}>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.name}
                style={[
                  s.voiceButton,
                  ttsVoice === v.name && s.voiceButtonActive,
                ]}
                onPress={() => handleVoicePreview(v.name)}
                activeOpacity={0.8}
              >
                <Text style={s.voiceIcon}>{v.icon}</Text>
                <Text
                  style={[
                    s.voiceLabel,
                    ttsVoice === v.name && s.voiceLabelActive,
                  ]}
                >
                  {v.label}
                </Text>
                <Text style={s.voiceGender}>{v.gender}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notifications</Text>
          <View style={s.row}>
            <Text style={s.notifLabel}>Receive Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#e0e0e0", true: "#FF9149" }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f2f2f2",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#60B5FF",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(18),
    },
    backButton: {
      width: scale(40),
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "PixelifySans",
      fontSize: scale(22),
      color: "#fff",
      textAlign: "center",
      flex: 1,
    },
    body: {
      flex: 1,
      paddingHorizontal: scale(20),
      paddingTop: verticalScale(20),
    },
    section: {
      marginBottom: verticalScale(8),
    },
    sectionTitle: {
      fontFamily: "PoppinsBold",
      fontSize: scale(16),
      color: "#333",
      marginBottom: verticalScale(12),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(12),
    },
    rowLabel: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#444",
      width: scale(70),
    },
    notifLabel: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#444",
      width: scale(250),
    },
    divider: {
      height: 1,
      backgroundColor: "#ddd",
      marginVertical: verticalScale(16),
    },
    voiceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: scale(10),
    },
    voiceButton: {
      width: scale(75),
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(10),
      borderRadius: scale(16),
      backgroundColor: "#fff",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#e0e0e0",
    },
    voiceButtonActive: {
      borderColor: "#FF9149",
      backgroundColor: "#FFF4EE",
    },
    voiceIcon: {
      fontSize: scale(24),
      marginBottom: verticalScale(4),
    },
    voiceLabel: {
      fontFamily: "PoppinsBold",
      fontSize: scale(13),
      color: "#333",
    },
    voiceLabelActive: {
      color: "#FF9149",
    },
    voiceGender: {
      fontFamily: "Poppins",
      fontSize: scale(10),
      color: "#aaa",
      marginTop: verticalScale(2),
    },
  });
