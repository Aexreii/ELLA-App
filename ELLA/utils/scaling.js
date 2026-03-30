import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 375;
const BASE_HEIGHT = 852;

// Hook version — use this inside components
// Automatically updates on rotation, foldables, split-screen
export function useScale() {
  const { width, height } = useWindowDimensions();

  const scale = (size) => (width / BASE_WIDTH) * size;
  const verticalScale = (size) => (height / BASE_HEIGHT) * size;
  const moderateScale = (size, factor = 0.5) =>
    size + (scale(size) - size) * factor;

  return { scale, verticalScale, moderateScale, width, height };
}
