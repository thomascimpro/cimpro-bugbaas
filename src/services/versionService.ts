export type VersionNotice = {
  latestVersion: string;
  releaseUrl: string;
};

const latestReleaseUrl = "https://api.github.com/repos/thomascimpro/cimpro-bugbaas/releases/latest";

export async function checkLatestVersion(currentVersion: string): Promise<VersionNotice | null> {
  const response = await fetch(latestReleaseUrl);
  if (!response.ok) return null;

  const release = await response.json() as { tag_name?: string; html_url?: string };
  const latestVersion = cleanVersion(release.tag_name ?? "");
  if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) return null;

  return {
    latestVersion,
    releaseUrl: release.html_url ?? "https://github.com/thomascimpro/cimpro-bugbaas/releases/latest"
  };
}

function cleanVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = cleanVersion(latest).split(".").map((part) => Number(part));
  const currentParts = cleanVersion(current).split(".").map((part) => Number(part));
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i += 1) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
}
