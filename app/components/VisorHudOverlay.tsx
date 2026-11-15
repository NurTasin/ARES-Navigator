'use client';

import React, { useEffect } from 'react';
import { Zap, X, AlertTriangle } from 'lucide-react';
import type { RealMarsEphemeris } from '../MarsGlobeViewer';
import type { SpeHavenReport } from '../algorithms/radHavenSpe';
import type { RfCommsReport } from '../algorithms/rfComms';

export interface VisorTelemetry {
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
  wheelTorques: [number, number, number, number, number, number];
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

export function VisorHudOverlay({
  telemetry,
  ephemeris,
  speReport,
  rfCommsReport,
  traverseMode,
  destinationName,
  distToDestKm,
  bearingToDestDeg,
  onClose,
  onToggleSpe,
}: {
  telemetry: VisorTelemetry;
  ephemeris: RealMarsEphemeris;
  speReport?: SpeHavenReport | null;
  rfCommsReport?: RfCommsReport | null;
  traverseMode: 'ROVER_AUTOPILOT' | 'ASTRONAUT_HIKE';
  destinationName?: string;
  distToDestKm?: number;
  bearingToDestDeg?: number;
  onClose: () => void;
  onToggleSpe?: () => void;
}) {
  // ESC and 'H' hotkeys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Generate 360-degree compass tape tick positions
  const centerHeading = telemetry.headingDeg;
  const compassTicks: { deg: number; label: string; xPct: number }[] = [];
  for (let d = -60; d <= 60; d += 5) {
    const tickDeg = ((centerHeading + d) % 360 + 360) % 360;
    let label = '';
    if (tickDeg === 0) label = 'N';
    else if (tickDeg === 45) label = 'NE';
    else if (tickDeg === 90) label = 'E';
    else if (tickDeg === 135) label = 'SE';
    else if (tickDeg === 180) label = 'S';
    else if (tickDeg === 225) label = 'SW';
    else if (tickDeg === 270) label = 'W';
    else if (tickDeg === 315) label = 'NW';
    else if (tickDeg % 15 === 0) label = `${tickDeg}°`;

    // Map offset [-60, +60] to percentage [0%, 100%]
    const xPct = 50 + (d / 60) * 45;
    compassTicks.push({ deg: tickDeg, label, xPct });
  }

  // Bearing to Destination indicator on compass tape
  let destMarkerXPct: number | null = null;
  if (bearingToDestDeg !== undefined) {
    let diff = bearingToDestDeg - centerHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    if (Math.abs(diff) <= 60) {
      destMarkerXPct = 50 + (diff / 60) * 45;
    }
  }

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 overflow-hidden animate-in fade-in duration-150">
      {/* Helmet Visor Outer Mask & Curvature Hologram */}
      <div className="absolute inset-0 border-[6px] border-cyan-500/30 rounded-[48px] pointer-events-none shadow-[inset_0_0_120px_rgba(0,240,255,0.12),0_0_40px_rgba(0,240,255,0.25)]" />

      {/* Cyber Scanlines Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,240,255,0.25)_50%)] bg-[length:100%_4px]"
      />

      {/* Visor Corner Brackets */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-cyan-400/80 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-cyan-400/80 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-cyan-400/80 rounded-br-xl pointer-events-none" />

      {/* =====================================================================
          TOP VISOR HUD: SCROLLING COMPASS TAPE & MISSION EPHEMERIS
         ===================================================================== */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Top Mission Header */}
        <div className="w-full flex items-center justify-between px-6 py-1 text-[11px] font-mono tracking-widest text-cyan-300">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold uppercase">
              {traverseMode === 'ROVER_AUTOPILOT'
                ? 'xEMU ROVER VISOR HUD // PILOT-1'
                : 'xEMU SPACESUIT VISOR HUD // EV-1 LEAD: SADIA A. PUSPO (BGD)'}
            </span>
            <span className="text-cyan-500/60">|</span>
            <span className="text-amber-300 font-bold">
              SOL {ephemeris.perseveranceSol} • {ephemeris.localSolarTimeStr}
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {speReport?.isAlertActive && (
              <span className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-400 text-rose-200 text-[10px] font-bold animate-pulse flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-300" />
                <span>SPE PROTON ALERT ACTIVE</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-slate-900/80 hover:bg-slate-800 border border-cyan-400/80 text-cyan-200 text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:scale-105 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>EXIT VISOR HUD [H]</span>
            </button>
          </div>
        </div>

        {/* Center Moving Compass Tape */}
        <div className="relative w-full max-w-2xl h-12 mt-1 bg-[#06101c]/80 backdrop-blur-md border border-cyan-500/50 rounded-lg overflow-hidden flex items-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          {/* Compass Center Indicator Needle */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-amber-400 shadow-[0_0_8px_#f59e0b] z-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-amber-400 z-20" />

          {/* Compass Heading Readout Box */}
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/60 font-mono text-xs font-bold text-cyan-200 z-20">
            {String(centerHeading).padStart(3, '0')}° {telemetry.compassDir}
          </div>

          {/* Compass Ticks */}
          {compassTicks.map((t, idx) => (
            <div
              key={idx}
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{ left: `${t.xPct}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className={`w-[1px] ${
                  t.label ? 'h-3 bg-cyan-300' : 'h-1.5 bg-cyan-600/70'
                }`}
              />
              {t.label && (
                <span className="text-[10px] font-mono font-bold text-cyan-200 mt-0.5">
                  {t.label}
                </span>
              )}
            </div>
          ))}

          {/* Waypoint Marker on Compass Tape */}
          {destMarkerXPct !== null && (
            <div
              className="absolute top-1 flex flex-col items-center z-15"
              style={{ left: `${destMarkerXPct}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-cyan-300 animate-bounce" />
              <span className="text-[9px] font-mono font-bold text-cyan-200 bg-cyan-950/90 px-1 rounded border border-cyan-400/60">
                B
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          MIDDLE VISOR BODY: PITCH/ROLL LADDER, FLIGHT VECTORS & HUD SIGHT
         ===================================================================== */}
      <div className="relative flex-1 flex items-center justify-between px-4 md:px-8 pointer-events-none">
        {/* Left HUD Panel: Gyro-Attitude & Bio-Terramechanic Load */}
        <div className="bg-[#050f1c]/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-4 w-64 space-y-3 shadow-[0_0_20px_rgba(0,240,255,0.15)] pointer-events-auto">
          <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider border-b border-cyan-500/30 pb-1 flex justify-between">
            <span>BIO-TERRAMECHANICS</span>
            <span className="text-amber-300 font-bold">0.38g MARS</span>
          </div>

          {/* Metabolic Power (Modified Santee-Pandolf at 0.38g) */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-300">
              <span>METABOLIC WORKLOAD:</span>
              <span className="text-amber-300 font-bold">{telemetry.metabolicWatts} W</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden mt-1">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  telemetry.metabolicWatts > 450
                    ? 'bg-rose-500'
                    : telemetry.metabolicWatts > 300
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (telemetry.metabolicWatts / 600) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
              Santee-Pandolf (Sadia A. Puspo: W=62kg, PLSS=130kg, 0.38g)
            </div>
          </div>

          {/* Heart Rate & Speed */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#081526] p-2 rounded-lg border border-slate-700/60">
              <div className="text-[9px] text-slate-400 uppercase">HEART RATE</div>
              <div className="text-base font-bold text-slate-100 flex items-center gap-1">
                <span>{telemetry.heartRateBpm}</span>
                <span className="text-[10px] text-rose-400 font-normal">BPM</span>
              </div>
            </div>
            <div className="bg-[#081526] p-2 rounded-lg border border-slate-700/60">
              <div className="text-[9px] text-slate-400 uppercase">TRAVERSE VELOCITY</div>
              <div className="text-base font-bold text-cyan-300 flex items-center gap-1">
                <span>{telemetry.speedKmh}</span>
                <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </div>
            </div>
          </div>

          {/* Attitude: Pitch & Roll */}
          <div className="space-y-1 text-xs font-mono pt-1 border-t border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">CHASSIS / SUIT PITCH:</span>
              <span
                className={`font-bold ${
                  Math.abs(telemetry.pitchDeg) > 15 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {telemetry.pitchDeg >= 0 ? `+${telemetry.pitchDeg}°` : `${telemetry.pitchDeg}°`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">LATERAL ROLL:</span>
              <span className="font-bold text-cyan-300">
                {telemetry.rollDeg >= 0 ? `+${telemetry.rollDeg}°` : `${telemetry.rollDeg}°`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SURFACE SLOPE:</span>
              <span
                className={`font-bold ${
                  telemetry.slopeDeg > 15
                    ? 'text-rose-400'
                    : telemetry.slopeDeg >= 8
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {telemetry.slopeDeg}°
              </span>
            </div>
          </div>
        </div>

        {/* Center Crosshair / Horizon Reticle */}
        <div className="relative w-48 h-48 flex items-center justify-center pointer-events-none">
          {/* Pitch Ladder Marks */}
          <div
            className="w-full flex flex-col items-center gap-4 transition-transform duration-100"
            style={{
              transform: `rotate(${-telemetry.rollDeg}deg) translateY(${telemetry.pitchDeg * 2}px)`,
            }}
          >
            <div className="w-16 h-[1.5px] bg-cyan-400/40 border-t border-cyan-400/60" />
            <div className="w-28 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00f0ff] flex items-center justify-between">
              <span className="text-[8px] font-mono text-cyan-300 -translate-y-3">-10°</span>
              <span className="text-[8px] font-mono text-cyan-300 -translate-y-3">+10°</span>
            </div>
            <div className="w-16 h-[1.5px] bg-cyan-400/40 border-t border-cyan-400/60" />
          </div>

          {/* Center Tactical Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
            </div>
          </div>
        </div>

        {/* Right HUD Panel: PLSS Tri-Expendables & Comms Status */}
        <div className="bg-[#050f1c]/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-4 w-72 space-y-3 shadow-[0_0_20px_rgba(0,240,255,0.15)] pointer-events-auto">
          <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider border-b border-cyan-500/30 pb-1 flex justify-between">
            <span>PLSS TRI-EXPENDABLES</span>
            <span className="text-cyan-400">EVA RULE OF HALF</span>
          </div>

          {/* Sublimator Feedwater Cooling Water */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-300">
              <span>FEEDWATER SUBLIMATOR:</span>
              <span className="text-cyan-300 font-bold">
                {telemetry.waterReservePct}% ({telemetry.waterBurnGph} g/h)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  telemetry.waterReservePct < 40 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${telemetry.waterReservePct}%` }}
              />
            </div>
          </div>

          {/* Primary O2 Gas Reserve */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-300">
              <span>PRIMARY O₂ TANKS (25 MPa):</span>
              <span className="text-emerald-300 font-bold">{telemetry.o2ReservePct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded transition-all duration-300"
                style={{ width: `${telemetry.o2ReservePct}%` }}
              />
            </div>
          </div>

          {/* LiOH CO2 Scrubber */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-300">
              <span>LiOH CO₂ SCRUBBER:</span>
              <span className="text-amber-300 font-bold">{telemetry.liohReservePct}% USABLE</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded transition-all duration-300"
                style={{ width: `${telemetry.liohReservePct}%` }}
              />
            </div>
          </div>

          {/* Suit Pressure & Radiation */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-800">
            <div className="bg-[#081526] p-1.5 rounded border border-slate-700/60">
              <div className="text-[9px] text-slate-400 uppercase">SUIT PRESSURE</div>
              <div className="text-xs font-bold text-slate-100">
                {telemetry.suitPressureKpa} kPa (4.3 psi)
              </div>
            </div>
            <div className="bg-[#081526] p-1.5 rounded border border-slate-700/60">
              <div className="text-[9px] text-slate-400 uppercase">RAD DOSIMETER</div>
              <div className="text-xs font-bold text-amber-300">
                {telemetry.radiationMsvH} mSv/h
              </div>
            </div>
          </div>

          {/* RF Comms & Relay Orbiter Link Status */}
          <div className="space-y-1 text-[10px] font-mono pt-1 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">RF COMMS LINK:</span>
              <span
                className={`font-bold ${
                  rfCommsReport?.isBlackout ? 'text-rose-400 animate-pulse' : 'text-emerald-300'
                }`}
              >
                {rfCommsReport?.statusLabel ?? 'NOMINAL (DTE LINK)'}
              </span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>EARTH DTE LATENCY: {rfCommsReport?.earthDte ? `${rfCommsReport.earthDte.oneWayLatencyMin}m` : '14.2m'}</span>
              <span>MRO: {rfCommsReport?.mro?.isInView ? `${rfCommsReport.mro.signalStrengthPct}%` : '92% (ACTIVE)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BOTTOM VISOR HUD: NAVIGATION DIRECTIVES & TACTICAL PROMPT
         ===================================================================== */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Destination Directive Banner */}
        <div className="bg-[#06101c]/90 backdrop-blur-md border border-cyan-500/50 px-6 py-2 rounded-xl flex items-center gap-6 shadow-[0_0_25px_rgba(0,240,255,0.25)] pointer-events-auto">
          {speReport?.isAlertActive && speReport.bestHaven ? (
            <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>EMERGENCY SPE EVACUATION:</span>
              <span>
                HEAD {String(Math.round(bearingToDestDeg || 0)).padStart(3, '0')}° • {speReport.bestHaven.distKm} KM TO {speReport.bestHaven.name} (ETA {speReport.bestHaven.evacTimeMin} MIN)
              </span>
            </div>
          ) : destinationName ? (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-cyan-300 font-bold uppercase">
                TARGET: {destinationName}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-200">
                BEARING:{' '}
                <strong className="text-amber-300">
                  {bearingToDestDeg !== undefined ? `${String(Math.round(bearingToDestDeg)).padStart(3, '0')}°` : '---'}
                </strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-200">
                DISTANCE:{' '}
                <strong className="text-emerald-300">
                  {distToDestKm !== undefined ? `${distToDestKm.toFixed(2)} km` : '---'}
                </strong>
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-slate-300">
              EXPLORATION MODE // SELECT DESTINATION (B2) ON MAP OR USE SEARCH BAR
            </div>
          )}

          <div className="flex items-center gap-2">
            {onToggleSpe && (
              <button
                onClick={onToggleSpe}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all border ${
                  speReport?.isAlertActive
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {speReport?.isAlertActive ? 'CLEAR SPE ALERT' : 'SIMULATE SPE ALERT'}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Help Text */}
        <div className="text-[10px] font-mono text-cyan-400/80 tracking-widest uppercase mt-2">
          PRESS &apos;H&apos; OR ESC TO RETURN TO TACTICAL COCKPIT VIEW
        </div>
      </div>
    </div>
  );
}
