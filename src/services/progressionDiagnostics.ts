import type { ProgressionSnapshot } from "./playerJourneyModel.ts";

export type ProgressionDiagnostics = {
  stage: ProgressionSnapshot["journey"]["stage"];
  ownedSpecies: number;
  fieldSpecies: number;
  museum: string;
  featuredMode: string;
  liveEventState: string;
};

export function buildProgressionDiagnostics(snapshot: ProgressionSnapshot, developmentMode: boolean): ProgressionDiagnostics | undefined {
  if (!developmentMode) return undefined;

  return {
    stage: snapshot.journey.stage,
    ownedSpecies: snapshot.journey.ownedSpecies,
    fieldSpecies: snapshot.journey.verifiedFieldSpecies,
    museum: `${snapshot.museum.openWings}/${snapshot.museum.curatedWings}/${snapshot.museum.masteredWings}`,
    featuredMode: snapshot.play.featuredMode ?? "none",
    liveEventState: snapshot.liveEvent?.state ?? "none"
  };
}
