export type VersionNotice = {
  apkUrl?: string;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
};

const latestReleaseUrl = "https://api.github.com/repos/thomascimpro/cimpro-bugbaas/releases/latest";

export async function checkLatestVersion(currentVersion: string): Promise<VersionNotice | null> {
  const current = parseVersion(currentVersion);
  if (!current) return null;

  const response = await fetch(latestReleaseUrl, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });
  if (!response.ok) return null;

  const release = await response.json() as { assets?: Array<{ browser_download_url?: string; name?: string }>; tag_name?: string; html_url?: string };
  const latest = parseVersion(release.tag_name ?? "");
  if (!latest || compareVersions(latest.parts, current.parts) <= 0) return null;

  return {
    apkUrl: release.assets?.find((asset) => asset.name?.toLowerCase().endsWith(".apk"))?.browser_download_url,
    currentVersion: current.label,
    latestVersion: latest.label,
    releaseUrl: release.html_url ?? "https://github.com/thomascimpro/cimpro-bugbaas/releases/latest"
  };
}

function parseVersion(version: string): { label: string; parts: number[] } | null {
  const label = version.trim().replace(/^v/i, "");
  const match = label.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { label, parts: match.slice(1).map((part) => Number(part)) };
}

function compareVersions(latestParts: number[], currentParts: number[]): number {
  for (let i = 0; i < latestParts.length; i += 1) {
    const latestPart = latestParts[i];
    const currentPart = currentParts[i];
    if (latestPart > currentPart) return 1;
    if (latestPart < currentPart) return -1;
  }
  return 0;
}
