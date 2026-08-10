export type RealBugPhotoResizeAction = {
  resize: {
    height?: number;
    width?: number;
  };
};

export type RealBugPhotoPlan = {
  resize: RealBugPhotoResizeAction[];
  quality: number;
};

const primaryMaxSide = 2560;
const primaryQuality = 0.94;
const fallbackMaxSide = 2048;
const fallbackQuality = 0.9;
const emergencyMaxSide = 1600;
const emergencyQuality = 0.84;
const reviewThumbnailMaxSide = 640;
const reviewThumbnailQuality = 0.72;
const fallbackThresholdBytes = 3 * 1024 * 1024;

function resizeActions(width: number, height: number, maxSide: number): RealBugPhotoResizeAction[] {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  if (Math.max(safeWidth, safeHeight) <= maxSide) return [];
  return safeWidth >= safeHeight
    ? [{ resize: { width: maxSide } }]
    : [{ resize: { height: maxSide } }];
}

export function primaryRealBugPhotoPlan(width: number, height: number): RealBugPhotoPlan {
  return {
    resize: resizeActions(width, height, primaryMaxSide),
    quality: primaryQuality
  };
}

export function fallbackRealBugPhotoPlan(width: number, height: number): RealBugPhotoPlan {
  return {
    resize: resizeActions(width, height, fallbackMaxSide),
    quality: fallbackQuality
  };
}

export function emergencyRealBugPhotoPlan(width: number, height: number): RealBugPhotoPlan {
  return {
    resize: resizeActions(width, height, emergencyMaxSide),
    quality: emergencyQuality
  };
}

export function reviewRealBugThumbnailPlan(width: number, height: number): RealBugPhotoPlan {
  return {
    resize: resizeActions(width, height, reviewThumbnailMaxSide),
    quality: reviewThumbnailQuality
  };
}

export function shouldFallbackRealBugPhoto(base64: string): boolean {
  const paddingBytes = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.max(0, Math.floor((base64.length * 3) / 4) - paddingBytes);
  return decodedBytes > fallbackThresholdBytes;
}
