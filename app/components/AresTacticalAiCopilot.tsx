'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Minimize2,
  Maximize2,
  Database,
  Cpu,
  MoveDiagonal2,
} from 'lucide-react';
import type { ComputedRoundTripRoute, RealMarsEphemeris } from '../MarsGlobeViewer';
import type { SpeHavenReport } from '../algorithms/radHavenSpe';
import type { RfCommsReport } from '../algorithms/rfComms';
import type { WalkbackIsochroneBoundary } from '../algorithms/bioTerramechanics';
import { MARS_LANDMARKS } from '../data/marsLandmarks';
import { SCIENCE_TARGETS_DATABASE } from './MarsTactical2DMap';

export type CopilotAction =
  | { action: 'PLOT_PRESET'; payload: string }
  | { action: 'SET_VIEW_MODE'; payload: '3D' | '2D' }
  | { action: 'SET_LAYER_MODE'; payload: string }
  | { action: 'ENTER_VISOR' }
  | { action: 'OPEN_EXPORT' }
  | { action: 'TOGGLE_SPE' }
  | { action: 'TOGGLE_RF_COMMS' }
  | { action: 'TOGGLE_ISOCHRONE' }
  | { action: 'SET_TRAVERSE_MODE'; payload: 'ASTRONAUT_HIKE' | 'ROVER_AUTOPILOT' }
  | { action: 'FLY_TO_SITE'; payload: string }
  | { action: 'SET_RESOLUTION'; payload: number }
  | { action: 'OPEN_SETTINGS' };

export interface NiniLiveTelemetrySnapshot {
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
}

interface AresTacticalAiCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  astronautName: string;
  routeData: ComputedRoundTripRoute | null;
  routeEndpoints?: { startLat: number; startLon: number; endLat: number; endLon: number };
  currentSite: string;
  currentSiteId?: string;
  currentViewMode: '3D' | '2D';
  currentLayerMode: string;
  traverseMode: 'ASTRONAUT_HIKE' | 'ROVER_AUTOPILOT';
  liveTelemetry?: NiniLiveTelemetrySnapshot;
  marsEphemeris?: RealMarsEphemeris;
  speReport?: SpeHavenReport | null;
  isSpeAlertActive?: boolean;
  rfCommsReport?: RfCommsReport | null;
  showRfCommsGrid?: boolean;
  walkbackIsochrone?: WalkbackIsochroneBoundary | null;
  resolutionScale?: number;
  maxZoomCap?: number;
  onExecuteCommand: (cmd: CopilotAction) => void;
}

interface Message {
  id: string;
  sender: 'ASTRONAUT' | 'NINI';
  text: string;
  action?: CopilotAction;
  actionLabel?: string;
  metricsCard?: {
    title: string;
    items: { label: string; value: string; tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' }[];
  };
  timestamp: string;
}

const BASE_WIDTH = 390;
const BASE_HEIGHT = 520;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 380;
const MAX_WIDTH = 860;
const MAX_HEIGHT = 860;

export function AresTacticalAiCopilot({
  isOpen,
  onClose,
  astronautName,
  routeData,
  routeEndpoints,
  currentSite,
  currentSiteId = 'jezero-delta',
  currentViewMode,
  currentLayerMode,
  traverseMode,
  liveTelemetry,
  marsEphemeris,
  speReport,
  isSpeAlertActive = false,
  rfCommsReport,
  showRfCommsGrid = false,
  walkbackIsochrone,
  resolutionScale = 1.5,
  maxZoomCap = 12,
  onExecuteCommand,
}: AresTacticalAiCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'NINI',
      text: `Salam & Greetings, Astronaut ${astronautName} (BGD). I am **Nini**, your ARES Tactical AI Copilot.\n\nI have live telemetry fusion locked on **${currentSite}** (MOLA 16-bit DEM, HiRISE 25cm stereo DTM, CRISM spectral mineralogy, THEMIS thermal inertia, and Santee-Pandolf 0.38g bio-metabolic solver). Ask me about your route (A ⇄ B), suit consumables, 2025 Boxwork science, radiation shelters, or render resolution!`,
      metricsCard: {
        title: 'NINI TELEMETRY FUSION ONLINE',
        items: [
          { label: 'AI CORE', value: 'NINI v4.2 TACTICAL', tone: 'cyan' },
          { label: 'GRAVITY MODEL', value: '3.721 m/s² (0.38g)', tone: 'emerald' },
          { label: 'SUIT PLSS', value: '29.65 kPa • NOMINAL', tone: 'cyan' },
          { label: 'SCIENCE DB', value: '18 LANDMARKS • 8 LAB POIs', tone: 'purple' },
        ],
      },
      timestamp: marsEphemeris?.localSolarTimeStr || '08:16 LTST',
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showLiveTelemetryBanner, setShowLiveTelemetryBanner] = useState<boolean>(true);

  // Resizable window state & proportional UI scaling
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeStateRef = useRef<{
    active: boolean;
    dir: 'NW' | 'N' | 'W' | 'NE' | 'SW';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({
    active: false,
    dir: 'NW',
    startX: 0,
    startY: 0,
    startW: BASE_WIDTH,
    startH: BASE_HEIGHT,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Global pointer move / up listeners for smooth window resizing
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const st = resizeStateRef.current;
      if (!st.active) return;

      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;

      let nextW = st.startW;
      let nextH = st.startH;

      // Window is anchored at bottom-right (bottom-11 right-4), so dragging left/up expands width/height
      if (st.dir === 'NW' || st.dir === 'W' || st.dir === 'SW') {
        nextW = st.startW - dx;
      }
      if (st.dir === 'NW' || st.dir === 'N' || st.dir === 'NE') {
        nextH = st.startH - dy;
      }

      const maxAllowedW = typeof window !== 'undefined' ? Math.min(MAX_WIDTH, window.innerWidth - 32) : MAX_WIDTH;
      const maxAllowedH = typeof window !== 'undefined' ? Math.min(MAX_HEIGHT, window.innerHeight - 80) : MAX_HEIGHT;

      setWindowSize({
        width: Math.round(Math.max(MIN_WIDTH, Math.min(maxAllowedW, nextW))),
        height: Math.round(Math.max(MIN_HEIGHT, Math.min(maxAllowedH, nextH))),
      });
    };

    const onMouseUp = () => {
      if (resizeStateRef.current.active) {
        resizeStateRef.current.active = false;
        setIsResizing(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResize = (dir: 'NW' | 'N' | 'W' | 'NE' | 'SW', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStateRef.current = {
      active: true,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: windowSize.width,
      startH: windowSize.height,
    };
    setIsResizing(true);
  };

  const cyclePresetWindowScale = () => {
    const curRatio = windowSize.width / BASE_WIDTH;
    let nextMult = 1.0;
    if (curRatio < 1.15) nextMult = 1.25;
    else if (curRatio < 1.4) nextMult = 1.5;
    else nextMult = 1.0;

    const maxAllowedW = typeof window !== 'undefined' ? Math.min(MAX_WIDTH, window.innerWidth - 32) : MAX_WIDTH;
    const maxAllowedH = typeof window !== 'undefined' ? Math.min(MAX_HEIGHT, window.innerHeight - 80) : MAX_HEIGHT;

    setWindowSize({
      width: Math.round(Math.min(maxAllowedW, BASE_WIDTH * nextMult)),
      height: Math.round(Math.min(maxAllowedH, BASE_HEIGHT * nextMult)),
    });
  };

  if (!isOpen) return null;

  // Proportional UI scale ratio derived from the resized window dimensions
  const widthRatio = windowSize.width / BASE_WIDTH;
  const heightRatio = windowSize.height / BASE_HEIGHT;
  const uiScale = Number(
    Math.max(0.82, Math.min(2.15, widthRatio * 0.65 + heightRatio * 0.35)).toFixed(3)
  );

  const quickPrompts = [
    { label: 'Full Mission Sitrep', prompt: 'Give me a complete mission sitrep and telemetry summary' },
    { label: '2025 Boxwork Science', prompt: 'Analyze Curiosity 2025 Mount Sharp Boxwork formations & science value' },
    { label: 'Origin A & Dest B', prompt: 'Analyze my current Origin (A) and Destination (B) route endpoints' },
    { label: 'PLSS Rule of Half', prompt: 'What is my PLSS Rule of Half water, oxygen, and metabolic status?' },
    { label: 'CRISM & PIXL Lab', prompt: 'Show CRISM mineralogy, PIXL XRF, and SHERLOC biosignature data for this site' },
    { label: 'SPE Radiation Shelter', prompt: 'Find nearest rock cliff shelter for solar particle event evacuation' },
    { label: 'RF Comms & DSN Link', prompt: 'Check Earth DTE, MRO, and Odyssey orbiter RF communications status' },
    { label: 'Ultra 2x Resolution', prompt: 'Set rendering resolution to Ultra 2.0x Supersampling' },
    { label: 'Switch to 2D Map', prompt: 'Switch to 2D tactical map view' },
    { label: 'Activate Visor HUD', prompt: 'Enter first-person astronaut visor mode' },
  ];

  const handleSend = (textToSend?: string) => {
    const q = (textToSend ?? inputQuery).trim();
    if (!q) return;

    const timeStr =
      marsEphemeris?.localSolarTimeStr ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'ASTRONAUT',
      text: q,
      timestamp: timeStr,
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputQuery('');

    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply = '';
      let action: CopilotAction | undefined = undefined;
      let actionLabel: string | undefined = undefined;
      let metricsCard: Message['metricsCard'] = undefined;

      const lat = liveTelemetry?.lat ?? 18.4447;
      const lon = liveTelemetry?.lon ?? 77.4508;
      const elev = Math.round(liveTelemetry?.elevM ?? -2540);
      const slope = liveTelemetry?.slopeDeg ?? 4.6;
      const mu = liveTelemetry?.frictionMu ?? 0.75;
      const hr = liveTelemetry?.heartRateBpm ?? 76;
      const watts = liveTelemetry?.metabolicWatts ?? 245;
      const waterGph = liveTelemetry?.waterBurnGph ?? 267;
      const extTemp = liveTelemetry?.externalTempC ?? -62;
      const presPa = liveTelemetry?.atmosPresPa ?? 710;
      const radMsv = liveTelemetry?.radiationMsvH ?? 0.12;

      const siteTargets = SCIENCE_TARGETS_DATABASE.filter((t) => t.siteId === currentSiteId);
      const siteLandmarks = MARS_LANDMARKS.filter((l) => l.siteId === currentSiteId);

      if (
        lower.includes('who are you') ||
        lower.includes('nini') ||
        lower.includes('your name') ||
        lower.includes('introduce')
      ) {
        reply = `I am **Nini** (Neural Integrated Navigation & In-Situ Intelligence), your onboard AI Tactical Copilot designed for the ARES-Navigator Marswalk Mission.\n\nI continuously process 6 NASA orbital and surface telemetry streams—MOLA/HRSC 16-bit DEM, HiRISE 25cm stereo imagery, MRO CRISM spectral mineralogy, Odyssey THEMIS thermal inertia, Curiosity RAD radiation dosimetry, and Perseverance MEDA atmospheric physics—to keep Astronaut ${astronautName} safe while maximizing astrobiological discovery.`;
        metricsCard = {
          title: 'NINI AI CORE ARCHITECTURE',
          items: [
            { label: 'DESIGNATION', value: 'NINI v4.2 TACTICAL', tone: 'cyan' },
            { label: 'LEAD CREW', value: astronautName, tone: 'emerald' },
            { label: 'TERRAIN ENGINE', value: 'C1 BICUBIC S16 DEM', tone: 'amber' },
            { label: 'BIO SOLVER', value: 'SANTEE-PANDOLF 0.38g', tone: 'purple' },
          ],
        };
      } else if (
        lower.includes('sitrep') ||
        lower.includes('summary') ||
        lower.includes('status') ||
        lower.includes('everything') ||
        lower.includes('telemetry')
      ) {
        const rtDist = routeData ? `${routeData.totalRoundTripKm} km` : 'No active route';
        const rtTime = routeData ? `${routeData.estRoundTripTimeMin} min` : 'N/A';
        const rtSafe = routeData
          ? routeData.isTraversable
            ? 'SAFE & VERIFIED'
            : `BLOCKED (${routeData.failureReason})`
          : 'STANDBY';
        reply = `**NINI COMPREHENSIVE TACTICAL SITREP (${currentSite})**:\n\n1. **Position & Geodesy**: Centered at ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E | Elevation ${elev} m | Local Slope ${slope}° | Regolith Traction ${mu}μ (${liveTelemetry?.tractionPct ?? 96}%).\n2. **Martian Ephemeris**: ${marsEphemeris ? `MSD ${marsEphemeris.msd.toFixed(2)} • ${marsEphemeris.localSolarTimeStr} (${marsEphemeris.mtcStr}) • Perseverance Sol ${marsEphemeris.perseveranceSol} / Curiosity Sol ${marsEphemeris.curiositySol} • ${marsEphemeris.freezeCountdownStr}` : 'Real-Time Sync Active'}.\n3. **Route Traverse (A⇄B)**: ${rtSafe} | Total Distance: ${rtDist} | Est. Duration: ${rtTime} | Max Slope: ${routeData?.maxSlopeDeg ?? slope}°.\n4. **Astronaut Biometrics (0.38g)**: Heart Rate ${hr} BPM | Metabolic Load ${watts} W | Cooling Sublimator ${waterGph} g/h | Suit Pressure ${liveTelemetry?.suitPressureKpa ?? 29.65} kPa (98% SpO₂).\n5. **Environment**: Surface Temp ${extTemp}°C | Pressure ${presPa} Pa | Background Dose ${radMsv} mSv/h.`;
        metricsCard = {
          title: `LIVE MISSION TELEMETRY • ${currentSite.toUpperCase()}`,
          items: [
            { label: 'COORDINATES', value: `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`, tone: 'cyan' },
            { label: 'ELEV / SLOPE', value: `${elev}m / ${slope}°`, tone: slope > 12 ? 'rose' : 'emerald' },
            { label: 'ROUND-TRIP', value: `${rtDist} (${rtTime})`, tone: 'amber' },
            { label: 'METABOLIC / HR', value: `${watts}W / ${hr} BPM`, tone: 'purple' },
          ],
        };
      } else if (
        lower.includes('origin') ||
        lower.includes('destination') ||
        lower.includes('(a)') ||
        lower.includes('(b)') ||
        lower.includes('endpoint') ||
        lower.includes('route')
      ) {
        const sLat = routeEndpoints?.startLat ?? 18.425;
        const sLon = routeEndpoints?.startLon ?? 77.515;
        const eLat = routeEndpoints?.endLat ?? 18.468;
        const eLon = routeEndpoints?.endLon ?? 77.412;
        const wpA = routeData?.waypoints.find((w) => w.id === 'A');
        const wpB = routeData?.waypoints.find((w) => w.id === 'B');

        reply = `**Nini Route Endpoint & Traverse Analysis (A ⇄ B)**:\n\n• **ORIGIN (A - Start Base)**: ${sLat.toFixed(4)}°N, ${sLon.toFixed(4)}°E | Elev: ${wpA ? `${wpA.elevM} m` : `${elev} m`} | Local Slope: ${wpA ? `${wpA.slopeDeg}°` : '3°'} | Traction: ${wpA ? `${wpA.frictionMu}μ` : `${mu}μ`}.\n• **DESTINATION (B - Target Objective)**: ${eLat.toFixed(4)}°N, ${eLon.toFixed(4)}°E | Elev: ${wpB ? `${wpB.elevM} m` : `${elev + 65} m`} | Local Slope: ${wpB ? `${wpB.slopeDeg}°` : '6°'} | Traction: ${wpB ? `${wpB.frictionMu}μ` : `${mu}μ`}.\n\n${
          routeData
            ? routeData.isTraversable
              ? `• **Asymmetric Round-Trip**: Outbound leg is **${routeData.outboundDistKm} km**, Return leg is **${routeData.returnDistKm} km** (Total **${routeData.totalRoundTripKm} km**, ~**${routeData.estRoundTripTimeMin} min**).\n• **Consumables**: Burns **${routeData.totalWaterBurnGrams}g H₂O** and **${routeData.totalO2BurnGrams}g O₂** (${routeData.ruleOfHalfCompliant ? '100% compliant with NASA Rule of Half' : 'EXCEEDS Rule of Half threshold!'}).`
              : `• **HAZARD ALERT**: ${routeData.failureReason}`
            : '• Routing is currently on standby. Click the highlighted Origin A or Destination B cards in the left panel to pick new points on Mars!'
        }`;
        metricsCard = {
          title: 'ORIGIN (A) & DESTINATION (B) TELEMETRY',
          items: [
            { label: 'ORIGIN A (START)', value: `${sLat.toFixed(3)}°N, ${sLon.toFixed(3)}°E`, tone: 'emerald' },
            { label: 'TARGET B (END)', value: `${eLat.toFixed(3)}°N, ${eLon.toFixed(3)}°E`, tone: 'rose' },
            { label: 'TOTAL DISTANCE', value: routeData ? `${routeData.totalRoundTripKm} km` : 'STANDBY', tone: 'cyan' },
            { label: 'PEAK INCLINE', value: `${routeData?.maxSlopeDeg ?? slope}°`, tone: 'amber' },
          ],
        };
      } else if (lower.includes('boxwork') || lower.includes('gale') || lower.includes('mount sharp') || lower.includes('curiosity')) {
        reply = `**Nini Astrobiology Briefing — Curiosity 2025 Mount Sharp Boxwork Formations**:\n\n• **Coordinates**: 4.7320°S, 137.3950°E (Elev: -4,010 m on lower Aeolis Mons).\n• **Geological Origin**: Extensive decameter-scale polygonal mineral-cemented fracture ridges formed when warm, mineral-rich ancient groundwater circulated through deep bedrock fractures before wind eroded the softer host rock.\n• **CRISM & PIXL Lab Data**: Polyhydrated Mg-sulfates & fracture-fill carbonates (SiO₂ 55.8%, SO₃ 22.4%, CaO 11.2%).\n• **Astrobiology Priority**: **100/100 SCI** — Subsurface fluid conduits sheltered from surface UV/cosmic radiation represent one of the highest-probability habitats for late-stage Martian microbial life.`;
        metricsCard = {
          title: 'MOUNT SHARP 2025 BOXWORK FORMATIONS',
          items: [
            { label: 'SCIENCE RATING', value: '100 / 100 SCI', tone: 'emerald' },
            { label: 'CRISM SPECTRUM', value: 'MG-SULFATES & CARBONATES', tone: 'purple' },
            { label: 'PIXL XRF', value: 'SiO₂ 55.8% • SO₃ 22.4%', tone: 'amber' },
            { label: 'ELEVATION', value: '-4,010 m (Gale Mound)', tone: 'cyan' },
          ],
        };
        action = { action: 'PLOT_PRESET', payload: 'gale-boxwork' };
        actionLabel = 'FLY & PLOT: 2025 BOXWORK EVA';
      } else if (lower.includes('delta scarp') || lower.includes('neretva')) {
        reply = `**Nini Route Dispatch — Neretva Delta Scarp (18.455°N, 77.412°E)**:\nCalculating asymmetric round-trip path enforcing 0.38g gravity and maximum scarp ascent pitch.\n• **CRISM Mineralogy**: Mg/Fe-Smectite Clays & Fe/Mg-Carbonates.\n• **PIXL XRF**: SiO₂ 51.4% • FeO 16.8% • Al₂O₃ 9.2% • CaO 7.5%.\n• **SHERLOC Raman**: Polycyclic Aromatic Hydrocarbons (PAH biosignatures, 98/100 SCI).`;
        action = { action: 'PLOT_PRESET', payload: 'jez-delta-scarp' };
        actionLabel = 'EXECUTE DISPATCH: NERETVA SCARP';
        onExecuteCommand(action);
      } else if (lower.includes('three forks') || lower.includes('sample depot')) {
        reply = `**Nini Route Dispatch — Three Forks Sample Depot (18.4492°N, 77.4318°E)**:\nDirect traverse to inspect the Mars Sample Return titanium cache tube depot.\n• **Terrain**: Nominal 4° slope, high-traction bedrock pavement (THEMIS 410 tiu, μ = 0.78).\n• **PIXL & SHERLOC**: Fluvial sandstones with silica-carbonate matrix (SiO₂ 58.0%, 99/100 SCI).`;
        action = { action: 'PLOT_PRESET', payload: 'jez-three-forks' };
        actionLabel = 'EXECUTE DISPATCH: THREE FORKS';
        onExecuteCommand(action);
      } else if (lower.includes('kodiak') || lower.includes('butte')) {
        reply = `**Nini Route Dispatch — Kodiak Butte Delta Remnant (18.418°N, 77.426°E)**:\nIsolated erosional mesa exhibiting classic Gilbert-type delta bottomset and foreset beds.\n• **Mineralogy**: Layered diagenetic Mg-carbonates & altered olivine (SiO₂ 46.2%, MgO 18.5%, 94/100 SCI).\n• **Safety**: Path maintains a 50m buffer from steep cliff talus slopes.`;
        action = { action: 'PLOT_PRESET', payload: 'jez-kodiak-butte' };
        actionLabel = 'EXECUTE DISPATCH: KODIAK BUTTE';
        onExecuteCommand(action);
      } else if (lower.includes('arcadia') || lower.includes('ice')) {
        reply = `**Nini Sector Analysis — Arcadia Planitia ISRU Hub (46.20°N, 171.20°W)**:\n• **Resource**: Shallow subsurface glacial water-ice sheet under 1.2m regolith overburden.\n• **SHARAD Radar**: Dielectric permittivity ε = 3.15 confirming >95% pure H₂O ice for Rodriguez-well thermal extraction and Methalox propellant synthesis.`;
        action = { action: 'PLOT_PRESET', payload: 'arc-ice-well' };
        actionLabel = 'FLY TO ARCADIA ICE WELL';
      } else if (lower.includes('melas') || lower.includes('valles marineris') || lower.includes('canyon')) {
        reply = `**Nini Sector Analysis — Melas Chasma, Valles Marineris (10.65°S, 68.15°W)**:\n• **Elevation**: -4,900 m (deepest tectonic trough on Mars, atmospheric pressure ~980 Pa).\n• **Mineralogy**: Monohydrated & polyhydrated magnesium sulfates (Kieserite, SO₃ 31.2%) + 5 km flood basalt cliff overhangs ideal for SPE radiation shielding.`;
        action = { action: 'PLOT_PRESET', payload: 'melas-cliff-haven' };
        actionLabel = 'FLY TO MELAS CHASMA';
      } else if (
        lower.includes('crism') ||
        lower.includes('mineral') ||
        lower.includes('pixl') ||
        lower.includes('sherloc') ||
        lower.includes('science') ||
        lower.includes('geology') ||
        lower.includes('lab')
      ) {
        const poiLines = siteTargets
          .map(
            (t) =>
              `• **${t.name}** (${t.scienceValueScore} SCI): *CRISM*: ${t.crismMineralogy} | *PIXL*: ${t.pixlChemistry} | *SHERLOC*: ${t.sherlocRaman}`
          )
          .join('\n');
        const lmLines = siteLandmarks
          .slice(0, 4)
          .map((l) => `• **${l.name}** (${l.elevationM}m): ${l.mineralogy}`)
          .join('\n');
        reply = `**Nini Multi-Mission Astrobiology & Geochemistry Dossier (${currentSite})**:\n\n**Spectroscopic Lab Targets (CRISM + PIXL + SHERLOC)**:\n${poiLines || '• Standard basaltic regolith'}\n\n**Regional Geologic Landmarks**:\n${lmLines}`;
        metricsCard = {
          title: `SPECTROSCOPIC LAB DATABASE • ${siteTargets.length} TARGETS`,
          items: siteTargets.slice(0, 4).map((t) => ({
            label: t.name.slice(0, 18),
            value: `${t.scienceValueScore}/100 SCI`,
            tone: 'purple' as const,
          })),
        };
      } else if (
        lower.includes('resolution') ||
        lower.includes('quality') ||
        lower.includes('supersampl') ||
        lower.includes('4k') ||
        lower.includes('dpi') ||
        lower.includes('setting') ||
        lower.includes('exaggeration')
      ) {
        let targetRes = 2.0;
        if (lower.includes('0.75') || lower.includes('performance') || lower.includes('eco')) targetRes = 0.75;
        else if (lower.includes('1.0') || lower.includes('standard')) targetRes = 1.0;
        else if (lower.includes('1.5') || lower.includes('high')) targetRes = 1.5;

        reply = `**Nini Render & Resolution Engine**:\n• Current Pixel Supersampling: **${resolutionScale.toFixed(2)}x** | Max LOD Tile Cap: **Z${maxZoomCap}**.\n• Adjusting WebGL & 2D GIS canvas resolution to **${targetRes.toFixed(2)}x** with C1-continuous bicubic DEM interpolation. You can also fine-tune Resolution Scale, Max Slope Limits, Legends, and Sun Illumination anytime via the **Settings** icon in the top-right bar.`;
        action = { action: 'SET_RESOLUTION', payload: targetRes };
        actionLabel = `APPLY ${targetRes}x RESOLUTION`;
        onExecuteCommand(action);
      } else if (lower.includes('2d') || lower.includes('map')) {
        reply = `**Nini Display Switch**: Engaging 2D Planimetric Tactical GIS Map powered by NASA JPL Mars Trek WMTS/WMS tile servers. High-resolution MRO CTX (6m/px), THEMIS IR thermal inertia, and MOLA topographic relief active.`;
        action = { action: 'SET_VIEW_MODE', payload: '2D' };
        actionLabel = 'SWITCHED TO 2D MAP';
        onExecuteCommand(action);
      } else if (lower.includes('3d') || lower.includes('globe')) {
        reply = `**Nini Display Switch**: Engaging 3D Photorealistic Three.js Spherical Terrain Globe with 16-bit MOLA+HRSC & HiRISE stereo DTM bicubic elevation rendering.`;
        action = { action: 'SET_VIEW_MODE', payload: '3D' };
        actionLabel = 'SWITCHED TO 3D GLOBE';
        onExecuteCommand(action);
      } else if (lower.includes('slope') || lower.includes('radar')) {
        reply = `**Nini Slope Radar**: Activating Dynamic Anti-Rollover Slope Radar calibrated to Mars 0.38g weight restoring force:\n• **Green (<8°)**: Nominal energy & full traction\n• **Amber (8°–15°)**: Elevated slip risk & metabolic load\n• **Red (>15°)**: Critical rover rollover & spacesuit center-of-mass hazard.`;
        action = { action: 'SET_LAYER_MODE', payload: 'slope_radar' };
        actionLabel = 'SLOPE RADAR ENGAGED';
        onExecuteCommand(action);
      } else if (lower.includes('contour') || lower.includes('topo')) {
        reply = `**Nini Topographic Contours**: Activating 60m iso-elevation contour lines fused over C1-continuous 16-bit MOLA/HiRISE DEM.`;
        action = { action: 'SET_LAYER_MODE', payload: 'tactical_contour' };
        actionLabel = 'TOPO CONTOURS ENGAGED';
        onExecuteCommand(action);
      } else if (lower.includes('visor') || lower.includes('helmet') || lower.includes('first-person')) {
        reply = `**Nini xEMU Visor HUD**: Dropping camera to 1.8m astronaut eye level above the Martian surface for ${astronautName}. Activating scrolling compass tape, pitch/roll inclinometer ladder, and PLSS biometric overlays.`;
        action = { action: 'ENTER_VISOR' };
        actionLabel = 'VISOR HUD ACTIVE';
        onExecuteCommand(action);
      } else if (lower.includes('export') || lower.includes('gpx') || lower.includes('pds4')) {
        reply = `**Nini Mission Data Export**: Opening NASA Planetary Data System (PDS4 XML v1.19), GPX 1.1 GPS Exchange, and RFC 7946 GeoJSON Traverse Exporter.`;
        action = { action: 'OPEN_EXPORT' };
        actionLabel = 'EXPORT MODAL OPENED';
        onExecuteCommand(action);
      } else if (
        lower.includes('plss') ||
        lower.includes('water') ||
        lower.includes('oxygen') ||
        lower.includes('o2') ||
        lower.includes('rule of half') ||
        lower.includes('metabolic') ||
        lower.includes('heart')
      ) {
        const wBurn = routeData?.totalWaterBurnGrams ?? 420;
        const oBurn = routeData?.totalO2BurnGrams ?? 85;
        const margin = routeData?.waterReserveMarginPct ?? liveTelemetry?.waterReservePct ?? 88;
        const compliant = routeData?.ruleOfHalfCompliant ?? true;
        reply = `**Nini PLSS Tri-Expendables & Santee-Pandolf 0.38g Audit**:\n\n• **Live Metabolic Rate**: **${watts} W** | Heart Rate: **${hr} BPM** | Sublimator Burn: **${waterGph} g/h**.\n• **Round-Trip Cooling Water**: **${wBurn} g** / 3,600 g NASA Rule-of-Half ceiling (**${margin}% reserve remaining**).\n• **Primary O₂ (25 MPa)**: **${oBurn} g** consumed (**${liveTelemetry?.o2ReservePct ?? 96}% tank reserve**).\n• **LiOH CO₂ Scrubber**: **${liveTelemetry?.liohReservePct ?? 92}% capacity** | Walkback Isochrone: **${walkbackIsochrone?.maxSafeRadiusKm ?? 4.8} km** safe radius.\n• **Verdict**: ${
          compliant
            ? '**GO FOR EVA** — All PLSS life-support reserves exceed NASA 50% Rule of Half safety margin.'
            : '**NO-GO WARNING** — Route exceeds 50% water sublimator limit! Shorten route or switch to Pressurized Rover.'
        }`;
        metricsCard = {
          title: 'PLSS RULE OF HALF & BIOMETRICS (0.38g)',
          items: [
            { label: 'SUBLIMATOR H₂O', value: `${wBurn}g (${margin}% RSV)`, tone: compliant ? 'cyan' : 'rose' },
            { label: 'PRIMARY O₂', value: `${oBurn}g (${liveTelemetry?.o2ReservePct ?? 96}% RSV)`, tone: 'emerald' },
            { label: 'METABOLIC LOAD', value: `${watts} W (${hr} BPM)`, tone: 'amber' },
            { label: 'RULE OF HALF', value: compliant ? 'COMPLIANT (OK)' : 'LIMIT EXCEEDED', tone: compliant ? 'emerald' : 'rose' },
          ],
        };
      } else if (
        lower.includes('spe') ||
        lower.includes('radiation') ||
        lower.includes('storm') ||
        lower.includes('haven') ||
        lower.includes('shelter')
      ) {
        const bestH = speReport?.bestHaven;
        reply = `**Nini RAD-HAVEN 3D Topographic Ray-Tracing Status**:\n\n• **Current Dosimetry**: ${
          isSpeAlertActive
            ? `ALERT! Solar Particle Event proton flux spike (${speReport?.protonFluxLevel ?? '1450 PFU'} • ${radMsv} mSv/h unshielded)`
            : `Nominal GCR background (${radMsv} mSv/h via Curiosity RAD calibration)`
        }.\n• **Nearest Certified Cliff Shelter**: **${bestH ? bestH.name : 'Neretva South Cliff Scarp'}** (${bestH ? `${bestH.distKm} km away, ${bestH.evacTimeMin} min sprint ETA` : '1.42 km away, 21 min sprint ETA'}).\n• **Geometrical Rock Shielding**: **${bestH ? `${bestH.reliefM}m basalt escarpment blocking ${Math.round(bestH.shieldingFraction * 100)}% of sky hemisphere` : '42m basalt scarp (>50 g/cm² rock mass attenuation, 68% sky occlusion)'}**.`;
        action = { action: 'TOGGLE_SPE' };
        actionLabel = isSpeAlertActive ? 'DEACTIVATE SPE SIMULATION' : 'SIMULATE SPE STORM & EVAC';
      } else if (
        lower.includes('rf') ||
        lower.includes('comm') ||
        lower.includes('radio') ||
        lower.includes('blackout') ||
        lower.includes('dsn') ||
        lower.includes('earth') ||
        lower.includes('orbiter')
      ) {
        const dteMasked = rfCommsReport?.earthDte.isMaskedByTerrain ?? false;
        const latency = rfCommsReport?.earthDte.oneWayLatencyMin ?? 11.4;
        const mroView = rfCommsReport?.mro.isInView ?? true;
        const odyView = rfCommsReport?.odyssey.isInView ?? true;
        reply = `**Nini RF Line-of-Sight & Deep Space Network (DSN) Comms Audit**:\n\n• **Direct-to-Earth (X-Band DTE)**: ${dteMasked ? 'MASKED BY CANYON WALL' : 'DIRECT LINE-OF-SIGHT LOCKED'} | Elev: ${rfCommsReport?.earthDte.elevationDeg ?? 34}° | One-Way Light Time: **${latency} min**.\n• **MRO UHF Electra Relay (310 km orbit)**: ${mroView ? `LOCKED (${rfCommsReport?.mro.signalStrengthPct ?? 94}% signal, 2.0 Mbps)` : 'BELOW HORIZON'}.\n• **Mars Odyssey UHF Relay (400 km orbit)**: ${odyView ? `LOCKED (${rfCommsReport?.odyssey.signalStrengthPct ?? 86}% signal)` : 'BELOW HORIZON'}.\n• **Overall Link Status**: ${rfCommsReport?.isBlackout ? 'RF BLACKOUT ZONE — Switch to autonomous inertial navigation' : 'NOMINAL MULTI-PATH TELEMETRY LOCK'}.`;
        action = { action: 'TOGGLE_RF_COMMS' };
        actionLabel = showRfCommsGrid ? 'HIDE RF LOS VECTORS' : 'SHOW 3D RF LOS VECTORS';
      } else if (
        lower.includes('night') ||
        lower.includes('freeze') ||
        lower.includes('temperature') ||
        lower.includes('time') ||
        lower.includes('sol') ||
        lower.includes('sun')
      ) {
        reply = `**Nini Martian Astronomical Ephemeris & Thermal Watch**:\n\n• **Mars Sol Date (MSD)**: ${marsEphemeris?.msd.toFixed(3) ?? '54398.42'} | **Coordinated Mars Time**: ${marsEphemeris?.mtcStr ?? '14:22:10 MTC'}.\n• **Local True Solar Time**: **${marsEphemeris?.localSolarTimeStr ?? '11:45:00 LTST'}** at ${lon.toFixed(2)}°E.\n• **Mission Sols**: Perseverance **Sol ${marsEphemeris?.perseveranceSol ?? 1765}** • Curiosity **Sol ${marsEphemeris?.curiositySol ?? 4800}**.\n• **Subsolar Coordinates**: ${marsEphemeris?.subsolarLat.toFixed(2) ?? '12.4'}°N, ${marsEphemeris?.subsolarLon.toFixed(2) ?? '84.2'}°E (Solar Zenith: ${marsEphemeris?.solarZenithDeg ?? 31}°).\n• **Diurnal Thermal Countdown**: **${marsEphemeris?.freezeCountdownStr ?? 'FREEZE IN 06h 35m'}** | Current Temp: **${extTemp}°C** (plunges to -98°C after sunset).`;
      } else {
        reply = `**Nini Tactical Copy** ("*${q}*"):\n\n• **Active Sector**: ${currentSite} (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E, Elev ${elev} m)\n• **Terrain & Traction**: Slope ${slope}° • Friction ${mu}μ (${liveTelemetry?.tractionPct ?? 96}% traction)\n• **Crew Vitals (${astronautName})**: ${hr} BPM • ${watts} W metabolic load • ${liveTelemetry?.waterReservePct ?? 88}% H₂O reserve\n• **Active Route (A⇄B)**: ${routeData ? `${routeData.totalRoundTripKm} km round-trip (${routeData.estRoundTripTimeMin} min)` : 'Standby'}\n\nTry asking me for a **Full Mission Sitrep**, **2025 Boxwork Science**, **CRISM & PIXL Lab Data**, **RF Comms Status**, or **Ultra 2x Resolution**!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `nini-${Date.now()}`,
          sender: 'NINI',
          text: reply,
          action,
          actionLabel,
          metricsCard,
          timestamp:
            marsEphemeris?.localSolarTimeStr ||
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 180);
  };

  return (
    <div
      style={
        isMinimized
          ? undefined
          : {
              width: `${windowSize.width}px`,
              height: `${windowSize.height}px`,
            }
      }
      className={`fixed bottom-11 right-4 z-40 font-mono transition-shadow duration-150 ${
        isMinimized
          ? 'w-76 h-12 rounded-xl bg-[#070f1e]/95 border border-cyan-500/70 shadow-2xl flex items-center justify-between px-3 cursor-pointer'
          : `rounded-2xl bg-[#060c18]/96 backdrop-blur-xl border-2 ${
              isResizing ? 'border-amber-400' : 'border-cyan-500/75'
            } shadow-[0_0_45px_rgba(0,240,255,0.28)] overflow-hidden select-none`
      }`}
    >
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                NINI • AI COPILOT
              </span>
              <span className="ml-2 text-[9px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                {liveTelemetry ? `${liveTelemetry.heartRateBpm} BPM • ${liveTelemetry.metabolicWatts}W` : 'ONLINE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 text-slate-400 hover:text-cyan-300"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Edge & Corner Resize Handles (Top-Left, Left, Top, Top-Right, Bottom-Left) */}
          <div
            onMouseDown={(e) => startResize('NW', e)}
            title="Drag corner to resize Nini Copilot (fonts & cards scale proportionally)"
            className="absolute top-0 left-0 w-5 h-5 z-50 cursor-nwse-resize flex items-start justify-start p-0.5 group"
          >
            <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/80 group-hover:border-amber-300 rounded-tl-xs" />
          </div>
          <div
            onMouseDown={(e) => startResize('N', e)}
            title="Drag top edge to resize height"
            className="absolute top-0 left-5 right-5 h-2 z-40 cursor-ns-resize hover:bg-cyan-400/20"
          />
          <div
            onMouseDown={(e) => startResize('W', e)}
            title="Drag left edge to resize width"
            className="absolute top-5 bottom-5 left-0 w-2 z-40 cursor-ew-resize hover:bg-cyan-400/20"
          />
          <div
            onMouseDown={(e) => startResize('SW', e)}
            title="Drag corner to resize width"
            className="absolute bottom-0 left-0 w-4 h-4 z-50 cursor-nesw-resize"
          />
          <div
            onMouseDown={(e) => startResize('NE', e)}
            title="Drag corner to resize height"
            className="absolute top-0 right-0 w-4 h-4 z-50 cursor-nesw-resize"
          />

          {/* Proportionally Scaled Inner Wrapper: fonts, cards, badges & inputs scale with window ratio */}
          <div
            style={{
              width: `${100 / uiScale}%`,
              height: `${100 / uiScale}%`,
              transform: `scale(${uiScale})`,
              transformOrigin: 'top left',
            }}
            className="flex flex-col select-text"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-gradient-to-r from-[#050b16] via-[#09152b] to-[#050b16]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  onMouseDown={(e) => startResize('NW', e)}
                  title="Drag to resize Nini window"
                  className="relative p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/70 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-nwse-resize shrink-0"
                >
                  <Bot className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#050b16]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider truncate">
                      NINI • TACTICAL AI COPILOT
                    </span>
                    <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-bold shrink-0">
                      {uiScale.toFixed(2)}x UI
                    </span>
                  </div>
                  <div className="text-[9px] text-cyan-300/90 flex items-center gap-1.5 mt-0.5 truncate">
                    <span>CREW: {astronautName} (BGD)</span>
                    <span>•</span>
                    <span className="text-amber-300 truncate">{currentSite}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={cyclePresetWindowScale}
                  className="p-1 rounded text-[9px] border border-slate-700 bg-slate-900/80 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200 transition-all cursor-pointer flex items-center gap-0.5"
                  title="Cycle Window & Font Scale (1.0x → 1.25x → 1.5x) or drag top-left corner"
                >
                  <MoveDiagonal2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowLiveTelemetryBanner(!showLiveTelemetryBanner)}
                  className={`p-1 rounded text-[9px] border transition-all cursor-pointer ${
                    showLiveTelemetryBanner
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle Nini Live Telemetry Strip"
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                  title="Minimize Nini"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                  title="Close Nini"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Fused Telemetry Strip */}
            {showLiveTelemetryBanner && (
              <div className="px-3 py-1.5 bg-[#06101f] border-b border-cyan-950/80 grid grid-cols-4 gap-1.5 text-[9px]">
                <div className="bg-[#09162b] px-1.5 py-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[8px]">ELEV / SLOPE</div>
                  <div className="text-cyan-300 font-bold truncate">
                    {Math.round(liveTelemetry?.elevM ?? -2540)}m • {liveTelemetry?.slopeDeg ?? 4.6}°
                  </div>
                </div>
                <div className="bg-[#09162b] px-1.5 py-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[8px]">BIO / 0.38g</div>
                  <div className="text-amber-300 font-bold truncate">
                    {liveTelemetry?.metabolicWatts ?? 245}W • {liveTelemetry?.heartRateBpm ?? 76}bpm
                  </div>
                </div>
                <div className="bg-[#09162b] px-1.5 py-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[8px]">PLSS H₂O / O₂</div>
                  <div className="text-emerald-300 font-bold truncate">
                    {liveTelemetry?.waterReservePct ?? 88}% • {liveTelemetry?.o2ReservePct ?? 96}%
                  </div>
                </div>
                <div className="bg-[#09162b] px-1.5 py-1 rounded border border-slate-800">
                  <div className="text-slate-400 text-[8px]">ROUTE A⇄B</div>
                  <div className="text-purple-300 font-bold truncate">
                    {routeData ? `${routeData.totalRoundTripKm}km` : 'STANDBY'}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Action Chips */}
            <div className="p-2 border-b border-slate-800/80 bg-[#081224] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.prompt)}
                  className="px-2 py-1 rounded-md bg-slate-900/90 hover:bg-cyan-950/90 border border-slate-700 hover:border-cyan-400/80 text-slate-200 hover:text-cyan-200 text-[9px] font-mono whitespace-nowrap transition-all cursor-pointer shrink-0"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Message History */}
            <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#040812] text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'ASTRONAUT' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 mb-0.5">
                    <span className={m.sender === 'NINI' ? 'text-cyan-400 font-bold' : 'text-emerald-300 font-bold'}>
                      {m.sender === 'ASTRONAUT' ? astronautName : 'NINI AI COPILOT'}
                    </span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl max-w-[92%] leading-relaxed ${
                      m.sender === 'ASTRONAUT'
                        ? 'bg-cyan-600/25 border border-cyan-400/60 text-cyan-100 rounded-br-xs'
                        : 'bg-[#0b1324]/95 border border-slate-800 text-slate-200 rounded-bl-xs shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-line text-[11px]">{m.text}</p>

                    {m.metricsCard && (
                      <div className="mt-2.5 p-2 rounded-lg bg-[#060b16] border border-cyan-500/30 space-y-1.5">
                        <div className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          <span>{m.metricsCard.title}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {m.metricsCard.items.map((it, i) => (
                            <div key={i} className="bg-[#0a1222] px-2 py-1 rounded border border-slate-800/80">
                              <div className="text-[8px] text-slate-400 uppercase">{it.label}</div>
                              <div
                                className={`text-[10px] font-bold truncate ${
                                  it.tone === 'emerald'
                                    ? 'text-emerald-300'
                                    : it.tone === 'amber'
                                    ? 'text-amber-300'
                                    : it.tone === 'rose'
                                    ? 'text-rose-300'
                                    : it.tone === 'purple'
                                    ? 'text-purple-300'
                                    : 'text-cyan-300'
                                }`}
                              >
                                {it.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.action && m.actionLabel && (
                      <button
                        onClick={() => onExecuteCommand(m.action!)}
                        className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-200 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{m.actionLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 border-t border-slate-800 bg-[#060c18] flex items-center gap-1.5"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask Nini (e.g. 'Sitrep', 'Boxwork science', '2x resolution')..."
                className="flex-1 bg-[#040812] border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
