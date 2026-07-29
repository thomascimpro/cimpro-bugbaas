export type WebRunnerGestureAction = "jump" | "left" | "right" | "none";

const swipeThreshold = 20;

export function classifyWebRunnerGesture(dx: number, dy: number): WebRunnerGestureAction {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);

  if (dy < -swipeThreshold && vertical > horizontal) return "jump";
  if (dx < -swipeThreshold && horizontal > vertical) return "left";
  if (dx > swipeThreshold && horizontal > vertical) return "right";
  if (horizontal < swipeThreshold && vertical < swipeThreshold) return "jump";
  return "none";
}
