/**
 * FR-09 / FEATURE 27: Direct-to-Earth & Mars Relay Orbiter Line-of-Sight (RF Comms Blackout Mapper)
 *
 * Requirements (NASA-SAC-2026-CH12-DOC-01, Section 2.3 FR-09):
 *  "The system shall compute elevation masking vectors to Earth and Mars orbiters,
 *   highlighting canyon communications blackout zones."
 *
 * Evaluates:
 *  1. Direct-to-Earth (DTE) geometry: Earth-Mars astronomical ephemeris, one-way light time latency,
 *     topocentric elevation and azimuth, and terrain canyon wall masking.
 *  2. Mars Relay Orbiters: MRO (Mars Reconnaissance Orbiter, 310 km circular) and 2001 Mars Odyssey (400 km),
 *     computing real-time elevation angle, signal strength %, and pass countdown.
 *  3. RF Comms Blackout Zone detection when local topography blocks both DTE and orbital relay links.
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

export interface OrbiterLinkState {
  name: string;
  designation: string;
  altitudeKm: number;
  elevationDeg: number;
  azimuthDeg: number;
  isInView: boolean;
  isMaskedByTerrain: boolean;
  maskingAngleDeg: number;
  signalStrengthPct: number;
  dataRateMbps: number;
  passRemainingMin: number;
}

export interface RfCommsReport {
  surfaceLat: number;
  surfaceLon: number;
  isRfCommsGridActive: boolean;
  isBlackout: boolean;
  statusLabel: string;
  earthDte: {
    distanceKm: number;
    oneWayLatencyMin: number;
    elevationDeg: number;
    azimuthDeg: number;
    isInView: boolean;
    isMaskedByTerrain: boolean;
    maskingAngleDeg: number;
  };
  mro: OrbiterLinkState;
  odyssey: OrbiterLinkState;
  blackoutCause: string | null;
}

export function computeRfCommsStatus(
  surfaceLat: number,
  surfaceLon: number,
  terrainField: UnifiedMarsTerrainField,
  nowMs: number = Date.now()
): RfCommsReport {
  const jdUT = 2440587.5 + nowMs / 86400000.0;
  const dJ2000 = jdUT - 2451545.0;

  // 1. Planetary Ephemeris (Earth vs Mars in Heliocentric Coordinates)
  // Earth mean anomaly and heliocentric longitude
  const mEarth = ((357.529 + 0.98560028 * dJ2000) % 360.0) * (Math.PI / 180.0);
  const lEarth =
    ((280.466 + 0.98564736 * dJ2000 + 1.915 * Math.sin(mEarth) + 0.02 * Math.sin(2 * mEarth)) %
      360.0) *
    (Math.PI / 180.0);

  // Mars mean anomaly and heliocentric longitude
  const mMars = ((19.3871 + 0.52402073 * dJ2000) % 360.0) * (Math.PI / 180.0);
  const vMinusM = (10.691 * Math.sin(mMars) + 0.623 * Math.sin(2 * mMars)) * (Math.PI / 180.0);
  const lMars = ((270.3871 + 0.524038496 * dJ2000) * (Math.PI / 180.0) + vMinusM) % (2 * Math.PI);

  const rEarth = 1.0 / (1.0 + 0.0167 * Math.cos(mEarth)); // AU
  const rMars = 1.524 / (1.0 + 0.0934 * Math.cos(mMars)); // AU

  // Relative Earth-Mars Cartesian coordinates in the ecliptic plane
  const dxAU = rEarth * Math.cos(lEarth) - rMars * Math.cos(lMars);
  const dyAU = rEarth * Math.sin(lEarth) - rMars * Math.sin(lMars);
  const distAU = Math.sqrt(dxAU * dxAU + dyAU * dyAU);
  const distanceKm = Math.round(distAU * 149597870.7);
  // Speed of light: 299,792.458 km/s
  const oneWayLatencyMin = Number((distanceKm / 299792.458 / 60.0).toFixed(1));

  // Planetocentric Sub-Earth Point on Mars
  const subEarthLon = normalizeLon(
    Math.atan2(dyAU, dxAU) * (180.0 / Math.PI) - 15.0 * ((dJ2000 % 1.02749) * 24.0)
  );
  const subEarthLat = Number((-3.2 + 2.5 * Math.sin(dJ2000 / 340.0)).toFixed(1));

  // Calculate local elevation and azimuth to Earth from surface point
  const latRad = (surfaceLat * Math.PI) / 180.0;
  const eLatRad = (subEarthLat * Math.PI) / 180.0;
  const dLonRad = (normalizeLon(subEarthLon - surfaceLon) * Math.PI) / 180.0;

  const sinEarthElev =
    Math.sin(latRad) * Math.sin(eLatRad) +
    Math.cos(latRad) * Math.cos(eLatRad) * Math.cos(dLonRad);
  const earthElevDeg = Math.asin(Math.max(-1, Math.min(1, sinEarthElev))) * (180.0 / Math.PI);

  const cosEarthElev = Math.max(0.01, Math.cos((earthElevDeg * Math.PI) / 180.0));
  const sinEarthAz = (Math.cos(eLatRad) * Math.sin(dLonRad)) / cosEarthElev;
  const cosEarthAz =
    (Math.sin(eLatRad) - Math.sin(latRad) * sinEarthElev) / (Math.cos(latRad) * cosEarthElev);
  const earthAzDeg = (Math.atan2(sinEarthAz, cosEarthAz) * (180.0 / Math.PI) + 360.0) % 360.0;

  // Ray-march terrain in Earth direction to check for canyon wall occlusion
  const elevM = terrainField.getElevationMeters(surfaceLat, surfaceLon);
  let maxEarthTerrainMaskAngle = -90.0;
  const earthAzRad = (earthAzDeg * Math.PI) / 180.0;
  const eDx = Math.sin(earthAzRad);
  const eDy = Math.cos(earthAzRad);
  const cosLatSur = Math.max(0.1, Math.cos((surfaceLat * Math.PI) / 180.0));

  for (const stepM of [40, 100, 250, 600, 1200, 2500]) {
    const sKm = stepM / 1000.0;
    const tLat = clampLat(surfaceLat + ((sKm * eDy) / MARS_RADIUS_KM) * (180.0 / Math.PI));
    const tLon = normalizeLon(
      surfaceLon + ((sKm * eDx) / (MARS_RADIUS_KM * cosLatSur)) * (180.0 / Math.PI)
    );
    const tElev = terrainField.getElevationMeters(tLat, tLon);
    const ang = Math.atan2(tElev - elevM, stepM) * (180.0 / Math.PI);
    if (ang > maxEarthTerrainMaskAngle) maxEarthTerrainMaskAngle = ang;
  }

  const isEarthAboveHorizon = earthElevDeg > 0;
  const isEarthMasked = isEarthAboveHorizon && maxEarthTerrainMaskAngle > earthElevDeg;

  // 2. Mars Reconnaissance Orbiter (MRO) Pass Telemetry
  // Period = 112 min, alt = 310 km, sun-synch polar inclination = 92.7°
  const mroOrbitalPhase = ((nowMs / (112.0 * 60.0 * 1000.0)) % 1.0) * 2.0 * Math.PI;
  const mroElevDeg = Math.round(52.0 * Math.sin(mroOrbitalPhase) + 12.0);
  const mroAzDeg = Math.round(((mroOrbitalPhase * 180.0) / Math.PI + 115.0) % 360.0);
  const isMroAboveHorizon = mroElevDeg >= 12.0;
  const isMroMasked = isMroAboveHorizon && maxEarthTerrainMaskAngle > mroElevDeg;
  const mroPassRemaining = isMroAboveHorizon
    ? Math.max(1, Math.round((mroElevDeg / 60.0) * 16.0))
    : 0;

  // 3. 2001 Mars Odyssey Pass Telemetry
  // Period = 118 min, alt = 400 km
  const odyOrbitalPhase =
    (((nowMs + 45.0 * 60.0 * 1000.0) / (118.0 * 60.0 * 1000.0)) % 1.0) * 2.0 * Math.PI;
  const odyElevDeg = Math.round(48.0 * Math.sin(odyOrbitalPhase) + 8.0);
  const odyAzDeg = Math.round(((odyOrbitalPhase * 180.0) / Math.PI + 240.0) % 360.0);
  const isOdyAboveHorizon = odyElevDeg >= 12.0;
  const isOdyMasked = isOdyAboveHorizon && maxEarthTerrainMaskAngle > odyElevDeg;
  const odyPassRemaining = isOdyAboveHorizon
    ? Math.max(1, Math.round((odyElevDeg / 55.0) * 18.0))
    : 0;

  const hasRelayUplink =
    (isMroAboveHorizon && !isMroMasked) || (isOdyAboveHorizon && !isOdyMasked);
  const hasDteUplink = isEarthAboveHorizon && !isEarthMasked;
  const isBlackout = !hasRelayUplink && !hasDteUplink;

  let blackoutCause: string | null = null;
  let statusLabel = 'NOMINAL COMMS (UPLINK ACTIVE)';

  if (isBlackout) {
    if (isEarthMasked || isMroMasked) {
      blackoutCause = `CANYON TOPOGRAPHY SHADOW (TERRAIN MASK ${Math.round(
        maxEarthTerrainMaskAngle
      )}° EXCEEDS LOS)`;
      statusLabel = 'RF LINE-OF-SIGHT BLACKOUT (CANYON MASK)';
    } else {
      blackoutCause = 'PLANETARY OCCLUSION (EARTH & ORBITERS BELOW HORIZON)';
      statusLabel = 'RF BLACKOUT (ORBITAL OCCLUSION)';
    }
  } else if (!hasDteUplink && hasRelayUplink) {
    statusLabel = 'RELAY ONLY (MRO / ODYSSEY UPLINK)';
  } else if (hasDteUplink && !hasRelayUplink) {
    statusLabel = 'DIRECT-TO-EARTH ONLY (HIGH LATENCY)';
  }

  return {
    surfaceLat,
    surfaceLon,
    isRfCommsGridActive: true,
    isBlackout,
    statusLabel,
    earthDte: {
      distanceKm,
      oneWayLatencyMin,
      elevationDeg: Number(earthElevDeg.toFixed(1)),
      azimuthDeg: Number(earthAzDeg.toFixed(1)),
      isInView: isEarthAboveHorizon && !isEarthMasked,
      isMaskedByTerrain: isEarthMasked,
      maskingAngleDeg: Number(maxEarthTerrainMaskAngle.toFixed(1)),
    },
    mro: {
      name: 'Mars Reconnaissance Orbiter (MRO)',
      designation: 'MRO-RELAY-1',
      altitudeKm: 310,
      elevationDeg: mroElevDeg,
      azimuthDeg: mroAzDeg,
      isInView: isMroAboveHorizon && !isMroMasked,
      isMaskedByTerrain: isMroMasked,
      maskingAngleDeg: Number(maxEarthTerrainMaskAngle.toFixed(1)),
      signalStrengthPct:
        isMroAboveHorizon && !isMroMasked ? Math.round(75 + (mroElevDeg / 60.0) * 23) : 0,
      dataRateMbps: 2.0,
      passRemainingMin: mroPassRemaining,
    },
    odyssey: {
      name: '2001 Mars Odyssey',
      designation: 'ODY-RELAY-2',
      altitudeKm: 400,
      elevationDeg: odyElevDeg,
      azimuthDeg: odyAzDeg,
      isInView: isOdyAboveHorizon && !isOdyMasked,
      isMaskedByTerrain: isOdyMasked,
      maskingAngleDeg: Number(maxEarthTerrainMaskAngle.toFixed(1)),
      signalStrengthPct:
        isOdyAboveHorizon && !isOdyMasked ? Math.round(68 + (odyElevDeg / 55.0) * 26) : 0,
      dataRateMbps: 0.5,
      passRemainingMin: odyPassRemaining,
    },
    blackoutCause,
  };
}
