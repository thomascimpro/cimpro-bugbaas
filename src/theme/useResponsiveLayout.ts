import { useWindowDimensions } from "react-native";
import { createResponsiveLayout } from "./responsiveLayoutModel";

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();
  return createResponsiveLayout(width, height);
}
