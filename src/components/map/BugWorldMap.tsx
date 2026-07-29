import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import type { FieldJournalEntry } from "../../services/fieldJournalService";
import {
  createMapProjection,
  mapDistanceMeters,
  moveMapCenterByPixels,
  OSM_TILE_SIZE,
  visibleMapRadiusMeters
} from "../../services/bugMapProjection";
import type { MapCoordinate } from "../../services/mapCellService";
import { biomeMapArt } from "../../services/biomeMapArt";
import { requestPrivateSightingLocation, type PrivateSightingLocation } from "../../services/privateSightingLocation";
import { useI18n } from "../../services/i18n";
import { loadNearbySearchZones, type SearchZone } from "../../services/osmSearchZoneService";
import { BugArtImage } from "../BugArtImage";
import { GameUiIcon } from "../ui/GameUiIcon";

const DEFAULT_CENTER = { latitude: 52.0907, longitude: 5.1214 };
const DEFAULT_VIEWPORT = { width: 340, height: 430 };
const osmTileHeaders = Platform.OS === "web" ? undefined : { "User-Agent": "BugBaas/3.0 (nl.cimpro.bugbaas)" };

type Props = {
  entries: FieldJournalEntry[];
  onStartScan: () => void;
  onSelectEntry: (entry: FieldJournalEntry) => void;
};

function locationFromEntry(entry: FieldJournalEntry) {
  if (entry.privateLocation) return { latitude: entry.privateLocation.latitudeE5 / 100000, longitude: entry.privateLocation.longitudeE5 / 100000 };
  if (entry.locationCell) return { latitude: entry.locationCell.latitudeE3 / 1000, longitude: entry.locationCell.longitudeE3 / 1000 };
  return undefined;
}

export function BugWorldMap({ entries, onSelectEntry, onStartScan }: Props) {
  const { t } = useI18n();
  const firstSighting = useMemo(() => entries.map(locationFromEntry).find(Boolean), [entries]);
  const initialCenter = firstSighting ?? DEFAULT_CENTER;
  const didAutoLocate = useRef(false);
  const hasManualPan = useRef(false);
  const viewCenterRef = useRef<MapCoordinate>(initialCenter);
  const dragStartCenter = useRef<MapCoordinate>(initialCenter);
  const zonesRef = useRef<SearchZone[]>([]);
  const [location, setLocation] = useState<PrivateSightingLocation>();
  const [locationState, setLocationState] = useState<"idle" | "loading" | "unsupported" | "denied" | "unavailable" | "ready">("loading");
  const [zones, setZones] = useState<SearchZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesUnavailable, setZonesUnavailable] = useState(false);
  const [zonesVisible, setZonesVisible] = useState(true);
  const [zoneRefresh, setZoneRefresh] = useState(0);
  const [zoom, setZoom] = useState(13);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [viewCenter, setViewCenter] = useState<MapCoordinate>(initialCenter);
  const [isPanning, setIsPanning] = useState(false);
  const [searchView, setSearchView] = useState<{ center: MapCoordinate; radius: number }>(() => ({
    center: initialCenter,
    radius: visibleMapRadiusMeters(initialCenter, 13, DEFAULT_VIEWPORT)
  }));
  const searchRadius = useMemo(
    () => visibleMapRadiusMeters(viewCenter, zoom, viewport),
    [viewCenter.latitude, viewCenter.longitude, viewport.height, viewport.width, zoom]
  );
  const projection = useMemo(
    () => createMapProjection(viewCenter, zoom, viewport),
    [viewCenter.latitude, viewCenter.longitude, viewport.height, viewport.width, zoom]
  );

  const locatePlayer = useCallback(async (recenter = true) => {
    setLocationState("loading");
    const result = await requestPrivateSightingLocation({ maxAccuracyMeters: Number.POSITIVE_INFINITY }).catch(() => ({ available: false, reason: "unavailable" } as const));
    if (result.available) {
      setLocation(result.location);
      setLocationState("ready");
      if (recenter || !hasManualPan.current) {
        viewCenterRef.current = result.location;
        setViewCenter(result.location);
        setSearchView({ center: result.location, radius: visibleMapRadiusMeters(result.location, zoom, viewport) });
      }
      return;
    }
    setLocationState(result.reason);
  }, [viewport.height, viewport.width, zoom]);

  useEffect(() => {
    if (didAutoLocate.current) return;
    didAutoLocate.current = true;
    void locatePlayer(false);
  }, [locatePlayer]);

  useEffect(() => {
    if (location || hasManualPan.current) return;
    const nextCenter = firstSighting ?? DEFAULT_CENTER;
    viewCenterRef.current = nextCenter;
    setViewCenter(nextCenter);
  }, [firstSighting?.latitude, firstSighting?.longitude, location]);

  useEffect(() => {
    if (isPanning) return;
    const timeout = setTimeout(() => {
      setSearchView((current) => {
        const movementThreshold = Math.max(100, searchRadius * 0.15);
        const radiusThreshold = Math.max(100, current.radius * 0.1);
        const centerChanged = mapDistanceMeters(current.center, viewCenter) >= movementThreshold;
        const radiusChanged = Math.abs(current.radius - searchRadius) >= radiusThreshold;
        return centerChanged || radiusChanged ? { center: viewCenter, radius: searchRadius } : current;
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [isPanning, searchRadius, viewCenter.latitude, viewCenter.longitude]);

  useEffect(() => {
    let active = true;
    setZonesLoading(true);
    setZonesUnavailable(false);
    loadNearbySearchZones(searchView.center, searchView.radius)
      .then((items) => {
        if (!active) return;
        zonesRef.current = items;
        setZones(items);
        setZonesUnavailable(false);
      })
      .catch(() => {
        if (!active) return;
        setZonesUnavailable(zonesRef.current.length === 0);
      })
      .finally(() => { if (active) setZonesLoading(false); });
    return () => { active = false; };
  }, [searchView.center.latitude, searchView.center.longitude, searchView.radius, zoneRefresh]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
    onPanResponderGrant: () => {
      hasManualPan.current = true;
      dragStartCenter.current = viewCenterRef.current;
      setIsPanning(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const nextCenter = moveMapCenterByPixels(dragStartCenter.current, zoom, gestureState.dx, gestureState.dy);
      viewCenterRef.current = nextCenter;
      setViewCenter(nextCenter);
    },
    onPanResponderRelease: () => setIsPanning(false),
    onPanResponderTerminate: () => setIsPanning(false),
    onPanResponderTerminationRequest: () => true
  }), [zoom]);

  function retrySearchZones() {
    const center = viewCenterRef.current;
    setSearchView({ center, radius: visibleMapRadiusMeters(center, zoom, viewport) });
    setZoneRefresh((value) => value + 1);
  }

  const visibleEntries = useMemo(() => entries.filter((entry) => locationFromEntry(entry)).slice(0, 60), [entries]);
  const visibleZones = zonesVisible ? zones : [];

  function onMapLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setViewport({ width, height });
  }

  return (
    <View style={styles.root}>
      <View {...panResponder.panHandlers} onLayout={onMapLayout} style={styles.map}>
        {projection.tiles.map((tile) => <Image key={tile.key} source={{ headers: osmTileHeaders, uri: tile.uri }} style={[styles.tile, { left: tile.left, top: tile.top }]} />)}
        <View pointerEvents="none" style={styles.tint} />

        {visibleZones.map((zone) => {
          if (!zone.bounds) return null;
          const northWest = projection.project({ latitude: zone.bounds.north, longitude: zone.bounds.west });
          const southEast = projection.project({ latitude: zone.bounds.south, longitude: zone.bounds.east });
          const width = Math.max(28, southEast.left - northWest.left);
          const height = Math.max(28, southEast.top - northWest.top);
          return (
            <View
              key={`${zone.id}:area`}
              pointerEvents="none"
              style={[
                styles.biomeArea,
                biomeAreaStyle(zone.kind),
                { height, left: northWest.left + 22, top: northWest.top + 22, width }
              ]}
            >
              <View style={styles.biomeMarker}>
                <Image source={{ uri: biomeMapArt[zone.visualKind] }} style={styles.biomeMarkerArt} />
                <Text numberOfLines={1} style={styles.biomeMarkerText}>{zone.visualKind === "garden" ? "TUIN" : t(`map.zone.${zone.kind}`).toUpperCase()}</Text>
              </View>
            </View>
          );
        })}

        {visibleZones.map((zone) => {
          if (zone.bounds) return null;
          const position = projection.project(zone);
          return (
            <View key={zone.id} pointerEvents="none" style={[styles.zone, position]}>
              <Image source={{ uri: biomeMapArt[zone.visualKind] }} style={styles.zoneArt} />
            </View>
          );
        })}

        {visibleEntries.map((entry) => {
          const point = locationFromEntry(entry)!;
          const position = projection.project(point);
          return (
            <Pressable accessibilityLabel={t("map.markerAccessibility", { species: entry.speciesName })} key={entry.id} onPress={() => onSelectEntry(entry)} style={[styles.marker, position]}>
              <BugArtImage bugId={entry.bugId} size={34} />
            </Pressable>
          );
        })}

        {location ? (
          <View pointerEvents="none" style={[styles.playerPulse, projection.project(location)]}>
            <View style={styles.playerCore}><GameUiIcon name="location" size={18} /></View>
          </View>
        ) : null}

        <View style={styles.hud}>
          <Text style={styles.hudKicker}>{t("map.title")}</Text>
          <Text style={styles.hudMain}>{t("map.findings", { count: visibleEntries.length })}</Text>
          {zonesUnavailable ? (
            <Pressable accessibilityRole="button" onPress={retrySearchZones}>
              <Text style={styles.hudRetry}>{t("map.zonesRetry")}</Text>
            </Pressable>
          ) : (
            <Text style={styles.hudSub}>{zonesLoading ? t("map.zonesLoading") : t("map.zonesNearby", { count: zones.length })}</Text>
          )}
        </View>

        {zonesVisible ? (
          <View pointerEvents="none" style={styles.biomeLegend}>
            <LegendItem visualKind="water" label={t("map.zone.water")} />
            <LegendItem visualKind="park" label={t("map.zone.park")} />
            <LegendItem visualKind="garden" label="Tuin" />
            <LegendItem visualKind="nature" label={t("map.zone.nature")} />
          </View>
        ) : null}

        <View style={styles.mapControls}>
          <Pressable accessibilityLabel={t("map.centerLocation")} onPress={() => void locatePlayer()} style={styles.controlButton}>
            {locationState === "loading" ? <ActivityIndicator color="#ffffff" size="small" /> : <GameUiIcon name="location" size={23} />}
          </Pressable>
          <Pressable accessibilityLabel={t("map.toggleZones")} onPress={() => setZonesVisible((current) => !current)} style={[styles.controlButton, zonesVisible && styles.controlButtonActive]}>
            <Image source={{ uri: biomeMapArt.nature }} style={[styles.controlBiomeArt, !zonesVisible && styles.controlBiomeArtInactive]} />
          </Pressable>
          <Pressable accessibilityLabel={t("map.zoomIn")} onPress={() => setZoom((value) => Math.min(18, value + 1))} style={styles.controlButton}><ZoomGlyph direction="in" /></Pressable>
          <Pressable accessibilityLabel={t("map.zoomOut")} onPress={() => setZoom((value) => Math.max(12, value - 1))} style={styles.controlButton}><ZoomGlyph direction="out" /></Pressable>
        </View>

        {locationState === "idle" ? (
          <Pressable onPress={() => void locatePlayer()} style={styles.locationPrompt}>
            <GameUiIcon name="location" size={20} />
            <Text style={styles.locationPromptText}>{t("map.useLocation")}</Text>
          </Pressable>
        ) : null}

        {locationState !== "ready" && locationState !== "loading" && locationState !== "idle" ? (
          <Pressable onPress={() => void locatePlayer()} style={styles.locationNotice}>
            <Text style={styles.locationNoticeTitle}>{locationState === "denied" ? t("map.locationDenied") : t("map.locationUnavailable")}</Text>
            <Text style={styles.locationNoticeText}>{t("map.locationFallback")}</Text>
          </Pressable>
        ) : null}

        {!visibleEntries.length && locationState === "ready" ? (
          <View pointerEvents="none" style={styles.emptyHint}>
            <GameUiIcon name="location" size={32} />
            <Text style={styles.emptyHintTitle}>{t("map.emptyTitle")}</Text>
            <Text style={styles.emptyHintText}>{t("map.emptyBody")}</Text>
          </View>
        ) : null}

        <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
      </View>
      <Pressable accessibilityLabel={t("map.scanAccessibility")} onPress={onStartScan} style={styles.scanButton}>
        <View><Text style={styles.scanKicker}>{t("map.scanKicker")}</Text><Text style={styles.scanText}>{t("map.scan")}</Text></View>
        <View style={styles.scanIcon}><GameUiIcon name="scan" size={28} /></View>
      </Pressable>
    </View>
  );
}

function biomeAreaStyle(kind: SearchZone["kind"]) {
  return {
    park: styles.biomeAreaPark,
    water: styles.biomeAreaWater,
    nature: styles.biomeAreaNature
  }[kind];
}

function LegendItem({ label, visualKind }: { label: string; visualKind: SearchZone["visualKind"] }) {
  return (
    <View style={styles.legendItem}>
      <Image source={{ uri: biomeMapArt[visualKind] }} style={styles.legendArt} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ZoomGlyph({ direction }: { direction: "in" | "out" }) {
  return (
    <View style={styles.zoomGlyph}>
      <View style={styles.zoomHorizontal} />
      {direction === "in" ? <View style={styles.zoomVertical} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  map: { backgroundColor: "#173329", borderColor: "rgba(244,220,121,0.45)", borderRadius: 20, borderWidth: 1, flex: 1, minHeight: 240, overflow: "hidden" },
  tile: { height: OSM_TILE_SIZE, position: "absolute", width: OSM_TILE_SIZE },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,36,27,0.10)" },
  biomeArea: { alignItems: "center", borderRadius: 18, borderWidth: 3, justifyContent: "center", position: "absolute" },
  biomeAreaPark: { backgroundColor: "rgba(103,201,100,0.38)", borderColor: "rgba(45,126,54,0.98)" },
  biomeAreaWater: { backgroundColor: "rgba(68,166,224,0.40)", borderColor: "rgba(20,102,166,0.98)" },
  biomeAreaNature: { backgroundColor: "rgba(25,119,70,0.42)", borderColor: "rgba(12,73,40,0.98)" },
  biomeMarker: { alignItems: "center", backgroundColor: "rgba(7,27,20,0.80)", borderColor: "rgba(255,255,255,0.90)", borderRadius: 14, borderWidth: 2, minWidth: 58, paddingHorizontal: 4, paddingVertical: 3 },
  biomeMarkerArt: { height: 48, resizeMode: "contain", width: 48 },
  biomeMarkerText: { color: "#ffffff", fontSize: 7, fontWeight: "900", letterSpacing: 0.7, marginTop: -2 },
  biomeLegend: { backgroundColor: "rgba(7,27,20,0.92)", borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, borderWidth: 1, bottom: 10, flexDirection: "row", gap: 8, left: 10, paddingHorizontal: 9, paddingVertical: 7, position: "absolute" },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 4 },
  legendArt: { height: 18, resizeMode: "contain", width: 18 },
  legendText: { color: "#ffffff", fontSize: 7, fontWeight: "800" },
  hud: { backgroundColor: "rgba(7,27,20,0.92)", borderColor: "rgba(244,220,121,0.35)", borderRadius: 15, borderWidth: 1, left: 10, paddingHorizontal: 12, paddingVertical: 9, position: "absolute", top: 10 },
  hudKicker: { color: "#f4dc79", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  hudMain: { color: "#fff", fontSize: 13, fontWeight: "900", marginTop: 2 },
  hudSub: { color: "#cde6d8", fontSize: 8, fontWeight: "800", marginTop: 2 },
  hudRetry: { color: "#f4dc79", fontSize: 8, fontWeight: "900", marginTop: 3, textDecorationLine: "underline" },
  marker: { alignItems: "center", backgroundColor: "#fff", borderColor: "#f4dc79", borderRadius: 24, borderWidth: 3, elevation: 5, height: 46, justifyContent: "center", position: "absolute", shadowColor: "#06150f", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 5, width: 46 },
  playerPulse: { alignItems: "center", backgroundColor: "rgba(244,220,121,0.28)", borderColor: "rgba(255,255,255,0.92)", borderRadius: 24, borderWidth: 2, height: 46, justifyContent: "center", position: "absolute", width: 46 },
  playerCore: { alignItems: "center", backgroundColor: "#173329", borderColor: "#f4dc79", borderRadius: 13, borderWidth: 3, height: 26, justifyContent: "center", width: 26 },
  playerBug: { color: "#ffffff", fontSize: 14, fontWeight: "900", lineHeight: 16 },
  zone: { alignItems: "center", backgroundColor: "rgba(7,27,20,0.82)", borderColor: "rgba(255,255,255,0.90)", borderRadius: 18, borderWidth: 2, height: 48, justifyContent: "center", position: "absolute", width: 48 },
  zoneArt: { height: 42, resizeMode: "contain", width: 42 },
  mapControls: { gap: 7, position: "absolute", right: 10, top: 10 },
  controlButton: { alignItems: "center", backgroundColor: "rgba(7,27,20,0.92)", borderColor: "rgba(255,255,255,0.24)", borderRadius: 13, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  controlButtonActive: { backgroundColor: "#f4dc79", borderColor: "#f4dc79" },
  controlBiomeArt: { height: 30, resizeMode: "contain", width: 30 },
  controlBiomeArtInactive: { opacity: 0.45 },
  controlIcon: { color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 22 },
  controlIconActive: { color: "#173329" },
  zoomGlyph: { alignItems: "center", height: 20, justifyContent: "center", width: 20 },
  zoomHorizontal: { backgroundColor: "#ffffff", borderRadius: 2, height: 3, position: "absolute", width: 17 },
  zoomVertical: { backgroundColor: "#ffffff", borderRadius: 2, height: 17, position: "absolute", width: 3 },
  locationPrompt: { alignItems: "center", backgroundColor: "rgba(7,27,20,0.94)", borderColor: "rgba(244,220,121,0.55)", borderRadius: 99, borderWidth: 1, bottom: 28, flexDirection: "row", gap: 7, left: 10, paddingHorizontal: 12, paddingVertical: 9, position: "absolute" },
  locationPromptIcon: { color: "#f4dc79", fontSize: 15, fontWeight: "900" },
  locationPromptText: { color: "#ffffff", fontSize: 9, fontWeight: "900" },
  locationNotice: { backgroundColor: "rgba(7,27,20,0.94)", borderColor: "rgba(244,220,121,0.55)", borderRadius: 14, borderWidth: 1, bottom: 28, left: 10, paddingHorizontal: 11, paddingVertical: 8, position: "absolute", right: 10 },
  locationNoticeTitle: { color: "#f4dc79", fontSize: 10, fontWeight: "900" },
  locationNoticeText: { color: "#fff", fontSize: 8, marginTop: 2 },
  emptyHint: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(7,27,20,0.88)", borderColor: "rgba(244,220,121,0.35)", borderRadius: 18, borderWidth: 1, maxWidth: 230, padding: 14, position: "absolute", top: "42%" },
  emptyHintIcon: { color: "#f4dc79", fontSize: 24, fontWeight: "900" },
  emptyHintTitle: { color: "#fff", fontSize: 11, fontWeight: "900", marginTop: 3, textAlign: "center" },
  emptyHintText: { color: "#cde6d8", fontSize: 8, lineHeight: 12, marginTop: 3, textAlign: "center" },
  attribution: { backgroundColor: "rgba(255,255,255,0.86)", bottom: 4, color: "#173329", fontSize: 7, paddingHorizontal: 4, position: "absolute", right: 4 },
  scanButton: { alignItems: "center", backgroundColor: "#f4dc79", borderColor: "rgba(255,255,255,0.55)", borderRadius: 17, borderWidth: 1, elevation: 5, flexDirection: "row", justifyContent: "space-between", marginTop: 9, minHeight: 58, paddingHorizontal: 15 },
  scanKicker: { color: "#61704c", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  scanText: { color: "#102018", fontSize: 15, fontWeight: "900", marginTop: 2 },
  scanIcon: { alignItems: "center", backgroundColor: "#173329", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  scanIconText: { color: "#f4dc79", fontSize: 20, fontWeight: "900" }
});
