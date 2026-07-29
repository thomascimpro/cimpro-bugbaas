import type { ArcadeMode } from "../types.ts";

export function featuredArcadeMode(unlockedModes: ArcadeMode[], localDay: string): ArcadeMode | undefined {
  const unique = [...new Set(unlockedModes)];
  if (!unique.length) return undefined;
  const index = stableHash(localDay) % unique.length;
  return unique[index];
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
