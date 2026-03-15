import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Base dimensions from your design
const BASE_WIDTH = 375;
const BASE_HEIGHT = 852; // adjust to your design height

export const scale = (size) => (width / BASE_WIDTH) * size; // horizontal scaling
export const verticalScale = (size) => (height / BASE_HEIGHT) * size; // vertical scaling
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor; // softer scaling
