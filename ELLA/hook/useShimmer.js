import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export default function useShimmer() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
}
