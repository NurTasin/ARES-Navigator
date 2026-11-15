'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Shield,
  Zap,
  Radio,
  Clock,
  Camera,
  Target,
  AlertTriangle,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ExpeditionSite,
  ComputedRoundTripRoute,
  TraverseMode,
  PickingPointMode,
  UnifiedMarsTerrainField,
} from '../MarsGlobeViewer';
import type { RoverPanoramaStation } from '../MarsRoverStreetViewModal';
import type { WalkbackIsochroneBoundary } from '../algorithms/bioTerramechanics';
import type { SpeHavenReport } from '../algorithms/radHavenSpe';
import type { RfCommsReport } from '../algorithms/rfComms';
import { MARS_LANDMARKS } from '../data/marsLandmarks';

export type MarsTrekLayerId =
  | 'ctx_optical'
  | 'themis_thermal'
  | 'mola_color_shade'
  | 'mola_shade'
  | 'viking_color'
  | 'geology';

export interface ScienceTargetPOI {
  id: string;
  name: string;
  siteId: string;
  lat: number;
  lon: number;
  elevM: number;
  category: 'FLUVIAL_DELTA' | 'BOXWORK_RIDGE' | 'ICE_EXTRACTION' | 'CANYON_STRATA';
  crismMineralogy: string;
  pixlChemistry: string;
  sherlocRaman: string;
  scienceValueScore: number;
  recommendedMission: string;
}

export const SCIENCE_TARGETS_DATABASE: ScienceTargetPOI[] = [
  // Jezero Crater (Perseverance & Artemis Marswalk Hub)
  {
    id: 'jez-neretva-delta',
    name: 'Neretva Delta Front Scarp',
    siteId: 'jezero-delta',
    lat: 18.455,
    lon: 77.412,
    elevM: -2540,
    category: 'FLUVIAL_DELTA',
    crismMineralogy: 'Mg/Fe-Smectite Clays & Fe/Mg-Carbonates',
    pixlChemistry: 'SiO₂ 51.4% • FeO 16.8% • Al₂O₃ 9.2% • CaO 7.5%',
    sherlocRaman: 'Polycyclic Aromatic Hydrocarbons (PAH Biosignatures)',
    scienceValueScore: 98,
    recommendedMission: 'Primary Marswalk EVA sampling ancient river delta bottomsets',
  },
  {
    id: 'jez-three-forks',
    name: 'Three Forks Sample Depot',
    siteId: 'jezero-delta',
    lat: 18.4492,
    lon: 77.4318,
    elevM: -2575,
    category: 'FLUVIAL_DELTA',
    crismMineralogy: 'Fluvial Sandstones with Silica-Carbonate Matrix',
    pixlChemistry: 'SiO₂ 58.0% • FeO 14.1% • MgO 6.8%',
    sherlocRaman: 'Titanium Hermetic Tube Seals Verified Intact',
    scienceValueScore: 99,
    recommendedMission: 'Inspect MSR titanium sample tubes for Mars Sample Return',
  },
  {
    id: 'jez-kodiak-butte',
    name: 'Kodiak Delta Remnant Butte',
    siteId: 'jezero-delta',
    lat: 18.418,
    lon: 77.462,
    elevM: -2490,
    category: 'FLUVIAL_DELTA',
    crismMineralogy: 'Layered Diagenetic Carbonates & Olivine Sand',
    pixlChemistry: 'SiO₂ 46.2% • MgO 18.5% • FeO 19.3%',
    sherlocRaman: 'Hydrothermally altered olivine biosignatures',
    scienceValueScore: 94,
    recommendedMission: 'Climb southern bench to date delta regression cycle',
  },
  {
    id: 'jez-belva-crater',
    name: 'Belva Impact Crater Rim',
    siteId: 'jezero-delta',
    lat: 18.482,
    lon: 77.385,
    elevM: -2380,
    category: 'FLUVIAL_DELTA',
    crismMineralogy: 'Impact Melt Breccia & Deep Noachian Basement',
    pixlChemistry: 'SiO₂ 48.7% • FeO 21.0% • Al₂O₃ 11.4%',
    sherlocRaman: 'Shocked feldspar minerals & deep regolith crust',
    scienceValueScore: 91,
    recommendedMission: 'Sample uplifted ancient basement rocks ejected by meteor impact',
  },

  // Mount Sharp (Gale Crater - Curiosity 2025 Science Objective)
  {
    id: 'gale-boxwork-alpha',
    name: '2025 Boxwork Formations (Primary)',
    siteId: 'mount-sharp-gale',
    lat: -4.712,
    lon: 137.382,
    elevM: -4210,
    category: 'BOXWORK_RIDGE',
    crismMineralogy: 'Polyhydrated Sulfates & Fracture-Fill Carbonates',
    pixlChemistry: 'SiO₂ 55.8% • SO₃ 22.4% • CaO 11.2%',
    sherlocRaman: 'Subsurface ancient groundwater circulation conduits',
    scienceValueScore: 99,
    recommendedMission: 'Featured NASA Challenge Science Target: Study bedrock fracture veins',
  },
  {
    id: 'gale-gator-back',
    name: 'Gator-Back Sandstone Pediment',
    siteId: 'mount-sharp-gale',
    lat: -4.685,
    lon: 137.408,
    elevM: -4350,
    category: 'BOXWORK_RIDGE',
    crismMineralogy: 'Cross-bedded Eolian Sandstones & Crystalline Hematite',
    pixlChemistry: 'SiO₂ 62.4% • FeO 18.9% • Al₂O₃ 7.1%',
    sherlocRaman: 'Aqueous pore-water cementation mineral fronts',
    scienceValueScore: 92,
    recommendedMission: 'Traverse low-incline plain to avoid tire/suit wheel damage',
  },

  // Arcadia Planitia (ISRU Subsurface Ice Basecamp)
  {
    id: 'arc-ice-sheet-1',
    name: 'Shallow Subsurface Ice Scarp Alpha',
    siteId: 'arcadia-planitia',
    lat: 46.28,
    lon: -171.15,
    elevM: -4120,
    category: 'ICE_EXTRACTION',
    crismMineralogy: 'Pure H₂O Ice Matrix under 1.2m Regolith Overburden',
    pixlChemistry: 'Subsurface SHARAD Dielectric ε = 3.15 (98% Pure Water Ice)',
    sherlocRaman: 'Cryogenic volatile clathrates & preservation potential',
    scienceValueScore: 97,
    recommendedMission: 'Primary In-Situ Resource Utilization (ISRU) water mining outpost',
  },

  // Melas Chasma (Valles Marineris)
  {
    id: 'melas-layered-strata',
    name: 'Interior Layered Sulfate Mound',
    siteId: 'melas-chasma',
    lat: -10.68,
    lon: -68.12,
    elevM: -4890,
    category: 'CANYON_STRATA',
    crismMineralogy: 'Monohydrated & Polyhydrated Magnesium Sulfates (Kieserite)',
    pixlChemistry: 'SO₃ 31.2% • MgO 19.8% • SiO₂ 38.4%',
    sherlocRaman: 'Late Hesperian evaporitic lacustrine deposits',
    scienceValueScore: 95,
    recommendedMission: 'Investigate canyon floor evaporite beds in high-pressure atmosphere',
  },
];

interface MarsTactical2DMapProps {
  site: ExpeditionSite;
  terrainField: UnifiedMarsTerrainField | null;
  routeData: ComputedRoundTripRoute | null;
  routeEndpoints: { startLat: number; startLon: number; endLat: number; endLon: number };
  routingEnabled: boolean;
  showReturnLeg: boolean;
  traverseMode: TraverseMode;
  pickingMode: PickingPointMode;
  onPickPoint: (lat: number, lon: number, isOrigin?: boolean) => void;
  walkbackIsochrone: WalkbackIsochroneBoundary | null;
  showWalkbackIsochrone: boolean;
  speReport: SpeHavenReport | null;
  isSpeAlertActive: boolean;
  rfCommsReport: RfCommsReport | null;
  showRfCommsGrid: boolean;
  showPanoMarkers: boolean;
  panoStations: RoverPanoramaStation[];
  onSelectPanoStation: (station: RoverPanoramaStation) => void;
  highDetailMode?: boolean;
  routeLineWidthScale?: number;
  renderScale?: number;
  maxZoomCap?: number;
  showWaypointLegends?: boolean;
  showScienceLegends?: boolean;
  showHubLegends?: boolean;
  showGraticuleAndScale?: boolean;
}

// Preloaded local 0ms base mosaics for continuous, gap-free fallback rendering
let baseShadeWestImg: HTMLImageElement | null = null;
let baseShadeEastImg: HTMLImageElement | null = null;
let baseVikingWestImg: HTMLImageElement | null = null;
let baseVikingEastImg: HTMLImageElement | null = null;

if (typeof window !== 'undefined') {
  baseShadeWestImg = new Image();
  baseShadeWestImg.src = '/tiles/base/shade_west.jpg';
  baseShadeEastImg = new Image();
  baseShadeEastImg.src = '/tiles/base/shade_east.jpg';
  baseVikingWestImg = new Image();
  baseVikingWestImg.src = '/tiles/base/viking_west.jpg';
  baseVikingEastImg = new Image();
  baseVikingEastImg.src = '/tiles/base/viking_east.jpg';
}

// In-memory tile cache to avoid refetching identical NASA WMTS tiles
const tileCache = new Map<string, HTMLImageElement>();
const pendingTileFetches = new Set<string>();
const failedTileUrls = new Set<string>();

function getOrLoadTile(url: string, onLoaded: () => void): HTMLImageElement | null {
  const cached = tileCache.get(url);
  if (cached) return cached;
  if (failedTileUrls.has(url)) return null;
  if (pendingTileFetches.has(url)) return null;

  pendingTileFetches.add(url);

  // Local base aliases for instant 0ms first-paint of root/z1 tiles
  let targetUrl = url;
  if (url.includes('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/0/0/0.jpg')) {
    targetUrl = '/tiles/base/shade_west.jpg';
  } else if (url.includes('Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/0/0/1.jpg')) {
    targetUrl = '/tiles/base/shade_east.jpg';
  } else if (url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/0.jpg')) {
    targetUrl = '/tiles/base/viking_west.jpg';
  } else if (url.includes('Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/1.jpg')) {
    targetUrl = '/tiles/base/viking_east.jpg';
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    tileCache.set(url, img);
    pendingTileFetches.delete(url);
    onLoaded();
  };
  img.onerror = () => {
    pendingTileFetches.delete(url);
    failedTileUrls.add(url);
    // Allow retry after 2.5s in case of temporary network congestion
    setTimeout(() => failedTileUrls.delete(url), 2500);
  };
  img.src = targetUrl;
  return null;
}

export function MarsTactical2DMap({
  site,
  terrainField,
  routeData,
  routeEndpoints,
  routingEnabled,
  showReturnLeg,
  traverseMode,
  pickingMode,
  onPickPoint,
  walkbackIsochrone,
  showWalkbackIsochrone,
  speReport,
  isSpeAlertActive,
  rfCommsReport,
  showRfCommsGrid,
  showPanoMarkers,
  panoStations,
  onSelectPanoStation,
  highDetailMode = true,
  routeLineWidthScale = 1.2,
  renderScale = 1.0,
  maxZoomCap = 11,
  showWaypointLegends = true,
  showScienceLegends = true,
  showHubLegends = true,
  showGraticuleAndScale = true,
}: MarsTactical2DMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Real NASA Mars Trek Layer
  const [activeLayer, setActiveLayer] = useState<MarsTrekLayerId>('ctx_optical');

  // Selected Science Target for on-map HUD card inspection
  const [selectedScienceTarget, setSelectedScienceTarget] = useState<ScienceTargetPOI | null>(null);

  // Map viewport transform (center lat/lon and scale: pixels per degree)
  const [viewCenter, setViewCenter] = useState<{ lat: number; lon: number }>({
    lat: site.lat,
    lon: site.lon,
  });
  const [zoomScale, setZoomScale] = useState<number>(2200);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorInfo, setCursorInfo] = useState<{
    lat: number;
    lon: number;
    elevM: number;
    slopeDeg: number;
    frictionMu: number;
    themisInertia: number;
    trafficability: string;
    screenX: number;
    screenY: number;
    visible: boolean;
  } | null>(null);

  // Sync center when expedition site changes
  useEffect(() => {
    setViewCenter({ lat: site.lat, lon: site.lon });
    const [lonMin, latMin, lonMax, latMax] = site.roiBbox;
    const dLat = Math.abs(latMax - latMin);
    const dLon = Math.abs(lonMax - lonMin);
    const maxSpan = Math.max(dLat, dLon, 0.4);
    if (containerRef.current) {
      const minDim = Math.min(containerRef.current.clientWidth, containerRef.current.clientHeight);
      setZoomScale(Math.max(1200, Math.min(5000, (minDim * 0.75) / maxSpan)));
    }
    setSelectedScienceTarget(null);
  }, [site]);

  // Equirectangular screen projection
  const projectToScreen = useCallback(
    (lat: number, lon: number, width: number, height: number) => {
      const cosLat = Math.cos((viewCenter.lat * Math.PI) / 180.0);
      const x = width * 0.5 + (lon - viewCenter.lon) * zoomScale * cosLat;
      const y = height * 0.5 - (lat - viewCenter.lat) * zoomScale;
      return { x, y };
    },
    [viewCenter, zoomScale]
  );

  const unprojectFromScreen = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const cosLat = Math.cos((viewCenter.lat * Math.PI) / 180.0);
      const lon = viewCenter.lon + (x - width * 0.5) / (zoomScale * cosLat);
      const lat = viewCenter.lat - (y - height * 0.5) / zoomScale;
      return { lat, lon };
    },
    [viewCenter, zoomScale]
  );

  // Build Continuous Global Foundation Tile URL
  const getGlobalBaseTileUrl = useCallback(
    (z: number, row: number, col: number): string => {
      if (activeLayer === 'mola_color_shade') {
        const mZ = Math.min(z, 8);
        const sShift = z - mZ;
        return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${mZ}/${row >> sShift}/${col >> sShift}.jpg`;
      }
      if (activeLayer === 'viking_color') {
        const vZ = Math.min(z, 7);
        const sShift = z - vZ;
        return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${vZ}/${row >> sShift}/${col >> sShift}.jpg`;
      }
      if (activeLayer === 'geology') {
        const gZ = Math.min(z, 6);
        const sShift = z - gZ;
        return `https://trek.nasa.gov/tiles/Mars/EQ/SIM3292_Global_Geology/1.0.0/default/default028mm/${gZ}/${row >> sShift}/${col >> sShift}.png`;
      }
      // Default: MOLA/HRSC Monochrome Shaded Relief
      const mZ = Math.min(z, 8);
      const sShift = z - mZ;
      return `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${mZ}/${row >> sShift}/${col >> sShift}.jpg`;
    },
    [activeLayer]
  );

  // Render 2D Canvas directly using real NASA Mars Trek tiles
  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(2.5, Math.max(0.5, (window.devicePixelRatio || 1) * renderScale));
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);

    // 1. Dark Base Background
    ctx.fillStyle = '#060a13';
    ctx.fillRect(0, 0, width, height);

    // 2. Compute Viewport Geographic Extent
    const cosLat = Math.cos((viewCenter.lat * Math.PI) / 180.0);
    const halfH = height / (2 * zoomScale);
    const halfW = width / (2 * zoomScale * cosLat);

    const minLat = Math.max(-85, viewCenter.lat - halfH);
    const maxLat = Math.min(85, viewCenter.lat + halfH);
    const minLon = Math.max(-180, viewCenter.lon - halfW);
    const maxLon = Math.min(180, viewCenter.lon + halfW);

    // 3. Determine Optimal WMTS Zoom Level z from pixel density (Retina High-Res up to z=11)
    const idealZ = Math.round(Math.log2((zoomScale * 180) / 256));
    const effectiveMaxZ = Math.min(maxZoomCap, highDetailMode ? 11 : 9);
    const targetZ = Math.max(0, Math.min(effectiveMaxZ, idealZ));

    // =========================================================================
    // 4. DUAL-PASS GIS TILE COMPOSITING (ZERO TILE REPETITION!)
    // =========================================================================
    // PASS 1: Render continuous global basemap at its natural maximum zoom level
    const baseMaxZ = activeLayer === 'mola_shade' || activeLayer === 'mola_color_shade' ? 8 : 7;
    const baseZ = Math.min(targetZ, baseMaxZ);

    const nRowsBase = Math.pow(2, baseZ);
    const nColsBase = Math.pow(2, baseZ + 1);
    const degPerRowBase = 180.0 / nRowsBase;
    const degPerColBase = 360.0 / nColsBase;

    const rMinBase = Math.max(0, Math.floor((90 - maxLat) / degPerRowBase));
    const rMaxBase = Math.min(nRowsBase - 1, Math.floor((90 - minLat) / degPerRowBase));
    const cMinBase = Math.max(0, Math.floor((minLon + 180) / degPerColBase));
    const cMaxBase = Math.min(nColsBase - 1, Math.floor((maxLon + 180) / degPerColBase));

    for (let rB = rMinBase; rB <= rMaxBase; rB++) {
      const tLatMax = 90 - rB * degPerRowBase;
      const tLatMin = 90 - (rB + 1) * degPerRowBase;

      for (let cB = cMinBase; cB <= cMaxBase; cB++) {
        const tLonMin = -180 + cB * degPerColBase;
        const tLonMax = -180 + (cB + 1) * degPerColBase;

        const pTopLeft = projectToScreen(tLatMax, tLonMin, width, height);
        const pBottomRight = projectToScreen(tLatMin, tLonMax, width, height);
        const tileW = pBottomRight.x - pTopLeft.x;
        const tileH = pBottomRight.y - pTopLeft.y;

        const baseTileUrl = getGlobalBaseTileUrl(baseZ, rB, cB);
        const baseImg = getOrLoadTile(baseTileUrl, () => renderMap());

        if (baseImg) {
          ctx.drawImage(baseImg, pTopLeft.x, pTopLeft.y, tileW + 0.5, tileH + 0.5);
        } else {
          // Continuous seamless terrain fallback using instant local 0ms base mosaic
          const isViking = activeLayer === 'viking_color';
          const localImg =
            tLonMin >= 0
              ? isViking ? baseVikingEastImg : baseShadeEastImg
              : isViking ? baseVikingWestImg : baseShadeWestImg;

          if (localImg && localImg.complete && localImg.naturalWidth > 0) {
            const minLonRel = tLonMin >= 0 ? tLonMin : tLonMin + 180;
            const maxLonRel = tLonMax >= 0 ? tLonMax : tLonMax + 180;
            const sx = (minLonRel / 180.0) * localImg.naturalWidth;
            const sy = ((90.0 - tLatMax) / 180.0) * localImg.naturalHeight;
            const sw = ((maxLonRel - minLonRel) / 180.0) * localImg.naturalWidth;
            const sh = ((tLatMax - tLatMin) / 180.0) * localImg.naturalHeight;
            ctx.drawImage(localImg, sx, sy, sw, sh, pTopLeft.x, pTopLeft.y, tileW + 0.5, tileH + 0.5);
          } else {
            ctx.fillStyle = '#1e140d';
            ctx.fillRect(pTopLeft.x, pTopLeft.y, tileW, tileH);
          }
        }

        // False-color thermophysical regolith overlay when THEMIS layer selected
        if (activeLayer === 'themis_thermal') {
          const midLat = (tLatMin + tLatMax) * 0.5;
          const midLon = (tLonMin + tLonMax) * 0.5;
          const sample = terrainField?.sampleMetricsAt(midLat, midLon, 0);
          const fMu = sample?.frictionMu ?? 0.65;
          if (fMu > 0.65) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
          } else if (fMu > 0.48) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          } else {
            ctx.fillStyle = 'rgba(129, 140, 248, 0.25)';
          }
          ctx.fillRect(pTopLeft.x, pTopLeft.y, tileW + 0.5, tileH + 0.5);
        }
      }
    }

    // PASS 2: If active layer is CTX/HiRISE, composite high-res mosaic over the basemap within swath
    if (activeLayer === 'ctx_optical' && site.ctxLayer && targetZ >= 6) {
      const ctxBounds = site.ctxBbox || site.roiBbox;
      const [cLonMin, cLatMin, cLonMax, cLatMax] = ctxBounds;

      const nRowsCtx = Math.pow(2, targetZ);
      const nColsCtx = Math.pow(2, targetZ + 1);
      const degPerRowCtx = 180.0 / nRowsCtx;
      const degPerColCtx = 360.0 / nColsCtx;

      const rMinCtx = Math.max(0, Math.floor((90 - maxLat) / degPerRowCtx));
      const rMaxCtx = Math.min(nRowsCtx - 1, Math.floor((90 - minLat) / degPerRowCtx));
      const cMinCtx = Math.max(0, Math.floor((minLon + 180) / degPerColCtx));
      const cMaxCtx = Math.min(nColsCtx - 1, Math.floor((maxLon + 180) / degPerColCtx));

      for (let r = rMinCtx; r <= rMaxCtx; r++) {
        const tLatMax = 90 - r * degPerRowCtx;
        const tLatMin = 90 - (r + 1) * degPerRowCtx;

        for (let c = cMinCtx; c <= cMaxCtx; c++) {
          const tLonMin = -180 + c * degPerColCtx;
          const tLonMax = -180 + (c + 1) * degPerColCtx;

          // Check if tile strictly intersects the site's authentic CTX swath
          const intersectsCtx =
            tLonMax >= cLonMin && tLonMin <= cLonMax && tLatMax >= cLatMin && tLatMin <= cLatMax;

          if (!intersectsCtx) continue;

          const pTopLeft = projectToScreen(tLatMax, tLonMin, width, height);
          const pBottomRight = projectToScreen(tLatMin, tLonMax, width, height);
          const tileW = pBottomRight.x - pTopLeft.x;
          const tileH = pBottomRight.y - pTopLeft.y;

          const ctxTileUrl = `https://trek.nasa.gov/tiles/Mars/EQ/${site.ctxLayer}/1.0.0/default/default028mm/${targetZ}/${r}/${c}.png`;
          const ctxImg = getOrLoadTile(ctxTileUrl, () => renderMap());

          if (ctxImg) {
            ctx.drawImage(ctxImg, pTopLeft.x, pTopLeft.y, tileW + 0.5, tileH + 0.5);
          }
        }
      }
    }

    // 5. Draw Coordinate Graticule Grid Lines (Dynamic Pixel Spacing - NO TEXT SMUDGE!)
    if (showGraticuleAndScale) {
      ctx.strokeStyle = 'rgba(100, 140, 180, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const targetPxSpacing = 140; // Maintain at least 140px between grid lines
      const degPerPxLon = 1 / (zoomScale * cosLat);
      const minDegSpacing = degPerPxLon * targetPxSpacing;

      const candidateIntervals = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
      let gridStep = candidateIntervals[candidateIntervals.length - 1];
      for (const step of candidateIntervals) {
        if (step >= minDegSpacing) {
          gridStep = step;
          break;
        }
      }

      const gLatMin = Math.floor(minLat / gridStep) * gridStep;
      const gLatMax = Math.ceil(maxLat / gridStep) * gridStep;
      const gLonMin = Math.floor(minLon / gridStep) * gridStep;
      const gLonMax = Math.ceil(maxLon / gridStep) * gridStep;

      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';

      const decimals = gridStep < 0.01 ? 3 : gridStep < 0.1 ? 2 : gridStep < 1 ? 1 : 0;

      for (let l = gLatMin; l <= gLatMax; l += gridStep) {
        const p = projectToScreen(l, viewCenter.lon, width, height);
        if (p.y >= 20 && p.y <= height - 20) {
          ctx.beginPath();
          ctx.moveTo(0, p.y);
          ctx.lineTo(width, p.y);
          ctx.stroke();
          const latLabel = `${Math.abs(l).toFixed(decimals)}°${l >= 0 ? 'N' : 'S'}`;
          ctx.fillText(latLabel, 8, p.y - 3);
        }
      }

      for (let l = gLonMin; l <= gLonMax; l += gridStep) {
        const p = projectToScreen(viewCenter.lat, l, width, height);
        if (p.x >= 30 && p.x <= width - 30) {
          ctx.beginPath();
          ctx.moveTo(p.x, 0);
          ctx.lineTo(p.x, height);
          ctx.stroke();
          const lonLabel = `${Math.abs(l).toFixed(decimals)}°${l >= 0 ? 'E' : 'W'}`;
          ctx.fillText(lonLabel, p.x + 4, height - 8);
        }
      }
      ctx.setLineDash([]);
    }

    // 6. Draw Bio-Metabolic Walkback Isochrone Polygon
    if (showWalkbackIsochrone && walkbackIsochrone) {
      const pts = walkbackIsochrone.safeBoundaryPoints.map((pt) =>
        projectToScreen(pt.lat, pt.lon, width, height)
      );
      if (pts.length > 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();

        // Glowing semi-transparent fill
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fill();

        // Solid cyan contour boundary
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Base habitat center marker
        const basePt = projectToScreen(
          walkbackIsochrone.centerLat,
          walkbackIsochrone.centerLon,
          width,
          height
        );
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(basePt.x, basePt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#bae6fd';
        ctx.fillText(
          `WALKBACK ISOCHRONE (R_max: ${walkbackIsochrone.maxSafeRadiusKm}km)`,
          pts[0].x + 8,
          pts[0].y - 8
        );
      }
    }

    // 7. Draw RAD-Haven SPE Solar Radiation Haven & Evacuation Path
    if (isSpeAlertActive && speReport && speReport.bestHaven) {
      const haven = speReport.bestHaven;
      const hPt = projectToScreen(haven.lat, haven.lon, width, height);

      // Emergency Sprint Route Path
      if (haven.evacRoute.length >= 2) {
        ctx.beginPath();
        const p0 = projectToScreen(haven.evacRoute[0].lat, haven.evacRoute[0].lon, width, height);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < haven.evacRoute.length; i++) {
          const pi = projectToScreen(haven.evacRoute[i].lat, haven.evacRoute[i].lon, width, height);
          ctx.lineTo(pi.x, pi.y);
        }
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Haven Cliff Shelter Beacon
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(hPt.x, hPt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`[SPE BUNKER] ${haven.name}`, hPt.x + 12, hPt.y + 4);
    }

    // 8. Draw RF Line-of-Sight Comms Vectors
    if (showRfCommsGrid && rfCommsReport) {
      const sPt = projectToScreen(rfCommsReport.surfaceLat, rfCommsReport.surfaceLon, width, height);

      const earthAzRad = (rfCommsReport.earthDte.azimuthDeg * Math.PI) / 180.0;
      const earthDx = Math.sin(earthAzRad) * 95;
      const earthDy = -Math.cos(earthAzRad) * 95;

      ctx.beginPath();
      ctx.moveTo(sPt.x, sPt.y);
      ctx.lineTo(sPt.x + earthDx, sPt.y + earthDy);
      ctx.strokeStyle = !rfCommsReport.earthDte.isMaskedByTerrain ? '#00f0ff' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = !rfCommsReport.earthDte.isMaskedByTerrain ? '#00f0ff' : '#f43f5e';
      ctx.font = '9px monospace';
      ctx.fillText(
        `EARTH DTE (${rfCommsReport.earthDte.oneWayLatencyMin}m LATENCY)`,
        sPt.x + earthDx + 5,
        sPt.y + earthDy
      );
    }

    // =========================================================================
    // 9. DYNAMIC ROUTE LINE RENDERING (SCALES WITH ZOOM LIKE GOOGLE MAPS)
    // =========================================================================
    if (routingEnabled && routeData && routeData.isTraversable) {
      // Dynamic route width: 3.5px when zoomed out to 13.0px when zoomed in (matches Google Maps road scaling)
      const dynamicWidth =
        Math.max(3.5, Math.min(13.0, 3.5 + Math.pow(Math.max(0, zoomScale - 450) / 700, 1.15) * 2.8)) *
        routeLineWidthScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Outbound (A1 -> B2) in Cyan with dark casing & outer glow
      if (routeData.outboundPoints.length >= 2) {
        ctx.beginPath();
        const p0 = projectToScreen(routeData.outboundPoints[0].lat, routeData.outboundPoints[0].lon, width, height);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < routeData.outboundPoints.length; i++) {
          const pi = projectToScreen(routeData.outboundPoints[i].lat, routeData.outboundPoints[i].lon, width, height);
          ctx.lineTo(pi.x, pi.y);
        }

        // 1. Dark contrast outline casing (Google Maps style)
        ctx.strokeStyle = '#020b17';
        ctx.lineWidth = dynamicWidth + 4.5;
        ctx.stroke();

        // 2. Outer cyan glow casing
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
        ctx.lineWidth = dynamicWidth + 2.0;
        ctx.stroke();

        // 3. Inner solid vector line
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = dynamicWidth;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Return (B2 -> A1) in Warm Amber with casing glow
      if (showReturnLeg && routeData.returnPoints.length >= 2) {
        ctx.beginPath();
        const p0 = projectToScreen(routeData.returnPoints[0].lat, routeData.returnPoints[0].lon, width, height);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < routeData.returnPoints.length; i++) {
          const pi = projectToScreen(routeData.returnPoints[i].lat, routeData.returnPoints[i].lon, width, height);
          ctx.lineTo(pi.x, pi.y);
        }

        // 1. Dark contrast outline casing
        ctx.strokeStyle = '#020b17';
        ctx.lineWidth = dynamicWidth + 4.0;
        ctx.stroke();

        // 2. Outer amber glow casing
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = dynamicWidth + 1.8;
        ctx.stroke();

        // 3. Inner solid vector line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = Math.max(2.2, dynamicWidth * 0.88);
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Waypoints A, M1, B, R1 (Clean rounded integer elevation values)
      if (showWaypointLegends) {
        for (const wp of routeData.waypoints) {
          if (wp.id === 'R1' && !showReturnLeg) continue;
          const p = projectToScreen(wp.lat, wp.lon, width, height);

          ctx.fillStyle = wp.id === 'B' ? '#ef4444' : wp.id === 'R1' ? '#f59e0b' : '#10b981';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`${wp.label} (${Math.round(wp.elevM)} m)`, p.x + 8, p.y + 4);
        }

        // Hazard Callouts
        for (const haz of routeData.hazardPoints) {
          const p = projectToScreen(haz.lat, haz.lon, width, height);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fde68a';
          ctx.font = '9px monospace';
          ctx.fillText(`[HAZARD] ${haz.label}`, p.x + 6, p.y - 4);
        }
      }
    } else if (routingEnabled && showWaypointLegends) {
      // Endpoint pins when untraversable
      const pA = projectToScreen(routeEndpoints.startLat, routeEndpoints.startLon, width, height);
      const pB = projectToScreen(routeEndpoints.endLat, routeEndpoints.endLon, width, height);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pA.x, pA.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('A (ORIGIN)', pA.x + 8, pA.y + 4);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(pB.x, pB.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('B (TARGET)', pB.x + 8, pB.y + 4);
    }

    // =========================================================================
    // 10. INTERACTIVE SCIENCE TARGETS ON MAP (NASA MISSION FUSION)
    // =========================================================================
    if (showScienceLegends) {
      const visibleScienceTargets = SCIENCE_TARGETS_DATABASE.filter((st) => st.siteId === site.id);
      visibleScienceTargets.forEach((st) => {
        const p = projectToScreen(st.lat, st.lon, width, height);
        if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
          const isHovered = selectedScienceTarget?.id === st.id;

          // Glowing Science Target Beacon
          ctx.fillStyle = isHovered ? '#f59e0b' : '#a855f7';
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHovered ? 7 : 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Pulsing ring
          ctx.strokeStyle = isHovered ? 'rgba(245, 158, 11, 0.7)' : 'rgba(168, 85, 247, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, isHovered ? 13 : 9, 0, Math.PI * 2);
          ctx.stroke();

          // Cam and point indicators may not show label by default (clean map!)
          if (isHovered) {
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#fde68a';
            ctx.fillText(`[SCI] ${st.name}`, p.x + 9, p.y - 4);
          }
        }
      });
    }

    // 11. Nearby Regional Landmarks (De-cluttered)
    if (showHubLegends) {
      const drawnLabels: { x: number; y: number }[] = [];
      MARS_LANDMARKS.forEach((lm) => {
        const p = projectToScreen(lm.lat, lm.lon, width, height);
        if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);

          const tooClose = drawnLabels.some((dl) => Math.hypot(dl.x - p.x, dl.y - p.y) < 65);
          if (!tooClose && (!routingEnabled || Math.hypot(p.x - width * 0.5, p.y - height * 0.5) > 60)) {
            if (zoomScale > 1600) {
              ctx.font = '9px monospace';
              ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
              ctx.fillText(lm.name, p.x + 6, p.y + 3);
              drawnLabels.push(p);
            }
          }
        }
      });
    }

    // 12. Rover Panorama Stations (Compact optics icon by default)
    if (showPanoMarkers) {
      panoStations.forEach((st) => {
        if (st.siteId !== site.id) return;
        const p = projectToScreen(st.lat, st.lon, width, height);
        if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Compact optics icon: only show label on high zoom (>1800)
          if (zoomScale > 1800) {
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`[CAM] ${st.code}`, p.x + 7, p.y + 3);
          }
        }
      });
    }

    // 13. Metric Scale Bar & Compass
    if (showGraticuleAndScale) {
      const kmPerDeg = 59.16;
      const pxFor1Km = zoomScale / kmPerDeg;
      let scaleKm = 1.0;
      if (pxFor1Km < 30) scaleKm = 5.0;
      else if (pxFor1Km > 200) scaleKm = 0.5;

      const barWidthPx = pxFor1Km * scaleKm;
      const barX = 20;
      const barY = height - 24;

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barX, barY);
      ctx.lineTo(barX + barWidthPx, barY);
      ctx.moveTo(barX, barY - 4);
      ctx.lineTo(barX, barY + 4);
      ctx.moveTo(barX + barWidthPx, barY - 4);
      ctx.lineTo(barX + barWidthPx, barY + 4);
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`${scaleKm >= 1 ? `${scaleKm} km` : `${scaleKm * 1000} m`}`, barX + barWidthPx + 6, barY + 3);

      // North Arrow
      const compassX = width - 40;
      const compassY = height - 40;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(compassX, compassY + 12);
      ctx.lineTo(compassX, compassY - 14);
      ctx.lineTo(compassX - 4, compassY - 6);
      ctx.moveTo(compassX, compassY - 14);
      ctx.lineTo(compassX + 4, compassY - 6);
      ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('N', compassX - 3, compassY - 18);
    }

    ctx.restore();
  }, [
    activeLayer,
    getGlobalBaseTileUrl,
    highDetailMode,
    isSpeAlertActive,
    panoStations,
    projectToScreen,
    rfCommsReport,
    routeData,
    routeEndpoints,
    routingEnabled,
    selectedScienceTarget,
    showPanoMarkers,
    showReturnLeg,
    showRfCommsGrid,
    showWalkbackIsochrone,
    site,
    speReport,
    viewCenter,
    walkbackIsochrone,
    zoomScale,
    renderScale,
    maxZoomCap,
    routeLineWidthScale,
    showWaypointLegends,
    showScienceLegends,
    showHubLegends,
    showGraticuleAndScale,
  ]);

  // Request render on dependency changes
  useEffect(() => {
    let animId: number;
    const tick = () => {
      renderMap();
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [renderMap]);

  // Window / Container resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      renderMap();
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [renderMap]);

  // Mouse pan and click interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      const cosLat = Math.cos((viewCenter.lat * Math.PI) / 180.0);
      setViewCenter((prev) => ({
        lat: prev.lat + dy / zoomScale,
        lon: prev.lon - dx / (zoomScale * cosLat),
      }));
    }

    // Inspect coordinates under cursor
    const { lat, lon } = unprojectFromScreen(mouseX, mouseY, container.clientWidth, container.clientHeight);

    let elevM = -2500;
    let slopeDeg = 4;
    let frictionMu = 0.72;
    if (terrainField) {
      const m = terrainField.sampleMetricsAt(lat, lon, 0);
      elevM = m.elevM;
      slopeDeg = m.slopeDeg;
      frictionMu = m.frictionMu;
    }

    const themisInertia = Math.round(140 + frictionMu * 380);
    const trafficability =
      frictionMu > 0.65
        ? 'HIGH TRACTION (Bedrock Pavement)'
        : frictionMu > 0.48
        ? 'NOMINAL TRACTION (Firm Regolith)'
        : 'LOW TRACTION (Fine Aeolian Sand Trap)';

    setCursorInfo({
      lat,
      lon,
      elevM,
      slopeDeg,
      frictionMu,
      themisInertia,
      trafficability,
      screenX: mouseX,
      screenY: mouseY,
      visible: mouseX >= 0 && mouseX <= container.clientWidth && mouseY >= 0 && mouseY <= container.clientHeight,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoomScale((prev) => Math.max(400, Math.min(14000, prev * zoomFactor)));
  };

  const handleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check click on Science Target
    const siteTargets = SCIENCE_TARGETS_DATABASE.filter((st) => st.siteId === site.id);
    for (const st of siteTargets) {
      const p = projectToScreen(st.lat, st.lon, container.clientWidth, container.clientHeight);
      if (Math.hypot(p.x - clickX, p.y - clickY) <= 14) {
        setSelectedScienceTarget(st);
        return;
      }
    }

    // Check click on Rover Panorama Station
    if (showPanoMarkers) {
      for (const st of panoStations) {
        if (st.siteId !== site.id) continue;
        const p = projectToScreen(st.lat, st.lon, container.clientWidth, container.clientHeight);
        const dist = Math.hypot(p.x - clickX, p.y - clickY);
        if (dist <= 12) {
          onSelectPanoStation(st);
          return;
        }
      }
    }

    const { lat, lon } = unprojectFromScreen(clickX, clickY, container.clientWidth, container.clientHeight);
    onPickPoint(lat, lon, e.shiftKey ? true : undefined);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { lat, lon } = unprojectFromScreen(clickX, clickY, container.clientWidth, container.clientHeight);
    // Shift+Right-Click = Origin (A1), Normal Right-Click = Destination (B2)
    onPickPoint(lat, lon, e.shiftKey);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="relative w-full h-full overflow-hidden cursor-crosshair select-none bg-[#070b12]"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Real NASA Mars Trek API Layer Switcher Bar (Zero Emojis, No Scrollbars!) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-[#08101d]/90 backdrop-blur-md border border-cyan-500/40 shadow-xl max-w-[95%] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 px-1.5 hidden md:flex shrink-0">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>MARS TREK API:</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('ctx_optical');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'ctx_optical'
              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Real MRO CTX 6m & HiRISE 25cm Orthomosaics from Mars Trek"
        >
          MRO CTX / HiRISE
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('themis_thermal');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'themis_thermal'
              ? 'bg-amber-500/30 text-amber-200 border border-amber-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="THEMIS Infrared Thermal Inertia & Regolith Trafficability False-Color Overlay"
        >
          THEMIS Traction
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('mola_color_shade');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'mola_color_shade'
              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Real MGS MOLA & Mars Express HRSC Color Hillshade Blend from Mars Trek"
        >
          MOLA Color Topo
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('mola_shade');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'mola_shade'
              ? 'bg-slate-500/30 text-slate-200 border border-slate-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Real MGS MOLA & MEX HRSC Monochrome Shaded Relief from Mars Trek"
        >
          MOLA Relief
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('viking_color');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'viking_color'
              ? 'bg-amber-600/30 text-amber-200 border border-amber-500 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Real Viking MDIM 2.1 Color Global Mosaic from Mars Trek"
        >
          Viking Color
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveLayer('geology');
          }}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
            activeLayer === 'geology'
              ? 'bg-purple-500/30 text-purple-200 border border-purple-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Real USGS SIM3292 Global Geologic Map from Mars Trek"
        >
          USGS Geology
        </button>
      </div>

      {/* Floating Zoom & Pan Controls (Clean Lucide Icons) */}
      <div className="absolute bottom-12 right-4 z-30 flex flex-col gap-1.5 p-1 rounded-xl bg-[#08101d]/90 backdrop-blur-md border border-slate-700/80 shadow-xl">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomScale((prev) => Math.min(14000, prev * 1.3));
          }}
          className="w-7 h-7 rounded bg-slate-900/80 hover:bg-slate-800 text-cyan-300 font-bold flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomScale((prev) => Math.max(400, prev * 0.7));
          }}
          className="w-7 h-7 rounded bg-slate-900/80 hover:bg-slate-800 text-cyan-300 font-bold flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setViewCenter({ lat: site.lat, lon: site.lon });
            setZoomScale(2200);
          }}
          className="w-7 h-7 rounded bg-slate-900/80 hover:bg-slate-800 text-amber-300 font-bold flex items-center justify-center transition-all cursor-pointer"
          title="Recenter Map on Expedition Base"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Science Target HUD Inspection Card */}
      {selectedScienceTarget && (
        <div className="absolute top-14 left-4 z-40 w-80 p-3 rounded-xl bg-[#091122]/95 border border-purple-500/60 shadow-2xl backdrop-blur-md text-mono space-y-2">
          <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>{selectedScienceTarget.name}</span>
            </div>
            <button
              onClick={() => setSelectedScienceTarget(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-300 leading-tight">
            {selectedScienceTarget.recommendedMission}
          </p>
          <div className="space-y-1 text-[9px] bg-[#060b16] p-2 rounded-lg border border-slate-800">
            <div>
              <span className="text-purple-300 font-bold">CRISM Spectral: </span>
              <span className="text-slate-200">{selectedScienceTarget.crismMineralogy}</span>
            </div>
            <div>
              <span className="text-amber-300 font-bold">PIXL XRF: </span>
              <span className="text-slate-200">{selectedScienceTarget.pixlChemistry}</span>
            </div>
            <div>
              <span className="text-emerald-300 font-bold">SHERLOC Raman: </span>
              <span className="text-slate-200">{selectedScienceTarget.sherlocRaman}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="text-[10px] font-bold text-amber-300">
              VAL: {selectedScienceTarget.scienceValueScore}/100 SCI
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  onPickPoint(selectedScienceTarget.lat, selectedScienceTarget.lon, true);
                  setSelectedScienceTarget(null);
                }}
                className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/60 text-[9px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Set as Origin (A)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>START (A)</span>
              </button>
              <button
                onClick={() => {
                  onPickPoint(selectedScienceTarget.lat, selectedScienceTarget.lon, false);
                  setSelectedScienceTarget(null);
                }}
                className="px-2 py-1 rounded bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 border border-purple-400 text-[9px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                title="Set as Target (B)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>TARGET (B)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Cursor Telemetry Tooltip (Flips below cursor when near top toolbar) */}
      {showGraticuleAndScale && cursorInfo && cursorInfo.visible && (
        <div
          className="pointer-events-none absolute z-40 px-2.5 py-1.5 rounded-lg bg-[#070e1e]/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-[10px] font-mono space-y-0.5"
          style={{
            left: Math.max(
              12,
              Math.min((containerRef.current?.clientWidth || 800) - 240, cursorInfo.screenX + 15)
            ),
            top: Math.max(
              58,
              cursorInfo.screenY < 160
                ? cursorInfo.screenY + 24
                : cursorInfo.screenY - 80
            ),
          }}
        >
          <div className="text-cyan-300 font-bold flex justify-between gap-3">
            <span>
              {Math.abs(cursorInfo.lat).toFixed(4)}° {cursorInfo.lat >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(cursorInfo.lon).toFixed(4)}° {cursorInfo.lon >= 0 ? 'E' : 'W'}
            </span>
            <span className="text-amber-300 font-bold">{Math.round(cursorInfo.elevM)} m</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-300">
            <span>
              SLOPE: <span className="font-bold text-emerald-300">{cursorInfo.slopeDeg.toFixed(1)}°</span>
            </span>
            <span>
              THEMIS: <span className="text-cyan-200">{cursorInfo.themisInertia} J·m⁻²·K⁻¹·s⁻½</span>
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {cursorInfo.trafficability}
          </div>
        </div>
      )}
    </div>
  );
}
