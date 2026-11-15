'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  ROVER_PANORAMA_STATIONS,
  RoverPanoramaStation,
  TacticalOpticIcon,
  MarsRoverStreetViewModal,
} from './MarsRoverStreetViewModal';
import {
  computeSanteePandolf038g,
  computeWalkbackIsochrone,
  type BioMetabolicExpenditure,
  type WalkbackIsochroneBoundary,
} from './algorithms/bioTerramechanics';
import {
  computeRadHavenSpe,
  type SpeHavenReport,
  type SpeHavenCandidate,
} from './algorithms/radHavenSpe';
import {
  computeRfCommsStatus,
  type RfCommsReport,
} from './algorithms/rfComms';
import {
  MARS_LANDMARKS,
  searchMarsLandmarks,
  parseCoordinateQuery,
  type MarsLandmark,
} from './data/marsLandmarks';
import {
  Globe,
  Map as LucideMap,
  Navigation,
  Shield,
  Zap,
  Radio,
  Clock,
  Activity,
  Info,
  AlertTriangle,
  Target,
  Camera,
  Search,
  Sparkles,
  Layers,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sliders,
  Loader2,
  Crosshair,
  Bot,
  Download,
  Sun,
  FileText,
} from 'lucide-react';
import {
  MarsTactical2DMap,
  SCIENCE_TARGETS_DATABASE,
  type ScienceTargetPOI,
} from './components/MarsTactical2DMap';
import { VisorHudOverlay } from './components/VisorHudOverlay';
import { TraverseExportModal } from './components/TraverseExportModal';
import { AresTacticalAiCopilot, type CopilotAction } from './components/AresTacticalAiCopilot';

// ============================================================================
// CONSTANTS & PLANETARY GEOMETRY
// ============================================================================
const GLOBE_RADIUS = 100.0; // 100 units = 3,396.2 km Mars radius (~33.96 km / unit)
const MARS_RADIUS_KM = 3396.2;
const MARS_RADIUS_M = 3396200.0;

const MAX_SITE_ZOOM = 12;
const MAX_GLOBAL_ZOOM = 5;

const TILE_SEGMENTS = 48; // 48x48 grid per tile
const DEM_GRID_SIZE = TILE_SEGMENTS + 1; // 49x49 vertices per tile
const MAX_CONCURRENT_DOWNLOADS = 10; // Optimized for high-throughput HTTP/2 tile streaming

export interface ExpeditionSite {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  role: 'PRIMARY LANDING SITE' | 'SECONDARY EXPEDITION HUB' | 'PRIMARY CHALLENGE TARGET';
  subtitle: string;
  lat: number;
  lon: number;
  elevation: string;
  targetAltitudeKm: number;
  targetTiltDeg: number;
  maxZoom: number;
  qualityBadge: string;
  description: string;
  color: string;
  roiBbox: [number, number, number, number];
  ctxLayer: string;
  ctxBbox: [number, number, number, number];
  hiriseLayer?: string;
  hiriseBbox?: [number, number, number, number];
  // Default traversable endpoints [startLat, startLon, endLat, endLon]
  defaultRoute: [number, number, number, number];
}

// ============================================================================
// THE 4 HIGH-DETAIL EXPEDITION SITES
// ============================================================================
export const EXPEDITION_SITES: ExpeditionSite[] = [
  {
    id: 'jezero-delta',
    code: 'A',
    name: 'Jezero Crater Delta Front',
    shortLabel: 'Jezero Crater',
    role: 'PRIMARY LANDING SITE',
    subtitle: 'Perseverance Landing Site & Ancient Western River Delta',
    lat: 18.4447,
    lon: 77.4508,
    elevation: '-2,540 m',
    targetAltitudeKm: 38,
    targetTiltDeg: 40,
    maxZoom: 12,
    qualityBadge: 'ULTRA-HD Z12 • 25cm HiRISE + 6m CTX',
    description:
      'Primary Mars 2020 Perseverance Rover landing site at the western Neretva Vallis delta front. Streams full 25cm HiRISE + 6m CTX orthomosaics over seamless 16-bit MOLA+HRSC DEM.',
    color: '#00f0ff',
    roiBbox: [76.5, 17.5, 78.5, 19.5],
    ctxLayer: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
    ctxBbox: [77.1605, 18.211, 77.6992, 18.7212],
    hiriseLayer: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
    hiriseBbox: [77.2229, 18.3068, 77.584, 18.6693],
    defaultRoute: [18.425, 77.515, 18.468, 77.412],
  },
  {
    id: 'mount-sharp-gale',
    code: 'Y',
    name: 'Mount Sharp (Gale Crater)',
    shortLabel: 'Mount Sharp',
    role: 'PRIMARY CHALLENGE TARGET',
    subtitle: 'Curiosity 2025 Boxwork Formations & Aeolis Mons Mound',
    lat: -4.72,
    lon: 137.48,
    elevation: '-4,500 m to +1,000 m',
    targetAltitudeKm: 85,
    targetTiltDeg: 40,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Featured NASA Challenge Science Target: Gale Crater basin and Mount Sharp boxwork formations studied by Curiosity in 2025. Streams 6m MRO CTX imagery, CRISM mineralogy, and 16-bit DEM.',
    color: '#10b981',
    roiBbox: [135.18, -6.58, 139.25, -2.8],
    ctxLayer: 'Gale_CTX_BlockAdj_dd',
    ctxBbox: [135.1842, -6.5733, 139.2413, -2.8078],
    defaultRoute: [-4.685, 137.408, -4.732, 137.395],
  },
  {
    id: 'arcadia-planitia',
    code: 'B',
    name: 'Arcadia Planitia (ISRU Basecamp)',
    shortLabel: 'Arcadia Planitia',
    role: 'SECONDARY EXPEDITION HUB',
    subtitle: 'Shallow Subsurface Water-Ice Sheet & ISRU Propellant Hub',
    lat: 46.2,
    lon: -171.2,
    elevation: '-4,120 m',
    targetAltitudeKm: 85,
    targetTiltDeg: 34,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Flat volcanic plains in northern lowlands containing abundant shallow subsurface water ice—ideal for In-Situ Resource Utilization (ISRU) water extraction and human basecamp.',
    color: '#f59e0b',
    roiBbox: [-173.65, 44.5, -168.75, 47.9],
    ctxLayer: 'Arcadia_Planitia_CTX_BlockAdj_dd',
    ctxBbox: [-173.6451, 44.508, -168.7549, 47.8921],
    defaultRoute: [46.08, -171.38, 46.32, -171.02],
  },
  {
    id: 'melas-chasma',
    code: 'X',
    name: 'Melas Chasma (Valles Marineris)',
    shortLabel: 'Melas Chasma',
    role: 'SECONDARY EXPEDITION HUB',
    subtitle: 'Widest & Deepest Tectonic Canyon Segment of Valles Marineris',
    lat: -10.65,
    lon: -68.15,
    elevation: '-4,900 m',
    targetAltitudeKm: 95,
    targetTiltDeg: 42,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Deepest central trough of Valles Marineris plunging below the surrounding plateau with layered interior deposits and high atmospheric pressure.',
    color: '#38bdf8',
    roiBbox: [-71.95, -14.5, -64.87, -9.29],
    ctxLayer: 'Coprates_EMelas_Chasm_CTX_BlockAdj_dd',
    ctxBbox: [-71.7281, -13.392, -64.8715, -10.0079],
    defaultRoute: [-10.52, -68.32, -10.76, -67.98],
  },
];

export interface PresetEvaRoute {
  id: string;
  name: string;
  siteId: string;
  category: 'SCIENCE_EXPEDITION' | 'SAMPLE_CACHE' | 'SURVIVAL_HAVEN' | 'GEOLOGY';
  description: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  scienceTarget: string;
  scienceValueScore: number;
}

export const PRESET_EVA_ROUTES: PresetEvaRoute[] = [
  // Mount Sharp (Gale Crater)
  {
    id: 'gale-boxwork',
    name: '2025 Boxwork Formations EVA',
    siteId: 'mount-sharp-gale',
    category: 'SCIENCE_EXPEDITION',
    description: "Follow Curiosity's 2025 discovery path across mineral-cemented boxwork fracture ridges.",
    startLat: -4.685,
    startLon: 137.408,
    endLat: -4.732,
    endLon: 137.395,
    scienceTarget: 'Hydrothermal Boxwork Mineral Veins & Ancient Groundwater Habitability',
    scienceValueScore: 100,
  },
  {
    id: 'gale-marker-band',
    name: 'Marker Band Valley Strata',
    siteId: 'mount-sharp-gale',
    category: 'GEOLOGY',
    description: 'Ascend wave-rippled lakebed sedimentary strata on lower Mount Sharp pediment.',
    startLat: -4.652,
    startLon: 137.418,
    endLat: -4.754,
    endLon: 137.408,
    scienceTarget: 'Wave-rippled sulfate sedimentary strata',
    scienceValueScore: 95,
  },
  {
    id: 'gale-greenheugh',
    name: 'Greenheugh Pediment Traverse',
    siteId: 'mount-sharp-gale',
    category: 'GEOLOGY',
    description: 'Traverse wind-sculpted gator-back sandstones on upper Mount Sharp pediment.',
    startLat: -4.665,
    startLon: 137.395,
    endLat: -4.7125,
    endLon: 137.3825,
    scienceTarget: 'Eolian sandstone caprock & diagenetic hematite',
    scienceValueScore: 92,
  },

  // Jezero Crater Delta Front
  {
    id: 'jez-delta-scarp',
    name: 'Neretva Delta Scarp Ascent',
    siteId: 'jezero-delta',
    category: 'SCIENCE_EXPEDITION',
    description: 'Climb from crater floor to the 40m river delta escarpment to sample fine clays.',
    startLat: 18.4447,
    startLon: 77.4508,
    endLat: 18.4550,
    endLon: 77.4120,
    scienceTarget: 'Fluvial bottomset sandstones with carbonate cementation',
    scienceValueScore: 98,
  },
  {
    id: 'jez-three-forks',
    name: 'Three Forks Sample Depot Check',
    siteId: 'jezero-delta',
    category: 'SAMPLE_CACHE',
    description: 'Direct EVA traverse to verify the Mars Sample Return titanium cache tube depot.',
    startLat: 18.4447,
    startLon: 77.4508,
    endLat: 18.4492,
    endLon: 77.4318,
    scienceTarget: 'Primary Mars Sample Return titanium tube cache depot',
    scienceValueScore: 99,
  },
  {
    id: 'jez-kodiak-butte',
    name: 'Kodiak Butte Delta Remnant',
    siteId: 'jezero-delta',
    category: 'GEOLOGY',
    description: 'Circumnavigate South Séítah dunes toward the isolated delta remnant mesa.',
    startLat: 18.4447,
    startLon: 77.4508,
    endLat: 18.4180,
    endLon: 77.4260,
    scienceTarget: 'Layered magnesium carbonates & delta stratigraphy',
    scienceValueScore: 94,
  },

  // Arcadia Planitia
  {
    id: 'arc-ice-well',
    name: 'Glacial Sheet Ice Well Inspection',
    siteId: 'arcadia-planitia',
    category: 'SURVIVAL_HAVEN',
    description: 'Traverse from ISRU basecamp to robotic thermal ice extraction well.',
    startLat: 46.20,
    startLon: -171.20,
    endLat: 46.35,
    endLon: -171.05,
    scienceTarget: 'Subsurface sheet ice core (>90% water purity)',
    scienceValueScore: 97,
  },

  // Melas Chasma
  {
    id: 'melas-cliff-haven',
    name: 'Canyon Cliff SPE Shelter Route',
    siteId: 'melas-chasma',
    category: 'SURVIVAL_HAVEN',
    description: 'Ingress corridor to deep 5 km rock overhang for cosmic ray and solar storm shielding.',
    startLat: -10.65,
    startLon: -68.15,
    endLat: -10.45,
    endLon: -68.35,
    scienceTarget: 'Crustal flood basalt overhang (>85% radiation block)',
    scienceValueScore: 95,
  },
];

export type VisualLayerMode =
  | 'realistic'
  | 'slope_radar'
  | 'tactical_contour'
  | 'color_hillshade'
  | 'orbital_raw';

export type TraverseMode = 'ROVER_AUTOPILOT' | 'ASTRONAUT_HIKE';
export type PickingPointMode = 'NONE' | 'START' | 'END';

export interface RouteWaypoint {
  id: string;
  label: string;
  lat: number;
  lon: number;
  elevM: number;
  slopeDeg: number;
  frictionMu: number;
  distFromStartKm: number;
  metabolicWatts: number;
  speedKmh: number;
}

export interface RouteSegmentSummary {
  id: string;
  leg: 'OUTBOUND' | 'RETURN';
  title: string;
  distKm: number;
  avgSlopeDeg: number;
  maxSlopeDeg: number;
  maxPitchDeg: number;
  frictionMu: number;
  status: 'SAFE' | 'CAUTION' | 'HAZARD';
}

export interface RouteProfileSample {
  distKm: number;
  elevM: number;
  slopeDeg: number;
  frictionMu: number;
  slipRiskPct: number;
  metabolicWatts: number;
  leg: 'OUTBOUND' | 'RETURN';
  velocityMs?: number;
  waterBurnRateGph?: number;
  cumWaterBurnG?: number;
  cumO2BurnG?: number;
  soilClass?: 'A (ROCK)' | 'B (SAND)' | 'C (DUST TRAP)';
}

export interface ComputedRoundTripRoute {
  mode: TraverseMode;
  isTraversable: boolean;
  failureReason: string | null;
  outboundPoints: { lat: number; lon: number; elevM: number; slopeDeg: number; pitchDeg: number; frictionMu: number }[];
  returnPoints: { lat: number; lon: number; elevM: number; slopeDeg: number; pitchDeg: number; frictionMu: number }[];
  waypoints: RouteWaypoint[];
  segments: RouteSegmentSummary[];
  profile: RouteProfileSample[];
  outboundDistKm: number;
  returnDistKm: number;
  totalRoundTripKm: number;
  estRoundTripTimeMin: number;
  maxSlopeDeg: number;
  avgFrictionMu: number;
  estEnergyWh: number;
  hazardPoints: { id: string; label: string; lat: number; lon: number; elevM: number; slopeDeg: number }[];
  totalWaterBurnGrams?: number;
  totalO2BurnGrams?: number;
  maxMetabolicWatts?: number;
  avgMetabolicWatts?: number;
  ruleOfHalfCompliant?: boolean;
  waterReserveMarginPct?: number;
}

export interface ProjectedMarkerPos {
  site: ExpeditionSite;
  x: number;
  y: number;
  visible: boolean;
  distKm: number;
}

export interface ProjectedRouteTag {
  id: string;
  text: string;
  subtext?: string;
  kind: 'WAYPOINT' | 'HAZARD';
  color: string;
  x: number;
  y: number;
  visible: boolean;
}

function normalizeLon(lon: number): number {
  let l = (lon + 180) % 360;
  if (l < 0) l += 360;
  return l - 180;
}

function clampLat(lat: number): number {
  return Math.max(-85.0, Math.min(85.0, lat));
}

function latLonToVector3(lat: number, lon: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = normalizeLon(lon) * (Math.PI / 180);
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    radius * sinPhi * Math.sin(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.cos(theta)
  );
}

function vector3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const r = v.length();
  if (r === 0) return { lat: 0, lon: 0 };
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, v.y / r))) * (180 / Math.PI);
  const lon = Math.atan2(v.x, v.z) * (180 / Math.PI);
  return { lat, lon };
}

function elevationMetersToRadius(elevMeters: number, exaggeration: number): number {
  return GLOBE_RADIUS + (elevMeters / 1000.0) * (GLOBE_RADIUS / MARS_RADIUS_KM) * exaggeration;
}

function boxesIntersect(
  lonMinA: number,
  latMinA: number,
  lonMaxA: number,
  latMaxA: number,
  lonMinB: number,
  latMinB: number,
  lonMaxB: number,
  latMaxB: number
): boolean {
  return lonMinA < lonMaxB && lonMaxA > lonMinB && latMinA < latMaxB && latMaxA > latMinB;
}

function findIntersectingExpeditionSite(
  lonMin: number,
  latMin: number,
  lonMax: number,
  latMax: number
): ExpeditionSite | null {
  for (const site of EXPEDITION_SITES) {
    const [rLonMin, rLatMin, rLonMax, rLatMax] = site.roiBbox;
    if (boxesIntersect(lonMin, latMin, lonMax, latMax, rLonMin, rLatMin, rLonMax, rLatMax)) {
      return site;
    }
  }
  return null;
}

function surfaceDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = (normalizeLon(lon2 - lon1) * Math.PI) / 180;
  const midLat = (((lat1 + lat2) * 0.5) * Math.PI) / 180;
  const dx = dLon * Math.cos(midLat) * MARS_RADIUS_KM;
  const dy = dLat * MARS_RADIUS_KM;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// REAL-TIME ASTRONOMICAL MARS CLOCK & EPHEMERIS (NASA GISS MARS24 ALGORITHM)
// ============================================================================
export interface RealMarsEphemeris {
  msd: number; // Mars Sol Date
  perseveranceSol: number; // Mars 2020 Sol (landed Feb 18, 2021, MSD 52303.99)
  curiositySol: number; // MSL Curiosity Sol (landed Aug 6, 2012, MSD 49268.90)
  mtcStr: string; // Coordinated Mars Time (at 0° Prime Meridian)
  localSolarTimeStr: string; // Local True Solar Time at watched longitude
  localHourFloat: number;
  freezeCountdownStr: string; // Time until local nightfall (-100°C drop) or sunrise
  isDaylightAtFocus: boolean;
  subsolarLat: number; // Real-time subsolar latitude on Mars right now
  subsolarLon: number; // Real-time subsolar east longitude on Mars right now
  solarZenithDeg?: number;
  solarAzimuthDeg?: number;
}

function computeRealMarsTimeAndSun(
  focusLonEast: number,
  focusLat: number = 0,
  nowMs: number = 1763148000000
): RealMarsEphemeris {
  const jdUT = 2440587.5 + nowMs / 86400000.0;
  const jdTT = jdUT + 69.184 / 86400.0;
  const dJ2000 = jdTT - 2451545.0;

  // 1. Mars Mean Anomaly (M) & Fiction Mean Sun (alpha_FMS) in degrees
  const Mdeg = (19.3871 + 0.52402073 * dJ2000) % 360.0;
  const Mrad = (Mdeg * Math.PI) / 180.0;
  const alphaFMS = (270.3871 + 0.524038496 * dJ2000) % 360.0;

  // 2. Equation of Center (v - M) & Areocentric Solar Longitude (L_s)
  const vMinusM =
    (10.691 + 3.0e-7 * dJ2000) * Math.sin(Mrad) +
    0.623 * Math.sin(2 * Mrad) +
    0.05 * Math.sin(3 * Mrad) +
    0.005 * Math.sin(4 * Mrad) +
    0.0005 * Math.sin(5 * Mrad);
  const LsDeg = (alphaFMS + vMinusM + 360.0) % 360.0;
  const LsRad = (LsDeg * Math.PI) / 180.0;

  // 3. Equation of Time (EOT) in degrees
  const eotDeg =
    2.861 * Math.sin(2 * LsRad) -
    0.071 * Math.sin(4 * LsRad) +
    0.002 * Math.sin(6 * LsRad) -
    vMinusM;

  // 4. Mars Sol Date (MSD) & Coordinated Mars Time (MTC)
  const msd = (dJ2000 - 4.5) / 1.0274912517 + 44796.0 - 0.0009626;
  const perseveranceSol = Math.floor(msd - 52303.99);
  const curiositySol = Math.floor(msd - 49268.9);

  const mtcHours = (((msd % 1.0) + 1.0) % 1.0) * 24.0;

  // 5. Subsolar Latitude (declination) & Subsolar East Longitude on Mars right now
  // Corrected astronomical formula: subsolar East lon = 180° - 15° * MTC + EOT
  const obliquityRad = (25.1919 * Math.PI) / 180.0;
  const subsolarLat = (Math.asin(Math.sin(obliquityRad) * Math.sin(LsRad)) * 180.0) / Math.PI;
  const subsolarLon = normalizeLon(180.0 - mtcHours * 15.0 + eotDeg);

  // 6. Local True Solar Time (LTST) at watched longitude
  const localHourFloat = ((mtcHours + focusLonEast / 15.0 + eotDeg / 15.0) % 24.0 + 24.0) % 24.0;

  // 7. Solar Zenith & Azimuth at Focus Location
  const latRad = (focusLat * Math.PI) / 180.0;
  const sLatRad = (subsolarLat * Math.PI) / 180.0;
  const dLonRad = (normalizeLon(subsolarLon - focusLonEast) * Math.PI) / 180.0;
  const sinElev =
    Math.sin(latRad) * Math.sin(sLatRad) +
    Math.cos(latRad) * Math.cos(sLatRad) * Math.cos(dLonRad);
  const solarZenithDeg = Math.acos(Math.max(-1, Math.min(1, sinElev))) * (180.0 / Math.PI);
  const cosElev = Math.max(0.01, Math.cos((90.0 - solarZenithDeg) * (Math.PI / 180.0)));
  const sinAz = (Math.cos(sLatRad) * Math.sin(dLonRad)) / cosElev;
  const cosAz = (Math.sin(sLatRad) - Math.sin(latRad) * sinElev) / (Math.cos(latRad) * cosElev);
  const solarAzimuthDeg = (Math.atan2(sinAz, cosAz) * (180.0 / Math.PI) + 360.0) % 360.0;

  const formatHMS = (hFloat: number) => {
    const hh = Math.floor(hFloat);
    const mm = Math.floor((hFloat - hh) * 60.0);
    const ss = Math.floor(((hFloat - hh) * 60.0 - mm) * 60.0);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const isDaylightAtFocus = localHourFloat >= 6.0 && localHourFloat < 18.2;
  let freezeCountdownStr: string;
  if (isDaylightAtFocus) {
    const remSolHours = (18.2 - localHourFloat) * 1.02749;
    const rH = Math.floor(remSolHours);
    const rM = Math.floor((remSolHours - rH) * 60);
    freezeCountdownStr = `FREEZE IN ${String(rH).padStart(2, '0')}h ${String(rM).padStart(2, '0')}m`;
  } else {
    const hrsToDawn =
      (localHourFloat < 6.0 ? 6.0 - localHourFloat : 30.0 - localHourFloat) * 1.02749;
    const rH = Math.floor(hrsToDawn);
    const rM = Math.floor((hrsToDawn - rH) * 60);
    freezeCountdownStr = `NIGHT (-98°C) • DAWN ${String(rH).padStart(2, '0')}h ${String(rM).padStart(2, '0')}m`;
  }

  return {
    msd,
    perseveranceSol,
    curiositySol,
    mtcStr: `${formatHMS(mtcHours)} MTC`,
    localSolarTimeStr: `${formatHMS(localHourFloat)} LTST`,
    localHourFloat,
    freezeCountdownStr,
    isDaylightAtFocus,
    subsolarLat,
    subsolarLon,
    solarZenithDeg: Number(solarZenithDeg.toFixed(1)),
    solarAzimuthDeg: Number(solarAzimuthDeg.toFixed(1)),
  };
}

// ============================================================================
// UNIFIED C1-CONTINUOUS BICUBIC ELEVATION & SLOPE FIELD (ZERO TILE SEAMS!)
// ============================================================================
/**
 * Why tile borders previously showed slope lines or cracks:
 * Computing elevation or slope inside each tile independently caused boundary jumps
 * between tiles of different zoom levels or at tile borders (r=0, r=48).
 *
 * Solution:
 * `UnifiedMarsTerrainField` maintains:
 *  1) A single global continuous DEM grid (512x256, smoothed from MOLA WMTS z=0)
 *  2) A single 256x256 16-bit Signed Integer Master DEM for each of the 4 Expedition Sites,
 *     smoothly feathered into the global DEM along the outer 15% ROI margin.
 *  3) Catmull-Rom Bicubic Interpolation (`sampleBicubic`) so BOTH elevation z(lat, lon)
 *     and slope theta(lat, lon) are 100% C1-continuous across every tile boundary on Mars!
 */
export class UnifiedMarsTerrainField {
  private globalDem: Float32Array;
  private readonly globalW = 512;
  private readonly globalH = 256;
  public isGlobalLoaded = false;

  private siteDems = new Map<string, Float32Array>();
  private siteLoading = new Set<string>();
  private readonly siteSize = 256;
  private onDemUpdated?: () => void;

  constructor(onDemUpdated?: () => void) {
    this.onDemUpdated = onDemUpdated;
    this.globalDem = new Float32Array(this.globalW * this.globalH).fill(-1800);
    this.loadGlobalDem();
  }

  private async loadGlobalDem() {
    const [westImg, eastImg] = await Promise.all([
      fetchCachedImage(
        'https://trek.nasa.gov/tiles/Mars/EQ/mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/0/0/0.png'
      ),
      fetchCachedImage(
        'https://trek.nasa.gov/tiles/Mars/EQ/mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/0/0/1.png'
      ),
    ]);

    if (!westImg || !eastImg) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.globalW;
    canvas.height = this.globalH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(westImg, 0, 0, 256, 256);
    ctx.drawImage(eastImg, 256, 0, 256, 256);
    const data = ctx.getImageData(0, 0, this.globalW, this.globalH).data;

    const raw = new Float32Array(this.globalW * this.globalH);
    for (let i = 0; i < raw.length; i++) {
      raw[i] = data[i * 4] * 55.08 - 7004.45;
    }

    // Apply 2 passes of separable 5-tap Gaussian smoothing to remove 8-bit quantization steps
    const temp = new Float32Array(raw.length);
    for (let pass = 0; pass < 2; pass++) {
      const src = pass === 0 ? raw : this.globalDem;
      for (let y = 0; y < this.globalH; y++) {
        for (let x = 0; x < this.globalW; x++) {
          const xm2 = (x - 2 + this.globalW) % this.globalW;
          const xm1 = (x - 1 + this.globalW) % this.globalW;
          const xp1 = (x + 1) % this.globalW;
          const xp2 = (x + 2) % this.globalW;
          temp[y * this.globalW + x] =
            (src[y * this.globalW + xm2] +
              4 * src[y * this.globalW + xm1] +
              6 * src[y * this.globalW + x] +
              4 * src[y * this.globalW + xp1] +
              src[y * this.globalW + xp2]) /
            16.0;
        }
      }
      for (let y = 0; y < this.globalH; y++) {
        const ym2 = Math.max(0, y - 2);
        const ym1 = Math.max(0, y - 1);
        const yp1 = Math.min(this.globalH - 1, y + 1);
        const yp2 = Math.min(this.globalH - 1, y + 2);
        for (let x = 0; x < this.globalW; x++) {
          this.globalDem[y * this.globalW + x] =
            (temp[ym2 * this.globalW + x] +
              4 * temp[ym1 * this.globalW + x] +
              6 * temp[y * this.globalW + x] +
              4 * temp[yp1 * this.globalW + x] +
              temp[yp2 * this.globalW + x]) /
            16.0;
        }
      }
    }

    this.isGlobalLoaded = true;
    this.onDemUpdated?.();
  }

  private static decodeGeoTiffS16(buf: ArrayBuffer, fallbackSize: number): Float32Array | null {
    if (buf.byteLength < 16) return null;
    const view = new DataView(buf);
    const b0 = view.getUint8(0);
    const b1 = view.getUint8(1);
    const littleEndian = b0 === 0x49 && b1 === 0x49; // 'II'
    const magic = view.getUint16(2, littleEndian);
    if (magic !== 42) return null;

    const ifdOffset = view.getUint32(4, littleEndian);
    if (ifdOffset + 2 > buf.byteLength) return null;
    const numEntries = view.getUint16(ifdOffset, littleEndian);

    let imgW = fallbackSize;
    let imgH = fallbackSize;
    let tileW = 0;
    let tileH = 0;
    let tileOffsets: number[] = [];
    let stripOffsets: number[] = [];
    let rowsPerStrip = 0;

    const readTagUintArray = (type: number, count: number, valOrOffset: number): number[] => {
      const out: number[] = [];
      if (count === 1) {
        out.push(valOrOffset);
        return out;
      }
      const elemSize = type === 3 ? 2 : 4;
      if (valOrOffset + count * elemSize > buf.byteLength) return out;
      for (let i = 0; i < count; i++) {
        const off = valOrOffset + i * elemSize;
        out.push(
          type === 3 ? view.getUint16(off, littleEndian) : view.getUint32(off, littleEndian)
        );
      }
      return out;
    };

    for (let i = 0; i < numEntries; i++) {
      const entryOff = ifdOffset + 2 + i * 12;
      if (entryOff + 12 > buf.byteLength) break;
      const tag = view.getUint16(entryOff, littleEndian);
      const type = view.getUint16(entryOff + 2, littleEndian);
      const count = view.getUint32(entryOff + 4, littleEndian);
      const valOrOff =
        type === 3 && count === 1
          ? view.getUint16(entryOff + 8, littleEndian)
          : view.getUint32(entryOff + 8, littleEndian);

      if (tag === 256) imgW = valOrOff;
      else if (tag === 257) imgH = valOrOff;
      else if (tag === 273) stripOffsets = readTagUintArray(type, count, valOrOff);
      else if (tag === 278) rowsPerStrip = valOrOff;
      else if (tag === 322) tileW = valOrOff;
      else if (tag === 323) tileH = valOrOff;
      else if (tag === 324) tileOffsets = readTagUintArray(type, count, valOrOff);
    }

    const outGrid = new Float32Array(imgW * imgH);

    // Case 1: Tiled GeoTIFF (ArcGIS ImageServer returns 128x128 internal TIFF tiles!)
    if (tileW > 0 && tileH > 0 && tileOffsets.length > 0) {
      const tilesAcross = Math.ceil(imgW / tileW);
      for (let tIdx = 0; tIdx < tileOffsets.length; tIdx++) {
        const byteOff = tileOffsets[tIdx];
        const tx0 = (tIdx % tilesAcross) * tileW;
        const ty0 = Math.floor(tIdx / tilesAcross) * tileH;
        const copyW = Math.min(tileW, imgW - tx0);
        const copyH = Math.min(tileH, imgH - ty0);

        for (let r = 0; r < copyH; r++) {
          const rowByteOff = byteOff + r * tileW * 2;
          if (rowByteOff + copyW * 2 > buf.byteLength) break;
          const dstRowBase = (ty0 + r) * imgW + tx0;
          for (let c = 0; c < copyW; c++) {
            const sample = view.getInt16(rowByteOff + c * 2, littleEndian);
            outGrid[dstRowBase + c] = sample < -15000 ? -2500 : sample;
          }
        }
      }
      return outGrid;
    }

    // Case 2: Stripped GeoTIFF fallback
    if (stripOffsets.length > 0) {
      const rps = rowsPerStrip > 0 ? rowsPerStrip : imgH;
      for (let sIdx = 0; sIdx < stripOffsets.length; sIdx++) {
        const byteOff = stripOffsets[sIdx];
        const y0 = sIdx * rps;
        const copyH = Math.min(rps, imgH - y0);
        for (let r = 0; r < copyH; r++) {
          const rowByteOff = byteOff + r * imgW * 2;
          if (rowByteOff + imgW * 2 > buf.byteLength) break;
          const dstRowBase = (y0 + r) * imgW;
          for (let c = 0; c < imgW; c++) {
            const sample = view.getInt16(rowByteOff + c * 2, littleEndian);
            outGrid[dstRowBase + c] = sample < -15000 ? -2500 : sample;
          }
        }
      }
      return outGrid;
    }

    return null;
  }

  public async ensureSiteMasterDemLoaded(site: { id: string; roiBbox: [number, number, number, number] }) {
    if (this.siteDems.has(site.id) || this.siteLoading.has(site.id)) return;
    this.siteLoading.add(site.id);

    const [lonMin, latMin, lonMax, latMax] = site.roiBbox;
    const url = `https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer/exportImage?bbox=${lonMin},${latMin},${lonMax},${latMax}&bboxSR=104905&size=${this.siteSize},${this.siteSize}&imageSR=104905&format=tiff&pixelType=S16&f=image`;

    try {
      let buf: ArrayBuffer | null = null;
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await window.caches.open('ares-mars-dem-v1');
          const match = await cache.match(url);
          if (match) {
            buf = await match.arrayBuffer();
          }
        } catch {}
      }

      if (!buf) {
        const res = await fetch(url);
        if (res.ok) {
          if (typeof window !== 'undefined' && 'caches' in window) {
            const clone = res.clone();
            window.caches.open('ares-mars-dem-v1').then((c) => c.put(url, clone)).catch(() => {});
          }
          buf = await res.arrayBuffer();
        }
      }

      if (buf) {
        const floatGrid = UnifiedMarsTerrainField.decodeGeoTiffS16(buf, this.siteSize);
        if (floatGrid) {
          // Light 3x3 smoothing pass so integer meter steps are C1 smooth for Slope Radar
          const smoothed = new Float32Array(floatGrid.length);
          const N = this.siteSize;
          for (let y = 0; y < N; y++) {
            const y0 = Math.max(0, y - 1);
            const y1 = Math.min(N - 1, y + 1);
            for (let x = 0; x < N; x++) {
              const x0 = Math.max(0, x - 1);
              const x1 = Math.min(N - 1, x + 1);
              smoothed[y * N + x] =
                (floatGrid[y0 * N + x0] +
                  2 * floatGrid[y0 * N + x] +
                  floatGrid[y0 * N + x1] +
                  2 * floatGrid[y * N + x0] +
                  4 * floatGrid[y * N + x] +
                  2 * floatGrid[y * N + x1] +
                  floatGrid[y1 * N + x0] +
                  2 * floatGrid[y1 * N + x] +
                  floatGrid[y1 * N + x1]) /
                16.0;
            }
          }

          this.siteDems.set(site.id, smoothed);
          this.onDemUpdated?.();
        }
      }
    } catch {
    } finally {
      this.siteLoading.delete(site.id);
    }
  }

  private static cubicHermite(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
    const b = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
    const c = -0.5 * p0 + 0.5 * p2;
    const d = p1;
    return ((a * t + b) * t + c) * t + d;
  }

  private sampleBicubicGrid(
    grid: Float32Array,
    w: number,
    h: number,
    uNorm: number,
    vNorm: number,
    wrapX: boolean
  ): number {
    const fx = uNorm * (w - 1);
    const fy = vNorm * (h - 1);
    const x1 = Math.floor(fx);
    const y1 = Math.floor(fy);
    const tx = fx - x1;
    const ty = fy - y1;

    const getX = (x: number) =>
      wrapX ? ((x % w) + w) % w : Math.max(0, Math.min(w - 1, x));
    const getY = (y: number) => Math.max(0, Math.min(h - 1, y));

    const rowVals = [0, 0, 0, 0];
    for (let j = -1; j <= 2; j++) {
      const y = getY(y1 + j);
      const p0 = grid[y * w + getX(x1 - 1)];
      const p1 = grid[y * w + getX(x1)];
      const p2 = grid[y * w + getX(x1 + 1)];
      const p3 = grid[y * w + getX(x1 + 2)];
      rowVals[j + 1] = UnifiedMarsTerrainField.cubicHermite(p0, p1, p2, p3, tx);
    }

    return UnifiedMarsTerrainField.cubicHermite(
      rowVals[0],
      rowVals[1],
      rowVals[2],
      rowVals[3],
      ty
    );
  }

  /**
   * Evaluates exact C1-continuous elevation in meters at ANY (lat, lon) on Mars.
   * Because this function depends ONLY on (lat, lon) and NEVER on tile indices,
   * all adjacent tiles share 100% identical border elevations and slopes!
   */
  public getElevationMeters(lat: number, lon: number): number {
    const nLon = normalizeLon(lon);
    const cLat = Math.max(-89.99, Math.min(89.99, lat));

    const uG = (nLon + 180.0) / 360.0;
    const vG = (90.0 - cLat) / 180.0;
    const globalElev = this.sampleBicubicGrid(
      this.globalDem,
      this.globalW,
      this.globalH,
      uG,
      vG,
      true
    );

    // Check if inside any of the 4 Expedition Sites with a loaded 16-bit Master DEM
    for (const site of EXPEDITION_SITES) {
      const [lonMin, latMin, lonMax, latMax] = site.roiBbox;
      if (nLon >= lonMin && nLon <= lonMax && cLat >= latMin && cLat <= latMax) {
        const siteGrid = this.siteDems.get(site.id);
        if (!siteGrid) {
          this.ensureSiteMasterDemLoaded(site);
          return globalElev;
        }

        const uS = (nLon - lonMin) / (lonMax - lonMin);
        const vS = (latMax - cLat) / (latMax - latMin);
        const siteElev = this.sampleBicubicGrid(
          siteGrid,
          this.siteSize,
          this.siteSize,
          uS,
          vS,
          false
        );

        // Smooth cosine feathering along the outer 12% margin of the ROI box so
        // the transition from global z=5 to site z=6..12 has ZERO step or seam!
        const edgeDist = Math.min(uS, 1.0 - uS, vS, 1.0 - vS);
        const margin = 0.12;
        if (edgeDist >= margin) return siteElev;
        const t = edgeDist / margin;
        const smoothW = t * t * (3.0 - 2.0 * t);
        return globalElev * (1.0 - smoothW) + siteElev * smoothW;
      }
    }

    return globalElev;
  }

  /**
   * Evaluates physical metric slope (degrees), directional pitch, lateral roll,
   * and surface friction coefficient at ANY (lat, lon) without tile-edge artifacts.
   */
  public sampleMetricsAt(
    lat: number,
    lon: number,
    headingDeg: number = 0
  ): {
    elevM: number;
    slopeDeg: number;
    pitchDeg: number;
    rollDeg: number;
    dzEast: number;
    dzNorth: number;
    frictionMu: number;
  } {
    const elevM = this.getElevationMeters(lat, lon);

    // Use a consistent 180-meter metric stencil in (lat, lon) across the entire planet
    const dLatDeg = 0.003; // ~177 meters on Mars
    const cosLat = Math.max(0.15, Math.cos((lat * Math.PI) / 180.0));
    const dLonDeg = dLatDeg / cosLat;
    const stepMeters = ((dLatDeg * Math.PI) / 180.0) * MARS_RADIUS_M;

    const zN = this.getElevationMeters(lat + dLatDeg, lon);
    const zS = this.getElevationMeters(lat - dLatDeg, lon);
    const zE = this.getElevationMeters(lat, lon + dLonDeg);
    const zW = this.getElevationMeters(lat, lon - dLonDeg);

    const dzEast = (zE - zW) / (2.0 * stepMeters);
    const dzNorth = (zN - zS) / (2.0 * stepMeters);

    const slopeRad = Math.atan(Math.sqrt(dzEast * dzEast + dzNorth * dzNorth));
    const slopeDeg = slopeRad * (180.0 / Math.PI);

    const hRad = (headingDeg * Math.PI) / 180.0;
    const uEast = Math.sin(hRad);
    const uNorth = Math.cos(hRad);
    const rEast = Math.cos(hRad);
    const rNorth = -Math.sin(hRad);

    const pitchDeg = Math.atan(dzEast * uEast + dzNorth * uNorth) * (180.0 / Math.PI);
    const rollDeg = Math.atan(dzEast * rEast + dzNorth * rNorth) * (180.0 / Math.PI);

    // Local Topographic Position Index (TPI) for depression sand-trap detection
    const meanNeigh = (zN + zS + zE + zW) * 0.25;
    const tpi = elevM - meanNeigh;
    const sandTrapScore = Math.max(0.0, Math.min(1.0, -tpi / 8.0));

    const frictionMu = Math.max(
      0.34,
      Math.min(0.82, 0.78 - slopeDeg * 0.012 - sandTrapScore * 0.18)
    );

    return {
      elevM,
      slopeDeg,
      pitchDeg,
      rollDeg,
      dzEast,
      dzNorth,
      frictionMu,
    };
  }
}

// ============================================================================
// SHARED IN-MEMORY & BROWSER CACHE API PERSISTENT TILE STORAGE
// ============================================================================
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function fetchCachedImage(url: string): Promise<HTMLImageElement | null> {
  const existing = imageCache.get(url);
  if (existing) return existing;

  const promise = (async (): Promise<HTMLImageElement | null> => {
    // 1. Alias root global tiles to pre-bundled local assets in /public/tiles/base/ for instant 0ms first-paint!
    let targetUrl = url;
    if (url.includes('mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/0/0/0.png')) {
      targetUrl = '/tiles/base/mola_dem_west.png';
    } else if (url.includes('mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/0/0/1.png')) {
      targetUrl = '/tiles/base/mola_dem_east.png';
    } else if (url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/0.jpg')) {
      targetUrl = '/tiles/base/viking_west.jpg';
    } else if (url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/1.jpg')) {
      targetUrl = '/tiles/base/viking_east.jpg';
    } else if (url.includes('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/0/0/0.jpg')) {
      targetUrl = '/tiles/base/shade_west.jpg';
    } else if (url.includes('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/0/0/1.jpg')) {
      targetUrl = '/tiles/base/shade_east.jpg';
    } else {
      const z1Viking = url.match(/Mars_Viking_MDIM21_ClrMosaic_global_232m\/1\.0\.0\/default\/default028mm\/1\/([0-1])\/([0-3])\.jpg/);
      if (z1Viking) {
        targetUrl = `/tiles/z1/viking_${z1Viking[1]}_${z1Viking[2]}.jpg`;
      } else {
        const z1Shade = url.match(/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw\/1\.0\.0\/default\/default028mm\/1\/([0-1])\/([0-3])\.jpg/);
        if (z1Shade) {
          targetUrl = `/tiles/z1/shade_${z1Shade[1]}_${z1Shade[2]}.jpg`;
        }
      }
    }

    // 2. Query persistent Browser Cache API ('ares-mars-tiles-v1') on client disk
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open('ares-mars-tiles-v1');
        const match = await cache.match(targetUrl);
        if (match) {
          const blob = await match.blob();
          const objUrl = URL.createObjectURL(blob);
          return await new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(objUrl);
              resolve(img);
            };
            img.onerror = () => {
              URL.revokeObjectURL(objUrl);
              resolve(null);
            };
            img.src = objUrl;
          });
        }
      } catch {}
    }

    // 3. Network Fetch with Auto-Persist to Cache API
    return await new Promise<HTMLImageElement | null>((resolve) => {
      fetch(targetUrl, { mode: 'cors' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (typeof window !== 'undefined' && 'caches' in window) {
            const clone = res.clone();
            window.caches.open('ares-mars-tiles-v1').then((c) => c.put(targetUrl, clone)).catch(() => {});
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(objUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objUrl);
            resolve(null);
          };
          img.src = objUrl;
        })
        .catch(() => {
          // Direct Image.src fallback if fetch or CORS fails
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = targetUrl;
        });
    });
  })();

  if (imageCache.size > 600) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
  imageCache.set(url, promise);
  return promise;
}

interface QueuedTask {
  id: string;
  priority: number;
  run: () => Promise<void>;
  cancelled: boolean;
}

class TileDownloadScheduler {
  private queue: QueuedTask[] = [];
  private activeCount = 0;
  private onStatsChange?: (active: number, queued: number) => void;

  constructor(onStatsChange?: (active: number, queued: number) => void) {
    this.onStatsChange = onStatsChange;
  }

  enqueue(id: string, priority: number, run: () => Promise<void>): () => void {
    const task: QueuedTask = { id, priority, run, cancelled: false };
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.notify();
    this.pump();

    return () => {
      task.cancelled = true;
      const idx = this.queue.indexOf(task);
      if (idx !== -1) {
        this.queue.splice(idx, 1);
        this.notify();
      }
    };
  }

  private notify() {
    this.onStatsChange?.(this.activeCount, this.queue.length);
  }

  private pump() {
    while (this.activeCount < MAX_CONCURRENT_DOWNLOADS && this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (next.cancelled) continue;
      this.activeCount++;
      this.notify();
      next
        .run()
        .catch(() => {})
        .finally(() => {
          this.activeCount--;
          this.notify();
          this.pump();
        });
    }
  }
}

// ============================================================================
// QUADTREE SPHERICAL TILE NODE (100% SEAMLESS ACROSS ALL BORDERS)
// ============================================================================
const SLOPE_RADAR_LUT = (() => {
  const lut = new Uint8Array(256 * 3);
  for (let s = 0; s < 256; s++) {
    const slopeDeg = s * 0.2; // 0.0 to 51.0 degrees
    let r = 34;
    let g = 197;
    let b = 94;
    if (slopeDeg < 8.0) {
      const t = slopeDeg / 8.0;
      r = 25 + t * 85;
      g = 185 + t * 25;
      b = 85 - t * 25;
    } else if (slopeDeg <= 15.0) {
      const t = (slopeDeg - 8.0) / 7.0;
      r = 215 + t * 30;
      g = 180 - t * 75;
      b = 38 - t * 15;
    } else {
      const t = Math.min(1.0, (slopeDeg - 15.0) / 14.0);
      r = 235 + t * 20;
      g = 48 - t * 32;
      b = 38 - t * 20;
    }
    lut[s * 3] = Math.round(r);
    lut[s * 3 + 1] = Math.round(g);
    lut[s * 3 + 2] = Math.round(b);
  }
  return lut;
})();

let sharedScratchCanvas: HTMLCanvasElement | null = null;
function getSharedScratchCanvas(size: number): HTMLCanvasElement {
  if (!sharedScratchCanvas) {
    sharedScratchCanvas = document.createElement('canvas');
  }
  if (sharedScratchCanvas.width !== size || sharedScratchCanvas.height !== size) {
    sharedScratchCanvas.width = size;
    sharedScratchCanvas.height = size;
  }
  return sharedScratchCanvas;
}

class QuadTileNode {
  readonly z: number;
  readonly row: number;
  readonly col: number;
  readonly key: string;
  readonly parent: QuadTileNode | null;

  readonly lonMin: number;
  readonly lonMax: number;
  readonly latMin: number;
  readonly latMax: number;
  readonly lonCenter: number;
  readonly latCenter: number;
  readonly spanDeg: number;

  readonly expeditionSite: ExpeditionSite | null;
  readonly isHighDetailSite: boolean;
  readonly maxAllowedZoom: number;
  readonly texSize: number;

  readonly center3D: THREE.Vector3;
  readonly boundingSphere: THREE.Sphere;

  children: QuadTileNode[] | null = null;
  mesh: THREE.Mesh | null = null;
  borderLine: THREE.Line | null = null;

  colorCanvas: HTMLCanvasElement;
  baseImageryCanvas: HTMLCanvasElement; // Cached orbital imagery so Slope Radar updates instantly
  demGrid: Float32Array;
  slopeGrid: Float32Array;

  isLoaded = false;
  isLoading = false;
  isDisposed = false;
  cancelDownload: (() => void) | null = null;

  constructor(
    z: number,
    row: number,
    col: number,
    parent: QuadTileNode | null,
    terrainField: UnifiedMarsTerrainField
  ) {
    this.z = z;
    this.row = row;
    this.col = col;
    this.key = `${z}/${row}/${col}`;
    this.parent = parent;

    const cols = 2 * (1 << z);
    const rows = 1 * (1 << z);
    this.spanDeg = 360.0 / cols;

    this.lonMin = -180.0 + col * this.spanDeg;
    this.lonMax = this.lonMin + this.spanDeg;
    this.latMax = 90.0 - row * (180.0 / rows);
    this.latMin = this.latMax - 180.0 / rows;

    this.lonCenter = (this.lonMin + this.lonMax) * 0.5;
    this.latCenter = (this.latMin + this.latMax) * 0.5;

    this.expeditionSite = findIntersectingExpeditionSite(
      this.lonMin,
      this.latMin,
      this.lonMax,
      this.latMax
    );
    if (this.expeditionSite) {
      terrainField.ensureSiteMasterDemLoaded(this.expeditionSite);
    }

    this.isHighDetailSite = this.expeditionSite !== null;
    this.maxAllowedZoom = this.expeditionSite ? this.expeditionSite.maxZoom : MAX_GLOBAL_ZOOM;
    this.texSize = this.isHighDetailSite ? 256 : 128;

    this.center3D = latLonToVector3(this.latCenter, this.lonCenter, GLOBE_RADIUS);
    const arcRadius = GLOBE_RADIUS * ((this.spanDeg * Math.PI) / 180.0) * 0.78;
    this.boundingSphere = new THREE.Sphere(this.center3D.clone(), Math.max(arcRadius, 0.15));

    this.colorCanvas = document.createElement('canvas');
    this.colorCanvas.width = this.texSize;
    this.colorCanvas.height = this.texSize;

    this.baseImageryCanvas = document.createElement('canvas');
    this.baseImageryCanvas.width = this.texSize;
    this.baseImageryCanvas.height = this.texSize;

    const gridLen = DEM_GRID_SIZE * DEM_GRID_SIZE;
    this.demGrid = new Float32Array(gridLen);
    this.slopeGrid = new Float32Array(gridLen);

    if (parent) {
      const qCol = this.col % 2;
      const qRow = this.row % 2;
      const pHalf = parent.texSize / 2;
      const bCtx = this.baseImageryCanvas.getContext('2d')!;
      bCtx.imageSmoothingEnabled = true;
      bCtx.drawImage(
        parent.baseImageryCanvas,
        qCol * pHalf,
        qRow * pHalf,
        pHalf,
        pHalf,
        0,
        0,
        this.texSize,
        this.texSize
      );
      const cCtx = this.colorCanvas.getContext('2d')!;
      cCtx.drawImage(this.baseImageryCanvas, 0, 0);
    } else {
      const bCtx = this.baseImageryCanvas.getContext('2d')!;
      bCtx.fillStyle = '#a45a38';
      bCtx.fillRect(0, 0, this.texSize, this.texSize);
      const cCtx = this.colorCanvas.getContext('2d')!;
      cCtx.drawImage(this.baseImageryCanvas, 0, 0);
    }

    this.refreshUnifiedDemAndSlope(terrainField);
  }

  /**
   * Populates demGrid and slopeGrid from the single UnifiedMarsTerrainField.
   * Because every vertex at (lat, lon) queries the exact same C1-continuous function,
   * adjacent tiles share 100% identical border vertices AND identical border slopes!
   */
  refreshUnifiedDemAndSlope(terrainField: UnifiedMarsTerrainField) {
    for (let r = 0; r < DEM_GRID_SIZE; r++) {
      const vFrac = r / TILE_SEGMENTS;
      const lat = this.latMax - vFrac * (this.latMax - this.latMin);

      for (let c = 0; c < DEM_GRID_SIZE; c++) {
        const uFrac = c / TILE_SEGMENTS;
        const lon = this.lonMin + uFrac * (this.lonMax - this.lonMin);

        const idx = r * DEM_GRID_SIZE + c;
        const metrics = terrainField.sampleMetricsAt(lat, lon, 0);
        this.demGrid[idx] = metrics.elevM;
        this.slopeGrid[idx] = metrics.slopeDeg;
      }
    }
  }

  /**
   * Composites the active visual layer (Realistic, Dynamic Slope Radar, Contours)
   * using the C1-continuous demGrid & slopeGrid so NO tile border lines ever appear!
   */
  applyVisualLayerToCanvas(layerMode: VisualLayerMode) {
    const texSize = this.texSize;
    const ctx = this.colorCanvas.getContext('2d')!;
    ctx.drawImage(this.baseImageryCanvas, 0, 0);

    if (layerMode === 'realistic' || layerMode === 'color_hillshade' || layerMode === 'orbital_raw') {
      if (this.mesh) {
        const mat = this.mesh.material as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.needsUpdate = true;
      }
      return;
    }

    const imgData = ctx.getImageData(0, 0, texSize, texSize);
    const pixels = imgData.data;
    const pixels32 = new Uint32Array(imgData.data.buffer);
    const contourIntervalM = 60.0;
    const isSlopeRadar = layerMode === 'slope_radar';

    for (let py = 0; py < texSize; py++) {
      const gy = (py / (texSize - 1)) * TILE_SEGMENTS;
      const r0 = Math.min(Math.floor(gy), TILE_SEGMENTS - 1);
      const fy = gy - r0;
      const r0Row = r0 * DEM_GRID_SIZE;
      const r1Row = (r0 + 1) * DEM_GRID_SIZE;
      const pRowOffset = py * texSize;

      for (let px = 0; px < texSize; px++) {
        const pIdx = pRowOffset + px;
        const pByte = pIdx * 4;
        let outR = pixels[pByte];
        let outG = pixels[pByte + 1];
        let outB = pixels[pByte + 2];
        const lum = (outR * 0.299 + outG * 0.587 + outB * 0.114) / 255.0;

        const gx = (px / (texSize - 1)) * TILE_SEGMENTS;
        const c0 = Math.min(Math.floor(gx), TILE_SEGMENTS - 1);
        const fx = gx - c0;

        const idx00 = r0Row + c0;
        const idx10 = r0Row + (c0 + 1);
        const idx01 = r1Row + c0;
        const idx11 = r1Row + (c0 + 1);

        const elevPx =
          (this.demGrid[idx00] * (1 - fx) + this.demGrid[idx10] * fx) * (1 - fy) +
          (this.demGrid[idx01] * (1 - fx) + this.demGrid[idx11] * fx) * fy;

        const slopePx =
          (this.slopeGrid[idx00] * (1 - fx) + this.slopeGrid[idx10] * fx) * (1 - fy) +
          (this.slopeGrid[idx01] * (1 - fx) + this.slopeGrid[idx11] * fx) * fy;

        if (isSlopeRadar) {
          const lutOffset = Math.min(255, (slopePx * 5) | 0) * 3;
          const radarR = SLOPE_RADAR_LUT[lutOffset];
          const radarG = SLOPE_RADAR_LUT[lutOffset + 1];
          const radarB = SLOPE_RADAR_LUT[lutOffset + 2];

          const reliefShade = Math.max(0.32, Math.min(1.22, 0.38 + lum * 0.9));
          outR = outR * 0.22 + radarR * reliefShade * 0.78;
          outG = outG * 0.22 + radarG * reliefShade * 0.78;
          outB = outB * 0.22 + radarB * reliefShade * 0.78;
        }

        const modElev = ((elevPx % contourIntervalM) + contourIntervalM) % contourIntervalM;
        const distToIso = Math.min(modElev, contourIntervalM - modElev);
        const lineTol = Math.max(1.1, slopePx * 0.15);
        if (distToIso < lineTol) {
          const lineStrength = (1.0 - distToIso / lineTol) * 0.5;
          if (slopePx > 14.5) {
            outR = outR * (1 - lineStrength) + 255 * lineStrength;
            outG = outG * (1 - lineStrength) + 175 * lineStrength;
            outB = outB * (1 - lineStrength) + 70 * lineStrength;
          } else {
            outR = outR * (1 - lineStrength) + 235 * lineStrength;
            outG = outG * (1 - lineStrength) + 245 * lineStrength;
            outB = outB * (1 - lineStrength) + 255 * lineStrength;
          }
        }

        const fR = Math.min(255, Math.max(0, outR | 0));
        const fG = Math.min(255, Math.max(0, outG | 0));
        const fB = Math.min(255, Math.max(0, outB | 0));
        pixels32[pIdx] = (255 << 24) | (fB << 16) | (fG << 8) | fR;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    if (this.mesh) {
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      if (mat.map) mat.map.needsUpdate = true;
    }
  }

  buildOrUpdateMesh(
    exaggeration: number,
    wireframe: boolean,
    showBorders: boolean,
    parentGroup: THREE.Group,
    terrainField: UnifiedMarsTerrainField
  ) {
    const mainVertCount = DEM_GRID_SIZE * DEM_GRID_SIZE;
    const skirtVertCount = DEM_GRID_SIZE * 4;
    const totalVerts = mainVertCount + skirtVertCount;

    let geometry: THREE.BufferGeometry;
    let positions: Float32Array;
    let normals: Float32Array;
    let uvs: Float32Array;

    if (!this.mesh) {
      geometry = new THREE.BufferGeometry();
      positions = new Float32Array(totalVerts * 3);
      normals = new Float32Array(totalVerts * 3);
      uvs = new Float32Array(totalVerts * 2);

      const mainRects = TILE_SEGMENTS * TILE_SEGMENTS;
      const skirtRects = TILE_SEGMENTS * 4;
      const indices = new Uint32Array((mainRects + skirtRects) * 6);
      let ptr = 0;

      for (let r = 0; r < TILE_SEGMENTS; r++) {
        for (let c = 0; c < TILE_SEGMENTS; c++) {
          const a = r * DEM_GRID_SIZE + c;
          const b = (r + 1) * DEM_GRID_SIZE + c;
          const d = (r + 1) * DEM_GRID_SIZE + (c + 1);
          const e = r * DEM_GRID_SIZE + (c + 1);

          indices[ptr++] = a;
          indices[ptr++] = b;
          indices[ptr++] = e;

          indices[ptr++] = b;
          indices[ptr++] = d;
          indices[ptr++] = e;
        }
      }

      const addSkirtIndices = (
        getMainIdx: (i: number) => number,
        skirtStartIdx: number,
        flipWinding: boolean
      ) => {
        for (let i = 0; i < TILE_SEGMENTS; i++) {
          const m0 = getMainIdx(i);
          const m1 = getMainIdx(i + 1);
          const s0 = skirtStartIdx + i;
          const s1 = skirtStartIdx + i + 1;

          if (!flipWinding) {
            indices[ptr++] = m0;
            indices[ptr++] = s0;
            indices[ptr++] = m1;

            indices[ptr++] = s0;
            indices[ptr++] = s1;
            indices[ptr++] = m1;
          } else {
            indices[ptr++] = m0;
            indices[ptr++] = m1;
            indices[ptr++] = s0;

            indices[ptr++] = s0;
            indices[ptr++] = m1;
            indices[ptr++] = s1;
          }
        }
      };

      addSkirtIndices((i) => i, mainVertCount, false);
      addSkirtIndices((i) => TILE_SEGMENTS * DEM_GRID_SIZE + i, mainVertCount + DEM_GRID_SIZE, true);
      addSkirtIndices((i) => i * DEM_GRID_SIZE, mainVertCount + DEM_GRID_SIZE * 2, true);
      addSkirtIndices(
        (i) => i * DEM_GRID_SIZE + TILE_SEGMENTS,
        mainVertCount + DEM_GRID_SIZE * 3,
        false
      );

      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      const texture = new THREE.CanvasTexture(this.colorCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.88,
        metalness: 0.03,
        wireframe,
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.userData = { tile: this };
      parentGroup.add(this.mesh);
    } else {
      geometry = this.mesh.geometry as THREE.BufferGeometry;
      positions = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      normals = (geometry.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      uvs = (geometry.getAttribute('uv') as THREE.BufferAttribute).array as Float32Array;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe = wireframe;
      if (mat.map) {
        mat.map.needsUpdate = true;
      }
    }

    const uvMin = 0.5 / this.texSize;
    const uvSpan = (this.texSize - 1.0) / this.texSize;

    // Compute 3D surface positions AND globally continuous analytical surface normals
    // directly from UnifiedMarsTerrainField so adjacent tiles share 100% identical border normals!
    const dStepDeg = 0.004;
    const vW = new THREE.Vector3();
    const vE = new THREE.Vector3();
    const vN = new THREE.Vector3();
    const vS = new THREE.Vector3();
    const dX = new THREE.Vector3();
    const dY = new THREE.Vector3();
    const nVec = new THREE.Vector3();

    for (let r = 0; r < DEM_GRID_SIZE; r++) {
      const vFrac = r / TILE_SEGMENTS;
      const lat = this.latMax - vFrac * (this.latMax - this.latMin);

      for (let c = 0; c < DEM_GRID_SIZE; c++) {
        const uFrac = c / TILE_SEGMENTS;
        const lon = this.lonMin + uFrac * (this.lonMax - this.lonMin);

        const idx = r * DEM_GRID_SIZE + c;
        const elev = this.demGrid[idx];
        const rad = elevationMetersToRadius(elev, exaggeration);
        const pos = latLonToVector3(lat, lon, rad);

        positions[idx * 3] = pos.x;
        positions[idx * 3 + 1] = pos.y;
        positions[idx * 3 + 2] = pos.z;

        uvs[idx * 2] = uvMin + uFrac * uvSpan;
        uvs[idx * 2 + 1] = uvMin + (1.0 - vFrac) * uvSpan;

        // Global coordinate-based normal (identical across tile borders!)
        const rW = elevationMetersToRadius(
          terrainField.getElevationMeters(lat, lon - dStepDeg),
          exaggeration
        );
        const rE = elevationMetersToRadius(
          terrainField.getElevationMeters(lat, lon + dStepDeg),
          exaggeration
        );
        const rN = elevationMetersToRadius(
          terrainField.getElevationMeters(Math.min(89.9, lat + dStepDeg), lon),
          exaggeration
        );
        const rS = elevationMetersToRadius(
          terrainField.getElevationMeters(Math.max(-89.9, lat - dStepDeg), lon),
          exaggeration
        );

        vW.copy(latLonToVector3(lat, lon - dStepDeg, rW));
        vE.copy(latLonToVector3(lat, lon + dStepDeg, rE));
        vN.copy(latLonToVector3(Math.min(89.9, lat + dStepDeg), lon, rN));
        vS.copy(latLonToVector3(Math.max(-89.9, lat - dStepDeg), lon, rS));

        dX.subVectors(vE, vW);
        dY.subVectors(vS, vN);
        nVec.crossVectors(dY, dX).normalize();

        normals[idx * 3] = nVec.x;
        normals[idx * 3 + 1] = nVec.y;
        normals[idx * 3 + 2] = nVec.z;
      }
    }

    // Skirts hide any LOD T-junctions between coarse z=5 and fine z=6..12 tiles
    const skirtDrop = Math.max(0.08, this.boundingSphere.radius * 0.12);
    const copyToSkirt = (mainIdx: number, skirtIdx: number) => {
      const mx = positions[mainIdx * 3];
      const my = positions[mainIdx * 3 + 1];
      const mz = positions[mainIdx * 3 + 2];
      const len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      const scale = Math.max(0.1, (len - skirtDrop) / len);

      positions[skirtIdx * 3] = mx * scale;
      positions[skirtIdx * 3 + 1] = my * scale;
      positions[skirtIdx * 3 + 2] = mz * scale;

      normals[skirtIdx * 3] = normals[mainIdx * 3];
      normals[skirtIdx * 3 + 1] = normals[mainIdx * 3 + 1];
      normals[skirtIdx * 3 + 2] = normals[mainIdx * 3 + 2];

      uvs[skirtIdx * 2] = uvs[mainIdx * 2];
      uvs[skirtIdx * 2 + 1] = uvs[mainIdx * 2 + 1];
    };

    for (let i = 0; i < DEM_GRID_SIZE; i++) {
      copyToSkirt(i, mainVertCount + i);
      copyToSkirt(TILE_SEGMENTS * DEM_GRID_SIZE + i, mainVertCount + DEM_GRID_SIZE + i);
      copyToSkirt(i * DEM_GRID_SIZE, mainVertCount + DEM_GRID_SIZE * 2 + i);
      copyToSkirt(
        i * DEM_GRID_SIZE + TILE_SEGMENTS,
        mainVertCount + DEM_GRID_SIZE * 3 + i
      );
    }

    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('normal').needsUpdate = true;
    geometry.getAttribute('uv').needsUpdate = true;

    const centerElev =
      this.demGrid[Math.floor(DEM_GRID_SIZE / 2) * DEM_GRID_SIZE + Math.floor(DEM_GRID_SIZE / 2)];
    this.center3D.copy(
      latLonToVector3(
        this.latCenter,
        this.lonCenter,
        elevationMetersToRadius(centerElev, exaggeration)
      )
    );
    this.boundingSphere.center.copy(this.center3D);
  }

  setVisible(vis: boolean, showBorders: boolean) {
    if (this.mesh) {
      this.mesh.visible = vis;
    }
    if (this.borderLine) {
      this.borderLine.visible = vis && showBorders;
    }
  }

  cancelPendingLoad() {
    if (this.cancelDownload) {
      this.cancelDownload();
      this.cancelDownload = null;
      this.isLoading = false;
    }
  }

  dispose(parentGroup: THREE.Group) {
    this.isDisposed = true;
    this.cancelPendingLoad();
    if (this.children) {
      for (const ch of this.children) {
        ch.dispose(parentGroup);
      }
      this.children = null;
    }
    if (this.mesh) {
      parentGroup.remove(this.mesh);
      this.mesh.geometry.dispose();
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.mesh = null;
    }
    if (this.borderLine) {
      parentGroup.remove(this.borderLine);
      this.borderLine.geometry.dispose();
      (this.borderLine.material as THREE.Material).dispose();
      this.borderLine = null;
    }
  }
}

// ============================================================================
// TILE IMAGERY FETCHER & COMPOSITOR
// ============================================================================
async function loadTileImageryFromTrek(
  node: QuadTileNode,
  layerMode: VisualLayerMode,
  terrainField: UnifiedMarsTerrainField
): Promise<void> {
  const { z, row, col, lonMin, latMin, lonMax, latMax, texSize, expeditionSite } = node;

  const colorZ = Math.min(z, 7);
  const colorShift = z - colorZ;
  const colorRow = row >> colorShift;
  const colorCol = col >> colorShift;

  const vikingPromise = fetchCachedImage(
    `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${colorZ}/${colorRow}/${colorCol}.jpg`
  );

  const shadeZ = Math.min(z, 8);
  const shadeShift = z - shadeZ;
  const shadeRow = row >> shadeShift;
  const shadeCol = col >> shadeShift;

  const hrscShadePromise = fetchCachedImage(
    `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${shadeZ}/${shadeRow}/${shadeCol}.jpg`
  );

  const clrShadePromise =
    layerMode === 'color_hillshade'
      ? fetchCachedImage(
          `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${shadeZ}/${shadeRow}/${shadeCol}.jpg`
        )
      : Promise.resolve(null);

  let ctxPromise: Promise<HTMLImageElement | null> = Promise.resolve(null);
  let hirisePromise: Promise<HTMLImageElement | null> = Promise.resolve(null);

  if (expeditionSite && z >= 6) {
    const [cLonMin, cLatMin, cLonMax, cLatMax] = expeditionSite.ctxBbox;
    if (boxesIntersect(lonMin, latMin, lonMax, latMax, cLonMin, cLatMin, cLonMax, cLatMax)) {
      ctxPromise = fetchCachedImage(
        `https://trek.nasa.gov/tiles/Mars/EQ/${expeditionSite.ctxLayer}/1.0.0/default/default028mm/${z}/${row}/${col}.png`
      );
    }

    if (expeditionSite.hiriseLayer && expeditionSite.hiriseBbox && z >= 8) {
      const [hLonMin, hLatMin, hLonMax, hLatMax] = expeditionSite.hiriseBbox;
      if (boxesIntersect(lonMin, latMin, lonMax, latMax, hLonMin, hLatMin, hLonMax, hLatMax)) {
        hirisePromise = fetchCachedImage(
          `https://trek.nasa.gov/tiles/Mars/EQ/${expeditionSite.hiriseLayer}/1.0.0/default/default028mm/${z}/${row}/${col}.png`
        );
      }
    }
  }

  const [vikingImg, hrscShadeImg, clrShadeImg, ctxImg, hiriseImg] = await Promise.all([
    vikingPromise,
    hrscShadePromise,
    clrShadePromise,
    ctxPromise,
    hirisePromise,
  ]);

  if (node.isDisposed) return;

  const bCtx = node.baseImageryCanvas.getContext('2d')!;
  const scratch = getSharedScratchCanvas(texSize);
  const sCtx = scratch.getContext('2d')!;

  const drawSubQuadrant = (
    targetCtx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    shift: number
  ) => {
    targetCtx.clearRect(0, 0, texSize, texSize);
    if (shift <= 0) {
      targetCtx.drawImage(img, 0, 0, texSize, texSize);
    } else {
      const scale = 1 << shift;
      const subSize = 256 / scale;
      const qCol = col % scale;
      const qRow = row % scale;
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.drawImage(
        img,
        qCol * subSize,
        qRow * subSize,
        subSize,
        subSize,
        0,
        0,
        texSize,
        texSize
      );
    }
  };

  if (layerMode === 'color_hillshade' && clrShadeImg) {
    drawSubQuadrant(bCtx, clrShadeImg, shadeShift);
  } else if (vikingImg) {
    drawSubQuadrant(bCtx, vikingImg, colorShift);
  }

  const baseImgData = bCtx.getImageData(0, 0, texSize, texSize);
  const basePixels = baseImgData.data;

  let shadePixels: Uint8ClampedArray | null = null;
  if (hrscShadeImg) {
    drawSubQuadrant(sCtx, hrscShadeImg, shadeShift);
    shadePixels = sCtx.getImageData(0, 0, texSize, texSize).data;
  }

  let ctxPixels: Uint8ClampedArray | null = null;
  if (ctxImg) {
    drawSubQuadrant(sCtx, ctxImg, 0);
    ctxPixels = sCtx.getImageData(0, 0, texSize, texSize).data;
  }

  let hirisePixels: Uint8ClampedArray | null = null;
  if (hiriseImg) {
    drawSubQuadrant(sCtx, hiriseImg, 0);
    hirisePixels = sCtx.getImageData(0, 0, texSize, texSize).data;
  }

  const totalPx = texSize * texSize;
  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const r = basePixels[p];
    const g = basePixels[p + 1];
    const b = basePixels[p + 2];

    const hrscLum = shadePixels ? shadePixels[p] / 255.0 : 0.62;
    let detailLum = hrscLum;

    if (ctxPixels) {
      const cVal = ctxPixels[p];
      const cAlpha = ctxPixels[p + 3];
      if (cAlpha > 180 && cVal > 28) {
        const wAlpha = Math.min(1.0, (cAlpha - 180) / 60.0);
        const wLum = Math.min(1.0, (cVal - 28) / 32.0);
        const w = wAlpha * wLum;
        detailLum = detailLum * (1.0 - w) + (cVal / 255.0) * w;
      }
    }

    if (hirisePixels) {
      const hVal = hirisePixels[p];
      const hAlpha = hirisePixels[p + 3];
      if (hAlpha > 180 && hVal > 28) {
        const wAlpha = Math.min(1.0, (hAlpha - 180) / 60.0);
        const wLum = Math.min(1.0, (hVal - 28) / 32.0);
        const w = wAlpha * wLum;
        detailLum = detailLum * (1.0 - w) + (hVal / 255.0) * w;
      }
    }

    if (layerMode === 'orbital_raw') {
      const v = Math.min(255, Math.max(0, Math.round(detailLum * 255)));
      basePixels[p] = v;
      basePixels[p + 1] = v;
      basePixels[p + 2] = v;
      continue;
    }

    if (layerMode === 'color_hillshade') {
      const mod = 0.6 + 0.65 * detailLum;
      basePixels[p] = Math.min(255, Math.round(r * mod));
      basePixels[p + 1] = Math.min(255, Math.round(g * mod));
      basePixels[p + 2] = Math.min(255, Math.round(b * mod));
      continue;
    }

    const warmR = r * 0.65 + 198 * 0.35;
    const warmG = g * 0.58 + 114 * 0.42;
    const warmB = b * 0.52 + 74 * 0.48;
    const stretched = Math.max(0.22, Math.min(1.22, 0.32 + (detailLum - 0.15) * 1.12));

    basePixels[p] = Math.min(255, Math.round(warmR * stretched));
    basePixels[p + 1] = Math.min(255, Math.round(warmG * stretched));
    basePixels[p + 2] = Math.min(255, Math.round(warmB * stretched));
  }

  bCtx.putImageData(baseImgData, 0, 0);
  node.refreshUnifiedDemAndSlope(terrainField);
  node.applyVisualLayerToCanvas(layerMode);
  node.isLoaded = true;
}

// ============================================================================
// STRICT ROUND-TRIP (OUTBOUND A->B + RETURN B->A) A* ROUTE PLANNER
// ============================================================================
/**
 * Computes BOTH:
 *  1) Outbound Path (A1 -> B2)
 *  2) Safe Return / Walkback Path (B2 -> A1)
 * Enforces STRICT Hard Constraints (Infinity cost = impassable wall):
 *  - Rover Autopilot: |pitch| <= 15.0° AND |roll| <= 11.5° AND totalSlope <= 15.0°
 *  - Astronaut Hike:  uphill pitch <= +20.0°, downhill pitch >= -14.0°, totalSlope <= 20.0°,
 *                     and 1-ring cliff setback around slopes > 25.0°.
 * If either Outbound (A1->B2) OR Return (B2->A1) cannot be traversed safely without
 * violating these hard constraints, returns `isTraversable = false` with an explicit reason!
 */
function computeRoundTripSafeRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  mode: TraverseMode,
  terrainField: UnifiedMarsTerrainField
): ComputedRoundTripRoute {
  const GRID_N = 52; // 52x52 lattice
  const dLatSpan = Math.abs(endLat - startLat);
  const dLonSpan = Math.abs(normalizeLon(endLon - startLon));
  const padDeg = Math.max(0.04, Math.max(dLatSpan, dLonSpan) * 0.45);

  const minLat = Math.min(startLat, endLat) - padDeg;
  const maxLat = Math.max(startLat, endLat) + padDeg;
  const minLon = Math.min(startLon, endLon) - padDeg;
  const maxLon = Math.max(startLon, endLon) + padDeg;

  const latAt = (r: number) => minLat + (r / (GRID_N - 1)) * (maxLat - minLat);
  const lonAt = (c: number) => minLon + (c / (GRID_N - 1)) * (maxLon - minLon);

  const totalCells = GRID_N * GRID_N;
  const elevArr = new Float32Array(totalCells);
  const slopeArr = new Float32Array(totalCells);
  const fricArr = new Float32Array(totalCells);
  const cliffNearArr = new Uint8Array(totalCells);

  for (let r = 0; r < GRID_N; r++) {
    const lat = latAt(r);
    for (let c = 0; c < GRID_N; c++) {
      const lon = lonAt(c);
      const { elevM, slopeDeg, frictionMu } = terrainField.sampleMetricsAt(lat, lon, 0);
      const idx = r * GRID_N + c;
      elevArr[idx] = elevM;
      slopeArr[idx] = slopeDeg;
      fricArr[idx] = frictionMu;
    }
  }

  // 1-ring cliff drop-off setback buffer (slopes > 25°)
  for (let r = 1; r < GRID_N - 1; r++) {
    for (let c = 1; c < GRID_N - 1; c++) {
      const idx = r * GRID_N + c;
      let maxNeigh = slopeArr[idx];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const ns = slopeArr[(r + dr) * GRID_N + (c + dc)];
          if (ns > maxNeigh) maxNeigh = ns;
        }
      }
      if (maxNeigh > 25.0) cliffNearArr[idx] = 1;
    }
  }

  const toGridRC = (lat: number, lon: number) => {
    const r = Math.max(
      0,
      Math.min(GRID_N - 1, Math.round(((lat - minLat) / (maxLat - minLat)) * (GRID_N - 1)))
    );
    const c = Math.max(
      0,
      Math.min(GRID_N - 1, Math.round(((lon - minLon) / (maxLon - minLon)) * (GRID_N - 1)))
    );
    return { r, c, idx: r * GRID_N + c };
  };

  const nodeA = toGridRC(startLat, startLon);
  const nodeB = toGridRC(endLat, endLon);

  // Find Top 2 Steepest Hazard Peaks in the area for map hazard callouts
  const hazardPoints: ComputedRoundTripRoute['hazardPoints'] = [];
  let maxH1 = { idx: -1, slope: 0 };
  let maxH2 = { idx: -1, slope: 0 };
  for (let i = 0; i < totalCells; i++) {
    const s = slopeArr[i];
    if (s > maxH1.slope) {
      maxH2 = maxH1;
      maxH1 = { idx: i, slope: s };
    } else if (s > maxH2.slope && Math.abs(i - maxH1.idx) > 8) {
      maxH2 = { idx: i, slope: s };
    }
  }
  [maxH1, maxH2].forEach((h, idx) => {
    if (h.idx >= 0 && h.slope >= 12.0) {
      const r = Math.floor(h.idx / GRID_N);
      const c = h.idx % GRID_N;
      const dispSlope = Math.round(h.slope);
      hazardPoints.push({
        id: `haz-${idx}`,
        label:
          idx === 0
            ? `SLOPE HAZARD ${dispSlope}°`
            : `STEEP SCARP ${dispSlope}°`,
        lat: latAt(r),
        lon: lonAt(c),
        elevM: Math.round(elevArr[h.idx]),
        slopeDeg: dispSlope,
      });
    }
  });

  const maxAllowedCellSlope = mode === 'ROVER_AUTOPILOT' ? 12.0 : 14.0;

  // Immediate endpoint check: if Start (A1) or Destination (B2) sits directly on an impassable cliff
  if (slopeArr[nodeA.idx] > maxAllowedCellSlope) {
    return {
      mode,
      isTraversable: false,
      failureReason: `ORIGIN (A1) sits on an impassable ${slopeArr[nodeA.idx].toFixed(
        1
      )}° slope (exceeds ${maxAllowedCellSlope}° safety limit). Pick a flatter Start point.`,
      outboundPoints: [],
      returnPoints: [],
      waypoints: [],
      segments: [],
      profile: [],
      outboundDistKm: 0,
      returnDistKm: 0,
      totalRoundTripKm: 0,
      estRoundTripTimeMin: 0,
      maxSlopeDeg: Math.round(slopeArr[nodeA.idx]),
      avgFrictionMu: 0,
      estEnergyWh: 0,
      hazardPoints,
    };
  }

  if (slopeArr[nodeB.idx] > maxAllowedCellSlope) {
    return {
      mode,
      isTraversable: false,
      failureReason: `DESTINATION (B2) sits on an impassable ${slopeArr[nodeB.idx].toFixed(
        1
      )}° slope (exceeds ${maxAllowedCellSlope}° safety limit). Pick a flatter Destination point.`,
      outboundPoints: [],
      returnPoints: [],
      waypoints: [],
      segments: [],
      profile: [],
      outboundDistKm: 0,
      returnDistKm: 0,
      totalRoundTripKm: 0,
      estRoundTripTimeMin: 0,
      maxSlopeDeg: Math.round(slopeArr[nodeB.idx]),
      avgFrictionMu: 0,
      estEnergyWh: 0,
      hazardPoints,
    };
  }

  // Helper to run strict A* for a single leg (used for Outbound A->B and Return B->A)
  const runStrictLegAStar = (
    fromIdx: number,
    toIdx: number,
    outboundUsedSet: Set<number> | null
  ): number[] | null => {
    const gScore = new Float32Array(totalCells).fill(Infinity);
    const fScore = new Float32Array(totalCells).fill(Infinity);
    const cameFrom = new Int32Array(totalCells).fill(-1);
    const closed = new Uint8Array(totalCells);

    const rGoal = Math.floor(toIdx / GRID_N);
    const cGoal = toIdx % GRID_N;
    const latGoal = latAt(rGoal);
    const lonGoal = lonAt(cGoal);

    gScore[fromIdx] = 0;
    fScore[fromIdx] = 0;

    const openList: number[] = [fromIdx];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    while (openList.length > 0) {
      let bestPos = 0;
      let current = openList[0];
      let bestF = fScore[current];
      for (let i = 1; i < openList.length; i++) {
        const cand = openList[i];
        if (fScore[cand] < bestF) {
          bestF = fScore[cand];
          current = cand;
          bestPos = i;
        }
      }

      if (current === toIdx) {
        const path: number[] = [];
        let cur = toIdx;
        while (cur !== -1) {
          path.push(cur);
          if (cur === fromIdx) break;
          cur = cameFrom[cur];
        }
        return path.reverse();
      }

      openList.splice(bestPos, 1);
      closed[current] = 1;

      const r = Math.floor(current / GRID_N);
      const c = current % GRID_N;
      const lat1 = latAt(r);
      const lon1 = lonAt(c);
      const z1 = elevArr[current];

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_N || nc < 0 || nc >= GRID_N) continue;
        const nIdx = nr * GRID_N + nc;
        if (closed[nIdx]) continue;

        const lat2 = latAt(nr);
        const lon2 = lonAt(nc);
        const z2 = elevArr[nIdx];
        const cellSlope = slopeArr[nIdx];
        const cellFric = fricArr[nIdx];

        const stepKm = Math.max(0.005, surfaceDistanceKm(lat1, lon1, lat2, lon2));
        const stepMeters = stepKm * 1000.0;
        const dz = z2 - z1;
        const signedPitchDeg = Math.atan2(dz, stepMeters) * (180.0 / Math.PI);
        const effSlopeDeg = Math.max(cellSlope, Math.abs(signedPitchDeg));

        // ====================================================================
        // STRICT HARD CONSTRAINTS (NO-GO MASK -> CONTINUE / INFINITY)
        // ====================================================================
        if (mode === 'ROVER_AUTOPILOT') {
          // R1: Rover strictly forbidden from any segment > 12.0° slope (0.38g rollover danger)
          if (effSlopeDeg > 12.0) continue;
          // R4: In low-friction sand traps (mu < 0.48), max safe slope drops to 8.0°
          if (cellFric < 0.48 && effSlopeDeg > 8.0) continue;
        } else {
          // H1: Astronaut Hike strictly forbidden from uphill > +14.0° or downhill < -12.0° (scarp tumble risk)
          if (signedPitchDeg > 14.0 || signedPitchDeg < -12.0 || cellSlope > 14.0) continue;
          // H2: 1-ring cliff drop-off setback (>22° neighbor)
          if (cliffNearArr[nIdx]) continue;
        }

        let edgeCost = stepKm;

        // Heavy exponential slope penalty so pathfinder strictly seeks plainland, canyons, and flat passes:
        const slopeAffinity = 1.0 + Math.pow(effSlopeDeg / 4.0, 3.2) * 3.2;
        const climbPenalty = signedPitchDeg > 0 ? Math.pow(signedPitchDeg / 4.0, 2.5) * 2.5 : 0;
        const downhillBraking = signedPitchDeg < -3.5 ? Math.pow(Math.abs(signedPitchDeg) / 3.5, 2.2) * 2.2 : 0;
        const slipPenalty = Math.max(0, (0.76 - cellFric) * 5.0);

        edgeCost *= slopeAffinity + climbPenalty + downhillBraking + slipPenalty;

        // For the Return Leg (B2 -> A1), gently encourage an independent return loop corridor
        // (while still allowing shared safe passes if a narrow canyon bottleneck is the only safe way)
        if (outboundUsedSet && outboundUsedSet.has(nIdx) && nIdx !== fromIdx && nIdx !== toIdx) {
          edgeCost *= 1.38;
        }

        const tentativeG = gScore[current] + edgeCost;
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + surfaceDistanceKm(lat2, lon2, latGoal, lonGoal) * 0.92;
          if (!openList.includes(nIdx)) {
            openList.push(nIdx);
          }
        }
      }
    }

    return null; // Unreachable without violating hard safety constraints!
  };

  // 1. Compute Outbound Leg (A1 -> B2)
  const outboundRaw = runStrictLegAStar(nodeA.idx, nodeB.idx, null);
  if (!outboundRaw) {
    return {
      mode,
      isTraversable: false,
      failureReason:
        mode === 'ROVER_AUTOPILOT'
          ? 'OUTBOUND LEG (A1 → B2) UNTRAVERSABLE: Every corridor between A1 and B2 exceeds the 12.0° Rover Rollover Limit.'
          : 'OUTBOUND LEG (A1 → B2) UNTRAVERSABLE: Blocked by >14° climbs, >12° descents, or cliff scarps.',
      outboundPoints: [],
      returnPoints: [],
      waypoints: [],
      segments: [],
      profile: [],
      outboundDistKm: 0,
      returnDistKm: 0,
      totalRoundTripKm: 0,
      estRoundTripTimeMin: 0,
      maxSlopeDeg: maxH1.slope > 0 ? Math.round(maxH1.slope) : 18,
      avgFrictionMu: 0,
      estEnergyWh: 0,
      hazardPoints,
    };
  }

  // 2. Compute Safe Return Leg (B2 -> A1)
  const outboundSet = new Set<number>(outboundRaw);
  const returnRaw = runStrictLegAStar(nodeB.idx, nodeA.idx, outboundSet);
  if (!returnRaw) {
    return {
      mode,
      isTraversable: false,
      failureReason:
        mode === 'ROVER_AUTOPILOT'
          ? 'RETURN LEG (B2 → A1) UNTRAVERSABLE: Cannot safely return from B2 to A1 without exceeding the 12.0° slope limit.'
          : 'RETURN LEG (B2 → A1) UNTRAVERSABLE: Outbound climb exceeds the -12.0° maximum safe downhill descent limit on return!',
      outboundPoints: [],
      returnPoints: [],
      waypoints: [],
      segments: [],
      profile: [],
      outboundDistKm: 0,
      returnDistKm: 0,
      totalRoundTripKm: 0,
      estRoundTripTimeMin: 0,
      maxSlopeDeg: maxH1.slope > 0 ? Math.round(maxH1.slope) : 18,
      avgFrictionMu: 0,
      estEnergyWh: 0,
      hazardPoints,
    };
  }

  // Smooth & sample a leg
  const smoothAndSampleLeg = (
    rawIndices: number[],
    legStartLat: number,
    legStartLon: number,
    legEndLat: number,
    legEndLon: number
  ) => {
    let pts = rawIndices.map((idx, i) => {
      if (i === 0) return { lat: legStartLat, lon: legStartLon };
      if (i === rawIndices.length - 1) return { lat: legEndLat, lon: legEndLon };
      const r = Math.floor(idx / GRID_N);
      const c = idx % GRID_N;
      return { lat: latAt(r), lon: lonAt(c) };
    });

    for (let pass = 0; pass < 2; pass++) {
      if (pts.length < 3) break;
      const nextPts: { lat: number; lon: number }[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        nextPts.push({
          lat: p0.lat * 0.75 + p1.lat * 0.25,
          lon: p0.lon * 0.75 + p1.lon * 0.25,
        });
        nextPts.push({
          lat: p0.lat * 0.25 + p1.lat * 0.75,
          lon: p0.lon * 0.25 + p1.lon * 0.75,
        });
      }
      nextPts.push(pts[pts.length - 1]);
      pts = nextPts;
    }

    return pts.map((pt, i) => {
      const { elevM, slopeDeg, frictionMu } = terrainField.sampleMetricsAt(pt.lat, pt.lon, 0);
      let pitchDeg = 0;
      if (i > 0) {
        const prev = pts[i - 1];
        const prevElev = terrainField.getElevationMeters(prev.lat, prev.lon);
        const stepM = Math.max(1.0, surfaceDistanceKm(prev.lat, prev.lon, pt.lat, pt.lon) * 1000.0);
        pitchDeg = Math.atan2(elevM - prevElev, stepM) * (180.0 / Math.PI);
      }
      return { lat: pt.lat, lon: pt.lon, elevM, slopeDeg, pitchDeg, frictionMu };
    });
  };

  const outboundPoints = smoothAndSampleLeg(outboundRaw, startLat, startLon, endLat, endLon);
  const returnPoints = smoothAndSampleLeg(returnRaw, endLat, endLon, startLat, startLon);

  // Build combined Round-Trip Profile & Telemetry
  const profile: RouteProfileSample[] = [];
  let cumDistKm = 0;
  let outboundDistKm = 0;
  let returnDistKm = 0;
  let maxSlopeDeg = 0;
  let sumFriction = 0;
  let totalTimeHours = 0;
  let totalEnergyWh = 0;
  let totalWaterBurnGrams = 0;
  let totalO2BurnGrams = 0;
  let maxMetabolicWatts = 0;
  let sumMetabolicWatts = 0;

  const accumulateLeg = (
    pts: typeof outboundPoints,
    leg: 'OUTBOUND' | 'RETURN'
  ) => {
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      let stepKm = 0;
      if (i > 0) {
        stepKm = surfaceDistanceKm(pts[i - 1].lat, pts[i - 1].lon, pt.lat, pt.lon);
        cumDistKm += stepKm;
        if (leg === 'OUTBOUND') outboundDistKm += stepKm;
        else returnDistKm += stepKm;
      }

      if (pt.slopeDeg > maxSlopeDeg) maxSlopeDeg = pt.slopeDeg;
      sumFriction += pt.frictionMu;

      const speedKmh =
        mode === 'ROVER_AUTOPILOT'
          ? Math.max(0.65, 4.2 * (1.0 - pt.slopeDeg / 24.0) * (pt.frictionMu / 0.75))
          : Math.max(
              1.2,
              4.5 * Math.exp(-3.5 * Math.abs(Math.tan((pt.pitchDeg * Math.PI) / 180) + 0.04))
            );

      // ALGORITHM 1: Modified Santee-Pandolf at 0.38g & PLSS Tri-Expendables
      const bio = computeSanteePandolf038g(speedKmh, pt.pitchDeg, pt.frictionMu);
      const powerWatts =
        mode === 'ROVER_AUTOPILOT'
          ? Math.round(145 + pt.slopeDeg * 14.5 + (0.8 - pt.frictionMu) * 180)
          : bio.metabolicWatts;

      if (stepKm > 0) {
        const dtH = stepKm / speedKmh;
        totalTimeHours += dtH;
        totalEnergyWh += powerWatts * dtH;
        totalWaterBurnGrams += bio.waterBurnGramsPerHour * dtH;
        totalO2BurnGrams += bio.o2BurnGramsPerHour * dtH;
      }

      if (powerWatts > maxMetabolicWatts) maxMetabolicWatts = powerWatts;
      sumMetabolicWatts += powerWatts;

      const slipRiskPct = Math.min(
        98,
        Math.max(4, Math.round((pt.slopeDeg / 15.0) * 48 + (0.82 - pt.frictionMu) * 95))
      );

      profile.push({
        distKm: cumDistKm,
        elevM: pt.elevM,
        slopeDeg: pt.slopeDeg,
        frictionMu: pt.frictionMu,
        slipRiskPct,
        metabolicWatts: Math.round(powerWatts),
        leg,
        velocityMs: bio.velocityMs,
        waterBurnRateGph: bio.waterBurnGramsPerHour,
        cumWaterBurnG: Math.round(totalWaterBurnGrams),
        cumO2BurnG: Math.round(totalO2BurnGrams),
        soilClass:
          bio.soilClass === 'CLASS_A_ROCK'
            ? 'A (ROCK)'
            : bio.soilClass === 'CLASS_B_SAND'
            ? 'B (SAND)'
            : 'C (DUST TRAP)',
      });
    }
  };

  accumulateLeg(outboundPoints, 'OUTBOUND');
  accumulateLeg(returnPoints, 'RETURN');

  // Waypoints: A1 (Origin), A2 (Outbound Midpoint), B2 (Destination), R1 (Return Midpoint)
  const midOut = outboundPoints[Math.floor(outboundPoints.length / 2)];
  const midRet = returnPoints[Math.floor(returnPoints.length / 2)];
  const startPt = outboundPoints[0];
  const endPt = outboundPoints[outboundPoints.length - 1];

  const calcWaypointBio = (pt: typeof startPt) => {
    const spd = Number(
      Math.max(
        1.2,
        4.2 * Math.exp(-3.5 * Math.abs(Math.tan((pt.pitchDeg * Math.PI) / 180.0) + 0.04))
      ).toFixed(1)
    );
    const bio = computeSanteePandolf038g(spd, pt.pitchDeg, pt.frictionMu);
    return { speedKmh: spd, watts: bio.metabolicWatts };
  };

  const bioA1 = calcWaypointBio(startPt);
  const bioA2 = calcWaypointBio(midOut);
  const bioB2 = calcWaypointBio(endPt);
  const bioR1 = calcWaypointBio(midRet);

  const waypoints: RouteWaypoint[] = [
    {
      id: 'A1',
      label: 'A1',
      lat: startPt.lat,
      lon: startPt.lon,
      elevM: Math.round(startPt.elevM),
      slopeDeg: Math.round(startPt.slopeDeg),
      frictionMu: startPt.frictionMu,
      distFromStartKm: 0,
      metabolicWatts: bioA1.watts,
      speedKmh: bioA1.speedKmh,
    },
    {
      id: 'A2',
      label: 'A2',
      lat: midOut.lat,
      lon: midOut.lon,
      elevM: Math.round(midOut.elevM),
      slopeDeg: Math.round(midOut.slopeDeg),
      frictionMu: midOut.frictionMu,
      distFromStartKm: Number((outboundDistKm * 0.5).toFixed(2)),
      metabolicWatts: bioA2.watts,
      speedKmh: bioA2.speedKmh,
    },
    {
      id: 'B2',
      label: 'B2',
      lat: endPt.lat,
      lon: endPt.lon,
      elevM: Math.round(endPt.elevM),
      slopeDeg: Math.round(endPt.slopeDeg),
      frictionMu: endPt.frictionMu,
      distFromStartKm: Number(outboundDistKm.toFixed(2)),
      metabolicWatts: bioB2.watts,
      speedKmh: bioB2.speedKmh,
    },
    {
      id: 'R1',
      label: 'R1',
      lat: midRet.lat,
      lon: midRet.lon,
      elevM: Math.round(midRet.elevM),
      slopeDeg: Math.round(midRet.slopeDeg),
      frictionMu: midRet.frictionMu,
      distFromStartKm: Number((outboundDistKm + returnDistKm * 0.5).toFixed(2)),
      metabolicWatts: bioR1.watts,
      speedKmh: bioR1.speedKmh,
    },
  ];

  // Build 4 Round-Trip Segment Cards:
  // 1) Outbound A1 -> A2
  // 2) Outbound A2 -> B2
  // 3) Return   B2 -> R1
  // 4) Return   R1 -> A1
  const summarizeSlice = (
    pts: typeof outboundPoints,
    i0: number,
    i1: number,
    id: string,
    leg: 'OUTBOUND' | 'RETURN',
    title: string,
    distKm: number
  ): RouteSegmentSummary => {
    let maxS = 0;
    let sumS = 0;
    let sumF = 0;
    let maxP = 0;
    let n = 0;
    for (let i = i0; i <= i1; i++) {
      const p = pts[i];
      if (p.slopeDeg > maxS) maxS = p.slopeDeg;
      if (Math.abs(p.pitchDeg) > Math.abs(maxP)) maxP = p.pitchDeg;
      sumS += p.slopeDeg;
      sumF += p.frictionMu;
      n++;
    }
    const dispSlope = Math.round(maxS);
    return {
      id,
      leg,
      title,
      distKm: Number(Math.max(0.1, distKm).toFixed(2)),
      avgSlopeDeg: Math.round(sumS / Math.max(1, n)),
      maxSlopeDeg: dispSlope,
      maxPitchDeg: Math.round(maxP),
      frictionMu: Number((sumF / Math.max(1, n)).toFixed(2)),
      status: dispSlope > 14 ? 'HAZARD' : dispSlope >= 8 ? 'CAUTION' : 'SAFE',
    };
  };

  const midOutIdx = Math.floor(outboundPoints.length / 2);
  const midRetIdx = Math.floor(returnPoints.length / 2);

  const segments: RouteSegmentSummary[] = [
    summarizeSlice(
      outboundPoints,
      0,
      midOutIdx,
      'out-1',
      'OUTBOUND',
      'OUTBOUND: A1 → A2',
      outboundDistKm * 0.5
    ),
    summarizeSlice(
      outboundPoints,
      midOutIdx,
      outboundPoints.length - 1,
      'out-2',
      'OUTBOUND',
      'OUTBOUND: A2 → B2',
      outboundDistKm * 0.5
    ),
    summarizeSlice(
      returnPoints,
      0,
      midRetIdx,
      'ret-1',
      'RETURN',
      'RETURN: B2 → R1',
      returnDistKm * 0.5
    ),
    summarizeSlice(
      returnPoints,
      midRetIdx,
      returnPoints.length - 1,
      'ret-2',
      'RETURN',
      'RETURN: R1 → A1',
      returnDistKm * 0.5
    ),
  ];

  const totalCount = outboundPoints.length + returnPoints.length;
  // NASA EVA Rule of Half: 4.5kg total water, 2.25kg one-way limit with 20% margin => 3.6kg round-trip limit
  const ruleOfHalfCompliant = mode === 'ROVER_AUTOPILOT' || totalWaterBurnGrams <= 3600;
  const waterReserveMarginPct = Math.max(
    0,
    Math.round(((4500 - totalWaterBurnGrams) / 4500) * 100)
  );

  return {
    mode,
    isTraversable: true,
    failureReason: null,
    outboundPoints,
    returnPoints,
    waypoints,
    segments,
    profile,
    outboundDistKm: Number(outboundDistKm.toFixed(2)),
    returnDistKm: Number(returnDistKm.toFixed(2)),
    totalRoundTripKm: Number((outboundDistKm + returnDistKm).toFixed(2)),
    estRoundTripTimeMin: Math.max(6, Math.round(totalTimeHours * 60)),
    maxSlopeDeg: Math.round(maxSlopeDeg),
    avgFrictionMu: Number((sumFriction / Math.max(1, totalCount)).toFixed(2)),
    estEnergyWh: Math.max(40, Math.round(totalEnergyWh)),
    hazardPoints,
    totalWaterBurnGrams: Math.round(totalWaterBurnGrams),
    totalO2BurnGrams: Math.round(totalO2BurnGrams),
    maxMetabolicWatts,
    avgMetabolicWatts: Math.round(sumMetabolicWatts / Math.max(1, totalCount)),
    ruleOfHalfCompliant,
    waterReserveMarginPct,
  };
}

// ============================================================================
// MAIN REACT COMPONENT — ARES-NAVIGATOR TACTICAL COMMAND & ROUTE PLANNER
// ============================================================================
export default function MarsGlobeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Primary View & Navigation Modes
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [selectedSite, setSelectedSite] = useState<ExpeditionSite>(EXPEDITION_SITES[0]);
  const [isGlobalCommandView, setIsGlobalCommandView] = useState<boolean>(false);

  // Routing State (with Option to Exit Routing Mode Completely!)
  const [routingEnabled, setRoutingEnabled] = useState<boolean>(true);
  const [traverseMode, setTraverseMode] = useState<TraverseMode>('ASTRONAUT_HIKE');
  const [pickingMode, setPickingMode] = useState<PickingPointMode>('NONE');
  const [showReturnLeg, setShowReturnLeg] = useState<boolean>(true);

  // Performance vs High Detail Upscaling Toggle
  const [highDetailMode, setHighDetailMode] = useState<boolean>(true);

  // Scene Loading Transition State
  const [isSceneLoading, setIsSceneLoading] = useState<boolean>(false);

  // Selected Science Target for on-map HUD card inspection
  const [selectedScienceTarget, setSelectedScienceTarget] = useState<ScienceTargetPOI | null>(null);
  const [projectedScienceTargets, setProjectedScienceTargets] = useState<
    { target: ScienceTargetPOI; x: number; y: number; visible: boolean }[]
  >([]);

  const [routeEndpoints, setRouteEndpoints] = useState<{
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
  }>({
    startLat: EXPEDITION_SITES[0].defaultRoute[0],
    startLon: EXPEDITION_SITES[0].defaultRoute[1],
    endLat: EXPEDITION_SITES[0].defaultRoute[2],
    endLon: EXPEDITION_SITES[0].defaultRoute[3],
  });

  const [activeRouteData, setActiveRouteData] = useState<ComputedRoundTripRoute | null>(null);

  // Mouse cursor screen position for auto-hiding nearby map legends when viewing routes
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });

  // Projected 2D Screen Overlays
  const [projectedMarkers, setProjectedMarkers] = useState<ProjectedMarkerPos[]>([]);
  const [projectedRouteTags, setProjectedRouteTags] = useState<ProjectedRouteTag[]>([]);
  const [projectedPanoMarkers, setProjectedPanoMarkers] = useState<
    { station: RoverPanoramaStation; x: number; y: number; visible: boolean }[]
  >([]);
  const [showPanoMarkers, setShowPanoMarkers] = useState<boolean>(true);
  const [activeStreetViewStation, setActiveStreetViewStation] =
    useState<RoverPanoramaStation | null>(null);

  // Real-Time Mars Astronomical Clock & Sun Sync State
  const [syncRealMarsTime, setSyncRealMarsTime] = useState<boolean>(true);
  // Use a deterministic timestamp for initial SSR/hydration render; useEffect immediately syncs to live Date.now()
  const [marsEphemeris, setMarsEphemeris] = useState<RealMarsEphemeris>(() =>
    computeRealMarsTimeAndSun(77.4508, 18.4447, 1763148000000)
  );

  // Collapsible Sidebars & Header Dropdown States
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState<boolean>(false);
  const [layerDropdownOpen, setLayerDropdownOpen] = useState<boolean>(false);
  const [safetyDropdownOpen, setSafetyDropdownOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');

  // Loading Overlay State when switching maps/layers
  const [isMapSwitching, setIsMapSwitching] = useState<boolean>(false);
  const [mapLoadingText, setMapLoadingText] = useState<string>('');

  // Option A: NASA Mission Traverse Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Option B: Astronaut Visor / Cockpit First-Person Mode
  const [isVisorMode, setIsVisorMode] = useState<boolean>(false);
  const previousCamAltitudeRef = useRef<number>(2.4);
  const previousCamTiltRef = useRef<number>(45);

  // Text AI Agent Copilot
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState<boolean>(false);

  // Option C: Real-Time Solar Shadow & Sun Glare Hazard Vector
  const [solarGlareHazard, setSolarGlareHazard] = useState<{
    isHazard: boolean;
    sunElevationDeg: number;
    sunAzimuthDeg: number;
    headingDiffDeg: number;
    message: string;
  }>({
    isHazard: false,
    sunElevationDeg: 28,
    sunAzimuthDeg: 94,
    headingDiffDeg: 45,
    message: '',
  });

  // Option E: Elevation Profile Scrubbing & Walk Stress Simulator
  const [simulatedProfileIndex, setSimulatedProfileIndex] = useState<number | null>(null);
  const [isWalkSimRunning, setIsWalkSimRunning] = useState<boolean>(false);

  // FR-07: RAD-HAVEN Topographic Ray-Tracing & SPE Evacuation Router
  const [isSpeAlertActive, setIsSpeAlertActive] = useState<boolean>(false);
  const [speReport, setSpeReport] = useState<SpeHavenReport | null>(null);

  // FR-09: RF Line-of-Sight Mapping & Comms Blackout Zones
  const [showRfCommsGrid, setShowRfCommsGrid] = useState<boolean>(false);
  const [rfCommsReport, setRfCommsReport] = useState<RfCommsReport | null>(null);

  // Algorithm 2: Dynamic Walkback Isochrone Generator
  const [showWalkbackIsochrone, setShowWalkbackIsochrone] = useState<boolean>(true);
  const [walkbackIsochrone, setWalkbackIsochrone] = useState<WalkbackIsochroneBoundary | null>(null);

  // FR-03: Natural Language / Textual Search Bar & Coordinate Autocomplete
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MarsLandmark[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Live Telemetry & Inclinometer State
  const [maxRenderedZoom, setMaxRenderedZoom] = useState<number>(0);
  const [visibleTileCount, setVisibleTileCount] = useState<number>(2);
  const [streamingCount, setStreamingCount] = useState<number>(0);
  const [demVersion, setDemVersion] = useState<number>(0);

  const [liveTelemetry, setLiveTelemetry] = useState<{
    lat: number;
    lon: number;
    elevM: number;
    altitudeKm: number;
    pitchDeg: number;
    rollDeg: number;
    slopeDeg: number;
    headingDeg: number;
    compassDir: string;
    frictionMu: number;
    tractionPct: number;
    slipRiskPct: number;
    speedKmh: number;
    o2SatPct: number;
    suitPressureKpa: number;
    heartRateBpm: number;
    radiationMsvH: number;
    externalTempC: number;
    atmosPresPa: number;
    qualityTierLabel: string;
    metabolicWatts: number;
    waterBurnGph: number;
    waterReservePct: number;
    o2ReservePct: number;
    liohReservePct: number;
    batteryReservePct: number;
  }>({
    lat: 18.4447,
    lon: 77.4508,
    elevM: -2540,
    altitudeKm: 38,
    pitchDeg: 4.2,
    rollDeg: -1.8,
    slopeDeg: 4.6,
    headingDeg: 57,
    compassDir: 'NE',
    frictionMu: 0.75,
    tractionPct: 98,
    slipRiskPct: 12,
    speedKmh: 0.84,
    o2SatPct: 98,
    suitPressureKpa: 29.65, // Standard NASA 4.3 psi = 29.65 kPa
    heartRateBpm: 76,
    radiationMsvH: 0.12,
    externalTempC: -62,
    atmosPresPa: 710,
    qualityTierLabel: 'ULTRA-HD Z12',
    metabolicWatts: 245,
    waterBurnGph: 267,
    waterReservePct: 88,
    o2ReservePct: 96,
    liohReservePct: 92,
    batteryReservePct: 84,
  });

  // Sun & Layer Controls
  const [sunAzimuth, setSunAzimuth] = useState<number>(115);
  const [sunElevation, setSunElevation] = useState<number>(38);
  const [exaggeration, setExaggeration] = useState<number>(1.0);
  const [layerMode, setLayerMode] = useState<VisualLayerMode>('realistic');
  const [wireframe, setWireframe] = useState<boolean>(false);

  // Mutable 3D Engine Refs
  const terrainFieldRef = useRef<UnifiedMarsTerrainField | null>(null);
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const markers3DGroupRef = useRef<THREE.Group | null>(null);
  const orbitalRingsGroupRef = useRef<THREE.Group | null>(null);
  const route3DGroupRef = useRef<THREE.Group | null>(null);
  const isochrone3DGroupRef = useRef<THREE.Group | null>(null);
  const spe3DGroupRef = useRef<THREE.Group | null>(null);
  const rf3DGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const rootsRef = useRef<QuadTileNode[]>([]);
  const schedulerRef = useRef<TileDownloadScheduler | null>(null);

  const navStateRef = useRef({
    focusLat: 18.4447,
    focusLon: 77.4508,
    targetLat: 18.4447,
    targetLon: 77.4508,
    altitude: (38 / MARS_RADIUS_KM) * GLOBE_RADIUS,
    targetAltitude: (38 / MARS_RADIUS_KM) * GLOBE_RADIUS,
    tiltDeg: 40,
    targetTiltDeg: 40,
    bearingDeg: 57,
    targetBearingDeg: 57,
    lastWheelTime: 0,
  });

  const paramsRef = useRef({
    exaggeration: 1.0,
    wireframe: false,
    layerMode: 'realistic' as VisualLayerMode,
    sunAzimuth: 115,
    sunElevation: 38,
    syncRealMarsTime: true,
    pickingMode: 'NONE' as PickingPointMode,
    routingEnabled: true,
  });

  useEffect(() => {
    paramsRef.current.pickingMode = pickingMode;
  }, [pickingMode]);

  useEffect(() => {
    paramsRef.current.routingEnabled = routingEnabled;
    if (route3DGroupRef.current) {
      route3DGroupRef.current.visible = routingEnabled;
    }
  }, [routingEnabled]);

  useEffect(() => {
    paramsRef.current.syncRealMarsTime = syncRealMarsTime;
  }, [syncRealMarsTime]);

  // Real-time 1-second Mars Astronomical Ephemeris & Clock Ticker
  useEffect(() => {
    const tickMarsClock = () => {
      const ephem = computeRealMarsTimeAndSun(navStateRef.current.focusLon);
      setMarsEphemeris(ephem);
      if (paramsRef.current.syncRealMarsTime) {
        setSunAzimuth(Math.round((ephem.subsolarLon + 360) % 360));
        setSunElevation(Math.round(ephem.subsolarLat));
      }

      // Option C: Real-Time Solar Shadow & Sun Glare Hazard Vector
      const sunElevDeg = 90.0 - (ephem.solarZenithDeg ?? 60.0);
      const sunAzDeg = ephem.solarAzimuthDeg ?? 90.0;
      const camHeading = Math.round(navStateRef.current.bearingDeg || 0);
      let headingDiff = Math.abs(camHeading - sunAzDeg);
      if (headingDiff > 180) headingDiff = 360 - headingDiff;
      const isLowSun = sunElevDeg > 0 && sunElevDeg < 22;
      const isBlinding = isLowSun && headingDiff < 32;
      setSolarGlareHazard({
        isHazard: isBlinding,
        sunElevationDeg: Math.round(sunElevDeg),
        sunAzimuthDeg: Math.round(sunAzDeg),
        headingDiffDeg: Math.round(headingDiff),
        message: isBlinding
          ? `DIRECT LOW-SUN GLARE HAZARD: Low sun at ${Math.round(sunElevDeg)}° elevation (azimuth ${Math.round(sunAzDeg)}°). Gold electrochromic filter active.`
          : '',
      });
    };
    tickMarsClock();
    const timer = setInterval(tickMarsClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Option E: Step Simulation Timer for Elevation Scrub & Biometrics
  useEffect(() => {
    if (!isWalkSimRunning || !activeRouteData || activeRouteData.profile.length === 0) return;
    const interval = setInterval(() => {
      setSimulatedProfileIndex((prev) => {
        const next = (prev === null ? 0 : prev + 1) % activeRouteData.profile.length;
        return next;
      });
    }, 700);
    return () => clearInterval(interval);
  }, [isWalkSimRunning, activeRouteData]);

  // 3D Mesh Generator for Algorithm 2: Walkback Isochrone
  const updateIsochrone3DMeshes = useCallback(
    (isochrone: WalkbackIsochroneBoundary | null) => {
      const group = isochrone3DGroupRef.current;
      const terrainField = terrainFieldRef.current;
      if (!group || !terrainField) return;

      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        group.remove(child);
        child.geometry?.dispose();
      }

      if (!showWalkbackIsochrone || !isochrone) return;

      const pts3D = isochrone.safeBoundaryPoints.map((p) => {
        const rad = elevationMetersToRadius(p.elevM, paramsRef.current.exaggeration) + 0.00022;
        return latLonToVector3(p.lat, p.lon, rad);
      });
      if (pts3D.length < 3) return;
      pts3D.push(pts3D[0].clone()); // Close polygon loop

      const curve = new THREE.CatmullRomCurve3(pts3D, true);
      // Earth human-scale running boundary line (~7.5m trail corridor)
      const tubeGeom = new THREE.TubeGeometry(curve, 180, 0.00022, 6, true);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -4.0,
      });
      group.add(new THREE.Mesh(tubeGeom, tubeMat));

      const glowGeom = new THREE.TubeGeometry(curve, 120, 0.00048, 6, true);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(glowGeom, glowMat));
    },
    [showWalkbackIsochrone]
  );

  // 3D Mesh Generator for FR-07: RAD-HAVEN Evacuation Route & Cliff Shelter
  const updateSpe3DMeshes = useCallback((report: SpeHavenReport | null) => {
    const group = spe3DGroupRef.current;
    const terrainField = terrainFieldRef.current;
    if (!group || !terrainField) return;

    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
    }

    if (!report || !report.bestHaven) return;

    const haven = report.bestHaven;
    const routePts = haven.evacRoute.map((p) => {
      const rad = elevationMetersToRadius(p.elevM, paramsRef.current.exaggeration) + 0.00024;
      return latLonToVector3(p.lat, p.lon, rad);
    });

    if (routePts.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(routePts);
      // Earth-scale emergency sprint corridor (~8.5m trail width)
      const tubeGeom = new THREE.TubeGeometry(curve, 80, 0.00025, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -4.0,
      });
      group.add(new THREE.Mesh(tubeGeom, tubeMat));

      const glowGeom = new THREE.TubeGeometry(curve, 60, 0.00055, 6, false);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff0055,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(glowGeom, glowMat));
    }

    const havenRad =
      elevationMetersToRadius(haven.elevM, paramsRef.current.exaggeration) + 0.00028;
    const havenPos = latLonToVector3(haven.lat, haven.lon, havenRad);

    const normal = havenPos.clone().normalize();
    const beaconGeom = new THREE.CylinderGeometry(0.00015, 0.00045, 0.008, 12);
    beaconGeom.translate(0, 0.004, 0);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.copy(havenPos);
    beaconMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    group.add(beaconMesh);

    const domeGeom = new THREE.SphereGeometry(0.002, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.position.copy(havenPos);
    domeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    group.add(domeMesh);
  }, []);

  // 3D Mesh Generator for FR-09: RF Line-of-Sight & Orbiter Relays
  const updateRfComms3DMeshes = useCallback(
    (report: RfCommsReport | null) => {
      const group = rf3DGroupRef.current;
      const terrainField = terrainFieldRef.current;
      if (!group || !terrainField) return;

      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        group.remove(child);
        child.geometry?.dispose();
      }

      if (!showRfCommsGrid || !report) return;

      const originElev = terrainField.getElevationMeters(report.surfaceLat, report.surfaceLon);
      const originRad =
        elevationMetersToRadius(originElev, paramsRef.current.exaggeration) + 0.002;
      const originPos = latLonToVector3(report.surfaceLat, report.surfaceLon, originRad);

      // Local topocentric orientation vectors (Up, North, East)
      const up = originPos.clone().normalize();
      const latRad = (report.surfaceLat * Math.PI) / 180.0;
      const lonRad = (report.surfaceLon * Math.PI) / 180.0;
      const north = new THREE.Vector3(
        -Math.sin(latRad) * Math.sin(lonRad),
        Math.cos(latRad),
        -Math.sin(latRad) * Math.cos(lonRad)
      ).normalize();
      const east = new THREE.Vector3().crossVectors(north, up).normalize();

      const computeSkyTarget = (elevDeg: number, azDeg: number, dist: number) => {
        const elRad = (elevDeg * Math.PI) / 180.0;
        const azRad = (azDeg * Math.PI) / 180.0;
        const dir = new THREE.Vector3()
          .addScaledVector(north, Math.cos(elRad) * Math.cos(azRad))
          .addScaledVector(east, Math.cos(elRad) * Math.sin(azRad))
          .addScaledVector(up, Math.sin(elRad))
          .normalize();
        return originPos.clone().addScaledVector(dir, dist);
      };

      // Direct-to-Earth Vector Beam
      const earthBeamDist = 0.45;
      const earthTarget = computeSkyTarget(
        report.earthDte.elevationDeg,
        report.earthDte.azimuthDeg,
        earthBeamDist
      );
      const earthLineGeom = new THREE.BufferGeometry().setFromPoints([originPos, earthTarget]);
      const earthLineMat = new THREE.LineDashedMaterial({
        color: !report.earthDte.isMaskedByTerrain ? 0x00f0ff : 0xf43f5e,
        dashSize: 0.02,
        gapSize: 0.01,
        transparent: true,
        opacity: 0.85,
      });
      const earthLine = new THREE.Line(earthLineGeom, earthLineMat);
      earthLine.computeLineDistances();
      group.add(earthLine);

      // MRO and Odyssey Relay Orbit Links
      const orbiters = [report.mro, report.odyssey];
      for (const orb of orbiters) {
        if (!orb.isInView) continue;
        const orbDist = 0.35;
        const orbPos = computeSkyTarget(orb.elevationDeg, orb.azimuthDeg, orbDist);
        const orbLineGeom = new THREE.BufferGeometry().setFromPoints([originPos, orbPos]);
        const orbLineMat = new THREE.LineDashedMaterial({
          color: !orb.isMaskedByTerrain ? 0x10b981 : 0xf59e0b,
          dashSize: 0.015,
          gapSize: 0.01,
          transparent: true,
          opacity: 0.75,
        });
        const orbLine = new THREE.Line(orbLineGeom, orbLineMat);
        orbLine.computeLineDistances();
        group.add(orbLine);
      }
    },
    [showRfCommsGrid]
  );

  // Rebuild 3D Outbound (A->B) & Return (B->A) Routes whenever endpoints, mode, or DEM updates
  const rebuildRoutesAndMeshes = useCallback(() => {
    const terrainField = terrainFieldRef.current;
    const routeGroup = route3DGroupRef.current;
    if (!terrainField || !routeGroup) return;

    while (routeGroup.children.length > 0) {
      const child = routeGroup.children[0] as THREE.Mesh;
      routeGroup.remove(child);
      child.geometry?.dispose();
    }

    if (!routingEnabled) {
      setActiveRouteData(null);
      return;
    }

    const routeData = computeRoundTripSafeRoute(
      routeEndpoints.startLat,
      routeEndpoints.startLon,
      routeEndpoints.endLat,
      routeEndpoints.endLon,
      traverseMode,
      terrainField
    );
    setActiveRouteData(routeData);

    // Always place Origin (A1) & Destination (B2) endpoint markers on the 3D terrain
    const placeEndpointPin = (lat: number, lon: number, colorHex: number) => {
      const elev = terrainField.getElevationMeters(lat, lon);
      const rad = elevationMetersToRadius(elev, paramsRef.current.exaggeration) + 0.00022;
      const pos = latLonToVector3(lat, lon, rad);
      
      // Ground base tactical dot
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.0009, 16, 16),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      pin.position.copy(pos);
      routeGroup.add(pin);

      // Slender vertical holographic laser beacon beam
      const normal = pos.clone().normalize();
      const beamGeom = new THREE.CylinderGeometry(0.00008, 0.00028, 0.007, 8);
      beamGeom.translate(0, 0.0035, 0);
      const beamMesh = new THREE.Mesh(
        beamGeom,
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        })
      );
      beamMesh.position.copy(pos);
      beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      routeGroup.add(beamMesh);
    };

    placeEndpointPin(routeEndpoints.startLat, routeEndpoints.startLon, 0x10b981);
    placeEndpointPin(routeEndpoints.endLat, routeEndpoints.endLon, 0xef4444);

    // If the route is UNTRAVERSABLE, do NOT draw a fake route line through dangerous terrain!
    if (!routeData.isTraversable) return;

    // Earth-scale running route geometry (human singletrack trail vs rover transit corridor)
    const isHike = traverseMode === 'ASTRONAUT_HIKE';
    // Human running trail corridor (~8.5m wide) vs Rover track corridor (~14m wide)
    const tubeR = isHike ? 0.00025 : 0.00042;
    const legOffset = 0.00018; // Ground hugging (~6m above terrain surface, eliminates sky floating)

    const buildLegTube = (
      pts: typeof routeData.outboundPoints,
      colorHex: number,
      radiusOffset: number,
      radiusWidth: number
    ) => {
      if (pts.length < 2) return;
      const pts3D = pts.map((p) => {
        const rad = elevationMetersToRadius(p.elevM, paramsRef.current.exaggeration) + radiusOffset;
        return latLonToVector3(p.lat, p.lon, rad);
      });

      const curve = new THREE.CatmullRomCurve3(pts3D);
      const tubeGeom = new THREE.TubeGeometry(
        curve,
        Math.min(240, pts3D.length * 4),
        radiusWidth,
        6,
        false
      );
      const tubeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -4.0,
      });
      routeGroup.add(new THREE.Mesh(tubeGeom, tubeMat));

      const glowGeom = new THREE.TubeGeometry(
        curve,
        Math.min(160, pts3D.length * 3),
        radiusWidth * 1.65,
        6,
        false
      );
      const glowMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      routeGroup.add(new THREE.Mesh(glowGeom, glowMat));
    };

    // Outbound Leg (A1 -> B2): Cyan (Earth running path scale)
    buildLegTube(routeData.outboundPoints, 0x00f0ff, legOffset, tubeR);

    // Safe Return / Walkback Leg (B2 -> A1): Amber/Gold
    if (showReturnLeg) {
      buildLegTube(routeData.returnPoints, 0xf59e0b, legOffset + 0.00005, tubeR * 0.88);
    }
  }, [
    routeEndpoints,
    routingEnabled,
    showReturnLeg,
    traverseMode,
  ]);

  // Dedicated Walkback Isochrone recalculation whenever toggled, endpoints change, or site changes
  useEffect(() => {
    const terrainField = terrainFieldRef.current;
    if (!terrainField) return;

    if (showWalkbackIsochrone) {
      const centerLat = routingEnabled ? routeEndpoints.startLat : selectedSite.lat;
      const centerLon = routingEnabled ? routeEndpoints.startLon : selectedSite.lon;
      const isochrone = computeWalkbackIsochrone(
        centerLat,
        centerLon,
        terrainField,
        4.5,
        5.0
      );
      setWalkbackIsochrone(isochrone);
      updateIsochrone3DMeshes(isochrone);
    } else {
      setWalkbackIsochrone(null);
      updateIsochrone3DMeshes(null);
    }
  }, [
    showWalkbackIsochrone,
    routingEnabled,
    routeEndpoints.startLat,
    routeEndpoints.startLon,
    selectedSite,
    updateIsochrone3DMeshes,
    demVersion,
  ]);

  useEffect(() => {
    rebuildRoutesAndMeshes();
  }, [rebuildRoutesAndMeshes, exaggeration, demVersion]);

  // Safe Haven Scanner (Concentric radial solver around B2)
  const handleScanNearbySafeHaven = useCallback(() => {
    const terrainField = terrainFieldRef.current;
    if (!terrainField) return;

    const baseLat = routeEndpoints.endLat;
    const baseLon = routeEndpoints.endLon;
    const cosLat = Math.cos((baseLat * Math.PI) / 180.0);

    let bestLat = baseLat;
    let bestLon = baseLon;
    let bestScore = -9999;

    const radiiKm = [0.4, 0.8, 1.2, 1.6, 2.2, 2.8, 3.5];
    const azimuths = 16;

    for (const rKm of radiiKm) {
      for (let i = 0; i < azimuths; i++) {
        const azRad = (i / azimuths) * Math.PI * 2;
        const dX = rKm * Math.sin(azRad);
        const dY = rKm * Math.cos(azRad);

        const candLat = Math.max(
          -85.0,
          Math.min(85.0, baseLat + (dY / MARS_RADIUS_KM) * (180.0 / Math.PI))
        );
        const candLon = normalizeLon(baseLon + (dX / (MARS_RADIUS_KM * cosLat)) * (180.0 / Math.PI));

        const m = terrainField.sampleMetricsAt(candLat, candLon, 0);
        if (m.slopeDeg < 12.0) {
          const score = 100 - m.slopeDeg * 5 + m.frictionMu * 25 - rKm * 6;
          if (score > bestScore) {
            bestScore = score;
            bestLat = candLat;
            bestLon = candLon;
          }
        }
      }
    }

    if (bestScore > -999) {
      setRouteEndpoints((prev) => ({
        ...prev,
        endLat: Number(bestLat.toFixed(4)),
        endLon: Number(bestLon.toFixed(4)),
      }));
    }
  }, [routeEndpoints.endLat, routeEndpoints.endLon]);

  // Landmark Selection & Flight Handler
  const handleSelectLandmark = useCallback((lm: MarsLandmark) => {
    terrainFieldRef.current?.ensureSiteMasterDemLoaded({
      id: lm.id,
      roiBbox: [lm.lon - 0.5, lm.lat - 0.5, lm.lon + 0.5, lm.lat + 0.5],
    });

    const nav = navStateRef.current;
    nav.targetLat = lm.lat;
    nav.targetLon = normalizeLon(lm.lon);
    nav.targetAltitude = (28 / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = 45;
    setIsGlobalCommandView(false);

    setRouteEndpoints((prev) => ({
      ...prev,
      endLat: lm.lat,
      endLon: lm.lon,
    }));

    setIsSearchOpen(false);
    setSearchQuery(lm.name);
  }, []);

  const handleSearchSubmit = useCallback(
    (query: string) => {
      const coord = parseCoordinateQuery(query);
      if (coord) {
        const nav = navStateRef.current;
        nav.targetLat = coord.lat;
        nav.targetLon = normalizeLon(coord.lon);
        nav.targetAltitude = (28 / MARS_RADIUS_KM) * GLOBE_RADIUS;
        setIsGlobalCommandView(false);
        setRouteEndpoints((prev) => ({
          ...prev,
          endLat: coord.lat,
          endLon: coord.lon,
        }));
        setIsSearchOpen(false);
        return;
      }

      const results = searchMarsLandmarks(query);
      if (results.length > 0) {
        handleSelectLandmark(results[0]);
      }
    },
    [handleSelectLandmark]
  );

  const handleToggleSpeAlert = useCallback(() => {
    setIsSpeAlertActive((prev) => {
      const next = !prev;
      if (next && terrainFieldRef.current) {
        const rep = computeRadHavenSpe(
          navStateRef.current.focusLat,
          navStateRef.current.focusLon,
          terrainFieldRef.current,
          marsEphemeris.subsolarLat,
          marsEphemeris.subsolarLon,
          marsEphemeris.perseveranceSol
        );
        setSpeReport(rep);
        updateSpe3DMeshes(rep);
      } else {
        setSpeReport(null);
        updateSpe3DMeshes(null);
      }
      return next;
    });
  }, [
    marsEphemeris.perseveranceSol,
    marsEphemeris.subsolarLat,
    marsEphemeris.subsolarLon,
    updateSpe3DMeshes,
  ]);

  const handleToggleRfComms = useCallback(() => {
    setShowRfCommsGrid((prev) => {
      const next = !prev;
      if (next && terrainFieldRef.current) {
        const curElev = terrainFieldRef.current.getElevationMeters(
          navStateRef.current.focusLat,
          navStateRef.current.focusLon
        );
        const rep = computeRfCommsStatus(
          navStateRef.current.focusLat,
          navStateRef.current.focusLon,
          terrainFieldRef.current
        );
        setRfCommsReport(rep);
        updateRfComms3DMeshes(rep);
      } else {
        setRfCommsReport(null);
        updateRfComms3DMeshes(null);
      }
      return next;
    });
  }, [marsEphemeris.subsolarLon, updateRfComms3DMeshes]);

  useEffect(() => {
    paramsRef.current.exaggeration = exaggeration;
    paramsRef.current.wireframe = wireframe;

    const tileGroup = tileGroupRef.current;
    const terrainField = terrainFieldRef.current;
    if (!tileGroup || !terrainField) return;

    const traverseAndUpdate = (node: QuadTileNode) => {
      node.refreshUnifiedDemAndSlope(terrainField);
      node.applyVisualLayerToCanvas(paramsRef.current.layerMode);
      if (node.mesh) {
        node.buildOrUpdateMesh(exaggeration, wireframe, false, tileGroup, terrainField);
      }
      if (node.children) {
        node.children.forEach(traverseAndUpdate);
      }
    };
    rootsRef.current.forEach(traverseAndUpdate);
  }, [exaggeration, wireframe, demVersion]);

  const updateSunSystem = useCallback(() => {
    if (!sunLightRef.current || !hemiLightRef.current || !sunMeshRef.current) return;
    const sunPos = latLonToVector3(sunElevation, sunAzimuth, 450);
    sunLightRef.current.position.copy(sunPos);
    sunMeshRef.current.position.copy(sunPos);

    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uSunDirection.value.copy(sunPos).normalize();
    }
  }, [sunAzimuth, sunElevation]);

  useEffect(() => {
    paramsRef.current.sunAzimuth = sunAzimuth;
    paramsRef.current.sunElevation = sunElevation;
    updateSunSystem();
  }, [sunAzimuth, sunElevation, updateSunSystem]);

  const flyToExpeditionSite = useCallback((site: ExpeditionSite) => {
    setSelectedSite(site);
    setIsGlobalCommandView(false);
    setActiveStreetViewStation(null);
    terrainFieldRef.current?.ensureSiteMasterDemLoaded(site);

    const nav = navStateRef.current;
    nav.targetLat = site.lat;
    nav.targetLon = normalizeLon(site.lon);
    nav.targetAltitude = (site.targetAltitudeKm / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = site.targetTiltDeg;
    nav.targetBearingDeg = 57;

    setRouteEndpoints({
      startLat: site.defaultRoute[0],
      startLon: site.defaultRoute[1],
      endLat: site.defaultRoute[2],
      endLon: site.defaultRoute[3],
    });
  }, []);

  // Quick Action: Fly directly to Curiosity's 2025 Mount Sharp Boxwork Formations (NASA Challenge Science Goal)
  const flyToBoxworkObjective = useCallback(() => {
    const galeSite = EXPEDITION_SITES.find((s) => s.id === 'mount-sharp-gale');
    if (!galeSite) return;
    setSelectedSite(galeSite);
    setIsGlobalCommandView(false);
    setActiveStreetViewStation(null);
    terrainFieldRef.current?.ensureSiteMasterDemLoaded(galeSite);

    const nav = navStateRef.current;
    nav.targetLat = -4.732;
    nav.targetLon = 137.395;
    nav.targetAltitude = (24 / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = 45;
    nav.targetBearingDeg = 35;

    setRoutingEnabled(true);
    setTraverseMode('ASTRONAUT_HIKE');
    setRouteEndpoints({
      startLat: -4.685,
      startLon: 137.408,
      endLat: -4.732,
      endLon: 137.395,
    });
  }, []);

  const applyPresetEvaRoute = useCallback((route: PresetEvaRoute) => {
    const site = EXPEDITION_SITES.find((s) => s.id === route.siteId);
    if (site && site.id !== selectedSite.id) {
      setSelectedSite(site);
      terrainFieldRef.current?.ensureSiteMasterDemLoaded(site);
    }
    const nav = navStateRef.current;
    nav.targetLat = (route.startLat + route.endLat) * 0.5;
    nav.targetLon = normalizeLon((route.startLon + route.endLon) * 0.5);
    nav.targetAltitude = (22 / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = 45;
    nav.targetBearingDeg = 42;
    setIsGlobalCommandView(false);

    setRoutingEnabled(true);
    setTraverseMode('ASTRONAUT_HIKE');
    setRouteEndpoints({
      startLat: route.startLat,
      startLon: route.startLon,
      endLat: route.endLat,
      endLon: route.endLon,
    });
    setPickingMode('NONE');
  }, [selectedSite]);

  const openRoverStreetView = useCallback((station: RoverPanoramaStation) => {
    const nav = navStateRef.current;
    nav.targetLat = station.lat;
    nav.targetLon = normalizeLon(station.lon);
    nav.targetAltitude = (2.2 / MARS_RADIUS_KM) * GLOBE_RADIUS; // Swoop camera directly down to ground station
    nav.targetTiltDeg = 68;
    setIsGlobalCommandView(false);
    // Smooth Google Maps dive transition: allow camera to swoop down before opening 360° view
    setTimeout(() => {
      setActiveStreetViewStation(station);
    }, 450);
  }, []);

  const closeRoverStreetView = useCallback(() => {
    setActiveStreetViewStation(null);
    const nav = navStateRef.current;
    nav.targetAltitude = (selectedSite.targetAltitudeKm / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = selectedSite.targetTiltDeg;
  }, [selectedSite]);

  const toggleGlobalCommandView = useCallback(
    (toGlobal: boolean) => {
      setIsGlobalCommandView(toGlobal);
      const nav = navStateRef.current;
      if (toGlobal) {
        nav.targetAltitude = (5600 / MARS_RADIUS_KM) * GLOBE_RADIUS;
        nav.targetTiltDeg = 12;
      } else {
        nav.targetLat = selectedSite.lat;
        nav.targetLon = normalizeLon(selectedSite.lon);
        nav.targetAltitude = (selectedSite.targetAltitudeKm / MARS_RADIUS_KM) * GLOBE_RADIUS;
        nav.targetTiltDeg = selectedSite.targetTiltDeg;
      }
    },
    [selectedSite]
  );

  const handleLayerModeChange = (newMode: VisualLayerMode) => {
    setIsMapSwitching(true);
    const label =
      newMode === 'realistic'
        ? 'SYNCHRONIZING HiRISE 25cm TRUE OPTICAL MOSAIC...'
        : newMode === 'slope_radar'
        ? 'COMPUTING 0.38g ANTI-ROLLOVER SLOPE RADAR...'
        : newMode === 'tactical_contour'
        ? 'GENERATING DTM ISO-ELEVATION CONTOURS...'
        : newMode === 'color_hillshade'
        ? 'FUSING MOLA COLOR TOPOGRAPHY & SHADED RELIEF...'
        : 'PROCESSING ORBITAL DATA...';
    setMapLoadingText(label);

    setLayerMode(newMode);
    paramsRef.current.layerMode = newMode;

    const applyModeToTree = (node: QuadTileNode) => {
      node.applyVisualLayerToCanvas(newMode);
      if (node.children) {
        node.children.forEach(applyModeToTree);
      }
    };
    rootsRef.current.forEach(applyModeToTree);
    setTimeout(() => {
      setIsMapSwitching(false);
    }, 450);
  };

  const handleViewModeSwitch = (newView: '3D' | '2D') => {
    if (newView === viewMode && !isVisorMode) return;
    setIsMapSwitching(true);
    if (isVisorMode) {
      setIsVisorMode(false);
    }
    setMapLoadingText(
      newView === '2D'
        ? 'INITIALIZING MARS TREK WMS PLANIMETRIC MOSAIC...'
        : 'SYNCHRONIZING HiRISE 1.0m STEREO DTM ELEVATION MESH...'
    );
    setViewMode(newView);
    setTimeout(() => {
      setIsMapSwitching(false);
    }, 600);
  };

  const toggleVisorMode = () => {
    if (!isVisorMode) {
      previousCamAltitudeRef.current = navStateRef.current.altitude;
      previousCamTiltRef.current = navStateRef.current.tiltDeg;
      setIsMapSwitching(true);
      setMapLoadingText('INITIALIZING xEMU SPACESUIT VISOR HUD TELEMETRY...');
      setViewMode('3D');
      // Drop camera to ground level right at the start point A1 or focus center
      const targetLat = routeEndpoints.startLat || navStateRef.current.focusLat;
      const targetLon = routeEndpoints.startLon || navStateRef.current.focusLon;
      navStateRef.current.focusLat = targetLat;
      navStateRef.current.focusLon = targetLon;
      navStateRef.current.altitude = 0.08; // 1.8m human eye level above ground
      navStateRef.current.tiltDeg = 82; // horizontal gaze across Martian scarp
      setIsVisorMode(true);
      setTimeout(() => {
        setIsMapSwitching(false);
      }, 500);
    } else {
      setIsMapSwitching(true);
      setMapLoadingText('REVERTING TO ORBITAL TACTICAL 3D COMMAND VIEW...');
      navStateRef.current.altitude = previousCamAltitudeRef.current || 2.4;
      navStateRef.current.tiltDeg = previousCamTiltRef.current || 45;
      setIsVisorMode(false);
      setTimeout(() => {
        setIsMapSwitching(false);
      }, 450);
    }
  };

  const handleCopilotCommand = (cmd: CopilotAction) => {
    switch (cmd.action) {
      case 'PLOT_PRESET': {
        const preset = PRESET_EVA_ROUTES.find((p) => p.id === cmd.payload) || PRESET_EVA_ROUTES[0];
        if (preset) {
          applyPresetEvaRoute(preset);
        }
        break;
      }
      case 'SET_VIEW_MODE':
        handleViewModeSwitch(cmd.payload);
        break;
      case 'SET_LAYER_MODE':
        handleLayerModeChange(cmd.payload as VisualLayerMode);
        break;
      case 'ENTER_VISOR':
        toggleVisorMode();
        break;
      case 'OPEN_EXPORT':
        setIsExportModalOpen(true);
        break;
      case 'TOGGLE_SPE':
        handleToggleSpeAlert();
        break;
      case 'SET_TRAVERSE_MODE':
        setTraverseMode(cmd.payload);
        break;
    }
  };

  // Helper to check if mouse cursor is near a screen coordinate (to auto-hide legends when inspecting routes!)
  const isCursorNear = (x: number, y: number, radiusPx: number = 115): boolean => {
    if (!routingEnabled) return false;
    return Math.hypot(cursorPos.x - x, cursorPos.y - y) < radiusPx;
  };

  // ==========================================================================
  // INITIALIZE THREE.JS SCENE, UNIFIED TERRAIN FIELD & QUADTREE ENGINE
  // ==========================================================================
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const terrainField = new UnifiedMarsTerrainField(() => {
      setDemVersion((v) => v + 1);
    });
    terrainFieldRef.current = terrainField;
    // Preload Jezero Crater Master S16 DEM immediately
    terrainField.ensureSiteMasterDemLoaded(EXPEDITION_SITES[0]);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04070d);

    const starsGeom = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 700 + Math.random() * 600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    scene.add(
      new THREE.Points(
        starsGeom,
        new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 })
      )
    );

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.015, 2500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Higher hemisphere ambient fill so even night-side Mars remains inspectable when synced with real Mars time
    const hemiLight = new THREE.HemisphereLight(0xffe6d0, 0x6b442e, 1.15);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const initEphem = computeRealMarsTimeAndSun(77.4508);
    const initSunPos = latLonToVector3(initEphem.subsolarLat, initEphem.subsolarLon, 450);
    const sunLight = new THREE.DirectionalLight(0xfff6eb, 2.8);
    sunLight.position.copy(initSunPos);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb })
    );
    sunMesh.position.copy(initSunPos);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const atmosGeom = new THREE.SphereGeometry(GLOBE_RADIUS * 1.022, 96, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: initSunPos.clone().normalize() },
        uAtmosphereColor: { value: new THREE.Color(0xd87c4a) },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize(worldPos.xyz);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        uniform vec3 uAtmosphereColor;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - max(dot(vWorldNormal, -vViewDir), 0.0);
          float fresnel = pow(rim, 2.8);
          float sunFactor = smoothstep(-0.35, 0.8, dot(vWorldNormal, uSunDirection));
          float alpha = fresnel * (0.22 + 0.78 * sunFactor) * 0.55;
          gl_FragColor = vec4(uAtmosphereColor, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeom, atmosMat);
    scene.add(atmosphereMesh);
    atmosphereRef.current = atmosphereMesh;

    // 3D Orbital Rings for Global Command View
    const orbitalRingsGroup = new THREE.Group();
    scene.add(orbitalRingsGroup);
    orbitalRingsGroupRef.current = orbitalRingsGroup;

    const createOrbitRing = (
      radius: number,
      tiltXDeg: number,
      tiltZDeg: number,
      colorHex: number,
      opacity: number
    ) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const ang = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(ang) * radius, 0, Math.sin(ang) * radius));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity });
      const loop = new THREE.Line(geom, mat);
      loop.rotation.x = (tiltXDeg * Math.PI) / 180;
      loop.rotation.z = (tiltZDeg * Math.PI) / 180;
      orbitalRingsGroup.add(loop);
    };

    createOrbitRing(GLOBE_RADIUS * 1.18, 24, -15, 0x00f0ff, 0.55);
    createOrbitRing(GLOBE_RADIUS * 1.24, -18, 22, 0xf59e0b, 0.45);
    createOrbitRing(GLOBE_RADIUS * 1.32, 35, 8, 0x38bdf8, 0.25);

    const tileGroup = new THREE.Group();
    scene.add(tileGroup);
    tileGroupRef.current = tileGroup;

    const route3DGroup = new THREE.Group();
    scene.add(route3DGroup);
    route3DGroupRef.current = route3DGroup;

    const isochrone3DGroup = new THREE.Group();
    scene.add(isochrone3DGroup);
    isochrone3DGroupRef.current = isochrone3DGroup;

    const spe3DGroup = new THREE.Group();
    scene.add(spe3DGroup);
    spe3DGroupRef.current = spe3DGroup;

    const rf3DGroup = new THREE.Group();
    scene.add(rf3DGroup);
    rf3DGroupRef.current = rf3DGroup;

    const markers3DGroup = new THREE.Group();
    scene.add(markers3DGroup);
    markers3DGroupRef.current = markers3DGroup;

    const beaconEntries: {
      site: ExpeditionSite;
      group: THREE.Group;
      pulseRing: THREE.Mesh;
    }[] = [];

    for (const site of EXPEDITION_SITES) {
      const siteGroup = new THREE.Group();
      const colorObj = new THREE.Color(site.color);

      const stemGeom = new THREE.CylinderGeometry(0.035, 0.01, 2.2, 12);
      stemGeom.rotateX(Math.PI / 2);
      stemGeom.translate(0, 0, 1.1);
      siteGroup.add(
        new THREE.Mesh(
          stemGeom,
          new THREE.MeshBasicMaterial({ color: colorObj, transparent: true, opacity: 0.85 })
        )
      );

      const innerRingGeom = new THREE.RingGeometry(0.28, 0.42, 32);
      innerRingGeom.translate(0, 0, 0.04);
      siteGroup.add(
        new THREE.Mesh(
          innerRingGeom,
          new THREE.MeshBasicMaterial({
            color: colorObj,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          })
        )
      );

      const pulseRingGeom = new THREE.RingGeometry(0.55, 0.74, 36);
      pulseRingGeom.translate(0, 0, 0.05);
      const pulseRing = new THREE.Mesh(
        pulseRingGeom,
        new THREE.MeshBasicMaterial({
          color: colorObj,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        })
      );
      siteGroup.add(pulseRing);

      markers3DGroup.add(siteGroup);
      beaconEntries.push({ site, group: siteGroup, pulseRing });
    }

    const scheduler = new TileDownloadScheduler((active, queued) => {
      setStreamingCount(active + queued);
    });
    schedulerRef.current = scheduler;

    const rootWest = new QuadTileNode(0, 0, 0, null, terrainField);
    const rootEast = new QuadTileNode(0, 0, 1, null, terrainField);
    rootsRef.current = [rootWest, rootEast];

    rootWest.buildOrUpdateMesh(paramsRef.current.exaggeration, false, false, tileGroup, terrainField);
    rootEast.buildOrUpdateMesh(paramsRef.current.exaggeration, false, false, tileGroup, terrainField);

    const requestTileDownload = (node: QuadTileNode, priorityScore: number) => {
      if (node.isLoaded || node.isLoading || node.isDisposed) return;
      node.isLoading = true;

      node.cancelDownload = scheduler.enqueue(node.key, priorityScore, async () => {
        await loadTileImageryFromTrek(node, paramsRef.current.layerMode, terrainField);
        if (node.isDisposed) return;
        node.isLoading = false;
        node.buildOrUpdateMesh(
          paramsRef.current.exaggeration,
          paramsRef.current.wireframe,
          false,
          tileGroup,
          terrainField
        );
        if (node.children) {
          for (const ch of node.children) {
            if (!ch.isLoaded) {
              const qCol = ch.col % 2;
              const qRow = ch.row % 2;
              const pHalf = node.texSize / 2;
              const bCtx = ch.baseImageryCanvas.getContext('2d')!;
              bCtx.drawImage(
                node.baseImageryCanvas,
                qCol * pHalf,
                qRow * pHalf,
                pHalf,
                pHalf,
                0,
                0,
                ch.texSize,
                ch.texSize
              );
              ch.applyVisualLayerToCanvas(paramsRef.current.layerMode);
              ch.buildOrUpdateMesh(
                paramsRef.current.exaggeration,
                paramsRef.current.wireframe,
                false,
                tileGroup,
                terrainField
              );
            }
          }
        }
        if (node.z === 0) {
          setInitialLoading(false);
        }
      });
    };

    requestTileDownload(rootWest, 100000);
    requestTileDownload(rootEast, 100000);

    // ========================================================================
    // SPHERICAL CAMERA & INTERACTIVE START/END ROUTE POINT PICKING
    // ========================================================================
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    let isDragging = false;
    let dragDistPx = 0;
    let dragButton = 0;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistPx = 0;
      dragButton = e.button;
      prevX = e.clientX;
      prevY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      dragDistPx += Math.hypot(dx, dy);
      prevX = e.clientX;
      prevY = e.clientY;

      const nav = navStateRef.current;

      if (dragButton === 0 && !e.shiftKey) {
        const degPerPx = Math.min(0.32, Math.max(0.00015, (nav.altitude / GLOBE_RADIUS) * 0.14));
        const bearingRad = (nav.bearingDeg * Math.PI) / 180;
        const cosB = Math.cos(bearingRad);
        const sinB = Math.sin(bearingRad);

        const dLon = (-dx * cosB + dy * sinB) * degPerPx;
        const dLat = (dy * cosB + dx * sinB) * degPerPx;

        nav.targetLon = normalizeLon(
          nav.targetLon + dLon / Math.max(0.25, Math.cos((nav.targetLat * Math.PI) / 180))
        );
        nav.targetLat = clampLat(nav.targetLat + dLat);
      } else {
        nav.targetBearingDeg = (nav.targetBearingDeg - dx * 0.35 + 360) % 360;
        nav.targetTiltDeg = Math.max(0, Math.min(65, nav.targetTiltDeg - dy * 0.28));
      }
    };

    const onPointerLeave = () => {
      setCursorPos({ x: -9999, y: -9999 });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}

      if (dragDistPx < 6 && e.button === 0 && paramsRef.current.pickingMode !== 'NONE') {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObjects(tileGroup.children, false);
        if (hits.length > 0) {
          const hitLatLon = vector3ToLatLon(hits[0].point);
          const modeNow = paramsRef.current.pickingMode;
          setRoutingEnabled(true);
          if (modeNow === 'START') {
            setRouteEndpoints((prev) => ({
              ...prev,
              startLat: clampLat(hitLatLon.lat),
              startLon: normalizeLon(hitLatLon.lon),
            }));
            setPickingMode('END');
          } else if (modeNow === 'END') {
            setRouteEndpoints((prev) => ({
              ...prev,
              endLat: clampLat(hitLatLon.lat),
              endLon: normalizeLon(hitLatLon.lon),
            }));
            setPickingMode('NONE');
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const nav = navStateRef.current;
      nav.lastWheelTime = performance.now();

      const zoomFactor = Math.pow(0.82, -e.deltaY / 100);
      nav.targetAltitude = Math.max(0.055, Math.min(280.0, nav.targetAltitude * zoomFactor));

      const altKm = (nav.targetAltitude / GLOBE_RADIUS) * MARS_RADIUS_KM;
      setIsGlobalCommandView(altKm > 1800);

      if (e.deltaY < 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObjects(tileGroup.children, false);
        if (hits.length > 0) {
          const hitLatLon = vector3ToLatLon(hits[0].point);
          const dLon = normalizeLon(hitLatLon.lon - nav.targetLon);
          nav.targetLon = normalizeLon(nav.targetLon + dLon * 0.14);
          nav.targetLat = clampLat(nav.targetLat + (hitLatLon.lat - nav.targetLat) * 0.14);
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(tileGroup.children, false);
      if (hits.length > 0) {
        const hitLatLon = vector3ToLatLon(hits[0].point);
        const nav = navStateRef.current;
        nav.targetLat = clampLat(hitLatLon.lat);
        nav.targetLon = normalizeLon(hitLatLon.lon);
        nav.targetAltitude = Math.max(0.06, nav.targetAltitude * 0.48);
        setIsGlobalCommandView(false);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(tileGroup.children, false);
      if (hits.length > 0) {
        const hitLatLon = vector3ToLatLon(hits[0].point);
        setRoutingEnabled(true);
        if (e.shiftKey) {
          // Shift + Right-Click sets Start (A1)
          setRouteEndpoints((prev) => ({
            ...prev,
            startLat: clampLat(hitLatLon.lat),
            startLon: normalizeLon(hitLatLon.lon),
          }));
        } else {
          // Right-Click sets Destination (B2) seamlessly!
          setRouteEndpoints((prev) => ({
            ...prev,
            endLat: clampLat(hitLatLon.lat),
            endLon: normalizeLon(hitLatLon.lon),
          }));
        }
        setPickingMode('NONE');
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerleave', onPointerLeave);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('dblclick', onDoubleClick);
    domEl.addEventListener('contextmenu', onContextMenu);

    const updateSphericalCamera = (): THREE.Vector3 => {
      const nav = navStateRef.current;

      const dLon = normalizeLon(nav.targetLon - nav.focusLon);
      nav.focusLon = normalizeLon(nav.focusLon + dLon * 0.18);
      nav.focusLat = clampLat(nav.focusLat + (nav.targetLat - nav.focusLat) * 0.18);
      nav.altitude += (nav.targetAltitude - nav.altitude) * 0.18;
      nav.tiltDeg += (nav.targetTiltDeg - nav.tiltDeg) * 0.18;

      const dBear = ((nav.targetBearingDeg - nav.bearingDeg + 540) % 360) - 180;
      nav.bearingDeg = (nav.bearingDeg + dBear * 0.18 + 360) % 360;

      const elevM = terrainField.getElevationMeters(nav.focusLat, nav.focusLon);
      const surfRadius = elevationMetersToRadius(elevM, paramsRef.current.exaggeration);
      const focusPoint3D = latLonToVector3(nav.focusLat, nav.focusLon, surfRadius);

      const up = focusPoint3D.clone().normalize();
      const worldY = new THREE.Vector3(0, 1, 0);
      const east = new THREE.Vector3().crossVectors(worldY, up).normalize();
      const north = new THREE.Vector3().crossVectors(up, east).normalize();

      const bearRad = (nav.bearingDeg * Math.PI) / 180;
      const forward = north
        .clone()
        .multiplyScalar(Math.cos(bearRad))
        .addScaledVector(east, Math.sin(bearRad))
        .normalize();

      const tiltScale = Math.min(1.0, 55.0 / Math.max(1.0, nav.altitude));
      const effTiltRad = (nav.tiltDeg * tiltScale * Math.PI) / 180;

      const camPos = focusPoint3D
        .clone()
        .addScaledVector(up, nav.altitude * Math.cos(effTiltRad))
        .addScaledVector(forward, -nav.altitude * Math.sin(effTiltRad));

      const camLatLon = vector3ToLatLon(camPos);
      const underCamElev = terrainField.getElevationMeters(camLatLon.lat, camLatLon.lon);
      const minCamR =
        elevationMetersToRadius(underCamElev, paramsRef.current.exaggeration) + 0.035;
      if (camPos.length() < minCamR) {
        camPos.setLength(minCamR);
      }

      camera.position.copy(camPos);
      camera.up
        .copy(up)
        .multiplyScalar(Math.sin(effTiltRad))
        .addScaledVector(forward, Math.cos(effTiltRad))
        .normalize();
      camera.lookAt(focusPoint3D);

      if (orbitalRingsGroupRef.current) {
        orbitalRingsGroupRef.current.visible = nav.altitude > 35.0;
        orbitalRingsGroupRef.current.rotation.y += 0.0008;
      }

      return focusPoint3D;
    };

    let frameCounter = 0;

    const updateBeaconsAndOverlays = () => {
      const camPos = camera.position;
      const camDir = camPos.clone().normalize();
      const camRadius = camPos.length();
      const horizonCos = GLOBE_RADIUS / Math.max(GLOBE_RADIUS + 0.01, camRadius);
      const pulsePhase = (performance.now() * 0.0022) % 1.0;

      const w = container.clientWidth;
      const h = container.clientHeight;
      const newProjected: ProjectedMarkerPos[] = [];

      for (const entry of beaconEntries) {
        const { site, group, pulseRing } = entry;
        const elevM = terrainField.getElevationMeters(site.lat, site.lon);
        const surfR = elevationMetersToRadius(elevM, paramsRef.current.exaggeration);
        const pos3D = latLonToVector3(site.lat, site.lon, surfR);
        const normal = pos3D.clone().normalize();

        group.position.copy(pos3D);
        group.lookAt(pos3D.clone().add(normal));

        // Auto-hide giant 3D beacon stems and pulse rings when low altitude (< 16.0) to keep crater terrain clean!
        const nav = navStateRef.current;
        const isOrbitalView = nav.altitude > 16.0;
        group.visible = isOrbitalView;

        const distToCam = camPos.distanceTo(pos3D);
        const beaconScale = Math.max(0.025, Math.min(3.2, distToCam * 0.022));
        group.scale.setScalar(beaconScale);

        const pScale = 0.8 + pulsePhase * 1.4;
        pulseRing.scale.set(pScale, pScale, 1);
        (pulseRing.material as THREE.MeshBasicMaterial).opacity = (1.0 - pulsePhase) * 0.75;

        const dotHorizon = normal.dot(camDir);
        const isFrontSide = dotHorizon >= horizonCos * 0.88;

        const proj = pos3D.clone().addScaledVector(normal, beaconScale * 1.4).project(camera);
        const screenX = (proj.x * 0.5 + 0.5) * w;
        const screenY = (-proj.y * 0.5 + 0.5) * h;
        const inScreen =
          isFrontSide &&
          proj.z < 1.0 &&
          screenX >= -40 &&
          screenX <= w + 40 &&
          screenY >= -40 &&
          screenY <= h + 40;

        // Hide 2D site badge when inside this site to avoid blocking rover route lines
        const showBadge = isOrbitalView || site.id !== selectedSite.id;
        newProjected.push({
          site,
          x: screenX,
          y: screenY,
          visible: inScreen && showBadge,
          distKm: (distToCam / GLOBE_RADIUS) * MARS_RADIUS_KM,
        });
      }

      if (frameCounter % 2 === 0) {
        setProjectedMarkers(newProjected);
      }
    };

    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();

    const updateQuadtreeLOD = (focusPoint3D: THREE.Vector3) => {
      camera.updateMatrixWorld();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const camPos = camera.position;
      const camRadius = camPos.length();
      const focusNormal = focusPoint3D.clone().normalize();

      const horizonCos = GLOBE_RADIUS / Math.max(GLOBE_RADIUS + 0.01, camRadius);
      const isWheelSpinning = performance.now() - navStateRef.current.lastWheelTime < 90;

      let highestZ = 0;
      let renderedTiles = 0;
      const watchedLeafNodes: { node: QuadTileNode; distToFocus: number }[] = [];

      const evaluateNode = (node: QuadTileNode): void => {
        const nodeNormal = node.center3D.clone().normalize();
        const tileAngularRadius = (node.spanDeg * Math.PI) / 180.0;

        const dotFocus = nodeNormal.dot(focusNormal);
        const isInFrontOfHorizon =
          node.z === 0 || dotFocus >= horizonCos - tileAngularRadius * 0.95;
        const inFrustum = node.z === 0 || frustum.intersectsSphere(node.boundingSphere);

        const distToFocus = focusPoint3D.distanceTo(node.center3D);
        const distToCam = camPos.distanceTo(node.center3D);
        const effectiveDist = Math.max(
          0.01,
          Math.min(distToCam, distToFocus * 1.15) - node.boundingSphere.radius * 0.45
        );

        const shouldSubdivide =
          node.z < node.maxAllowedZoom &&
          isInFrontOfHorizon &&
          inFrustum &&
          effectiveDist < node.boundingSphere.radius * 1.32;

        if (shouldSubdivide) {
          if (node.z >= 2 && !node.isLoaded) {
            node.cancelPendingLoad();
          }

          if (!node.children) {
            const nextZ = node.z + 1;
            const r2 = node.row * 2;
            const c2 = node.col * 2;
            node.children = [
              new QuadTileNode(nextZ, r2, c2, node, terrainField),
              new QuadTileNode(nextZ, r2, c2 + 1, node, terrainField),
              new QuadTileNode(nextZ, r2 + 1, c2, node, terrainField),
              new QuadTileNode(nextZ, r2 + 1, c2 + 1, node, terrainField),
            ];
            for (const ch of node.children) {
              ch.applyVisualLayerToCanvas(paramsRef.current.layerMode);
              ch.buildOrUpdateMesh(
                paramsRef.current.exaggeration,
                paramsRef.current.wireframe,
                false,
                tileGroup,
                terrainField
              );
            }
          }

          node.setVisible(false, false);
          for (const ch of node.children) {
            evaluateNode(ch);
          }
          return;
        }

        if (node.children) {
          for (const ch of node.children) {
            ch.dispose(tileGroup);
          }
          node.children = null;
        }

        node.setVisible(true, false);
        renderedTiles++;
        if (node.z > highestZ) highestZ = node.z;

        if (isInFrontOfHorizon && inFrustum) {
          watchedLeafNodes.push({ node, distToFocus });
        } else if (!node.isLoaded && node.z >= 2) {
          node.cancelPendingLoad();
        }
      };

      for (const root of rootsRef.current) {
        evaluateNode(root);
      }

      for (const { node, distToFocus } of watchedLeafNodes) {
        if (node.isLoaded || node.isLoading) continue;
        if (node.z >= 3 && isWheelSpinning) continue;
        const siteBoost = node.isHighDetailSite ? 500 : 0;
        const priority = 10000 - distToFocus * 10 + node.z * 50 + siteBoost;
        requestTileDownload(node, priority);
      }

      frameCounter++;
      if (frameCounter % 8 === 0) {
        setMaxRenderedZoom(highestZ);
        setVisibleTileCount(renderedTiles);

        const nav = navStateRef.current;
        const { elevM, slopeDeg, pitchDeg, rollDeg, frictionMu } = terrainField.sampleMetricsAt(
          nav.focusLat,
          nav.focusLon,
          nav.bearingDeg
        );
        const altKm = Math.max(0.5, (nav.altitude / GLOBE_RADIUS) * MARS_RADIUS_KM);

        const dirs8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const compassDir = dirs8[Math.round(nav.bearingDeg / 45) % 8];

        const tractionPct = Math.min(99, Math.max(42, Math.round(frictionMu * 124 - slopeDeg * 0.8)));
        const slipRiskPct = Math.min(95, Math.max(4, 100 - tractionPct));
        const speedKmh = Number(
          Math.max(0.45, 3.8 * (1 - slopeDeg / 28) * (frictionMu / 0.75)).toFixed(2)
        );

        const atmosPresPa = Math.round(610 * Math.exp(-elevM / 11100));
        const ephemNow = computeRealMarsTimeAndSun(nav.focusLon);
        const sunDot = Math.cos(((ephemNow.localHourFloat - 12.5) * Math.PI) / 12);
        const externalTempC = Math.round(-62 + sunDot * 38 - Math.abs(nav.focusLat) * 0.35);

        const matchedSite = findIntersectingExpeditionSite(
          normalizeLon(nav.focusLon) - 0.05,
          nav.focusLat - 0.05,
          normalizeLon(nav.focusLon) + 0.05,
          nav.focusLat + 0.05
        );

        const bioLive = computeSanteePandolf038g(speedKmh, pitchDeg, frictionMu);

        setLiveTelemetry({
          lat: nav.focusLat,
          lon: normalizeLon(nav.focusLon),
          elevM,
          altitudeKm: altKm,
          pitchDeg: Number(pitchDeg.toFixed(1)),
          rollDeg: Number(rollDeg.toFixed(1)),
          slopeDeg: Number(slopeDeg.toFixed(1)),
          headingDeg: Math.round(nav.bearingDeg),
          compassDir,
          frictionMu: Number(frictionMu.toFixed(2)),
          tractionPct,
          slipRiskPct,
          speedKmh,
          o2SatPct: 98,
          suitPressureKpa: 29.65, // Standard NASA 4.3 psi = 29.65 kPa
          heartRateBpm: Math.min(148, Math.round(72 + slopeDeg * 2.4)),
          radiationMsvH: Number(Math.max(0.06, 0.14 + (elevM / 10000) * 0.04).toFixed(2)),
          externalTempC,
          atmosPresPa,
          qualityTierLabel: matchedSite ? `ULTRA-HD Z${matchedSite.maxZoom}` : `GLOBAL Z${MAX_GLOBAL_ZOOM}`,
          metabolicWatts: bioLive.metabolicWatts,
          waterBurnGph: bioLive.waterBurnGramsPerHour,
          waterReservePct: activeRouteData?.waterReserveMarginPct ?? 88,
          o2ReservePct: 96,
          liohReservePct: 92,
          batteryReservePct: 84,
        });
      }
    };

    let animId: number;
    let lastLodTime = 0;
    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);
      const focusPoint3D = updateSphericalCamera();

      // Throttle quadtree LOD evaluation to ~12 Hz (every 80ms)
      // This maintains high-performance 60 FPS rendering without CPU quadtree thrashing!
      if (timestamp - lastLodTime > 80) {
        updateQuadtreeLOD(focusPoint3D);
        lastLodTime = timestamp;
      }

      updateBeaconsAndOverlays();
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerleave', onPointerLeave);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('dblclick', onDoubleClick);
      domEl.removeEventListener('contextmenu', onContextMenu);
      rootsRef.current.forEach((r) => r.dispose(tileGroup));
      renderer.dispose();
      rendererRef.current = null;
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  // Force Three.js viewport resize when sidebars collapse/expand or view mode switches
  useEffect(() => {
    const handlePanelChange = () => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    handlePanelChange();
    const t1 = setTimeout(handlePanelChange, 25);
    const t2 = setTimeout(handlePanelChange, 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [leftPanelOpen, rightPanelOpen, viewMode]);

      // Project Waypoints, Hazard Badges, and 360° Rover Panorama Optic Stations to 2D Screen
  useEffect(() => {
    const interval = setInterval(() => {
      const camera = cameraRef.current;
      const container = containerRef.current;
      const terrainField = terrainFieldRef.current;
      if (!camera || !container || !terrainField) {
        setProjectedRouteTags([]);
        setProjectedPanoMarkers([]);
        return;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;
      const camPos = camera.position;
      const camDir = camPos.clone().normalize();
      const horizonCos = GLOBE_RADIUS / Math.max(GLOBE_RADIUS + 0.01, camPos.length());

      const projectLatLon = (lat: number, lon: number, lift: number) => {
        const elevM = terrainField.getElevationMeters(lat, lon);
        const rad = elevationMetersToRadius(elevM, exaggeration) + lift;
        const pos3D = latLonToVector3(lat, lon, rad);
        const normal = pos3D.clone().normalize();
        const isFront = normal.dot(camDir) >= horizonCos * 0.9;
        const proj = pos3D.clone().project(camera);
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h;
        const visible = isFront && proj.z < 1.0 && x > 40 && x < w - 40 && y > 40 && y < h - 40;
        return { x, y, visible };
      };

      // 1. Project 360° Rover Panorama Optic Stations (Local to current site only)
      if (showPanoMarkers) {
        const panoList: { station: RoverPanoramaStation; x: number; y: number; visible: boolean }[] =
          [];
        for (const st of ROVER_PANORAMA_STATIONS) {
          if (st.siteId !== selectedSite.id) continue;
          const { x, y, visible } = projectLatLon(st.lat, st.lon, 0.0035);
          panoList.push({ station: st, x, y, visible });
        }
        setProjectedPanoMarkers(panoList);
      } else {
        setProjectedPanoMarkers([]);
      }

      // 2. Project Route Waypoints & Hazard Badges
      if (!routingEnabled || !activeRouteData) {
        setProjectedRouteTags([]);
        return;
      }

      const tags: ProjectedRouteTag[] = [];

      if (activeRouteData.isTraversable) {
        for (const wp of activeRouteData.waypoints) {
          if (wp.id === 'R1' && !showReturnLeg) continue;
          const { x, y, visible } = projectLatLon(wp.lat, wp.lon, 0.0022);
          tags.push({
            id: `wp-${wp.id}`,
            text: wp.label,
            kind: 'WAYPOINT',
            color: wp.id === 'B2' ? '#ef4444' : wp.id === 'R1' ? '#f59e0b' : '#00f0ff',
            x,
            y,
            visible,
          });
        }
      } else {
        // Show A1 and B2 pins even when route is untraversable
        const pA = projectLatLon(routeEndpoints.startLat, routeEndpoints.startLon, 0.0022);
        const pB = projectLatLon(routeEndpoints.endLat, routeEndpoints.endLon, 0.0022);
        tags.push({
          id: 'wp-A1',
          text: 'A1',
          kind: 'WAYPOINT',
          color: '#10b981',
          x: pA.x,
          y: pA.y,
          visible: pA.visible,
        });
        tags.push({
          id: 'wp-B2',
          text: 'B2',
          kind: 'WAYPOINT',
          color: '#ef4444',
          x: pB.x,
          y: pB.y,
          visible: pB.visible,
        });
      }

      for (const haz of activeRouteData.hazardPoints) {
        const { x, y, visible } = projectLatLon(haz.lat, haz.lon, 0.0028);
        tags.push({
          id: haz.id,
          text: haz.label,
          kind: 'HAZARD',
          color: '#f59e0b',
          x,
          y,
          visible,
        });
      }

      setProjectedRouteTags(tags);

      // 3. Project Science Targets on 3D Globe
      const siteScience = SCIENCE_TARGETS_DATABASE.filter(
        (st) => st.siteId === selectedSite.id
      );
      const sciList: { target: ScienceTargetPOI; x: number; y: number; visible: boolean }[] = [];
      for (const st of siteScience) {
        const { x, y, visible } = projectLatLon(st.lat, st.lon, 0.0032);
        sciList.push({ target: st, x, y, visible });
      }
      setProjectedScienceTargets(sciList);
    }, 80);

    return () => clearInterval(interval);
  }, [
    activeRouteData,
    exaggeration,
    routeEndpoints,
    routingEnabled,
    selectedSite.id,
    showPanoMarkers,
    showReturnLeg,
  ]);

  // Display accurate Mission Sol for current site (Curiosity Sol for Gale Crater, Perseverance Sol for Jezero & Mars 2020)
  const displayedSolNumber =
    selectedSite.id === 'mount-sharp-gale'
      ? marsEphemeris.curiositySol
      : marsEphemeris.perseveranceSol;
  const displayedSolMission =
    selectedSite.id === 'mount-sharp-gale' ? 'CURIOSITY SOL' : 'PERSEVERANCE SOL';

  return (
    <div className="relative w-full h-screen bg-[#05080f] text-slate-100 overflow-hidden font-sans select-none p-2 md:p-3 flex flex-col">
      <div className="relative flex-1 w-full h-full rounded-2xl border-2 border-slate-700/80 bg-[#070b12] shadow-[inset_0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(0,240,255,0.08)] overflow-hidden flex flex-col">
        {/* Click-outside backdrop to dismiss any open header dropdown */}
        {(siteDropdownOpen || layerDropdownOpen || safetyDropdownOpen) && (
          <div
            onClick={() => {
              setSiteDropdownOpen(false);
              setLayerDropdownOpen(false);
              setSafetyDropdownOpen(false);
            }}
            className="fixed inset-0 z-35 bg-transparent"
          />
        )}

        {/* ===================================================================
            TOP TACTICAL COMMAND HEADER BAR
           =================================================================== */}
        <header className="h-12 bg-[#0b101b]/95 border-b border-slate-700/80 px-3 flex items-center justify-between z-40 relative shrink-0 gap-2">
          {/* Left: System Title, Site Dropdown & FR-03 Search Bar */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-amber-500/15 border border-amber-500/60 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
              ▲
            </div>
            <div className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-xs md:text-sm font-bold tracking-wider uppercase text-slate-100">
                ARES-NAVIGATOR
              </span>
            </div>

            {/* Site Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setSiteDropdownOpen(!siteDropdownOpen);
                  setLayerDropdownOpen(false);
                  setSafetyDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070e1b] hover:bg-[#0d182e] border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
                title="Select Expedition Site"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: selectedSite.color }}
                />
                <span className="max-w-[120px] truncate">{selectedSite.shortLabel}</span>
                <span className="text-[9px] text-slate-400">▾</span>
              </button>
              {siteDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-[#08101d]/98 border border-cyan-500/60 rounded-xl shadow-2xl p-1 z-50 divide-y divide-slate-800">
                  {EXPEDITION_SITES.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => {
                        flyToExpeditionSite(site);
                        setSiteDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-mono rounded flex items-center gap-2 hover:bg-cyan-500/20 transition-all cursor-pointer ${
                        selectedSite.id === site.id ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-slate-300'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: site.color }}
                      />
                      <div className="truncate">
                        <div className="font-bold">{site.shortLabel}</div>
                        <div className="text-[9px] text-slate-500 truncate">{site.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* FR-03: Mars Landmark & Coordinate Search Bar */}
            <div className="relative hidden md:block">
              <div className="flex items-center bg-[#060c16] border border-slate-700 hover:border-cyan-500/70 focus-within:border-cyan-400 rounded px-2 py-0.5 transition-all w-32 lg:w-44">
                <Search className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Boxwork, Clays..."
                  value={searchQuery}
                  onFocus={() => {
                    setIsSearchOpen(true);
                    setSearchResults(searchMarsLandmarks(searchQuery));
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                    setSearchResults(searchMarsLandmarks(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(searchQuery);
                    }
                  }}
                  className="bg-transparent text-[11px] font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsSearchOpen(false);
                    }}
                    className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 max-h-72 bg-[#09111e]/98 border border-cyan-500/60 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(0,240,255,0.2)] overflow-y-auto z-50 p-1">
                  <div className="px-2 py-1 text-[9px] font-mono uppercase text-slate-400 border-b border-slate-800 flex justify-between">
                    <span>NASA TARGETS (BOXWORK, CLAYS, ICE)</span>
                    <span>SCI / ELEV</span>
                  </div>
                  {(searchResults.length > 0 ? searchResults : MARS_LANDMARKS.slice(0, 7)).map(
                    (lm) => (
                      <button
                        key={lm.id}
                        onClick={() => handleSelectLandmark(lm)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent transition-all flex flex-col gap-0.5 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 font-mono">
                            {lm.name}
                          </span>
                          <span className="text-[10px] font-mono text-amber-300">
                            {lm.elevationM} m
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span className="truncate max-w-[190px]">{lm.mineralogy}</span>
                          <span className="text-cyan-400 font-bold">{lm.scienceValueScore}/100 SCI</span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center: Clean Segmented Mode Toggle + Grouped Dropdowns */}
          <div className="flex items-center gap-2">
            {/* View Mode: 3D Globe vs 2D Tactical Map vs Visor HUD */}
            <div className="flex items-center bg-[#060912] border border-cyan-500/50 rounded-lg p-0.5 font-mono text-[10px] shadow-xs">
              <button
                onClick={() => handleViewModeSwitch('3D')}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === '3D' && !isVisorMode
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to 3D Photorealistic Terrain Globe"
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>3D GLOBE</span>
              </button>
              <button
                onClick={() => handleViewModeSwitch('2D')}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === '2D'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to 2D Planimetric Tactical GIS Map with Mars Trek Layers"
              >
                <LucideMap className="w-3 h-3 text-cyan-400" />
                <span>2D MAP</span>
              </button>
              <button
                onClick={toggleVisorMode}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                  isVisorMode
                    ? 'bg-amber-500/35 text-amber-200 border border-amber-400/70 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
                title="First-Person Astronaut Helmet Visor / Cockpit HUD View"
              >
                <Eye className="w-3 h-3 text-amber-400" />
                <span>VISOR HUD</span>
              </button>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex items-center bg-[#060912] border border-slate-700/80 rounded-lg p-0.5 font-mono text-[10px]">
              <button
                onClick={() => {
                  setRoutingEnabled(true);
                  setTraverseMode('ASTRONAUT_HIKE');
                  setIsGlobalCommandView(false);
                }}
                className={`px-2.5 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                  traverseMode === 'ASTRONAUT_HIKE'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MARSWALK EVA
              </button>
              <button
                onClick={() => {
                  setRoutingEnabled(true);
                  setTraverseMode('ROVER_AUTOPILOT');
                  setIsGlobalCommandView(false);
                }}
                className={`px-2.5 py-1 rounded font-bold uppercase transition-all cursor-pointer ${
                  traverseMode === 'ROVER_AUTOPILOT'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ROVER
              </button>
            </div>

            {/* Grouped Layers Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setLayerDropdownOpen(!layerDropdownOpen);
                  setSafetyDropdownOpen(false);
                  setSiteDropdownOpen(false);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                  layerMode !== 'realistic' || wireframe
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>LAYERS</span>
                <span className="text-[8px] text-slate-400">▾</span>
              </button>
              {layerDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#08101d]/98 border border-cyan-500/60 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                  <button
                    onClick={() => {
                      setWireframe(false);
                      handleLayerModeChange('realistic');
                      setLayerDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-cyan-500/20 cursor-pointer ${
                      layerMode === 'realistic' && !wireframe ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span>Realistic Surface</span>
                    {layerMode === 'realistic' && !wireframe && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setWireframe(false);
                      handleLayerModeChange('slope_radar');
                      setLayerDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-cyan-500/20 cursor-pointer ${
                      layerMode === 'slope_radar' ? 'text-emerald-300 font-bold bg-emerald-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span>Dynamic Slope Radar</span>
                    {layerMode === 'slope_radar' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setWireframe(false);
                      handleLayerModeChange('tactical_contour');
                      setLayerDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-cyan-500/20 cursor-pointer ${
                      layerMode === 'tactical_contour' ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span>50m Topo Contours</span>
                    {layerMode === 'tactical_contour' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setWireframe(!wireframe);
                      setLayerDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-cyan-500/20 cursor-pointer ${
                      wireframe ? 'text-amber-300 font-bold bg-amber-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span>Wireframe DEM</span>
                    {wireframe && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Grouped Safety & Comms Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setSafetyDropdownOpen(!safetyDropdownOpen);
                  setLayerDropdownOpen(false);
                  setSiteDropdownOpen(false);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSpeAlertActive || showRfCommsGrid || showWalkbackIsochrone
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>SAFETY & COMMS</span>
                {(isSpeAlertActive || showRfCommsGrid || showWalkbackIsochrone) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                )}
                <span className="text-[8px] text-slate-400">▾</span>
              </button>
              {safetyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#08101d]/98 border border-rose-500/60 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                  <button
                    onClick={() => {
                      handleToggleSpeAlert();
                      setSafetyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-rose-500/20 cursor-pointer ${
                      isSpeAlertActive ? 'text-rose-300 font-bold bg-rose-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>SPE Storm Haven</span>
                    </span>
                    <span className="font-bold">{isSpeAlertActive ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleToggleRfComms();
                      setSafetyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-cyan-500/20 cursor-pointer ${
                      showRfCommsGrid ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>RF Comms Blackout</span>
                    </span>
                    <span className="font-bold">{showRfCommsGrid ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowWalkbackIsochrone(!showWalkbackIsochrone);
                      setSafetyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs font-mono rounded flex items-center justify-between hover:bg-sky-500/20 cursor-pointer ${
                      showWalkbackIsochrone ? 'text-sky-300 font-bold bg-sky-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Walkback Isochrone</span>
                    </span>
                    <span className="font-bold">{showWalkbackIsochrone ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* HD / Fast Upscaling Toggle */}
            <button
              onClick={() => setHighDetailMode(!highDetailMode)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                highDetailMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={highDetailMode ? 'HD Mesh Detail Active' : 'Fast Performance Mode Active'}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{highDetailMode ? 'HD: ON' : 'FAST'}</span>
            </button>

            {/* 360° Optics Toggle */}
            <button
              onClick={() => setShowPanoMarkers((v) => !v)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border inline-flex items-center gap-1.5 cursor-pointer ${
                showPanoMarkers
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/80 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle 360° Rover Panorama Optic Markers"
            >
              <TacticalOpticIcon
                className="w-3.5 h-3.5"
                accentColor={showPanoMarkers ? '#22d3ee' : '#94a3b8'}
              />
              <span className="hidden xl:inline">360° OPTICS</span>
            </button>

            {/* Global Orbit Toggle */}
            <button
              onClick={() => toggleGlobalCommandView(!isGlobalCommandView)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border cursor-pointer ${
                isGlobalCommandView
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              GLOBAL ORBIT
            </button>

            {/* AI Copilot Toggle */}
            <button
              onClick={() => setIsAiCopilotOpen(!isAiCopilotOpen)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all border flex items-center gap-1.5 cursor-pointer ${
                isAiCopilotOpen
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/80 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/20'
              }`}
              title="Open ARES AI Tactical Copilot (Assisting Astronaut Sadia A. Puspo)"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">AI COPILOT</span>
            </button>
          </div>

          {/* Right: Mars Clock & Sidebar Drawer Toggles */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div
              suppressHydrationWarning
              className="text-slate-200 tracking-wide bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700/70 hidden sm:flex items-center"
              title={`Mars Sol Date (MSD): ${marsEphemeris.msd.toFixed(2)} | Coordinated Mars Time: ${marsEphemeris.mtcStr}`}
            >
              <span suppressHydrationWarning className="text-amber-300 font-bold">
                {displayedSolMission} {displayedSolNumber}
              </span>
              <span className="mx-1.5 text-slate-600">|</span>
              <span suppressHydrationWarning className="text-cyan-300 font-semibold">
                {marsEphemeris.localSolarTimeStr}
              </span>
            </div>

            {/* Panel Quick Toggle Buttons */}
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={`p-1.5 rounded border transition-all cursor-pointer ${
                leftPanelOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={leftPanelOpen ? 'Collapse Route Panel' : 'Open Route Panel'}
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`p-1.5 rounded border transition-all cursor-pointer ${
                rightPanelOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={rightPanelOpen ? 'Collapse Telemetry Panel' : 'Open Telemetry Panel'}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </header>

        {/* ===================================================================
            MAIN 3-COLUMN TACTICAL COCKPIT BODY
           =================================================================== */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* =================================================================
              LEFT TACTICAL SIDEBAR
             ================================================================= */}
          {leftPanelOpen && (
            <aside className="w-70 bg-[#0b101b]/95 border-r border-slate-700/80 p-3 flex flex-col justify-between z-20 shrink-0 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider font-mono">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ROUND-TRIP PLANNER</span>
                  </div>
                  <button
                    onClick={() => setLeftPanelOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 text-xs font-mono transition-all cursor-pointer"
                    title="Collapse Panel (Clean Map View)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase">
                      ROUND-TRIP PLANNER
                    </span>
                    {routingEnabled ? (
                      <button
                        onClick={() => {
                          setRoutingEnabled(false);
                          setPickingMode('NONE');
                        }}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 cursor-pointer"
                      >
                        EXIT ROUTING
                      </button>
                    ) : (
                      <button
                        onClick={() => setRoutingEnabled(true)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 cursor-pointer"
                      >
                        ENABLE ROUTING
                      </button>
                    )}
                  </div>

                  {!routingEnabled ? (
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 text-center space-y-2">
                      <div className="text-xs font-bold text-slate-300">
                        ROUTING MODE DISABLED
                      </div>
                      <p className="text-[11px] text-slate-400">
                        All route lines and waypoint markers are hidden for unobstructed terrain inspection.
                      </p>
                      <button
                        onClick={() => setRoutingEnabled(true)}
                        className="w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-mono text-xs font-bold uppercase cursor-pointer"
                      >
                        START NEW ROUTE
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Verified 1-Click Science Marswalks */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                          <span>1-CLICK SCIENCE MARSWALKS</span>
                          <span className="text-[9px] font-mono text-slate-400">NASA PRESETS</span>
                        </div>
                        <div className="space-y-1">
                          {PRESET_EVA_ROUTES.filter((r) => r.siteId === selectedSite.id).map((pr) => (
                            <button
                              key={pr.id}
                              onClick={() => applyPresetEvaRoute(pr)}
                              className="w-full text-left p-1.5 rounded-lg bg-[#0e1626] hover:bg-[#14233c] border border-slate-800 hover:border-cyan-400/60 transition-all flex flex-col gap-0.5 group cursor-pointer"
                              title={pr.description}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300">
                                  {pr.name}
                                </span>
                                <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {pr.scienceValueScore} SCI
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {pr.scienceTarget}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Outbound + Return Dual Path Legend & Toggle */}
                      <div className="bg-[#0e1626] border border-slate-800 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-semibold">
                            Round-Trip Survival Paths:
                          </span>
                          <button
                            onClick={() => setShowReturnLeg(!showReturnLeg)}
                            className={`font-mono text-[9px] px-1.5 py-0.5 rounded border cursor-pointer ${
                              showReturnLeg
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {showReturnLeg ? 'A→B & B→A: ON' : 'OUTBOUND ONLY'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="flex items-center gap-1.5 text-cyan-300">
                            <span className="w-3 h-1 bg-cyan-400 rounded" />
                            Outbound (A1 → B2)
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-300">
                            <span className="w-3 h-1 bg-amber-400 rounded" />
                            Return (B2 → A1)
                          </span>
                        </div>
                      </div>

                      {/* Export Mission Traverse Action Button */}
                      <div>
                        <button
                          onClick={() => setIsExportModalOpen(true)}
                          disabled={!activeRouteData}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-400/60 hover:border-cyan-400 text-cyan-200 font-mono text-[11px] font-bold uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:scale-[1.01] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                          title="Export mission traverse as GeoJSON, GPX 1.1, and NASA PDS4 XML"
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                          <span>EXPORT TRAVERSE (GPX / PDS4 XML)</span>
                        </button>
                      </div>

                      {/* ORIGIN: START (A1) */}
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                          <span>ORIGIN (A1)</span>
                          <span className="text-[9px] font-mono text-emerald-400">START POINT</span>
                        </div>
                        <button
                          onClick={() =>
                            setPickingMode(pickingMode === 'START' ? 'NONE' : 'START')
                          }
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                            pickingMode === 'START'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 animate-pulse'
                              : 'bg-[#111827]/90 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-100">
                              {pickingMode === 'START' ? 'CLICK GLOBE FOR START...' : 'ORIGIN A1'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {routeEndpoints.startLat.toFixed(3)}°N,{' '}
                              {routeEndpoints.startLon.toFixed(3)}°E
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 font-mono text-[10px] font-bold">
                            A1
                          </span>
                        </button>
                      </div>

                      {/* Swap A ↔ B button */}
                      <div className="flex justify-center -my-1">
                        <button
                          onClick={() => {
                            setRouteEndpoints((prev) => ({
                              startLat: prev.endLat,
                              startLon: prev.endLon,
                              endLat: prev.startLat,
                              endLon: prev.startLon,
                            }));
                          }}
                          className="px-3 py-0.5 rounded-full bg-slate-900 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/60 text-[9px] font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1 cursor-pointer"
                          title="Reverse route direction: swap Start and Destination"
                        >
                          <span>⇄</span>
                          <span>SWAP A ↔ B</span>
                        </button>
                      </div>

                      {/* DESTINATION (B2) */}
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                          <span>DESTINATION (B2)</span>
                          <span className="text-[9px] font-mono text-rose-400">TARGET</span>
                        </div>
                        <button
                          onClick={() => setPickingMode(pickingMode === 'END' ? 'NONE' : 'END')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                            pickingMode === 'END'
                              ? 'bg-rose-500/20 border-rose-400 text-rose-200 animate-pulse'
                              : 'bg-[#111827]/90 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-100">
                              {pickingMode === 'END' ? 'CLICK GLOBE FOR END...' : 'DESTINATION B2'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {routeEndpoints.endLat.toFixed(3)}°N,{' '}
                              {routeEndpoints.endLon.toFixed(3)}°E
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/60 text-rose-300 font-mono text-[10px] font-bold">
                            B2
                          </span>
                        </button>
                      </div>

                      {/* Seamless Routing Tip */}
                      <div className="bg-[#08101a] border border-cyan-900/60 rounded-lg p-2 text-[9px] font-mono text-cyan-300/90 leading-tight flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-cyan-200">Tip:</strong> Right-click anywhere on Mars to set Destination (B2), or Shift+Right-Click for Origin (A1).
                        </div>
                      </div>

                      {/* UNTRAVERSABLE WARNING OR STEP-BY-STEP ROUND-TRIP CARDS */}
                      {activeRouteData && !activeRouteData.isTraversable ? (
                        <div className="bg-rose-950/75 border-2 border-rose-500 rounded-xl p-3 space-y-2">
                          <div className="text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>ROUTE UNTRAVERSABLE</span>
                          </div>
                          <p className="text-[11px] text-rose-100/90 leading-relaxed">
                            {activeRouteData.failureReason}
                          </p>
                          <button
                            onClick={handleScanNearbySafeHaven}
                            className="w-full py-1.5 px-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-400 text-emerald-200 font-mono text-[10px] font-bold tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Target className="w-3.5 h-3.5 text-emerald-400" />
                            <span>AUTO-SCAN ACCESSIBLE HAVEN</span>
                          </button>
                          <div className="text-[9px] font-mono text-rose-300 pt-0.5">
                            Radial terrain solver finds nearest accessible slope &lt; 12° destination.
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-300">
                            Outbound (A→B) & Return (B→A) Legs
                          </div>
                          {activeRouteData?.segments.map((seg) => {
                            const isReturn = seg.leg === 'RETURN';
                            const borderCol = isReturn
                                ? 'border-l-4 border-l-amber-400 border-slate-700/80'
                              : 'border-l-4 border-l-cyan-400 border-slate-700/80';
                            const titleCol = isReturn ? 'text-amber-300' : 'text-cyan-300';

                            return (
                              <div
                                key={seg.id}
                                className={`bg-[#101726]/90 border ${borderCol} rounded-lg p-2 space-y-0.5`}
                              >
                                <div className={`text-[11px] font-bold font-mono ${titleCol}`}>
                                  {seg.title}
                                </div>
                                <div className="text-[10px] text-slate-200 font-mono">
                                  {seg.distKm} km • max slope {seg.maxSlopeDeg}° • friction{' '}
                                  {seg.frictionMu}μ
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            {/* Bottom of Left Sidebar: 360° Rover Panoramas & Expedition Hubs */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              {(selectedSite.id === 'jezero-delta' || selectedSite.id === 'mount-sharp-gale') && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TacticalOpticIcon className="w-3.5 h-3.5" accentColor="#22d3ee" />
                      <span>360° ROVER STREET VIEW</span>
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400">
                      {selectedSite.id === 'jezero-delta' ? 'M20 MASTCAM-Z' : 'MSL MASTCAM'}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {ROVER_PANORAMA_STATIONS.filter((st) => st.siteId === selectedSite.id).map(
                      (st) => {
                        const isActive = activeStreetViewStation?.id === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() => openRoverStreetView(st)}
                            title={`${st.code}: ${st.title} (Sol ${st.sol})`}
                            className={`py-1 px-1 rounded text-[9px] font-mono font-bold flex flex-col items-center justify-center border transition-all ${
                              isActive
                                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                                : 'bg-[#08101c] border-slate-800 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200'
                            }`}
                          >
                            <TacticalOpticIcon
                              className="w-3 h-3 mb-0.5"
                              accentColor={isActive ? '#22d3ee' : '#38bdf8'}
                            />
                            <span>{st.code.replace('CAM-', 'C')}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex justify-between">
                  <span>EXPEDITION HUBS (Z12)</span>
                  <span className="text-cyan-400 font-mono">{liveTelemetry.qualityTierLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {EXPEDITION_SITES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => flyToExpeditionSite(s)}
                      className={`px-2 py-1.5 rounded text-[10px] font-medium text-left truncate border transition-all ${
                        selectedSite.id === s.id
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50'
                          : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
          )}

          {/* =================================================================
              CENTER VIEWPORT (3D GLOBE OR 2D TACTICAL MAP)
             ================================================================= */}
          <main className="relative flex-1 h-full overflow-hidden">
            {/* 2D Planimetric Tactical GIS Map (Real NASA Mars Trek API Tiles) */}
            <div className={`w-full h-full ${viewMode === '2D' ? 'block' : 'hidden'}`}>
              <MarsTactical2DMap
                site={selectedSite}
                terrainField={terrainFieldRef.current}
                routeData={activeRouteData}
                routeEndpoints={routeEndpoints}
                routingEnabled={routingEnabled}
                showReturnLeg={showReturnLeg}
                traverseMode={traverseMode}
                pickingMode={pickingMode}
                onPickPoint={(lat, lon, isOrigin) => {
                  if (isOrigin !== undefined) {
                    if (isOrigin) {
                      setRouteEndpoints((prev) => ({ ...prev, startLat: lat, startLon: lon }));
                    } else {
                      setRouteEndpoints((prev) => ({ ...prev, endLat: lat, endLon: lon }));
                    }
                    setRoutingEnabled(true);
                  } else if (pickingMode === 'START') {
                    setRouteEndpoints((prev) => ({ ...prev, startLat: lat, startLon: lon }));
                    setPickingMode('NONE');
                  } else if (pickingMode === 'END') {
                    setRouteEndpoints((prev) => ({ ...prev, endLat: lat, endLon: lon }));
                    setPickingMode('NONE');
                  } else {
                    setRouteEndpoints((prev) => ({ ...prev, endLat: lat, endLon: lon }));
                  }
                }}
                walkbackIsochrone={walkbackIsochrone}
                showWalkbackIsochrone={showWalkbackIsochrone}
                speReport={speReport}
                isSpeAlertActive={isSpeAlertActive}
                rfCommsReport={rfCommsReport}
                showRfCommsGrid={showRfCommsGrid}
                showPanoMarkers={showPanoMarkers}
                panoStations={ROVER_PANORAMA_STATIONS}
                onSelectPanoStation={openRoverStreetView}
              />
            </div>

            {/* 3D Photorealistic Terrain Globe */}
            <div
              ref={containerRef}
              className={`w-full h-full ${viewMode === '3D' ? 'block' : 'hidden'} ${
                pickingMode !== 'NONE'
                  ? 'cursor-crosshair'
                  : 'cursor-grab active:cursor-grabbing'
              }`}
            />

            {/* Edge Tab Handle to Restore Left Panel when Collapsed */}
            {!leftPanelOpen && (
              <button
                onClick={() => setLeftPanelOpen(true)}
                className="absolute top-3 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#08101d]/90 backdrop-blur-md border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold shadow-xl transition-all cursor-pointer hover:scale-105"
                title="Open Route & Science Drawer"
              >
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>ROUTE PLANNER</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}

            {/* Edge Tab Handle to Restore Right Panel when Collapsed */}
            {!rightPanelOpen && (
              <button
                onClick={() => setRightPanelOpen(true)}
                className="absolute top-3 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#08101d]/90 backdrop-blur-md border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold shadow-xl transition-all cursor-pointer hover:scale-105"
                title="Open Astronaut EVA Telemetry Drawer"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>EVA TELEMETRY</span>
              </button>
            )}

            {/* Interactive Picking Mode Floating Banner */}
            {pickingMode !== 'NONE' && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#0a1424]/95 border-2 border-cyan-400 px-4 py-2 rounded-full shadow-[0_0_25px_rgba(0,240,255,0.4)] flex items-center gap-3 backdrop-blur-md animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-cyan-200 uppercase tracking-wide">
                  CLICK ON MARS TERRAIN TO SET {pickingMode === 'START' ? 'ORIGIN (A1)' : 'DESTINATION (B2)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  (Or right-click anywhere anytime)
                </span>
                <button
                  onClick={() => setPickingMode('NONE')}
                  className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 text-[10px] font-mono font-bold cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            )}

            {/* Minimalist Floating Route HUD Pill (Only when route is active - anchored at bottom to never collide with top menus!) */}
            {routingEnabled && activeRouteData && !isGlobalCommandView && (
              <div
                className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-[#08101e]/90 backdrop-blur-md border border-cyan-500/40 shadow-[0_4px_25px_rgba(0,0,0,0.8),0_0_15px_rgba(0,240,255,0.15)] text-[11px] sm:text-xs font-mono max-w-[95%] transition-opacity duration-200 ${
                  siteDropdownOpen || layerDropdownOpen || safetyDropdownOpen
                    ? 'opacity-20 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                {activeRouteData.isTraversable ? (
                  <>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-300 hidden sm:inline">ROUND-TRIP:</span>
                      <span className="text-cyan-300 font-bold">{activeRouteData.totalRoundTripKm} km</span>
                    </div>
                    <span className="text-slate-600">|</span>
                    <div className="text-slate-300 shrink-0">
                      TIME: <span className="text-slate-100 font-bold">{activeRouteData.estRoundTripTimeMin}m</span>
                    </div>
                    <span className="text-slate-600 hidden md:inline">|</span>
                    <div className="text-slate-300 hidden md:inline shrink-0">
                      SLOPE: <span className="text-emerald-300 font-bold">{activeRouteData.maxSlopeDeg}°</span>
                    </div>
                    <span className="text-slate-600 hidden lg:inline">|</span>
                    <div className="text-slate-300 hidden lg:inline shrink-0">
                      ENERGY: <span className="text-amber-300 font-bold">{activeRouteData.estEnergyWh} Wh</span>
                    </div>
                    <button
                      onClick={() => {
                        setRoutingEnabled(false);
                        setPickingMode('NONE');
                      }}
                      className="ml-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1"
                      title="Hide route lines"
                    >
                      <X className="w-3 h-3" />
                      <span>HIDE</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs truncate">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">ROUTE UNTRAVERSABLE: {activeRouteData.failureReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* 3D-Projected Expedition Hub Markers (Auto-hide when cursor is near them while viewing routes!) */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {projectedMarkers.map(({ site, x, y, visible }) => {
                if (!visible) return null;
                const nearMouse = isCursorNear(x, y, 125);
                const isSelected = selectedSite.id === site.id;
                return (
                  <div
                    key={site.id}
                    style={{
                      transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
                    }}
                    className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-full pb-2 transition-opacity duration-150 ${
                      nearMouse
                        ? 'opacity-0 pointer-events-none'
                        : 'opacity-100 pointer-events-auto'
                    }`}
                  >
                    <button
                      onClick={() => flyToExpeditionSite(site)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-md backdrop-blur-md border transition-all shadow-lg hover:scale-105 ${
                        isSelected
                          ? 'bg-[#081526]/95 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                          : 'bg-[#0b101b]/90 border-amber-500/60 text-slate-200 hover:border-cyan-400'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full animate-pulse"
                        style={{ backgroundColor: site.color }}
                      />
                      <span className="text-[11px] font-bold tracking-wider uppercase whitespace-nowrap">
                        {site.shortLabel}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 3D-Projected Subtle 360° Rover Panorama Optic Markers */}
            {showPanoMarkers && !isGlobalCommandView && !activeStreetViewStation && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {projectedPanoMarkers.map(({ station, x, y, visible }) => {
                  if (!visible) return null;
                  const nearMouseWhenRouting =
                    routingEnabled && isCursorNear(x, y, 75);
                  return (
                    <div
                      key={station.id}
                      style={{
                        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
                      }}
                      className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-full pb-1.5 transition-opacity duration-150 ${
                        nearMouseWhenRouting
                          ? 'opacity-15 pointer-events-none'
                          : 'opacity-95 pointer-events-auto'
                      }`}
                    >
                      <button
                        onClick={() => openRoverStreetView(station)}
                        title={`Enter 360° Rover Street View: ${station.title} (Sol ${station.sol})`}
                        className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#06101d]/90 hover:bg-[#091b30]/95 backdrop-blur-md border border-cyan-400/55 hover:border-cyan-300 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.22)] hover:shadow-[0_0_16px_rgba(0,240,255,0.45)] transition-all hover:scale-105"
                      >
                        <TacticalOpticIcon
                          className="w-3.5 h-3.5 shrink-0"
                          accentColor="#22d3ee"
                        />
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
                          {station.code}
                        </span>
                        <span className="text-[9px] font-mono text-amber-300/90 border-l border-slate-700 pl-1">
                          S{station.sol}
                        </span>
                        <span className="hidden group-hover:inline-block text-[9px] font-mono text-slate-200 pl-1 max-w-44 truncate">
                          • {station.title}
                        </span>
                      </button>
                      {/* Subtle vertical targeting stem to exact surface point */}
                      <div className="mx-auto w-[1px] h-2 bg-cyan-400/60" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3D-Projected Waypoints & Hazard Badges (Auto-hide when cursor approaches them!) */}
            {routingEnabled && !isGlobalCommandView && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {projectedRouteTags.map((tag) => {
                  if (!tag.visible) return null;
                  const nearMouse = isCursorNear(tag.x, tag.y, 110);

                  if (tag.kind === 'HAZARD') {
                    return (
                      <div
                        key={tag.id}
                        style={{
                          transform: `translate3d(${Math.round(tag.x)}px, ${Math.round(tag.y)}px, 0)`,
                        }}
                        className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-full pb-1 transition-opacity duration-150 ${
                          nearMouse ? 'opacity-0' : 'opacity-95'
                        }`}
                      >
                        <div className="bg-[#18120b]/90 border border-amber-500/80 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{tag.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tag.id}
                      style={{
                        transform: `translate3d(${Math.round(tag.x)}px, ${Math.round(tag.y)}px, 0)`,
                      }}
                      className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-150 ${
                        nearMouse ? 'opacity-15' : 'opacity-100'
                      }`}
                    >
                      <div
                        className="h-6 w-6 rounded-full bg-[#091322]/95 border-2 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-[0_0_10px_rgba(0,240,255,0.45)]"
                        style={{ borderColor: tag.color }}
                      >
                        {tag.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3D-Projected Interactive Science Targets */}
            {!isGlobalCommandView && !activeStreetViewStation && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {projectedScienceTargets.map(({ target, x, y, visible }) => {
                  if (!visible) return null;
                  const nearMouseWhenRouting = routingEnabled && isCursorNear(x, y, 65);
                  const isSelected = selectedScienceTarget?.id === target.id;
                  return (
                    <div
                      key={target.id}
                      style={{
                        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
                      }}
                      className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-full pb-1 transition-opacity duration-150 ${
                        nearMouseWhenRouting
                          ? 'opacity-20 pointer-events-none'
                          : 'opacity-95 pointer-events-auto'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedScienceTarget(target)}
                        title={`Inspect Science Target: ${target.name} (${target.crismMineralogy})`}
                        className={`group flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-md border text-slate-200 shadow-md transition-all hover:scale-105 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-900/90 border-purple-400 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                            : 'bg-[#0b0f1c]/90 hover:bg-[#141b33]/95 border-purple-500/50 hover:border-purple-400'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-[10px] font-mono font-bold tracking-wider text-purple-300">
                          {target.name}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 border-l border-slate-700 pl-1">
                          {target.scienceValueScore} SCI
                        </span>
                      </button>
                      <div className="mx-auto w-[1px] h-2 bg-purple-400/60" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Interactive Science Target HUD Card (3D Globe Mode) */}
            {selectedScienceTarget && viewMode === '3D' && (
              <div className="absolute top-16 left-6 z-30 w-84 bg-[#0a101d]/95 backdrop-blur-md border border-purple-500/60 rounded-xl p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 font-mono">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="truncate max-w-[200px]">{selectedScienceTarget.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedScienceTarget(null)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[10px] text-slate-300 leading-snug">
                  {selectedScienceTarget.recommendedMission}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-[#060a14] p-2 rounded-lg border border-purple-500/20">
                  <div className="col-span-2">
                    <span className="text-slate-400">CRISM MINERAL:</span>
                    <div className="text-purple-300 font-bold truncate">{selectedScienceTarget.crismMineralogy}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">PIXL XRF:</span>
                    <div className="text-amber-300 truncate">{selectedScienceTarget.pixlChemistry}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">SHERLOC RAMAN:</span>
                    <div className="text-cyan-300 truncate">{selectedScienceTarget.sherlocRaman}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRoutingEnabled(true);
                    setRouteEndpoints((prev) => ({
                      ...prev,
                      endLat: selectedScienceTarget.lat,
                      endLon: selectedScienceTarget.lon,
                    }));
                    setPickingMode('NONE');
                    setSelectedScienceTarget(null);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>PLAN MARSWALK HERE →</span>
                </button>
              </div>
            )}

            {/* Aerospace HUD Loading Overlay */}
            {isSceneLoading && (
              <div className="absolute inset-0 z-50 bg-[#060a12]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200 pointer-events-auto">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-cyan-200" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                    STREAMING NASA MARS DATA
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    16-Bit MOLA DTM • MRO CTX • CRISM SPECTRAL • SAFETY ENGINES
                  </div>
                </div>
              </div>
            )}

            {/* Interactive 360° Rover Street View Modal Overlay */}
            {activeStreetViewStation && (
              <MarsRoverStreetViewModal
                station={activeStreetViewStation}
                allStationsForSite={ROVER_PANORAMA_STATIONS.filter(
                  (st) => st.siteId === activeStreetViewStation.siteId
                )}
                onSelectStation={(st) => openRoverStreetView(st)}
                onClose={() => closeRoverStreetView()}
              />
            )}
          </main>

          {/* =================================================================
              RIGHT TACTICAL SIDEBAR
             ================================================================= */}
          {rightPanelOpen && (
            <aside className="w-72 bg-[#0b101b]/95 border-l border-slate-700/80 p-3 flex flex-col justify-between z-20 shrink-0 overflow-y-auto">
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-1 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-100 uppercase">
                      EVA TELEMETRY
                    </div>
                    <div className="text-[9px] text-cyan-300 uppercase font-mono flex items-center gap-1 font-bold">
                      <span>ASTRONAUT SADIA A. PUSPO</span>
                      <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-normal">BGD</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-mono text-[9px] font-bold">
                      {isSpeAlertActive ? (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Zap className="w-2.5 h-2.5 text-amber-400" /> SPE
                        </span>
                      ) : (
                        '● NOMINAL'
                      )}
                    </span>
                    <button
                      onClick={() => setRightPanelOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 text-xs font-mono transition-all cursor-pointer ml-1"
                      title="Collapse Panel (Clean Map View)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {/* Real-Time Mars Ephemeris & Sun Sync Control */}
              <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">
                    MARS TIME & SUN SYNC
                  </span>
                  <button
                    onClick={() => setSyncRealMarsTime(!syncRealMarsTime)}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer ${
                      syncRealMarsTime
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    }`}
                  >
                    {syncRealMarsTime ? 'LIVE MARS NOW' : 'MANUAL SUN'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                  <div>MSD: {marsEphemeris.msd.toFixed(2)}</div>
                  <div className="text-right text-cyan-300">{marsEphemeris.mtcStr}</div>
                  <div>Perseverance: Sol {marsEphemeris.perseveranceSol}</div>
                  <div className="text-right">Curiosity: Sol {marsEphemeris.curiositySol}</div>
                </div>

                {!syncRealMarsTime && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Manual Sun Lon:</span>
                      <span className="font-mono text-amber-300">{sunAzimuth}° E</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={sunAzimuth}
                      onChange={(e) => setSunAzimuth(parseInt(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Astronaut Bio-Metabolic Status (Santee-Pandolf Spacesuit Model) */}
              <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase">
                  <span>EVA BIOMETRICS (0.38g)</span>
                  <span className="text-cyan-400 font-mono">PLSS SUIT</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-[#090e18] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-400 text-[9px]">O₂ SATURATION</div>
                    <div className="text-base font-bold text-emerald-300">{liveTelemetry.o2SatPct}%</div>
                    <div className="text-[8px] text-slate-500">SpO₂ Nominal</div>
                  </div>
                  <div className="bg-[#090e18] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-400 text-[9px]">HEART RATE</div>
                    <div className="text-base font-bold text-cyan-300">{liveTelemetry.heartRateBpm} <span className="text-[9px] text-slate-400">bpm</span></div>
                    <div className="text-[8px] text-slate-500">Slope: {liveTelemetry.slopeDeg}°</div>
                  </div>
                  <div className="bg-[#090e18] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-400 text-[9px]">METABOLIC POWER</div>
                    <div className="text-base font-bold text-amber-300">{liveTelemetry.metabolicWatts} <span className="text-[9px] text-slate-400">W</span></div>
                    <div className="text-[8px] text-slate-500">Santee-Pandolf</div>
                  </div>
                  <div className="bg-[#090e18] p-2 rounded border border-slate-800/80">
                    <div className="text-slate-400 text-[9px]">SUIT PRESSURE</div>
                    <div className="text-base font-bold text-sky-300">29.65 <span className="text-[9px] text-slate-400">kPa</span></div>
                    <div className="text-[8px] text-slate-500">4.3 psi Pure O₂</div>
                  </div>
                </div>
              </div>

              {/* ALGORITHM 1: PLSS TRI-EXPENDABLES (FEEDWATER, O2, LiOH, BATTERY) */}
              <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-cyan-300 uppercase border-b border-slate-800 pb-1">
                  <span>PLSS TRI-EXPENDABLES</span>
                  <span className="text-[9px] font-mono text-amber-400">RULE OF HALF</span>
                </div>

                {/* Sublimator Cooling Water */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">FEEDWATER (H₂O):</span>
                    <span className="text-cyan-300 font-bold">
                      {liveTelemetry.waterReservePct}% ({liveTelemetry.waterBurnGph} g/h)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded"
                      style={{ width: `${liveTelemetry.waterReservePct}%` }}
                    />
                  </div>
                </div>

                {/* Primary O2 Tanks */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">PRIMARY O₂ (25 MPa):</span>
                    <span className="text-emerald-300 font-bold">{liveTelemetry.o2ReservePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded"
                      style={{ width: `${liveTelemetry.o2ReservePct}%` }}
                    />
                  </div>
                </div>

                {/* LiOH CO2 Scrubber */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">LiOH CO₂ SCRUBBER:</span>
                    <span className="text-amber-300 font-bold">{liveTelemetry.liohReservePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded"
                      style={{ width: `${liveTelemetry.liohReservePct}%` }}
                    />
                  </div>
                </div>

                {/* Suit Pressure & Compliance Badge */}
                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                  <span className="text-slate-400">SUIT PRES: 29.65 kPa (4.3 psi)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      activeRouteData?.ruleOfHalfCompliant ?? true
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    }`}
                  >
                    {activeRouteData?.ruleOfHalfCompliant ?? true ? '50% RESERVE OK' : 'LIMIT EXCEEDED'}
                  </span>
                </div>
              </div>

              {/* FR-07: RAD-HAVEN ACTIVE HAVEN CARD */}
              {isSpeAlertActive && speReport && (
                <div className="bg-rose-950/80 border-2 border-rose-500 rounded-xl p-2.5 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[10px] font-bold text-rose-300 uppercase">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>SPE RADIATION HAVEN</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px]">
                      EVAC ACTIVE
                    </span>
                  </div>
                  {speReport.bestHaven ? (
                    <div className="space-y-1 text-[10px] font-mono">
                      <div className="text-rose-100 font-bold">
                        SHELTER: {speReport.bestHaven.name}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-rose-200">
                        <div>DIST: {speReport.bestHaven.distKm} km</div>
                        <div>ETA: {speReport.bestHaven.evacTimeMin} min</div>
                        <div>RELIEF: {speReport.bestHaven.reliefM}m CLIFF</div>
                        <div>SHIELD: {Math.round(speReport.bestHaven.shieldingFraction * 100)}%</div>
                      </div>
                      <p className="text-[9px] text-rose-300/90 leading-tight pt-0.5">
                        {speReport.tacticalInstruction}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-rose-200 leading-tight">
                      No cliff alcove within 30-min radius. Descend into local depression.
                    </p>
                  )}
                </div>
              )}

              {/* FR-09: RF COMMS BLACKOUT & LINE-OF-SIGHT CARD */}
              {showRfCommsGrid && rfCommsReport && (
                <div className="bg-[#0a1526] border border-cyan-500/70 rounded-xl p-2.5 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300 uppercase">
                    <span>RF COMMS & RELAY LINK</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                        rfCommsReport.isBlackout
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                      }`}
                    >
                      {rfCommsReport.isBlackout ? 'BLACKOUT' : 'LINK NOMINAL'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">EARTH DTE (DSN):</span>
                      <span
                        className={`font-bold ${
                          !rfCommsReport.earthDte.isMaskedByTerrain ? 'text-cyan-300' : 'text-rose-400'
                        }`}
                      >
                        {!rfCommsReport.earthDte.isMaskedByTerrain ? 'DIRECT LOS' : 'MASKED BY TERRAIN'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>LATENCY: {rfCommsReport.earthDte.oneWayLatencyMin}m (ONE-WAY)</span>
                      <span>ELEV: {rfCommsReport.earthDte.elevationDeg}°</span>
                    </div>
                    <div className="pt-1 border-t border-slate-800 flex justify-between text-[9px]">
                      <span>MRO (310km): {rfCommsReport.mro.isInView ? `${rfCommsReport.mro.signalStrengthPct}%` : 'HORIZON'}</span>
                      <span>ODY (400km): {rfCommsReport.odyssey.isInView ? `${rfCommsReport.odyssey.signalStrengthPct}%` : 'HORIZON'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Round-Trip Elevation Profile Chart */}
              {routingEnabled && activeRouteData && activeRouteData.isTraversable && (() => {
                const activeProfileSample =
                  simulatedProfileIndex !== null && activeRouteData.profile[simulatedProfileIndex]
                    ? activeRouteData.profile[simulatedProfileIndex]
                    : null;
                const currentEffSlope = activeProfileSample
                  ? activeProfileSample.slopeDeg
                  : liveTelemetry.slopeDeg;
                const currentEffHeartRate = Math.min(
                  155,
                  Math.round(72 + Math.max(0, currentEffSlope) * 3.8)
                );

                return (
                  <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase">
                      <span>ROUND-TRIP ELEVATION (A→B→A)</span>
                      <span className="font-mono text-amber-400">
                        Δ{' '}
                        {Math.round(
                          Math.max(...activeRouteData.profile.map((p) => p.elevM)) -
                            Math.min(...activeRouteData.profile.map((p) => p.elevM))
                        )}{' '}
                        m
                      </span>
                    </div>
                    <svg
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const idx = Math.round(ratio * (activeRouteData.profile.length - 1));
                        setSimulatedProfileIndex(idx);
                      }}
                      onMouseLeave={() => {
                        if (!isWalkSimRunning) setSimulatedProfileIndex(null);
                      }}
                      className="w-full h-14 bg-[#080d17] rounded border border-slate-800/80 cursor-crosshair"
                      viewBox="0 0 160 50"
                    >
                      {(() => {
                        const prof = activeRouteData.profile;
                        if (prof.length < 2) return null;
                        const minE = Math.min(...prof.map((p) => p.elevM));
                        const maxE = Math.max(minE + 10, ...prof.map((p) => p.elevM));
                        const pts = prof
                          .map((p, idx) => {
                            const x = (idx / (prof.length - 1)) * 160;
                            const y = 44 - ((p.elevM - minE) / (maxE - minE)) * 36;
                            return `${x.toFixed(1)},${y.toFixed(1)}`;
                          })
                          .join(' ');

                        const scrubX =
                          simulatedProfileIndex !== null
                            ? (simulatedProfileIndex / (prof.length - 1)) * 160
                            : null;
                        const scrubY =
                          simulatedProfileIndex !== null && prof[simulatedProfileIndex]
                            ? 44 - ((prof[simulatedProfileIndex].elevM - minE) / (maxE - minE)) * 36
                            : null;

                        return (
                          <>
                            <polygon
                              points={`0,50 ${pts} 160,50`}
                              fill="rgba(245, 158, 11, 0.22)"
                            />
                            <polyline
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="2"
                              points={pts}
                            />
                            {/* Midpoint divider line at B2 turnaround */}
                            <line
                              x1="80"
                              y1="0"
                              x2="80"
                              y2="50"
                              stroke="#00f0ff"
                              strokeDasharray="2,2"
                              strokeWidth="1"
                            />
                            {/* Scrub / Walk simulation indicator */}
                            {scrubX !== null && scrubY !== null && (
                              <>
                                <line
                                  x1={scrubX}
                                  y1="0"
                                  x2={scrubX}
                                  y2="50"
                                  stroke="#00f0ff"
                                  strokeWidth="1.5"
                                />
                                <circle
                                  cx={scrubX}
                                  cy={scrubY}
                                  r="3.5"
                                  fill="#00f0ff"
                                  stroke="#0b101b"
                                  strokeWidth="1"
                                />
                              </>
                            )}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Active Scrub Telemetry Readout */}
                    {activeProfileSample && (
                      <div className="flex justify-between items-center text-[9px] font-mono text-cyan-300 pt-0.5 border-t border-slate-800">
                        <span>DIST: {activeProfileSample.distKm.toFixed(2)} km</span>
                        <span>SLOPE: {activeProfileSample.slopeDeg.toFixed(1)}°</span>
                        <span className="text-amber-300 font-bold">{currentEffHeartRate} BPM</span>
                      </div>
                    )}

                    {/* 0.38g Walk Simulator Button */}
                    <button
                      onClick={() => setIsWalkSimRunning(!isWalkSimRunning)}
                      className={`w-full py-1 px-2 rounded-lg font-mono text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isWalkSimRunning
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-400 animate-pulse'
                          : 'bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700 text-slate-300 hover:text-cyan-200'
                      }`}
                    >
                      <Activity className="w-3 h-3 text-cyan-400" />
                      <span>{isWalkSimRunning ? 'PAUSE WALK SIMULATOR' : 'START 0.38g WALK SIMULATOR'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* Heart Rate / Speed + Radiation Dose */}
              <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">
                      {traverseMode === 'ROVER_AUTOPILOT' ? 'TRAVERSE SPEED' : 'HEART RATE'}
                    </div>
                    <div className="text-lg font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <span>
                        {traverseMode === 'ROVER_AUTOPILOT'
                          ? `${liveTelemetry.speedKmh} km/h`
                          : `${
                              simulatedProfileIndex !== null && activeRouteData?.profile[simulatedProfileIndex]
                                ? Math.min(155, Math.round(72 + Math.max(0, activeRouteData.profile[simulatedProfileIndex].slopeDeg) * 3.8))
                                : liveTelemetry.heartRateBpm
                            } BPM`}
                      </span>
                    </div>
                  </div>
                  <svg className="w-24 h-9" viewBox="0 0 100 36">
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      points="0,18 20,18 26,8 32,29 38,4 44,32 50,14 56,22 64,18 100,18"
                    />
                  </svg>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase font-bold">
                      {traverseMode === 'ROVER_AUTOPILOT' ? 'ROVER POWER' : 'RADIATION DOSE'}
                    </span>
                    <span className="font-mono text-amber-300 font-bold">
                      {traverseMode === 'ROVER_AUTOPILOT'
                        ? '88%'
                        : `${liveTelemetry.radiationMsvH} mSv/h`}
                    </span>
                  </div>
                  <div className="grid grid-cols-16 gap-0.5 mt-1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-xs ${
                          i < 10 ? 'bg-amber-400' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Environment Telemetry */}
              <div className="bg-[#0e1525] border border-slate-800 rounded-xl p-2.5 space-y-1 text-[11px] font-mono">
                <div className="text-[10px] font-sans font-bold text-slate-300 uppercase mb-1">
                  ENVIRONMENT
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EXTERNAL TEMP</span>
                  <span className="text-slate-100 font-bold">
                    {liveTelemetry.externalTempC}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ATMOS. PRES</span>
                  <span className="text-slate-100 font-bold">
                    {liveTelemetry.atmosPresPa} Pa
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SURFACE FRICTION</span>
                  <span className="text-cyan-300 font-bold">{liveTelemetry.frictionMu} μ</span>
                </div>
              </div>
            </div>
          </aside>
          )}
        </div>

        {/* ===================================================================
            BOTTOM COCKPIT STATUS BAR
           =================================================================== */}
        <footer className="h-8 bg-[#0b101b]/95 border-t border-slate-700/80 px-4 flex items-center justify-between text-[11px] font-mono z-20 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              STATUS:{' '}
              <strong
                className={
                  routingEnabled && activeRouteData && !activeRouteData.isTraversable
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }
              >
                {routingEnabled && activeRouteData && !activeRouteData.isTraversable
                  ? 'ROUTE BLOCKED (HAZARD)'
                  : streamingCount > 0
                  ? `STREAMING (${streamingCount})`
                  : 'NOMINAL'}
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              RADAR:{' '}
              <strong className="text-cyan-300">
                {layerMode === 'slope_radar' ? 'SLOPE-ACTIVE' : 'ACTIVE'}
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              MARS EPHEMERIS:{' '}
              <strong className="text-emerald-400">
                {syncRealMarsTime ? 'REAL-TIME SYNC' : 'MANUAL SUN'}
              </strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400">
            <span>
              COORDS:{' '}
              <strong className="text-cyan-300">
                {liveTelemetry.lat >= 0
                  ? `${liveTelemetry.lat.toFixed(2)}°N`
                  : `${Math.abs(liveTelemetry.lat).toFixed(2)}°S`}{' '}
                {liveTelemetry.lon.toFixed(2)}°E
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              ELEV:{' '}
              <strong className="text-emerald-300">
                {Math.round(liveTelemetry.elevM)} m
              </strong>
            </span>
          </div>
        </footer>

        {/* Option C: Real-Time Solar Glare Hazard Warning */}
        {solarGlareHazard.isHazard && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-400 text-amber-200 text-xs font-mono font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse pointer-events-none">
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              SOLAR GLARE HAZARD: Low-angle sun at {solarGlareHazard.sunElevationDeg}° elev (az {solarGlareHazard.sunAzimuthDeg}°). Gold electrochromic filter active.
            </span>
          </div>
        )}

        {/* Option B: First-Person Astronaut Visor HUD Mode */}
        {isVisorMode && (
          <VisorHudOverlay
            telemetry={{
              lat: liveTelemetry.lat,
              lon: liveTelemetry.lon,
              elevM: liveTelemetry.elevM,
              altitudeKm: liveTelemetry.altitudeKm,
              pitchDeg: liveTelemetry.pitchDeg,
              rollDeg: liveTelemetry.rollDeg,
              slopeDeg: liveTelemetry.slopeDeg,
              headingDeg: liveTelemetry.headingDeg,
              compassDir: liveTelemetry.compassDir,
              frictionMu: liveTelemetry.frictionMu,
              tractionPct: liveTelemetry.tractionPct,
              slipRiskPct: liveTelemetry.slipRiskPct,
              speedKmh: liveTelemetry.speedKmh,
              wheelTorques: [120, 120, 115, 115, 118, 118],
              o2SatPct: liveTelemetry.o2SatPct,
              suitPressureKpa: liveTelemetry.suitPressureKpa,
              heartRateBpm: liveTelemetry.heartRateBpm,
              radiationMsvH: liveTelemetry.radiationMsvH,
              externalTempC: liveTelemetry.externalTempC,
              atmosPresPa: liveTelemetry.atmosPresPa,
              qualityTierLabel: 'HiRISE 1m Stereo DTM',
              metabolicWatts: liveTelemetry.metabolicWatts,
              waterBurnGph: liveTelemetry.waterBurnGph,
              waterReservePct: Math.round(activeRouteData?.waterReserveMarginPct ?? 88),
              o2ReservePct: 98,
              liohReservePct: 92,
              batteryReservePct: 84,
            }}
            ephemeris={marsEphemeris}
            speReport={speReport}
            rfCommsReport={rfCommsReport}
            traverseMode={traverseMode}
            destinationName={activeRouteData?.waypoints.find((w) => w.id === 'B2')?.label || 'Target Scarp'}
            distToDestKm={activeRouteData?.outboundDistKm || 4.5}
            bearingToDestDeg={312}
            onClose={toggleVisorMode}
            onToggleSpe={handleToggleSpeAlert}
          />
        )}

        {/* Option A: NASA Mission Traverse Export Modal */}
        <TraverseExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          routeData={activeRouteData}
          astronautName="Sadia A. Puspo"
          siteName={selectedSite.name}
        />

        {/* Text AI Copilot for Astronaut Sadia A. Puspo */}
        <AresTacticalAiCopilot
          isOpen={isAiCopilotOpen}
          onClose={() => setIsAiCopilotOpen(false)}
          astronautName="Sadia A. Puspo"
          routeData={activeRouteData}
          currentSite={selectedSite.name}
          currentViewMode={viewMode}
          currentLayerMode={layerMode}
          traverseMode={traverseMode}
          onExecuteCommand={handleCopilotCommand}
        />

        {/* Floating Quick AI Copilot Launcher Button */}
        {!isAiCopilotOpen && (
          <button
            onClick={() => setIsAiCopilotOpen(true)}
            className="fixed bottom-11 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0a1a30]/95 to-[#0e2444]/95 hover:from-cyan-900/90 hover:to-blue-900/90 border border-cyan-400/70 text-cyan-200 font-mono text-xs font-bold shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all cursor-pointer hover:scale-105 group"
            title="Open ARES AI Tactical Copilot (Assisting Astronaut Sadia A. Puspo)"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <Bot className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="tracking-wider">AI COPILOT</span>
          </button>
        )}

        {/* Sleek Loading Overlay when switching layers/maps */}
        {isMapSwitching && (
          <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-[#020612]/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#06101e]/90 border border-cyan-500/60 shadow-[0_0_50px_rgba(0,240,255,0.3)]">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
                <div className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin" />
                <Crosshair className="w-5 h-5 text-cyan-400 absolute" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-mono font-bold text-cyan-300 tracking-wider uppercase">
                  {mapLoadingText || 'SYNCHRONIZING ORBITAL SENSORS...'}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  MRO • MARS TREK WMS • HiRISE 1m STEREO PIPELINE
                </div>
              </div>
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {initialLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#03050a]/90 backdrop-blur-md">
            <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold tracking-widest text-slate-200 uppercase">
              INITIALIZING ARES-NAVIGATOR TACTICAL COMMAND...
            </p>
            <p className="text-xs text-cyan-400 mt-1 font-mono">
              Syncing Real-Time Mars Ephemeris & Seamless Bicubic DEM...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
