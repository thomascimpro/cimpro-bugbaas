const REAL_BUG_CAMERA_ZOOM_STEP = 0.15;
const REAL_BUG_PINCH_SENSITIVITY = 0.005;
const REAL_BUG_MAX_CAMERA_PIXELS = 12_000_000;

function clampRealBugCameraZoom(zoom: number): number {
  return Math.min(1, Math.max(0, Number(zoom.toFixed(2))));
}

export function adjustRealBugCameraZoom(currentZoom: number, direction: -1 | 1): number {
  return clampRealBugCameraZoom(currentZoom + direction * REAL_BUG_CAMERA_ZOOM_STEP);
}

export function calculateRealBugPinchZoom(startZoom: number, startDistance: number, currentDistance: number): number {
  return clampRealBugCameraZoom(startZoom + (currentDistance - startDistance) * REAL_BUG_PINCH_SENSITIVITY);
}

type ParsedPictureSize = {
  pixels: number;
  ratio: number;
  value: string;
};

function parsePictureSize(value: string): ParsedPictureSize | null {
  const match = /^(\d+)x(\d+)$/.exec(value.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { pixels: width * height, ratio: width / height, value };
}

export function chooseBestRealBugPictureSize(sizes: string[]): string | undefined {
  const safeSizes = sizes
    .map(parsePictureSize)
    .filter((size): size is ParsedPictureSize => size !== null)
    .filter((size) => size.pixels <= REAL_BUG_MAX_CAMERA_PIXELS);
  if (!safeSizes.length) return undefined;

  const fourByThree = safeSizes.filter((size) => Math.abs(size.ratio - 4 / 3) < 0.02);
  const candidates = fourByThree.length ? fourByThree : safeSizes;
  return candidates.sort((left, right) => right.pixels - left.pixels)[0]?.value;
}
