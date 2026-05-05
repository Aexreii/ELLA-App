import React, { useContext } from "react";
import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 375;
const BASE_HEIGHT = 852;

// Context that holds the effective (pillarboxed) dimensions.
// App.js writes the real container size here; every component reads from it.
const ScaleContext = React.createContext({
  effectiveWidth: BASE_WIDTH,
  effectiveHeight: BASE_HEIGHT,
});

/**
 * Wrap your app once (inside App.js) to supply the true container size.
 * On phones this is just the screen size; on tablets it's the pillarboxed width.
 */
export function ScaleProvider({ effectiveWidth, effectiveHeight, children }) {
  return (
    <ScaleContext.Provider value={{ effectiveWidth, effectiveHeight }}>
      {children}
    </ScaleContext.Provider>
  );
}

/**
 * Hook — use this inside any component instead of raw useWindowDimensions.
 * Automatically uses the container size so tablets scale like a phone.
 */
export function useScale() {
  const { effectiveWidth, effectiveHeight } = useContext(ScaleContext);

  const scale = (size) => (effectiveWidth / BASE_WIDTH) * size;
  const verticalScale = (size) => (effectiveHeight / BASE_HEIGHT) * size;
  const moderateScale = (size, factor = 0.5) =>
    size + (scale(size) - size) * factor;

  return {
    scale,
    verticalScale,
    moderateScale,
    width: effectiveWidth,
    height: effectiveHeight,
  };
}
