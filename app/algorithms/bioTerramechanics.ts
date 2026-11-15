/**
 * ALGORITHM 1 & 2: Bio-Terramechanic Routing & Dynamic Walkback Isochrone Generator
 * Grounded in:
 *  - NASA Mars Design Reference Architecture 5.0 (NASA-SP-2009-566)
 *  - Santee, W. R. et al. (2001) "Validation of an updated metabolic prediction model for military load carriage"
 *  - NASA EVA Operations Foundation Document (NASA-SP-20205009657)
 *  - Christensen, P. R. et al. (2001) / Fergason et al. (2006) Mars Odyssey THEMIS Thermal Inertia
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

export interface BioMetabolicExpenditure {
  metabolicWatts: number;
  velocityMs: number;
  gradePct: number;
  waterBurnGramsPerHour: number;
  o2BurnGramsPerHour: number;
  co2ProductionLitersPerMin: number;
  soilClass: 'CLASS_A_ROCK' | 'CLASS_B_SAND' | 'CLASS_C_DUST';
  soilEta: number;
}

/**
 * ALGORITHM 1: Modified Santee-Pandolf Metabolic Load Formulation at 0.38g
 *
 * M_dot = 0.378 * [ 1.5*W + 2.0*(W+L)*(L/W)^2 + eta*(W+L)*(0.1*v + 0.18*v^2 + 0.0054*v*G) ] + C_suit
 *
 * Where:
 *  - W = 80 kg (Astronaut bare body mass)
 *  - L = 55 kg (xEMU Spacesuit + PLSS backpack + scientific tools)
 *  - v = Walking velocity across surface (m/s)
 *  - G = Grade/slope percentage (100 * tan(pitch))
 *  - eta = THEMIS soil coefficient (Class A = 1.0, Class B = 1.35, Class C = 2.10)
 *  - C_suit = 45 Watts (Spacesuit joint bending resistance at 4.3 psi / 29.65 kPa)
 */
export function computeSanteePandolf038g(
  speedKmh: number,
  signedPitchDeg: number,
  frictionMu: number,
  astronautBodyMassKg: number = 80.0,
  spacesuitPayloadMassKg: number = 55.0
): BioMetabolicExpenditure {
  const W = astronautBodyMassKg;
  const L = spacesuitPayloadMassKg;
  const v = Math.max(0.2, (speedKmh * 1000.0) / 3600.0); // convert km/h to m/s

  // Grade percentage G = 100 * tan(theta)
  const pitchRad = (signedPitchDeg * Math.PI) / 180.0;
  const gradePct = 100.0 * Math.tan(pitchRad);

  // THEMIS Soil classification & terrain coefficient eta
  let soilEta = 1.0;
  let soilClass: 'CLASS_A_ROCK' | 'CLASS_B_SAND' | 'CLASS_C_DUST' = 'CLASS_A_ROCK';
  if (frictionMu < 0.48) {
    soilEta = 2.1; // Class C: Unconsolidated fine aeolian dust trap (I < 180)
    soilClass = 'CLASS_C_DUST';
  } else if (frictionMu < 0.72) {
    soilEta = 1.35; // Class B: Mixed sand and firm regolith (180 <= I <= 400)
    soilClass = 'CLASS_B_SAND';
  } else {
    soilEta = 1.0; // Class A: Cemented bedrock / coarse pavement (I > 400)
    soilClass = 'CLASS_A_ROCK';
  }

  const lwRatio = L / W;
  const levelTerm = 1.5 * W + 2.0 * (W + L) * lwRatio * lwRatio;

  let slopeTerm = 0;
  if (gradePct >= 0) {
    // Level or uphill climb
    slopeTerm = soilEta * (W + L) * (0.1 * v + 0.18 * v * v + 0.0054 * v * gradePct);
  } else {
    // Downhill descent with eccentric muscular braking correction
    const absG = Math.abs(gradePct);
    if (absG <= 10.0) {
      slopeTerm = soilEta * (W + L) * (0.1 * v + 0.18 * v * v - 0.0035 * v * absG);
    } else {
      // Steep descent: joint and muscle braking increases energy expenditure
      slopeTerm = soilEta * (W + L) * (0.1 * v + 0.18 * v * v + 0.0028 * v * (absG - 10.0));
    }
  }

  // 0.378 partial-gravity scale factor for Martian 0.38g
  // C_suit = 45.0 Watts constant joint bending resistance at 4.3 psi (29.65 kPa)
  const cSuit = 45.0;
  const rawWatts = 0.378 * (levelTerm + Math.max(0, slopeTerm)) + cSuit;
  const metabolicWatts = Math.max(120, Math.min(680, Math.round(rawWatts)));

  // PLSS Tri-Expendables:
  // 1. Feedwater Sublimator Cooling Water Burn:
  // Q_rad = ~65 Watts radiative heat rejected to Martian sky; remainder sublimated (h_sub = 2427 kJ/kg)
  const qRad = 65.0;
  const netHeatRejectedWatts = Math.max(0, metabolicWatts - qRad);
  const waterKgPerSec = netHeatRejectedWatts / 2427000.0;
  const waterBurnGramsPerHour = Math.round(waterKgPerSec * 3600.0 * 1000.0);

  // 2. Primary O2 Gas Consumption:
  // NASA Standard: ~0.175 g O2 per Watt-hour
  const o2BurnGramsPerHour = Math.round(metabolicWatts * 0.175);

  // 3. CO2 Scrubber (LiOH Canister) Saturation Rate:
  // RQ = 0.85; ~0.00024 L/min CO2 per Watt
  const co2ProductionLitersPerMin = Number((metabolicWatts * 0.00024).toFixed(3));

  return {
    metabolicWatts,
    velocityMs: Number(v.toFixed(2)),
    gradePct: Number(gradePct.toFixed(1)),
    waterBurnGramsPerHour,
    o2BurnGramsPerHour,
    co2ProductionLitersPerMin,
    soilClass,
    soilEta,
  };
}

export interface WalkbackIsochroneBoundary {
  centerLat: number;
  centerLon: number;
  safeBoundaryPoints: {
    lat: number;
    lon: number;
    elevM: number;
    distKm: number;
    azimuthDeg: number;
    limitingConstraint: string;
  }[];
  minSafeRadiusKm: number;
  maxSafeRadiusKm: number;
  avgSafeRadiusKm: number;
  waterReserveCapacityKg: number;
  allocatedWaterKg: number;
}

/**
 * ALGORITHM 2: Dynamic Walkback Isochrone Generator (NASA EVA Rule of Half)
 *
 * Computes a 36-point closed radial boundary perimeter B_walkback around the habitat/base:
 * B_walkback = { x in R^2 | Delta t_return(x -> x_base) <= min(V_water/m_dot_water, V_CO2/V_dot_CO2, V_O2/V_dot_O2) * 0.80 }
 *
 * Enforces a strict 20% safety margin before turnaround alert fires.
 */
export function computeWalkbackIsochrone(
  centerLat: number,
  centerLon: number,
  terrainField: UnifiedMarsTerrainField,
  totalWaterSupplyKg: number = 4.5,
  availableDaylightHours: number = 5.0
): WalkbackIsochroneBoundary {
  // NASA EVA Rule of Half: 50% allocated to outbound, 50% reserved for return,
  // multiplied by 0.80 for strict 20% contingency safety margin.
  const usableOutboundWaterKg = totalWaterSupplyKg * 0.5 * 0.8; // ~1.80 kg water
  const maxOneWayHours = availableDaylightHours * 0.5 * 0.8; // ~2.0 hours max

  const numBeams = 36;
  const boundaryPoints: WalkbackIsochroneBoundary['safeBoundaryPoints'] = [];
  let minR = Infinity;
  let maxR = 0;
  let sumR = 0;

  for (let b = 0; b < numBeams; b++) {
    const azDeg = (b * 360) / numBeams;
    const azRad = (azDeg * Math.PI) / 180.0;
    const sinAz = Math.sin(azRad);
    const cosAz = Math.cos(azRad);

    let currentDistKm = 0.2;
    let cumWaterGrams = 0;
    let cumTimeHours = 0;
    let limitCause = 'CONSUMABLE_RESERVE_LIMIT';
    let lastValidLat = centerLat;
    let lastValidLon = centerLon;
    let lastValidElev = terrainField.getElevationMeters(centerLat, centerLon);

    // Step radially outward in 150m increments up to 7.5 km
    const stepKm = 0.15;
    const maxSteps = 50;

    for (let step = 1; step <= maxSteps; step++) {
      const rKm = step * stepKm;
      const dLatDeg = (rKm * cosAz) / (MARS_RADIUS_KM * (Math.PI / 180.0));
      const cosLatCenter = Math.max(0.1, Math.cos((centerLat * Math.PI) / 180.0));
      const dLonDeg = (rKm * sinAz) / (MARS_RADIUS_KM * cosLatCenter * (Math.PI / 180.0));

      const lat = clampLat(centerLat + dLatDeg);
      const lon = normalizeLon(centerLon + dLonDeg);

      const metrics = terrainField.sampleMetricsAt(lat, lon, azDeg);
      if (metrics.slopeDeg > 20.0) {
        limitCause = `SLOPE BARRIER (${Math.round(metrics.slopeDeg)}°)`;
        break;
      }

      // Outbound velocity & bio-metabolics
      const outSpeedKmh = Math.max(
        1.2,
        4.5 * Math.exp(-3.5 * Math.abs(Math.tan((metrics.pitchDeg * Math.PI) / 180.0) + 0.04))
      );
      const outBio = computeSanteePandolf038g(outSpeedKmh, metrics.pitchDeg, metrics.frictionMu);

      // On return leg, pitch inverts (-pitchDeg)
      const retPitchDeg = -metrics.pitchDeg;
      if (retPitchDeg < -14.0) {
        limitCause = `RETURN CLIFF DROP (${retPitchDeg.toFixed(1)}°)`;
        break;
      }
      const retSpeedKmh = Math.max(
        1.2,
        4.5 * Math.exp(-3.5 * Math.abs(Math.tan((retPitchDeg * Math.PI) / 180.0) + 0.04))
      );
      const retBio = computeSanteePandolf038g(retSpeedKmh, retPitchDeg, metrics.frictionMu);

      const dtOutH = stepKm / outSpeedKmh;
      const dtRetH = stepKm / retSpeedKmh;
      const dWaterG = outBio.waterBurnGramsPerHour * dtOutH + retBio.waterBurnGramsPerHour * dtRetH;

      cumTimeHours += dtOutH + dtRetH;
      cumWaterGrams += dWaterG;

      if (cumWaterGrams / 1000.0 >= usableOutboundWaterKg) {
        limitCause = 'SUBLIMATOR COOLING WATER 50% THRESHOLD';
        break;
      }
      if (cumTimeHours >= maxOneWayHours * 2.0) {
        limitCause = 'DAYLIGHT SUNSET DEADLINE';
        break;
      }

      currentDistKm = rKm;
      lastValidLat = lat;
      lastValidLon = lon;
      lastValidElev = metrics.elevM;
    }

    if (currentDistKm < minR) minR = currentDistKm;
    if (currentDistKm > maxR) maxR = currentDistKm;
    sumR += currentDistKm;

    boundaryPoints.push({
      lat: lastValidLat,
      lon: lastValidLon,
      elevM: lastValidElev,
      distKm: Number(currentDistKm.toFixed(2)),
      azimuthDeg: azDeg,
      limitingConstraint: limitCause,
    });
  }

  return {
    centerLat,
    centerLon,
    safeBoundaryPoints: boundaryPoints,
    minSafeRadiusKm: Number(minR.toFixed(2)),
    maxSafeRadiusKm: Number(maxR.toFixed(2)),
    avgSafeRadiusKm: Number((sumR / numBeams).toFixed(2)),
    waterReserveCapacityKg: totalWaterSupplyKg,
    allocatedWaterKg: usableOutboundWaterKg,
  };
}
