export const webRouteLocalStorageKey = "bugbaas:active-route-recovery:v1";
export const webRouteRecoveryTtlMs = 30 * 60 * 1000;

type WebRouteSnapshot = {
  route: string;
  updatedAt: number;
};

export function encodeWebRouteSnapshot(route: string, now = Date.now()): string {
  return JSON.stringify({ route, updatedAt: now } satisfies WebRouteSnapshot);
}

export function readRecentWebRoute(
  raw: string | null,
  validRoutes: ReadonlySet<string>,
  now = Date.now(),
  ttlMs = webRouteRecoveryTtlMs
): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WebRouteSnapshot>;
    if (typeof parsed.route !== "string" || !validRoutes.has(parsed.route)) return null;
    if (typeof parsed.updatedAt !== "number" || now - parsed.updatedAt < 0 || now - parsed.updatedAt > ttlMs) return null;
    return parsed.route;
  } catch {
    return null;
  }
}
