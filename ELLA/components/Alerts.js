import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useScale } from "../utils/scaling";

const TYPE_CONFIG = {
  success: { icon: "checkmark-circle", color: "#4CAF50", bg: "#f0faf0" },
  error: { icon: "close-circle", color: "#E53935", bg: "#fff5f5" },
  warning: { icon: "warning", color: "#FF9149", bg: "#fff8f0" },
  info: { icon: "information-circle", color: "#60B5FF", bg: "#f0f8ff" },
  confirm: { icon: "help-circle", color: "#60B5FF", bg: "#f0f8ff" },
};

export default function Ellalert({ config, onClose }) {
  const { scale, verticalScale } = useScale();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = !!config;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 160,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!config) return null;

  const type = config.type ?? "info";
  const { icon, color, bg } = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

  const buttons = config.buttons ?? [
    { text: config.okText ?? "Got it!", style: "default" },
  ];

  const handlePress = (btn) => {
    onClose();
    btn.onPress?.();
  };

  const s = getStyles(scale, verticalScale);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Animated.View
          style={[
            s.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* ── Icon badge ── */}
          <View style={[s.iconBadge, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={scale(50)} color={color} />
          </View>

          {/* ── Title ── */}
          <Text style={s.title}>{config.title ?? "Hey!"}</Text>

          {/* ── Message ── */}
          {config.message ? (
            <Text style={s.message}>{config.message}</Text>
          ) : null}

          {/* ── Divider ── */}
          <View style={s.divider} />

          {/* ── Buttons ── */}
          {/* ── Buttons ── */}
          <View style={s.buttonRow}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.button,
                    isDestructive && s.buttonDestructive,
                    isCancel && s.buttonCancel,
                    !isDestructive && !isCancel && s.buttonDefault,
                    // Add margin only if there is a next button
                    i < buttons.length - 1 && { marginRight: scale(12) },
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.buttonText,
                      isDestructive && s.buttonTextDestructive,
                      isCancel && s.buttonTextCancel,
                      !isDestructive && !isCancel && s.buttonTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// useEllAlert — convenience hook
//
// const { alertConfig, showAlert, closeAlert } = useEllAlert();
// <EllAlert config={alertConfig} onClose={closeAlert} />
// showAlert({ type: "error", title: "Oops!", message: "Try again." });
// ─────────────────────────────────────────────────────────────
export function useEllAlert() {
  const [alertConfig, setAlertConfig] = React.useState(null);

  const showAlert = (config) => setAlertConfig(config);
  const closeAlert = () => setAlertConfig(null);

  return { alertConfig, showAlert, closeAlert };
}

const getStyles = (scale, verticalScale) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scale(32),
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: scale(24),
      padding: scale(20),
      width: "100%",
      alignItems: "center",
      elevation: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: scale(16),
    },
    iconBadge: {
      width: scale(60),
      height: scale(60),
      borderRadius: scale(40),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: verticalScale(10),
    },
    title: {
      fontFamily: "Mochi",
      fontSize: scale(24),
      color: "#1a1a2e",
      textAlign: "center",
      marginBottom: verticalScale(8),
    },
    message: {
      fontFamily: "Poppins",
      fontSize: scale(14),
      color: "#4b4b4b",
      textAlign: "center",
      lineHeight: scale(22),
      marginBottom: verticalScale(4),
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: "#f0f0f0",
      marginVertical: verticalScale(20),
    },

    buttonDefault: {
      backgroundColor: "#FF9149",
      borderWidth: 1.5,
      borderColor: "#e07030",
    },
    buttonDestructive: {
      backgroundColor: "#E53935",
      borderWidth: 1.5,
      borderColor: "#c62828",
    },
    buttonCancel: {
      backgroundColor: "#f2f2f2",
      borderWidth: 1.5,
      borderColor: "#ddd",
    },

    buttonRow: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      marginTop: verticalScale(5),
    },
    button: {
      paddingVertical: verticalScale(10),
      paddingHorizontal: scale(15),
      borderRadius: scale(20),
      width: scale(120),
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontFamily: "PoppinsBold",
      fontSize: scale(12),
      textAlign: "center",
    },
    buttonTextDefault: { color: "#fff" },
    buttonTextDestructive: { color: "#fff" },
    buttonTextCancel: { color: "#555" },
  });
