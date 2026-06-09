import React, { useMemo } from "react";
import { Animated, Easing, ImageStyle, StyleProp, StyleSheet } from "react-native";
import type { ImageSourcePropType } from "react-native";

type Props = {
  bugSize: number;
  feedback: Animated.Value;
  style?: StyleProp<ImageStyle>;
};

const bugSwatterImage = require("../../assets/generated/bug-swatter-hd.png");

export function BugSwatterHit({ bugSize, feedback, style }: Props) {
  const swatterStyle = useMemo(() => {
    const size = bugSize * 2.4;
    const opacity = feedback.interpolate({
      inputRange: [0, 0.06, 0.72, 1],
      outputRange: [0, 1, 0.88, 0],
      extrapolate: "clamp"
    });
    const translateX = feedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: [bugSize * 0.65, bugSize * 0.24, -bugSize * 0.06, bugSize * 0.02, bugSize * 0.72],
      extrapolate: "clamp"
    });
    const translateY = feedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: [-bugSize * 1.3, -bugSize * 0.72, -bugSize * 0.2, -bugSize * 0.34, -bugSize * 1.36],
      extrapolate: "clamp"
    });
    const rotate = feedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: ["-48deg", "-24deg", "7deg", "-8deg", "-52deg"],
      extrapolate: "clamp"
    });
    const scale = feedback.interpolate({
      inputRange: [0, 0.3, 0.52, 1],
      outputRange: [0.8, 1.08, 0.98, 0.84],
      extrapolate: "clamp"
    });
    return {
      height: size,
      opacity,
      transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      width: size
    };
  }, [bugSize, feedback]);

  return (
    <Animated.Image
      resizeMode="contain"
      source={bugSwatterImage as ImageSourcePropType}
      style={[styles.swatter, swatterStyle, style]}
    />
  );
}

export function playBugSwatterFeedback(feedback: Animated.Value) {
  feedback.stopAnimation();
  feedback.setValue(0);
  Animated.timing(feedback, {
    duration: 240,
    easing: Easing.out(Easing.quad),
    toValue: 1,
    useNativeDriver: true
  }).start();
}

const styles = StyleSheet.create({
  swatter: {
    position: "absolute",
    zIndex: 5
  }
});
