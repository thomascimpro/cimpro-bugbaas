export function swarmSiegeRequestError(value: unknown, status?: number, serverError?: unknown): string {
  if (typeof serverError === "string" && serverError.trim()) return serverError.trim();
  if (status === 401 || status === 403) return "Je sessie is verlopen. Log opnieuw in.";
  if (status === 404) return "Zwermbeleg is nog niet beschikbaar op deze versie.";
  if (typeof status === "number" && status >= 500) return "De eventserver is tijdelijk niet bereikbaar.";
  if (value instanceof TypeError || (value instanceof Error && /failed to fetch|network request failed/i.test(value.message))) {
    return "Geen verbinding met de eventserver. Controleer je internetverbinding.";
  }
  return value instanceof Error && value.message ? value.message : "Zwermbeleg kan nu niet worden geladen.";
}
