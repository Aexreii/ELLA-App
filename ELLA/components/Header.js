import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

export default function Header({
  currUser,
  characterImages,
  handleMenuPress,
  styles,
}) {
  return (
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
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "95%",
    marginBottom: 30,
    marginTop: 0,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 30,
    marginLeft: 10,
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
});
