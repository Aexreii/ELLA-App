import React, { useRef } from "react";
import { View, Animated, StyleSheet, PanResponder } from "react-native";

const THUMB_SIZE = 26;
const TRACK_HEIGHT = 14;

// min, max, step — supports both 0-1 float ranges and integer ranges like age
export default function CustomSlider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0,
  trackColor = "#FF9149",
  trackBgColor = "#e0e0e0",
}) {
  const trackWidth = useRef(0);
  const valueAtGrant = useRef(value);
  const currentValue = useRef(value);

  // Normalize value to 0-1 for animation
  const normalize = (v) => (v - min) / (max - min);
  const denormalize = (n) => n * (max - min) + min;

  const clampRaw = (v) => Math.max(min, Math.min(max, v));

  const applyStep = (v) => {
    if (step <= 0) return v;
    return Math.round((v - min) / step) * step + min;
  };

  const fillAnim = useRef(new Animated.Value(normalize(value))).current;

  const commit = (normalized) => {
    const clamped = Math.max(0, Math.min(1, normalized));
    const raw = denormalize(clamped);
    const stepped = applyStep(raw);
    const final = clampRaw(stepped);
    currentValue.current = final;
    fillAnim.setValue(normalize(final));
    onValueChange(final);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        valueAtGrant.current = currentValue.current;
        const x = evt.nativeEvent.locationX;
        if (trackWidth.current > 0) {
          commit(x / trackWidth.current);
          valueAtGrant.current = currentValue.current;
        }
      },

      onPanResponderMove: (_, gestureState) => {
        if (trackWidth.current > 0) {
          const delta = gestureState.dx / trackWidth.current;
          commit(normalize(valueAtGrant.current) + delta);
        }
      },

      onPanResponderRelease: () => {
        valueAtGrant.current = currentValue.current;
      },
    }),
  ).current;

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        trackWidth.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: trackBgColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: trackColor,
              width: fillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.thumb,
          { borderColor: trackColor },
          {
            left: fillAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
            marginLeft: -(THUMB_SIZE / 2),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#fff",
    borderWidth: 2,
    top: "50%",
    marginTop: -(THUMB_SIZE / 2),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
