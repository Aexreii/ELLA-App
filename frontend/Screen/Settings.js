import React, { useContext, useState } from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

import { SettingsContext } from "../components/SettingsContext";

export default function Settings({ navigation }) {
  const { textSize, setTextSize } = useContext(SettingsContext);

  const [music, setMusic] = useState(0.5);
  const [sound, setSound] = useState(0.5);
  const [notifEnabled, setNotifEnabled] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* AUDIO SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Music</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={music}
            onValueChange={setMusic}
            minimumTrackTintColor="#FF9149"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#fff"
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Sound</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={sound}
            onValueChange={setSound}
            minimumTrackTintColor="#FF9149"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#fff"
          />
        </View>
      </View>

      <View style={styles.divider} />

      {/* TEXT SIZE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Size</Text>

        <View style={styles.textSizeRow}>
          {["small", "medium", "large"].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sizeButton,
                textSize === size && styles.sizeButtonActive,
              ]}
              onPress={() => setTextSize(size)}
            >
              <Text
                style={[
                  styles.sizeButtonText,
                  textSize === size && styles.sizeButtonTextActive,
                ]}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* NOTIFICATION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Receive Notifications</Text>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            thumbColor={notifEnabled ? "#fff" : "#fff"}
            trackColor={{ true: "#FF9149", false: "#ddd" }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#63B3FF",
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1,
  },

  /* SECTIONS */
  section: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  label: {
    fontSize: 16,
    width: 90,
  },

  slider: {
    flex: 1,
    height: 40,
  },

  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginHorizontal: 20,
  },

  /* TEXT SIZE BUTTONS */
  textSizeRow: {
    flexDirection: "row",
    gap: 12,
  },

  sizeButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 25,
    backgroundColor: "#FFD2B2",
  },

  sizeButtonActive: {
    backgroundColor: "#FF9149",
  },

  sizeButtonText: {
    fontSize: 16,
    color: "#333",
  },

  sizeButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
});
