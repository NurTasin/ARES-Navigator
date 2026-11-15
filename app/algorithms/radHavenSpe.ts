/**
 * FR-07 / FEATURE 13 / ALGORITHM 3: RAD-HAVEN 3D Topographic Ray-Tracing & SPE Radiation Haven Router
 *
 * Algorithm from Formal Engineering Specification (NASA-SAC-2026-CH12-DOC-01, Chapter 4):
 * Proton Flux Terrain Occlusion:
 *  If theta_shield(phi_solar) >= theta_solar_elevation:
 *    Dose_surface = Dose_free_space * (1 - Shielding_Fraction) [Shielding_Fraction = 0.60 to 0.90]
 *    Location is marked as an active Natural Radiation Bunker.
 *
 * Sequence Flow (Spec Page 9):
 *  Astronaut UI Viewport -> Trigger SPE Alert -> Compute Haven Vector -> Query Cliff Heights ->
 *  Return 3D Elevation -> Calculate Proton Ray-Trace -> Locate >20m Cliff Alcove ->
 *  Return Evac Route -> Display Red Vector and Pacing Command.
 */

import type { UnifiedMarsTerrainField } from '../MarsGlobeViewer';

const MARS_RADIUS_KM = 3389.5;

function clampLat(lat: number): number {
  return Math.max(-85.0, Math.min(85.0, lat));
}

function normalizeLon(lon: number): number {
  let l = (lon + 180) % 360;
  if (l < 0) l += 360;
  return l - 180;
}

function surfaceDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = (normalizeLon(lon2 - lon1) * Math.PI) / 180;
  const midLat = (((lat1 + lat2) * 0.5) * Math.PI) / 180;
  const dx = dLon * Math.cos(midLat) * MARS_RADIUS_KM;
  const dy = dLat * MARS_RADIUS_KM;
  return Math.sqrt(dx * dx + dy * dy);
}

export interface SpeHavenCandidate {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevM: number;
  distKm: number;
  reliefM: number;
  shieldingAngleDeg: number;
  solarElevationDeg: number;
  shieldingFraction: number; // 0.60 to 0.90
  evacTimeMin: number;
  isWithin30MinWindow: boolean;
  evacRoute: { lat: number; lon: number; elevM: number }[];
}

export interface SpeHavenReport {
  isAlertActive: boolean;
  alertSol: number;
  protonFluxLevel: string;
  solarElevationDeg: number;
  solarAzimuthDeg: number;
  bestHaven: SpeHavenCandidate | null;
  allCandidates: SpeHavenCandidate[];
  tacticalInstruction: string;
}

export function computeRadHavenSpe(
  originLat: number,
  originLon: number,
  terrainField: UnifiedMarsTerrainField,
  subsolarLat: number,
  subsolarLon: number,
  sol: number
): SpeHavenReport {
  // 1. Calculate Solar Elevation and Azimuth at Origin
  const latRad = (originLat * Math.PI) / 180.0;
  const sLatRad = (subsolarLat * Math.PI) / 180.0;
  const dLonRad = (normalizeLon(subsolarLon - originLon) * Math.PI) / 180.0;

  const sinElev =
    Math.sin(latRad) * Math.sin(sLatRad) +
    Math.cos(latRad) * Math.cos(sLatRad) * Math.cos(dLonRad);
  const solarElevDeg = Math.asin(Math.max(-1, Math.min(1, sinElev))) * (180.0 / Math.PI);

  const cosElev = Math.max(0.01, Math.cos((solarElevDeg * Math.PI) / 180.0));
  const sinAz = (Math.cos(sLatRad) * Math.sin(dLonRad)) / cosElev;
  const cosAz =
    (Math.sin(sLatRad) - Math.sin(latRad) * sinElev) / (Math.cos(latRad) * cosElev);
  const solarAzDeg = (Math.atan2(sinAz, cosAz) * (180.0 / Math.PI) + 360.0) % 360.0;

  // 2. Vector pointing TOWARDS the Sun across the terrain
  const sunAzRad = (solarAzDeg * Math.PI) / 180.0;
  const sunDx = Math.sin(sunAzRad);
  const sunDy = Math.cos(sunAzRad);

  // 3. Scan a 3.4 km operational search envelope around origin for natural cliff overhangs
  const GRID_DIM = 24;
  const spanKm = 3.4;
  const stepKm = spanKm / (GRID_DIM - 1);
  const halfSpan = spanKm * 0.5;

  const candidates: SpeHavenCandidate[] = [];

  for (let r = 0; r < GRID_DIM; r++) {
    const dY = r * stepKm - halfSpan;
    const lat = clampLat(originLat + (dY / MARS_RADIUS_KM) * (180.0 / Math.PI));
    const cosLat = Math.max(0.1, Math.cos((lat * Math.PI) / 180.0));

    for (let c = 0; c < GRID_DIM; c++) {
      const dX = c * stepKm - halfSpan;
      const lon = normalizeLon(originLon + (dX / (MARS_RADIUS_KM * cosLat)) * (180.0 / Math.PI));

      const distKm = surfaceDistanceKm(originLat, originLon, lat, lon);
      if (distKm < 0.1 || distKm > 3.0) continue;

      const baseMetrics = terrainField.sampleMetricsAt(lat, lon, 0);
      // Haven base must be safe to stand (<16° slope)
      if (baseMetrics.slopeDeg > 16.0) continue;

      // Ray-trace towards the Sun along multiple probe baselines
      let maxOcclusionAngle = -90.0;
      let maxRelief = 0;

      const probeSteps = [25, 50, 100, 200, 350, 600]; // sample baselines in meters
      for (const pDistM of probeSteps) {
        const pKm = pDistM / 1000.0;
        const pLat = clampLat(lat + ((pKm * sunDy) / MARS_RADIUS_KM) * (180.0 / Math.PI));
        const pLon = normalizeLon(lon + ((pKm * sunDx) / (MARS_RADIUS_KM * cosLat)) * (180.0 / Math.PI));

        const probeElev = terrainField.getElevationMeters(pLat, pLon);
        const dz = probeElev - baseMetrics.elevM;
        if (dz > maxRelief) maxRelief = dz;

        const rayAngle = Math.atan2(dz, pDistM) * (180.0 / Math.PI);
        if (rayAngle > maxOcclusionAngle) maxOcclusionAngle = rayAngle;
      }

      // Requirement: Cliff relief >= 18m and terrain blocking angle >= solar elevation
      const isBlocking = solarElevDeg <= 0 || maxOcclusionAngle >= solarElevDeg - 2.5;

      if (maxRelief >= 18.0 && isBlocking) {
        const shieldExcess = Math.max(0, maxOcclusionAngle - Math.max(0, solarElevDeg));
        const shieldingFraction = Math.min(
          0.92,
          0.62 + Math.min(0.2, (maxRelief / 80.0) * 0.2) + Math.min(0.1, (shieldExcess / 30.0) * 0.1)
        );

        // Evacuation time at brisk astronaut stride (3.8 km/h ~ 1.05 m/s)
        const evacTimeMin = Math.round((distKm / 3.8) * 60.0);
        const midLat = originLat * 0.5 + lat * 0.5;
        const midLon = originLon * 0.5 + lon * 0.5;

        candidates.push({
          id: `haven-${r}-${c}`,
          name: `${Math.round(maxRelief)}m Cliff Alcove (${Math.round(shieldingFraction * 100)}% Shield)`,
          lat,
          lon,
          elevM: baseMetrics.elevM,
          distKm: Number(distKm.toFixed(2)),
          reliefM: Math.round(maxRelief),
          shieldingAngleDeg: Number(maxOcclusionAngle.toFixed(1)),
          solarElevationDeg: Number(solarElevDeg.toFixed(1)),
          shieldingFraction: Number(shieldingFraction.toFixed(2)),
          evacTimeMin,
          isWithin30MinWindow: evacTimeMin <= 30,
          evacRoute: [
            { lat: originLat, lon: originLon, elevM: terrainField.getElevationMeters(originLat, originLon) },
            { lat: midLat, lon: midLon, elevM: terrainField.getElevationMeters(midLat, midLon) },
            { lat, lon, elevM: baseMetrics.elevM },
          ],
        });
      }
    }
  }

  // Sort candidates by:
  // 1. Within 30-min window first
  // 2. Highest shielding fraction
  // 3. Lowest distance
  candidates.sort((a, b) => {
    if (a.isWithin30MinWindow && !b.isWithin30MinWindow) return -1;
    if (!a.isWithin30MinWindow && b.isWithin30MinWindow) return 1;
    return b.shieldingFraction - a.shieldingFraction || a.distKm - b.distKm;
  });

  const bestHaven = candidates.length > 0 ? candidates[0] : null;
  const tacticalInstruction = bestHaven
    ? `ARES-COPILOT: SPE EVACUATION VECTOR ACTIVE. PROCEED AT 1.1 M/S TO ${bestHaven.reliefM}M CLIFF ALCOVE (${Math.round(bestHaven.shieldingFraction * 100)}% PROTON FLUX SHIELD). ETA ${bestHaven.evacTimeMin} MIN.`
    : 'NO NATURAL CLIFF ALCOVE WITHIN 30-MIN RADIUS. SEEK LOWEST TOPOGRAPHIC DEPRESSION AND ACTIVATE SUIT LCVG WATER ABSORPTION PROTOCOL.';

  return {
    isAlertActive: true,
    alertSol: sol,
    protonFluxLevel: 'EXTREME (>100 MeV / 1,420 pfu)',
    solarElevationDeg: Number(solarElevDeg.toFixed(1)),
    solarAzimuthDeg: Number(solarAzDeg.toFixed(1)),
    bestHaven,
    allCandidates: candidates.slice(0, 5),
    tacticalInstruction,
  };
}
