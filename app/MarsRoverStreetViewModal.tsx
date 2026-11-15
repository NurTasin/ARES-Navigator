'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface RoverPanoramaStation {
  id: string;
  code: string;
  siteId: 'jezero-delta' | 'mount-sharp-gale';
  roverName: 'PERSEVERANCE (M20)' | 'CURIOSITY (MSL)';
  instrument: string;
  title: string;
  subtitle: string;
  piaId: string;
  fastTier: 'large' | 'medium' | 'orig';
  hdTier: 'orig' | 'large';
  sol: number;
  lat: number;
  lon: number;
  elevM: number;
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
  elMinDeg: number;
  elMaxDeg: number;
  description: string;
}

export const ROVER_PANORAMA_STATIONS: RoverPanoramaStation[] = [
  // ==========================================================================
  // JEZERO CRATER DELTA FRONT (PERSEVERANCE ROVER — 5 STATIONS)
  // ==========================================================================
  {
    id: 'jez-cam-01',
    code: 'CAM-01',
    siteId: 'jezero-delta',
    roverName: 'PERSEVERANCE (M20)',
    instrument: 'Mastcam-Z Stereo 360° Mosaic (142 Frames)',
    title: 'Octavia E. Butler Landing Site',
    subtitle: "Mastcam-Z's First High-Resolution 360° Panorama in Jezero Crater",
    piaId: 'PIA24264',
    fastTier: 'large',
    hdTier: 'orig',
    sol: 3,
    lat: 18.4447,
    lon: 77.4508,
    elevM: -2540,
    rollDeg: 1.1,
    pitchDeg: -0.6,
    yawDeg: 88,
    elMinDeg: -62,
    elMaxDeg: 26,
    description:
      'Captured on Sol 3 from the Octavia E. Butler landing site. Shows the ancient Jezero Crater rim on the horizon and the eroded remnant of the western river delta.',
  },
  {
    id: 'jez-cam-02',
    code: 'CAM-02',
    siteId: 'jezero-delta',
    roverName: 'PERSEVERANCE (M20)',
    instrument: 'Mastcam-Z 360° Telephoto Mosaic',
    title: 'Van Zyl Overlook (Wright Brothers Field)',
    subtitle: '360° Surface View of Ingenuity Helicopter Airfield & Crater Floor',
    piaId: 'PIA24663',
    fastTier: 'large',
    hdTier: 'large',
    sol: 53,
    lat: 18.4525,
    lon: 77.4562,
    elevM: -2535,
    rollDeg: 1.8,
    pitchDeg: -1.2,
    yawDeg: 112,
    elMinDeg: -58,
    elMaxDeg: 24,
    description:
      'Captured from Van Zyl Overlook watching over Wright Brothers Field where the Ingenuity Mars Helicopter performed the first powered aircraft flights on another planet.',
  },
  {
    id: 'jez-cam-03',
    code: 'CAM-03',
    siteId: 'jezero-delta',
    roverName: 'PERSEVERANCE (M20)',
    instrument: 'Mastcam-Z 360° Geologic Panorama',
    title: 'South Séítah Basin & Kodiak Butte View',
    subtitle: 'Layered Olivine Cumulate Outcrops & Ancient Delta Remnant',
    piaId: 'PIA24921',
    fastTier: 'large',
    hdTier: 'orig',
    sol: 170,
    lat: 18.4285,
    lon: 77.4395,
    elevM: -2558,
    rollDeg: 3.4,
    pitchDeg: 2.1,
    yawDeg: 315,
    elMinDeg: -60,
    elMaxDeg: 28,
    description:
      'Looks across the dune-rippled South Séítah geologic unit toward the flat-topped Kodiak delta remnant and the steep western Jezero delta front.',
  },
  {
    id: 'jez-cam-04',
    code: 'CAM-04',
    siteId: 'jezero-delta',
    roverName: 'PERSEVERANCE (M20)',
    instrument: 'Mastcam-Z 360° Escarpment Panorama',
    title: 'Three Forks Sample Depot & Delta Base',
    subtitle: 'Approaching the 40-Meter Escarpment of the Ancient River Delta',
    piaId: 'PIA25212',
    fastTier: 'large',
    hdTier: 'large',
    sol: 411,
    lat: 18.4492,
    lon: 77.4318,
    elevM: -2512,
    rollDeg: -2.1,
    pitchDeg: 3.8,
    yawDeg: 284,
    elMinDeg: -48,
    elMaxDeg: 22,
    description:
      'Taken directly at the foot of the Jezero western river delta near the Three Forks sample depot, showing finely laminated sedimentary mudstones and boulder conglomerates.',
  },
  {
    id: 'jez-cam-05',
    code: 'CAM-05',
    siteId: 'jezero-delta',
    roverName: 'PERSEVERANCE (M20)',
    instrument: 'Navcam 360° Full-Deck & Horizon Mosaic',
    title: 'Upper Western Delta Front Ascent',
    subtitle: 'Wide-Angle 360° Navigation Camera View Including Rover Deck',
    piaId: 'PIA24422',
    fastTier: 'orig',
    hdTier: 'orig',
    sol: 4,
    lat: 18.4628,
    lon: 77.4165,
    elevM: -2465,
    rollDeg: 0.9,
    pitchDeg: 1.4,
    yawDeg: 45,
    elMinDeg: -68,
    elMaxDeg: 25,
    description:
      'Full 360-degree Navigation Camera (Navcam) surface panorama capturing both the surrounding Jezero terrain and Perseverance’s aluminium wheels and deck hardware.',
  },

  // ==========================================================================
  // MOUNT SHARP / GALE CRATER (CURIOSITY ROVER — 5 STATIONS)
  // ==========================================================================
  {
    id: 'gale-cam-01',
    code: 'CAM-06',
    siteId: 'mount-sharp-gale',
    roverName: 'CURIOSITY (MSL)',
    instrument: 'Mastcam 360° Full-Color Mosaic',
    title: 'Bradbury Landing Site Vista',
    subtitle: '360° Panorama Looking Toward the 5.5 km Peak of Mount Sharp',
    piaId: 'PIA16101',
    fastTier: 'large',
    hdTier: 'large',
    sol: 3,
    lat: -4.5895,
    lon: 137.4417,
    elevM: -4501,
    rollDeg: 0.8,
    pitchDeg: -0.5,
    yawDeg: 145,
    elMinDeg: -60,
    elMaxDeg: 26,
    description:
      'Curiosity’s landmark 360-degree color panorama from Bradbury Landing on the floor of Gale Crater, with the layered sedimentary slopes of Aeolis Mons (Mount Sharp) rising in the distance.',
  },
  {
    id: 'gale-cam-02',
    code: 'CAM-07',
    siteId: 'mount-sharp-gale',
    roverName: 'CURIOSITY (MSL)',
    instrument: 'Navcam 360° Self-Deck & Horizon Mosaic',
    title: 'Yellowknife Bay Basin',
    subtitle: 'Ancient Freshwater Lakebed Mudstones on Gale Crater Floor',
    piaId: 'PIA16074',
    fastTier: 'medium',
    hdTier: 'orig',
    sol: 2,
    lat: -4.5965,
    lon: 137.458,
    elevM: -4512,
    rollDeg: 1.2,
    pitchDeg: -0.9,
    yawDeg: 180,
    elMinDeg: -65,
    elMaxDeg: 25,
    description:
      '360-degree horizon and rover-deck panorama overlooking the Yellowknife Bay depression where Curiosity discovered habitable ancient lakebed clay minerals.',
  },
  {
    id: 'gale-cam-03',
    code: 'CAM-08',
    siteId: 'mount-sharp-gale',
    roverName: 'CURIOSITY (MSL)',
    instrument: 'Mastcam 360° Enhanced Color Vista',
    title: 'Lower Mount Sharp Foothills & Bagnold Dunes',
    subtitle: 'Stratified Hematite-Bearing Foothills of Aeolis Mons',
    piaId: 'PIA16029',
    fastTier: 'orig',
    hdTier: 'orig',
    sol: 19,
    lat: -4.652,
    lon: 137.418,
    elevM: -4415,
    rollDeg: -2.4,
    pitchDeg: 4.1,
    yawDeg: 162,
    elMinDeg: -58,
    elMaxDeg: 26,
    description:
      'Shows the transition from dark windblown basaltic sand dunes of the Bagnold dune field to the light-toned, sulfate- and hematite-rich strata of lower Mount Sharp.',
  },
  {
    id: 'gale-cam-04',
    code: 'CAM-09',
    siteId: 'mount-sharp-gale',
    roverName: 'CURIOSITY (MSL)',
    instrument: 'Mastcam 360° High-Climb Panorama',
    title: "Greenheugh Pediment ('Gator-Back' Sandstone)",
    subtitle: 'Wind-Sculpted Diagnetic Sandstone Fin Ridges on Mount Sharp',
    piaId: 'PIA25176',
    fastTier: 'large',
    hdTier: 'orig',
    sol: 3418,
    lat: -4.7125,
    lon: 137.3825,
    elevM: -4080,
    rollDeg: 4.7,
    pitchDeg: 6.2,
    yawDeg: 210,
    elMinDeg: -62,
    elMaxDeg: 28,
    description:
      'Captured high on the flank of Mount Sharp atop the Greenheugh Pediment caprock, revealing rugged diagenetic “gator-back” sandstone ridges resistant to wind erosion.',
  },
  {
    id: 'gale-cam-05',
    code: 'CAM-10',
    siteId: 'mount-sharp-gale',
    roverName: 'CURIOSITY (MSL)',
    instrument: 'Mastcam 360° Panorama (116 Images)',
    title: "Marker Band Valley ('Avanavero' Drill Site)",
    subtitle: 'Sulfate-Bearing Unit & Ancient Wave-Rippled Lake Deposits',
    piaId: 'PIA25407',
    fastTier: 'medium',
    hdTier: 'orig',
    sol: 3542,
    lat: -4.754,
    lon: 137.4085,
    elevM: -3920,
    rollDeg: -3.8,
    pitchDeg: 5.5,
    yawDeg: 195,
    elMinDeg: -62,
    elMaxDeg: 28,
    description:
      '360-degree panorama at the Avanavero drill site inside Marker Band Valley on Mount Sharp, surrounded by steep sulfate-rich mesas and wave-rippled rock layers.',
  },
];

/**
 * Subtle, geometric cyber-tactical optic/camera icon (zero emojis)
 * designed to blend into the ARES-NAVIGATOR HUD aesthetic.
 */
export function TacticalOpticIcon({
  className = 'w-3.5 h-3.5',
  accentColor = 'currentColor',
}: {
  className?: string;
  accentColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle 360 orbital horizon ring */}
      <ellipse
        cx="10"
        cy="10.5"
        rx="8.2"
        ry="3.4"
        stroke={accentColor}
        strokeWidth="1.2"
        strokeDasharray="2.2 1.6"
        opacity="0.7"
      />
      {/* Tactical camera chassis */}
      <rect
        x="4.2"
        y="6.2"
        width="11.6"
        height="8.6"
        rx="1.8"
        stroke={accentColor}
        strokeWidth="1.4"
        fill="#07111e"
      />
      {/* Top prism / mast housing */}
      <path
        d="M7.4 6.2L8.3 4.5H11.7L12.6 6.2"
        stroke={accentColor}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center aperture reticle */}
      <circle cx="10" cy="10.5" r="2.3" stroke={accentColor} strokeWidth="1.4" />
      <circle cx="10" cy="10.5" r="0.7" fill={accentColor} />
    </svg>
  );
}

/**
 * Converts a cylindrical NASA Rover Panorama into a seamless 2:1 equirectangular canvas
 * with natural Martian sky zenith and regolith nadir gradients so the 3D sphere has
 * true 1:1 rock proportions and zero pole pinching.
 */
function buildEquirectangularCanvasFromPanorama(
  img: HTMLImageElement,
  elMinDeg: number,
  elMaxDeg: number
): HTMLCanvasElement {
  const eqW = Math.min(4096, Math.max(2048, img.width));
  const eqH = Math.round(eqW / 2);

  const canvas = document.createElement('canvas');
  canvas.width = eqW;
  canvas.height = eqH;
  const ctx = canvas.getContext('2d')!;

  // Sample average sky color from top row and ground color from bottom row of the NASA image
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 64;
  sampleCanvas.height = 64;
  const sCtx = sampleCanvas.getContext('2d')!;
  sCtx.drawImage(img, 0, 0, 64, 64);
  const sData = sCtx.getImageData(0, 0, 64, 64).data;

  let topR = 0,
    topG = 0,
    topB = 0;
  let botR = 0,
    botG = 0,
    botB = 0;
  for (let x = 0; x < 64; x++) {
    const tIdx = (1 * 64 + x) * 4;
    topR += sData[tIdx];
    topG += sData[tIdx + 1];
    topB += sData[tIdx + 2];

    const bIdx = (62 * 64 + x) * 4;
    botR += sData[bIdx];
    botG += sData[bIdx + 1];
    botB += sData[bIdx + 2];
  }
  topR = Math.round(topR / 64);
  topG = Math.round(topG / 64);
  topB = Math.round(topB / 64);
  botR = Math.round(botR / 64);
  botG = Math.round(botG / 64);
  botB = Math.round(botB / 64);

  // If the top or bottom border of the mosaic has black un-stitched margins, fall back to warm Martian tones
  if (topR + topG + topB < 60) {
    topR = 178;
    topG = 136;
    topB = 104;
  }
  if (botR + botG + botB < 45) {
    botR = 76;
    botG = 52;
    botB = 38;
  }

  // Map elevation angles (+90° zenith at y=0, 0° horizon at y=eqH/2, -90° nadir at y=eqH)
  const yTop = Math.round(((90.0 - elMaxDeg) / 180.0) * eqH);
  const yBot = Math.round(((90.0 - elMinDeg) / 180.0) * eqH);
  const bandH = Math.max(64, yBot - yTop);

  // Fill sky zenith and ground nadir gradients
  const skyGrad = ctx.createLinearGradient(0, 0, 0, yTop + 18);
  skyGrad.addColorStop(
    0,
    `rgb(${Math.round(topR * 0.55)}, ${Math.round(topG * 0.52)}, ${Math.round(topB * 0.5)})`
  );
  skyGrad.addColorStop(1, `rgb(${topR}, ${topG}, ${topB})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, eqW, yTop + 18);

  const groundGrad = ctx.createLinearGradient(0, yBot - 18, 0, eqH);
  groundGrad.addColorStop(0, `rgb(${botR}, ${botG}, ${botB})`);
  groundGrad.addColorStop(
    1,
    `rgb(${Math.round(botR * 0.35)}, ${Math.round(botG * 0.35)}, ${Math.round(botB * 0.35)})`
  );
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, yBot - 18, eqW, eqH - (yBot - 18));

  // Draw the authentic NASA 360° panorama in its true vertical elevation band
  ctx.drawImage(img, 0, yTop, eqW, bandH);

  // Softly feather the top and bottom seam edges (14px)
  const topFeather = ctx.createLinearGradient(0, yTop - 2, 0, yTop + 16);
  topFeather.addColorStop(0, `rgba(${topR}, ${topG}, ${topB}, 1)`);
  topFeather.addColorStop(1, `rgba(${topR}, ${topG}, ${topB}, 0)`);
  ctx.fillStyle = topFeather;
  ctx.fillRect(0, yTop - 2, eqW, 18);

  const botFeather = ctx.createLinearGradient(0, yBot - 16, 0, yBot + 2);
  botFeather.addColorStop(0, `rgba(${botR}, ${botG}, ${botB}, 0)`);
  botFeather.addColorStop(1, `rgba(${botR}, ${botG}, ${botB}, 1)`);
  ctx.fillStyle = botFeather;
  ctx.fillRect(0, yBot - 16, eqW, 18);

  return canvas;
}

function compassLabelFromAzimuth(azDeg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((azDeg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
}

export function MarsRoverStreetViewModal({
  station,
  allStationsForSite,
  onSelectStation,
  onClose,
}: {
  station: RoverPanoramaStation;
  allStationsForSite: RoverPanoramaStation[];
  onSelectStation: (st: RoverPanoramaStation) => void;
  onClose: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHdLoaded, setIsHdLoaded] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [viewHud, setViewHud] = useState<{
    azimuthDeg: number;
    pitchDeg: number;
    fovDeg: number;
  }>({
    azimuthDeg: station.yawDeg,
    pitchDeg: -4,
    fovDeg: 65,
  });

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    setIsLoading(true);
    setIsHdLoaded(false);

    const w = container.clientWidth || 960;
    const h = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);

    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200);
    camera.position.set(0, 0, 0.01);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Inverted 360° Panorama Sphere
    const sphereGeo = new THREE.SphereGeometry(60, 96, 64);
    // Flip X scale so texture inside the sphere reads left-to-right correctly
    sphereGeo.scale(-1, 1, 1);

    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);

    // Subtle 3D Tactical Ground Horizon Compass Ring inside the sphere
    const ringGeo = new THREE.RingGeometry(14.5, 14.8, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const compassRing = new THREE.Mesh(ringGeo, ringMat);
    compassRing.position.y = -5.5;
    scene.add(compassRing);

    const applyImageToSphere = (img: HTMLImageElement, isHd: boolean) => {
      if (cancelled) return;
      const eqCanvas = buildEquirectangularCanvasFromPanorama(
        img,
        station.elMinDeg,
        station.elMaxDeg
      );
      const tex = new THREE.CanvasTexture(eqCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;

      sphereMat.map?.dispose();
      sphereMat.map = tex;
      sphereMat.needsUpdate = true;
      setIsLoading(false);
      if (isHd) setIsHdLoaded(true);
    };

    // 1. Load fast preview tier immediately
    const fastImg = new Image();
    fastImg.crossOrigin = 'anonymous';
    fastImg.onload = () => {
      applyImageToSphere(fastImg, station.fastTier === station.hdTier);

      // 2. Upgrade to full-resolution ~orig.jpg in background if different
      if (station.hdTier !== station.fastTier && !cancelled) {
        const hdImg = new Image();
        hdImg.crossOrigin = 'anonymous';
        hdImg.onload = () => {
          applyImageToSphere(hdImg, true);
        };
        hdImg.src = `/api/nasa-pano?pia=${station.piaId}&tier=${station.hdTier}`;
      }
    };
    fastImg.onerror = () => {
      if (!cancelled) setIsLoading(false);
    };
    fastImg.src = `/api/nasa-pano?pia=${station.piaId}&tier=${station.fastTier}`;

    // Interactive spherical camera look angles
    let lonDeg = station.yawDeg;
    let latDeg = -4;
    let targetLonDeg = station.yawDeg;
    let targetLatDeg = -4;
    let fovDeg = 65;
    let targetFovDeg = 65;

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      setAutoRotate(false);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      const sensitivity = (fovDeg / 65) * 0.18;
      targetLonDeg = targetLonDeg - dx * sensitivity;
      targetLatDeg = Math.max(-62, Math.min(32, targetLatDeg + dy * sensitivity));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetFovDeg = Math.max(22, Math.min(82, targetFovDeg + e.deltaY * 0.04));
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    let animId = 0;
    let frameCounter = 0;
    const lookTarget = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotateRef.current && !isDragging) {
        targetLonDeg += 0.08;
      }

      lonDeg += (targetLonDeg - lonDeg) * 0.14;
      latDeg += (targetLatDeg - latDeg) * 0.14;
      fovDeg += (targetFovDeg - fovDeg) * 0.16;

      if (Math.abs(camera.fov - fovDeg) > 0.05) {
        camera.fov = fovDeg;
        camera.updateProjectionMatrix();
      }

      const phi = THREE.MathUtils.degToRad(90 - latDeg);
      const theta = THREE.MathUtils.degToRad(lonDeg);

      lookTarget.set(
        50 * Math.sin(phi) * Math.cos(theta),
        50 * Math.cos(phi),
        50 * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);

      frameCounter++;
      if (frameCounter % 4 === 0) {
        setViewHud({
          azimuthDeg: Math.round(((lonDeg % 360) + 360) % 360),
          pitchDeg: Math.round(latDeg * 10) / 10,
          fovDeg: Math.round(fovDeg),
        });
      }
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      sphereGeo.dispose();
      sphereMat.map?.dispose();
      sphereMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, [station]);

  const currentIdx = allStationsForSite.findIndex((s) => s.id === station.id);
  const prevStation =
    allStationsForSite[(currentIdx - 1 + allStationsForSite.length) % allStationsForSite.length];
  const nextStation = allStationsForSite[(currentIdx + 1) % allStationsForSite.length];
  const zoomFactor = (65 / viewHud.fovDeg).toFixed(1);

  return (
    <div className="absolute inset-0 z-30 bg-[#050912] flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* =====================================================================
          TOP STREET-VIEW TELEMETRY & COMPASS BAR
         ===================================================================== */}
      <div className="h-11 bg-[#08101c]/95 border-b border-cyan-500/40 px-3.5 flex items-center justify-between z-20 shrink-0">
        {/* Left: Rover & Camera Instrument Badge */}
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded bg-cyan-500/15 border border-cyan-400/60 flex items-center justify-center text-cyan-300">
            <TacticalOpticIcon className="w-4 h-4" accentColor="#22d3ee" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-200">
                {station.code} • {station.title}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold">
                SOL {station.sol}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  isHdLoaded
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                }`}
              >
                {isHdLoaded ? `NASA ${station.piaId} • FULL-RES` : `NASA ${station.piaId} • STREAMING`}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate max-w-md">
              {station.roverName} • {station.instrument}
            </div>
          </div>
        </div>

        {/* Center: Live Azimuth Compass & Elevation Readout */}
        <div className="hidden lg:flex items-center gap-3 bg-[#050a14] border border-slate-700/80 px-3 py-1 rounded font-mono text-[11px]">
          <div>
            <span className="text-slate-500 mr-1">HEADING:</span>
            <span className="text-cyan-300 font-bold">
              {String(viewHud.azimuthDeg).padStart(3, '0')}°{' '}
              {compassLabelFromAzimuth(viewHud.azimuthDeg)}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500 mr-1">PITCH:</span>
            <span className="text-slate-200 font-bold">
              {viewHud.pitchDeg > 0 ? `+${viewHud.pitchDeg}` : viewHud.pitchDeg}°
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500 mr-1">OPTIC ZOOM:</span>
            <span className="text-amber-300 font-bold">{zoomFactor}x</span>
          </div>
        </div>

        {/* Right: Auto-Scan & Exit Street View */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all border ${
              autoRotate
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoRotate ? '360° AUTO-SCAN: ON' : '360° AUTO-SCAN'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-[10px] font-mono font-bold uppercase bg-rose-950/85 hover:bg-rose-900 border border-rose-500/80 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all"
          >
            ✕ EXIT STREET VIEW
          </button>
        </div>
      </div>

      {/* =====================================================================
          INTERACTIVE 360° WEBGL SPHERE CANVAS
         ===================================================================== */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Subtle Center Optic Reticle Crosshair */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border border-cyan-400/25 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
          </div>
        </div>

        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#050912]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
            <div className="h-9 w-9 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <div className="text-xs font-mono tracking-wider text-cyan-300 uppercase">
              STREAMING 360° ROVER MASTCAM PANORAMA ({station.piaId})...
            </div>
          </div>
        )}

        {/* Top-Left Rover Surface Localization & Chassis Attitude Card */}
        <div className="pointer-events-none absolute top-3 left-3 bg-[#08101c]/88 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-2 text-[10px] font-mono space-y-1 max-w-xs">
          <div className="text-cyan-300 font-bold uppercase tracking-wider">
            SURFACE TELEMETRY • {station.subtitle}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300">
            <div>
              COORDS:{' '}
              <span className="text-slate-100">
                {Math.abs(station.lat).toFixed(4)}°{station.lat >= 0 ? 'N' : 'S'},{' '}
                {station.lon.toFixed(4)}°E
              </span>
            </div>
            <div>
              ELEVATION: <span className="text-amber-300 font-bold">{station.elevM} m</span>
            </div>
            <div>
              CHASSIS ROLL: <span className="text-slate-100">{station.rollDeg}°</span>
            </div>
            <div>
              CHASSIS PITCH: <span className="text-slate-100">{station.pitchDeg}°</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 leading-relaxed pt-0.5 border-t border-slate-800">
            {station.description}
          </div>
        </div>

        {/* Bottom Street View Waypoint Stepper Bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#08101c]/92 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 flex items-center gap-2 shadow-2xl z-20 max-w-[95%]">
          <button
            onClick={() => onSelectStation(prevStation)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap transition-all"
          >
            ◀ PREV CAM
          </button>

          <div className="flex items-center gap-1 overflow-x-auto px-1">
            {allStationsForSite.map((st) => {
              const active = st.id === station.id;
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStation(st)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono transition-all whitespace-nowrap border ${
                    active
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <TacticalOpticIcon
                    className="w-3 h-3"
                    accentColor={active ? '#22d3ee' : '#94a3b8'}
                  />
                  <span>{st.code}</span>
                  <span className="text-[9px] opacity-75">S{st.sol}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSelectStation(nextStation)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap transition-all"
          >
            NEXT CAM ▶
          </button>
        </div>
      </div>
    </div>
  );
}
