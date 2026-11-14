'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ============================================================================
// CONSTANTS & PLANETARY GEOMETRY
// ============================================================================
const GLOBE_RADIUS = 100.0; // 100 units = 3,396.2 km Mars radius (~33.96 km / unit)
const MARS_RADIUS_KM = 3396.2;

// Selective Quality Zoom Caps:
// - High-Detail Expedition Sites stream up to Zoom 12 (~2.5 km tiles, 6m CTX & 25cm HiRISE + 16-bit DEM)
// - Rest of Mars is capped at Zoom 5 (~330 km tiles, 128px lightweight WMTS JPEG/PNG)
const MAX_SITE_ZOOM = 12;
const MAX_GLOBAL_ZOOM = 5;

const TILE_SEGMENTS = 48; // 48x48 grid per tile (consistent border vertex count = 0 cracks/seams)
const DEM_GRID_SIZE = TILE_SEGMENTS + 1; // 49x49 vertices per tile
const MAX_CONCURRENT_DOWNLOADS = 6;

export interface ExpeditionSite {
  id: string;
  name: string;
  shortLabel: string;
  role: 'PRIMARY LANDING SITE' | 'SECONDARY EXPEDITION HUB';
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
  // Geographic bounding box [lonMin, latMin, lonMax, latMax] where Ultra/High-Detail tiles are unlocked
  roiBbox: [number, number, number, number];
  // Site-specific NASA Trek high-resolution MRO CTX 6m WMTS layer
  ctxLayer: string;
  ctxBbox: [number, number, number, number];
  // Optional sub-meter MRO HiRISE 25cm WMTS layer (Jezero Delta Front)
  hiriseLayer?: string;
  hiriseBbox?: [number, number, number, number];
}

// ============================================================================
// THE 4 HIGH-DETAIL EXPEDITION SITES
// ============================================================================
const EXPEDITION_SITES: ExpeditionSite[] = [
  {
    id: 'jezero-delta',
    name: 'Jezero Crater Delta Front',
    shortLabel: 'Jezero Delta Front',
    role: 'PRIMARY LANDING SITE',
    subtitle: 'Perseverance Landing Site & Ancient Western River Delta',
    lat: 18.4447,
    lon: 77.4508,
    elevation: '-2,540 m',
    targetAltitudeKm: 42,
    targetTiltDeg: 38,
    maxZoom: 12,
    qualityBadge: 'ULTRA-HD Z12 • 25cm HiRISE + 6m CTX',
    description:
      'Primary Mars 2020 Perseverance Rover landing site at the western Neretva Vallis delta front. Streams full 25cm HiRISE + 6m CTX orthomosaics over 16-bit MOLA+HRSC DEM.',
    color: '#00f0ff',
    roiBbox: [76.5, 17.5, 78.5, 19.5],
    ctxLayer: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0',
    ctxBbox: [77.1605, 18.211, 77.6992, 18.7212],
    hiriseLayer: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd',
    hiriseBbox: [77.2229, 18.3068, 77.584, 18.6693],
  },
  {
    id: 'mount-sharp-gale',
    name: 'Mount Sharp (Gale Crater)',
    shortLabel: 'Mount Sharp (Gale)',
    role: 'SECONDARY EXPEDITION HUB',
    subtitle: 'Aeolis Mons 5.5 km Sedimentary Peak & Curiosity Hub',
    lat: -5.08,
    lon: 137.85,
    elevation: '-4,500 m to +1,000 m',
    targetAltitudeKm: 115,
    targetTiltDeg: 40,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Secondary expedition hub inside the 154 km Gale Crater basin surrounding Aeolis Mons (Mount Sharp), streaming block-adjusted 6m MRO CTX imagery and 16-bit elevation.',
    color: '#10b981',
    roiBbox: [135.18, -6.58, 139.25, -2.8],
    ctxLayer: 'Gale_CTX_BlockAdj_dd',
    ctxBbox: [135.1842, -6.5733, 139.2413, -2.8078],
  },
  {
    id: 'arcadia-planitia',
    name: 'Arcadia Planitia (ISRU Basecamp)',
    shortLabel: 'Arcadia Planitia ISRU',
    role: 'SECONDARY EXPEDITION HUB',
    subtitle: 'Shallow Subsurface Water-Ice Sheet & ISRU Propellant Hub',
    lat: 46.2,
    lon: -171.2,
    elevation: '-4,120 m',
    targetAltitudeKm: 95,
    targetTiltDeg: 32,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Flat volcanic plains in northern lowlands containing abundant shallow subsurface water ice—ideal for In-Situ Resource Utilization (ISRU) water extraction and human basecamp.',
    color: '#38bdf8',
    roiBbox: [-173.65, 44.5, -168.75, 47.9],
    ctxLayer: 'Arcadia_Planitia_CTX_BlockAdj_dd',
    ctxBbox: [-173.6451, 44.508, -168.7549, 47.8921],
  },
  {
    id: 'melas-chasma',
    name: 'Melas Chasma (Valles Marineris)',
    shortLabel: 'Melas Chasma',
    role: 'SECONDARY EXPEDITION HUB',
    subtitle: 'Widest & Deepest Tectonic Canyon Segment of Valles Marineris',
    lat: -11.7,
    lon: -68.3,
    elevation: '-9,100 m',
    targetAltitudeKm: 130,
    targetTiltDeg: 44,
    maxZoom: 12,
    qualityBadge: 'HIGH-DETAIL Z12 • 6m CTX + 16-bit DEM',
    description:
      'Deepest central trough of Valles Marineris plunging 9 km below the surrounding plateau with layered interior deposits and high atmospheric pressure.',
    color: '#f59e0b',
    roiBbox: [-71.95, -14.5, -64.87, -9.29],
    ctxLayer: 'Coprates_EMelas_Chasm_CTX_BlockAdj_dd',
    ctxBbox: [-71.7281, -13.392, -64.8715, -10.0079],
  },
];

// Extensible Layer Mode Architecture (ready for future Thermal Inertia, CO2 Ice, Mineralogy overlays)
export type VisualLayerMode = 'realistic' | 'color_hillshade' | 'orbital_raw';

export interface FutureOverlaySlot {
  id: string;
  label: string;
  trekProductLabel: string;
  status: 'planned';
}

const FUTURE_SCIENTIFIC_LAYERS: FutureOverlaySlot[] = [
  {
    id: 'thermal_inertia',
    label: 'TES Thermal Inertia',
    trekProductLabel: 'TES_Thermal_Inertia',
    status: 'planned',
  },
  {
    id: 'co2_ice_albedo',
    label: 'CO₂ / Surface Albedo',
    trekProductLabel: 'Mars_MGS_TES_Albedo_mosaic_global_7410m',
    status: 'planned',
  },
  {
    id: 'themis_night_ir',
    label: 'THEMIS Night Thermal IR',
    trekProductLabel: 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018',
    status: 'planned',
  },
];

export interface ProjectedMarkerPos {
  site: ExpeditionSite;
  x: number;
  y: number;
  visible: boolean;
  distKm: number;
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

/**
 * Checks whether a quadtree tile intersects any of the 4 High-Detail Expedition Sites.
 * Returns the matching ExpeditionSite (unlocking Zoom 12 + 256px textures + CTX/HiRISE + 16-bit DEM),
 * or null for standard global background tiles (capped at Zoom 5 + 128px lightweight textures).
 */
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

// ============================================================================
// SHARED IN-MEMORY TILE CACHE & PRIORITY SCHEDULER (LAZY WATCHED-ONLY LOADING)
// ============================================================================
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
const demS16Cache = new Map<string, Promise<Int16Array | null>>();

function fetchCachedImage(url: string): Promise<HTMLImageElement | null> {
  let existing = imageCache.get(url);
  if (existing) return existing;

  existing = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

  if (imageCache.size > 400) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
  imageCache.set(url, existing);
  return existing;
}

function fetchCachedS16Dem(
  z: number,
  row: number,
  col: number,
  lonMin: number,
  latMin: number,
  lonMax: number,
  latMax: number
): Promise<Int16Array | null> {
  const key = `${z}/${row}/${col}`;
  let existing = demS16Cache.get(key);
  if (existing) return existing;

  const url = `https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer/exportImage?bbox=${lonMin},${latMin},${lonMax},${latMax}&bboxSR=104905&size=128,128&imageSR=104905&format=tiff&pixelType=S16&f=image`;
  existing = fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((buf) => {
      if (!buf || buf.byteLength < 32768) return null;
      const slice = buf.slice(buf.byteLength - 32768);
      return new Int16Array(slice);
    })
    .catch(() => null);

  if (demS16Cache.size > 250) {
    const firstKey = demS16Cache.keys().next().value;
    if (firstKey) demS16Cache.delete(firstKey);
  }
  demS16Cache.set(key, existing);
  return existing;
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
// QUADTREE SPHERICAL TILE NODE (TIERED QUALITY + SEAMLESS NORMALS + SKIRTS)
// ============================================================================
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

  // Quality tier: High-Detail if intersecting one of the 4 Expedition Sites, Standard otherwise
  readonly expeditionSite: ExpeditionSite | null;
  readonly isHighDetailSite: boolean;
  readonly maxAllowedZoom: number;
  readonly texSize: number; // 256px for Expedition Hubs, 128px for rest of Mars

  readonly center3D: THREE.Vector3;
  readonly boundingSphere: THREE.Sphere;

  children: QuadTileNode[] | null = null;
  mesh: THREE.Mesh | null = null;
  borderLine: THREE.Line | null;

  colorCanvas: HTMLCanvasElement;
  demGrid: Float32Array;

  isLoaded = false;
  isLoading = false;
  isDisposed = false;
  cancelDownload: (() => void) | null = null;

  constructor(z: number, row: number, col: number, parent: QuadTileNode | null) {
    this.z = z;
    this.row = row;
    this.col = col;
    this.key = `${z}/${row}/${col}`;
    this.parent = parent;
    this.borderLine = null;

    const cols = 2 * (1 << z);
    const rows = 1 * (1 << z);
    this.spanDeg = 360.0 / cols;

    this.lonMin = -180.0 + col * this.spanDeg;
    this.lonMax = this.lonMin + this.spanDeg;
    this.latMax = 90.0 - row * (180.0 / rows);
    this.latMin = this.latMax - 180.0 / rows;

    this.lonCenter = (this.lonMin + this.lonMax) * 0.5;
    this.latCenter = (this.latMin + this.latMax) * 0.5;

    // Determine if this tile covers one of the 4 High-Detail Expedition Sites
    this.expeditionSite = findIntersectingExpeditionSite(
      this.lonMin,
      this.latMin,
      this.lonMax,
      this.latMax
    );
    this.isHighDetailSite = this.expeditionSite !== null;
    this.maxAllowedZoom = this.expeditionSite ? this.expeditionSite.maxZoom : MAX_GLOBAL_ZOOM;
    // Non-hub global tiles use 128x128 lightweight textures; Expedition Hub tiles use full 256x256
    this.texSize = this.isHighDetailSite ? 256 : 128;

    this.center3D = latLonToVector3(this.latCenter, this.lonCenter, GLOBE_RADIUS);
    const arcRadius = GLOBE_RADIUS * ((this.spanDeg * Math.PI) / 180.0) * 0.78;
    this.boundingSphere = new THREE.Sphere(this.center3D.clone(), Math.max(arcRadius, 0.15));

    this.colorCanvas = document.createElement('canvas');
    this.colorCanvas.width = this.texSize;
    this.colorCanvas.height = this.texSize;

    this.demGrid = new Float32Array(DEM_GRID_SIZE * DEM_GRID_SIZE);

    if (parent) {
      this.inheritFromParent(parent);
    } else {
      const ctx = this.colorCanvas.getContext('2d')!;
      ctx.fillStyle = '#a45a38';
      ctx.fillRect(0, 0, this.texSize, this.texSize);
      this.demGrid.fill(-1500);
    }
  }

  inheritFromParent(parent: QuadTileNode) {
    const qCol = this.col % 2;
    const qRow = this.row % 2;

    const pHalf = parent.texSize / 2;
    const ctx = this.colorCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      parent.colorCanvas,
      qCol * pHalf,
      qRow * pHalf,
      pHalf,
      pHalf,
      0,
      0,
      this.texSize,
      this.texSize
    );

    const pGrid = parent.demGrid;
    const halfSeg = TILE_SEGMENTS / 2;
    const startX = qCol * halfSeg;
    const startY = qRow * halfSeg;

    for (let r = 0; r < DEM_GRID_SIZE; r++) {
      const py = startY + (r / TILE_SEGMENTS) * halfSeg;
      const y0 = Math.min(Math.floor(py), TILE_SEGMENTS - 1);
      const y1 = y0 + 1;
      const fy = py - y0;

      for (let c = 0; c < DEM_GRID_SIZE; c++) {
        const px = startX + (c / TILE_SEGMENTS) * halfSeg;
        const x0 = Math.min(Math.floor(px), TILE_SEGMENTS - 1);
        const x1 = x0 + 1;
        const fx = px - x0;

        const v00 = pGrid[y0 * DEM_GRID_SIZE + x0];
        const v10 = pGrid[y0 * DEM_GRID_SIZE + x1];
        const v01 = pGrid[y1 * DEM_GRID_SIZE + x0];
        const v11 = pGrid[y1 * DEM_GRID_SIZE + x1];

        const top = v00 * (1 - fx) + v10 * fx;
        const bot = v01 * (1 - fx) + v11 * fx;
        this.demGrid[r * DEM_GRID_SIZE + c] = top * (1 - fy) + bot * fy;
      }
    }
  }

  /**
   * Builds 3D spherical patch mesh with analytical surface normals so skirt geometry
   * NEVER corrupts border vertex normals (eliminating dark/black borders between tiles).
   */
  buildOrUpdateMesh(
    exaggeration: number,
    wireframe: boolean,
    showBorders: boolean,
    parentGroup: THREE.Group
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

      // Top, bottom, left, right skirts
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

    // Clamp UV coordinates to exact texel centers to eliminate JPEG edge seams
    const uvMin = 0.5 / this.texSize;
    const uvSpan = (this.texSize - 1.0) / this.texSize;

    // 1. Compute 3D surface positions & UVs
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
      }
    }

    // 2. Compute seamless analytical surface normals on the 49x49 grid
    const vLeft = new THREE.Vector3();
    const vRight = new THREE.Vector3();
    const vUp = new THREE.Vector3();
    const vDown = new THREE.Vector3();
    const dX = new THREE.Vector3();
    const dY = new THREE.Vector3();
    const slopeNormal = new THREE.Vector3();
    const radialNormal = new THREE.Vector3();

    for (let r = 0; r < DEM_GRID_SIZE; r++) {
      const rU = Math.max(0, r - 1);
      const rD = Math.min(TILE_SEGMENTS, r + 1);
      const borderDistR = Math.min(r, TILE_SEGMENTS - r);

      for (let c = 0; c < DEM_GRID_SIZE; c++) {
        const cL = Math.max(0, c - 1);
        const cR = Math.min(TILE_SEGMENTS, c + 1);
        const borderDistC = Math.min(c, TILE_SEGMENTS - c);
        const borderFactor = Math.min(1.0, Math.min(borderDistR, borderDistC) / 2.0);

        const idx = r * DEM_GRID_SIZE + c;
        radialNormal.set(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2]).normalize();

        if (borderFactor <= 0.01) {
          normals[idx * 3] = radialNormal.x;
          normals[idx * 3 + 1] = radialNormal.y;
          normals[idx * 3 + 2] = radialNormal.z;
        } else {
          const idxL = r * DEM_GRID_SIZE + cL;
          const idxR = r * DEM_GRID_SIZE + cR;
          const idxU = rU * DEM_GRID_SIZE + c;
          const idxD = rD * DEM_GRID_SIZE + c;

          vLeft.set(positions[idxL * 3], positions[idxL * 3 + 1], positions[idxL * 3 + 2]);
          vRight.set(positions[idxR * 3], positions[idxR * 3 + 1], positions[idxR * 3 + 2]);
          vUp.set(positions[idxU * 3], positions[idxU * 3 + 1], positions[idxU * 3 + 2]);
          vDown.set(positions[idxD * 3], positions[idxD * 3 + 1], positions[idxD * 3 + 2]);

          dX.subVectors(vRight, vLeft);
          dY.subVectors(vDown, vUp);
          slopeNormal.crossVectors(dY, dX).normalize();

          slopeNormal.lerp(radialNormal, 1.0 - borderFactor * 0.85).normalize();
          normals[idx * 3] = slopeNormal.x;
          normals[idx * 3 + 1] = slopeNormal.y;
          normals[idx * 3 + 2] = slopeNormal.z;
        }
      }
    }

    // 3. Populate Skirt vertices & copy surface border normals
    const skirtDrop = Math.max(0.05, this.boundingSphere.radius * 0.08);
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

    // Optional Quadtree Debug Border (Cyan for High-Detail Expedition Hub tiles, Amber for Global tiles)
    if (showBorders) {
      if (!this.borderLine) {
        const borderPts: THREE.Vector3[] = [];
        for (let i = 0; i < DEM_GRID_SIZE; i++) {
          const idx = i;
          borderPts.push(
            new THREE.Vector3(
              positions[idx * 3],
              positions[idx * 3 + 1],
              positions[idx * 3 + 2]
            ).multiplyScalar(1.001)
          );
        }
        for (let i = 1; i < DEM_GRID_SIZE; i++) {
          const idx = i * DEM_GRID_SIZE + TILE_SEGMENTS;
          borderPts.push(
            new THREE.Vector3(
              positions[idx * 3],
              positions[idx * 3 + 1],
              positions[idx * 3 + 2]
            ).multiplyScalar(1.001)
          );
        }
        for (let i = TILE_SEGMENTS - 1; i >= 0; i--) {
          const idx = TILE_SEGMENTS * DEM_GRID_SIZE + i;
          borderPts.push(
            new THREE.Vector3(
              positions[idx * 3],
              positions[idx * 3 + 1],
              positions[idx * 3 + 2]
            ).multiplyScalar(1.001)
          );
        }
        for (let i = TILE_SEGMENTS - 1; i >= 0; i--) {
          const idx = i * DEM_GRID_SIZE;
          borderPts.push(
            new THREE.Vector3(
              positions[idx * 3],
              positions[idx * 3 + 1],
              positions[idx * 3 + 2]
            ).multiplyScalar(1.001)
          );
        }
        const bGeom = new THREE.BufferGeometry().setFromPoints(borderPts);
        const bMat = new THREE.LineBasicMaterial({
          color: this.isHighDetailSite && this.z >= 6 ? 0x00f0ff : 0xf59e0b,
          transparent: true,
          opacity: 0.75,
        });
        this.borderLine = new THREE.Line(bGeom, bMat);
        parentGroup.add(this.borderLine);
      }
      this.borderLine.visible = this.mesh.visible;
    } else if (this.borderLine) {
      this.borderLine.visible = false;
    }
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
// SELECTIVE QUALITY TILE FETCHER & SEAMLESS COMPOSITOR
// ============================================================================
async function loadTileDataFromTrek(
  node: QuadTileNode,
  layerMode: VisualLayerMode
): Promise<void> {
  const { z, row, col, lonMin, latMin, lonMax, latMax, texSize, expeditionSite } = node;

  // 1. Base Color (Viking Global Color z <= 7, or exact sub-quadrant of z=7 ancestor for z >= 8)
  const colorZ = Math.min(z, 7);
  const colorShift = z - colorZ;
  const colorRow = row >> colorShift;
  const colorCol = col >> colorShift;

  const vikingPromise = fetchCachedImage(
    `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/${colorZ}/${colorRow}/${colorCol}.jpg`
  );

  // 2. Global MOLA + HRSC 200m Shaded Relief (z <= 8, or exact sub-quadrant of z=8 ancestor)
  const shadeZ = Math.min(z, 8);
  const shadeShift = z - shadeZ;
  const shadeRow = row >> shadeShift;
  const shadeCol = col >> shadeShift;

  const hrscShadePromise = fetchCachedImage(
    `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${shadeZ}/${shadeRow}/${shadeCol}.jpg`
  );

  // 3. Optional Color Hillshade (z <= 8)
  const clrShadePromise =
    layerMode === 'color_hillshade'
      ? fetchCachedImage(
          `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/${shadeZ}/${shadeRow}/${shadeCol}.jpg`
        )
      : Promise.resolve(null);

  // 4. HIGH-DETAIL EXPEDITION SITE ORTHOMOSAICS (6m CTX & 25cm HiRISE)
  // ONLY fetched when this tile belongs to one of the 4 Expedition Sites at z >= 6!
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

  // 5. ELEVATION DEM:
  // - Standard Global Tiles (z <= 5): lightweight WMTS 8-bit MOLA Global DEM PNG
  // - High-Detail Expedition Site Tiles (z >= 6): 16-bit Signed Integer DEM from MOLA+HRSC ImageServer
  const wmtsDemPromise =
    z <= 5
      ? fetchCachedImage(
          `https://trek.nasa.gov/tiles/Mars/EQ/mola128_mola64_merge_90Nto90S_SimpleC_clon0/1.0.0/default/default028mm/${z}/${row}/${col}.png`
        )
      : Promise.resolve(null);

  let s16DemPromise: Promise<Int16Array | null> = Promise.resolve(null);
  const demZ = Math.min(z, 10);
  const demShift = z - demZ;
  const demRow = row >> demShift;
  const demCol = col >> demShift;

  if (expeditionSite && z >= 6) {
    const demCols = 2 * (1 << demZ);
    const demRows = 1 * (1 << demZ);
    const dSpan = 360.0 / demCols;
    const dLonMin = -180.0 + demCol * dSpan;
    const dLonMax = dLonMin + dSpan;
    const dLatMax = 90.0 - demRow * (180.0 / demRows);
    const dLatMin = dLatMax - 180.0 / demRows;

    s16DemPromise = fetchCachedS16Dem(demZ, demRow, demCol, dLonMin, dLatMin, dLonMax, dLatMax);
  }

  const [vikingImg, hrscShadeImg, clrShadeImg, ctxImg, hiriseImg, wmtsDemImg, s16DemArr] =
    await Promise.all([
      vikingPromise,
      hrscShadePromise,
      clrShadePromise,
      ctxPromise,
      hirisePromise,
      wmtsDemPromise,
      s16DemPromise,
    ]);

  if (node.isDisposed) return;

  // ==========================================================================
  // COMPOSITE SEAMLESS TILE TEXTURE (256x256 FOR SITES, 128x128 FOR REST)
  // ==========================================================================
  const ctx = node.colorCanvas.getContext('2d')!;
  const scratch = document.createElement('canvas');
  scratch.width = texSize;
  scratch.height = texSize;
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
    drawSubQuadrant(ctx, clrShadeImg, shadeShift);
  } else if (vikingImg) {
    drawSubQuadrant(ctx, vikingImg, colorShift);
  }

  const baseImgData = ctx.getImageData(0, 0, texSize, texSize);
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
  const microDetail = new Float32Array(totalPx);

  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const r = basePixels[p];
    const g = basePixels[p + 1];
    const b = basePixels[p + 2];

    const hrscLum = shadePixels ? shadePixels[p] / 255.0 : 0.62;
    let detailLum = hrscLum;

    // Smoothly feather 6m CTX swath edges across all 4 Expedition Hubs (zero black borders!)
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

    // Smoothly feather 25cm HiRISE swath on top of CTX (Jezero Delta Front)
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

    microDetail[i] = detailLum;

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

    // REALISTIC MARS COMPOSITE
    const warmR = r * 0.65 + 198 * 0.35;
    const warmG = g * 0.58 + 114 * 0.42;
    const warmB = b * 0.52 + 74 * 0.48;

    const stretched = Math.max(0.22, Math.min(1.22, 0.32 + (detailLum - 0.15) * 1.12));
    basePixels[p] = Math.min(255, Math.round(warmR * stretched));
    basePixels[p + 1] = Math.min(255, Math.round(warmG * stretched));
    basePixels[p + 2] = Math.min(255, Math.round(warmB * stretched));
  }

  ctx.putImageData(baseImgData, 0, 0);

  // ==========================================================================
  // POPULATE 49x49 ELEVATION GRID IN METERS
  // ==========================================================================
  if (s16DemArr) {
    const scale = 1 << demShift;
    const qCol = col % scale;
    const qRow = row % scale;
    const subSpan = 127.0 / scale;
    const startX = qCol * subSpan;
    const startY = qRow * subSpan;

    for (let r = 0; r < DEM_GRID_SIZE; r++) {
      const fy = startY + (r / TILE_SEGMENTS) * subSpan;
      const y0 = Math.min(Math.floor(fy), 126);
      const y1 = y0 + 1;
      const wy = fy - y0;

      for (let c = 0; c < DEM_GRID_SIZE; c++) {
        const fx = startX + (c / TILE_SEGMENTS) * subSpan;
        const x0 = Math.min(Math.floor(fx), 126);
        const x1 = x0 + 1;
        const wx = fx - x0;

        const e00 = s16DemArr[y0 * 128 + x0];
        const e10 = s16DemArr[y0 * 128 + x1];
        const e01 = s16DemArr[y1 * 128 + x0];
        const e11 = s16DemArr[y1 * 128 + x1];

        let elev = (e00 * (1 - wx) + e10 * wx) * (1 - wy) + (e01 * (1 - wx) + e11 * wx) * wy;

        // Subtle CTX/HiRISE micro-topography inside Expedition Hub tiles (faded smoothly before tile border)
        if (z >= 8 && r > 1 && r < TILE_SEGMENTS - 1 && c > 1 && c < TILE_SEGMENTS - 1) {
          const px = Math.min(texSize - 1, Math.round((c / TILE_SEGMENTS) * (texSize - 1)));
          const py = Math.min(texSize - 1, Math.round((r / TILE_SEGMENTS) * (texSize - 1)));
          const dVal = microDetail[py * texSize + px];
          elev += (dVal - 0.5) * (z === 8 ? 28.0 : z === 9 ? 18.0 : 10.0);
        }

        node.demGrid[r * DEM_GRID_SIZE + c] = elev;
      }
    }
  } else if (wmtsDemImg) {
    sCtx.clearRect(0, 0, texSize, texSize);
    sCtx.drawImage(wmtsDemImg, 0, 0, DEM_GRID_SIZE, DEM_GRID_SIZE);
    const demData = sCtx.getImageData(0, 0, DEM_GRID_SIZE, DEM_GRID_SIZE).data;

    for (let i = 0; i < DEM_GRID_SIZE * DEM_GRID_SIZE; i++) {
      const u8 = demData[i * 4];
      node.demGrid[i] = u8 * 55.08 - 7004.45;
    }
  }

  node.isLoaded = true;
}

// ============================================================================
// MAIN REACT COMPONENT
// ============================================================================
export default function MarsGlobeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  // UI & Expedition Site State
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [selectedSite, setSelectedSite] = useState<ExpeditionSite>(EXPEDITION_SITES[0]);
  const [projectedMarkers, setProjectedMarkers] = useState<ProjectedMarkerPos[]>([]);
  const [showSiteMarkers, setShowSiteMarkers] = useState<boolean>(true);

  const [maxRenderedZoom, setMaxRenderedZoom] = useState<number>(0);
  const [visibleTileCount, setVisibleTileCount] = useState<number>(2);
  const [streamingCount, setStreamingCount] = useState<number>(0);
  const [cameraTiltUI, setCameraTiltUI] = useState<number>(38);
  const [centerTileInfo, setCenterTileInfo] = useState<{
    z: number;
    row: number;
    col: number;
    lat: number;
    lon: number;
    elevM: number;
    altitudeKm: number;
    resMetersPerPx: number;
    qualityTierLabel: string;
    activeSiteName: string | null;
  }>({
    z: 8,
    row: 101,
    col: 366,
    lat: 18.4447,
    lon: 77.4508,
    elevM: -2540,
    altitudeKm: 42,
    resMetersPerPx: 145,
    qualityTierLabel: 'ULTRA-HD SITE (Max Z12)',
    activeSiteName: 'Jezero Crater Delta Front',
  });

  // Sun & Visual Controls State
  const [sunAzimuth, setSunAzimuth] = useState<number>(115);
  const [sunElevation, setSunElevation] = useState<number>(38);
  const [sunIntensity, setSunIntensity] = useState<number>(2.8);
  const [ambientIntensity, setAmbientIntensity] = useState<number>(0.85);
  const [lockSunToCamera, setLockSunToCamera] = useState<boolean>(false);

  const [exaggeration, setExaggeration] = useState<number>(3.5);
  const [layerMode, setLayerMode] = useState<VisualLayerMode>('realistic');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showTileBorders, setShowTileBorders] = useState<boolean>(false);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true);

  // Mutable Refs for 3D Engine
  const tileGroupRef = useRef<THREE.Group | null>(null);
  const markers3DGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const rootsRef = useRef<QuadTileNode[]>([]);
  const schedulerRef = useRef<TileDownloadScheduler | null>(null);

  // Dedicated Spherical Planetary Camera State (originating at Jezero Crater Delta Front)
  const navStateRef = useRef({
    focusLat: 18.4447,
    focusLon: 77.4508,
    targetLat: 18.4447,
    targetLon: 77.4508,
    altitude: (42 / MARS_RADIUS_KM) * GLOBE_RADIUS,
    targetAltitude: (42 / MARS_RADIUS_KM) * GLOBE_RADIUS,
    tiltDeg: 38,
    targetTiltDeg: 38,
    bearingDeg: 0,
    targetBearingDeg: 0,
    lastWheelTime: 0,
  });

  const paramsRef = useRef({
    exaggeration: 3.5,
    wireframe: false,
    showTileBorders: false,
    showSiteMarkers: true,
    layerMode: 'realistic' as VisualLayerMode,
    lockSunToCamera: false,
    sunAzimuth: 115,
    sunElevation: 38,
  });

  useEffect(() => {
    paramsRef.current.exaggeration = exaggeration;
    paramsRef.current.wireframe = wireframe;
    paramsRef.current.showTileBorders = showTileBorders;

    const tileGroup = tileGroupRef.current;
    if (!tileGroup) return;

    const traverseAndUpdate = (node: QuadTileNode) => {
      if (node.mesh) {
        node.buildOrUpdateMesh(exaggeration, wireframe, showTileBorders, tileGroup);
      }
      if (node.children) {
        node.children.forEach(traverseAndUpdate);
      }
    };
    rootsRef.current.forEach(traverseAndUpdate);
  }, [exaggeration, wireframe, showTileBorders]);

  useEffect(() => {
    paramsRef.current.showSiteMarkers = showSiteMarkers;
    if (markers3DGroupRef.current) {
      markers3DGroupRef.current.visible = showSiteMarkers;
    }
  }, [showSiteMarkers]);

  useEffect(() => {
    paramsRef.current.lockSunToCamera = lockSunToCamera;
    paramsRef.current.sunAzimuth = sunAzimuth;
    paramsRef.current.sunElevation = sunElevation;
  }, [lockSunToCamera, sunAzimuth, sunElevation]);

  const updateSunSystem = useCallback(() => {
    if (!sunLightRef.current || !hemiLightRef.current || !sunMeshRef.current) return;

    let sunPos: THREE.Vector3;
    if (paramsRef.current.lockSunToCamera && cameraRef.current) {
      const camPos = cameraRef.current.position.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(up, camPos).normalize();
      const localUp = new THREE.Vector3().crossVectors(camPos, right).normalize();
      sunPos = camPos
        .clone()
        .multiplyScalar(0.65)
        .addScaledVector(right, 0.55)
        .addScaledVector(localUp, 0.45)
        .normalize()
        .multiplyScalar(450);
    } else {
      sunPos = latLonToVector3(paramsRef.current.sunElevation, paramsRef.current.sunAzimuth, 450);
    }

    sunLightRef.current.position.copy(sunPos);
    sunLightRef.current.intensity = sunIntensity;
    hemiLightRef.current.intensity = ambientIntensity;
    sunMeshRef.current.position.copy(sunPos);

    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uSunDirection.value.copy(sunPos).normalize();
    }
  }, [sunIntensity, ambientIntensity]);

  useEffect(() => {
    updateSunSystem();
  }, [sunAzimuth, sunElevation, sunIntensity, ambientIntensity, lockSunToCamera, updateSunSystem]);

  useEffect(() => {
    if (atmosphereRef.current) {
      atmosphereRef.current.visible = showAtmosphere;
    }
  }, [showAtmosphere]);

  const sampleElevationAtLatLon = useCallback(
    (lat: number, lon: number): { elevM: number; node: QuadTileNode | null } => {
      const nLon = normalizeLon(lon);
      let current: QuadTileNode | null =
        rootsRef.current.find((r) => nLon >= r.lonMin && nLon <= r.lonMax) ||
        rootsRef.current[0] ||
        null;

      while (current && current.children) {
        const nextChild: QuadTileNode | undefined = current.children.find(
          (ch) =>
            nLon >= ch.lonMin &&
            nLon <= ch.lonMax &&
            lat >= ch.latMin &&
            lat <= ch.latMax
        );
        if (nextChild) {
          current = nextChild;
        } else {
          break;
        }
      }

      if (!current) return { elevM: -2000, node: null };

      const u = Math.max(
        0,
        Math.min(1, (nLon - current.lonMin) / (current.lonMax - current.lonMin))
      );
      const v = Math.max(
        0,
        Math.min(1, (current.latMax - lat) / (current.latMax - current.latMin))
      );
      const c = Math.min(TILE_SEGMENTS, Math.round(u * TILE_SEGMENTS));
      const r = Math.min(TILE_SEGMENTS, Math.round(v * TILE_SEGMENTS));
      return {
        elevM: current.demGrid[r * DEM_GRID_SIZE + c],
        node: current,
      };
    },
    []
  );

  // Fly Camera to Expedition Site (or Global Orbit View)
  const flyToExpeditionSite = useCallback((site: ExpeditionSite) => {
    setSelectedSite(site);
    const nav = navStateRef.current;
    nav.targetLat = site.lat;
    nav.targetLon = normalizeLon(site.lon);
    nav.targetAltitude = (site.targetAltitudeKm / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = site.targetTiltDeg;
    nav.targetBearingDeg = 0;
    setCameraTiltUI(site.targetTiltDeg);

    if (!paramsRef.current.lockSunToCamera) {
      setSunAzimuth(Math.round((normalizeLon(site.lon) + 35 + 360) % 360));
      setSunElevation(Math.max(25, Math.min(58, Math.round(site.lat + 22))));
    }
  }, []);

  const flyToGlobalOrbit = useCallback(() => {
    const nav = navStateRef.current;
    nav.targetAltitude = (5200 / MARS_RADIUS_KM) * GLOBE_RADIUS;
    nav.targetTiltDeg = 10;
    nav.targetBearingDeg = 0;
    setCameraTiltUI(10);
  }, []);

  const handleTiltChange = (newTilt: number) => {
    setCameraTiltUI(newTilt);
    navStateRef.current.targetTiltDeg = newTilt;
  };

  const handleLayerModeChange = (newMode: VisualLayerMode) => {
    setLayerMode(newMode);
    paramsRef.current.layerMode = newMode;

    const refreshNode = (node: QuadTileNode) => {
      node.isLoaded = false;
      node.cancelPendingLoad();
      if (node.children) {
        node.children.forEach(refreshNode);
      }
    };
    rootsRef.current.forEach(refreshNode);
  };

  // ==========================================================================
  // INITIALIZE THREE.JS SCENE, 3D SITE BEACONS, CAMERA & SELECTIVE QUADTREE
  // ==========================================================================
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050a);

    // Starfield
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
        new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.85 })
      )
    );

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.02, 2500);
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

    // Lighting System
    const hemiLight = new THREE.HemisphereLight(0xffe6d0, 0x4a2c1d, 0.85);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const initSunPos = latLonToVector3(38, 115, 450);
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

    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = 128;
    coronaCanvas.height = 128;
    const cCtx = coronaCanvas.getContext('2d')!;
    const grad = cCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 250, 230, 1)');
    grad.addColorStop(0.35, 'rgba(255, 190, 100, 0.55)');
    grad.addColorStop(1, 'rgba(255, 100, 30, 0)');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 128, 128);
    const coronaSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(coronaCanvas),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coronaSprite.scale.set(45, 45, 1);
    sunMesh.add(coronaSprite);

    // Atmosphere Glow Shell
    const atmosGeom = new THREE.SphereGeometry(GLOBE_RADIUS * 1.022, 96, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: initSunPos.clone().normalize() },
        uAtmosphereColor: { value: new THREE.Color(0xe07b42) },
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
          float alpha = fresnel * (0.18 + 0.82 * sunFactor) * 0.55;
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

    const tileGroup = new THREE.Group();
    scene.add(tileGroup);
    tileGroupRef.current = tileGroup;

    // ========================================================================
    // 3D SURFACE BEACONS & PULSING RINGS FOR THE 4 EXPEDITION SITES
    // ========================================================================
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

      // Vertical laser stem along local Z (oriented via lookAt outward normal)
      const stemGeom = new THREE.CylinderGeometry(0.035, 0.01, 2.4, 12);
      stemGeom.rotateX(Math.PI / 2);
      stemGeom.translate(0, 0, 1.2);
      const stemMat = new THREE.MeshBasicMaterial({
        color: colorObj,
        transparent: true,
        opacity: 0.85,
      });
      siteGroup.add(new THREE.Mesh(stemGeom, stemMat));

      // Glowing beacon tip sphere
      const tipGeom = new THREE.SphereGeometry(0.18, 16, 16);
      tipGeom.translate(0, 0, 2.45);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      siteGroup.add(new THREE.Mesh(tipGeom, tipMat));

      // Inner target ring on surface
      const innerRingGeom = new THREE.RingGeometry(0.28, 0.42, 32);
      innerRingGeom.translate(0, 0, 0.04);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: colorObj,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      siteGroup.add(new THREE.Mesh(innerRingGeom, innerRingMat));

      // Animated pulsing outer ring
      const pulseRingGeom = new THREE.RingGeometry(0.55, 0.72, 36);
      pulseRingGeom.translate(0, 0, 0.05);
      const pulseRingMat = new THREE.MeshBasicMaterial({
        color: colorObj,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const pulseRing = new THREE.Mesh(pulseRingGeom, pulseRingMat);
      siteGroup.add(pulseRing);

      markers3DGroup.add(siteGroup);
      beaconEntries.push({ site, group: siteGroup, pulseRing });
    }

    const scheduler = new TileDownloadScheduler((active, queued) => {
      setStreamingCount(active + queued);
    });
    schedulerRef.current = scheduler;

    // Root Quadtree Tiles (z = 0)
    const rootWest = new QuadTileNode(0, 0, 0, null);
    const rootEast = new QuadTileNode(0, 0, 1, null);
    rootsRef.current = [rootWest, rootEast];

    rootWest.buildOrUpdateMesh(paramsRef.current.exaggeration, false, false, tileGroup);
    rootEast.buildOrUpdateMesh(paramsRef.current.exaggeration, false, false, tileGroup);

    const requestTileDownload = (node: QuadTileNode, priorityScore: number) => {
      if (node.isLoaded || node.isLoading || node.isDisposed) return;
      node.isLoading = true;

      node.cancelDownload = scheduler.enqueue(node.key, priorityScore, async () => {
        await loadTileDataFromTrek(node, paramsRef.current.layerMode);
        if (node.isDisposed) return;
        node.isLoading = false;
        node.buildOrUpdateMesh(
          paramsRef.current.exaggeration,
          paramsRef.current.wireframe,
          paramsRef.current.showTileBorders,
          tileGroup
        );
        if (node.children) {
          for (const ch of node.children) {
            if (!ch.isLoaded) {
              ch.inheritFromParent(node);
              ch.buildOrUpdateMesh(
                paramsRef.current.exaggeration,
                paramsRef.current.wireframe,
                paramsRef.current.showTileBorders,
                tileGroup
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
    // SPHERICAL PLANETARY CAMERA CONTROLLER
    // ========================================================================
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    let isDragging = false;
    let dragButton = 0;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragButton = e.button;
      prevX = e.clientX;
      prevY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
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
        setCameraTiltUI(Math.round(nav.targetTiltDeg));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const nav = navStateRef.current;
      nav.lastWheelTime = performance.now();

      const zoomFactor = Math.pow(0.82, -e.deltaY / 100);
      nav.targetAltitude = Math.max(0.055, Math.min(280.0, nav.targetAltitude * zoomFactor));

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
      }
    };

    const preventContext = (e: MouseEvent) => e.preventDefault();

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('dblclick', onDoubleClick);
    domEl.addEventListener('contextmenu', preventContext);

    const updateSphericalCamera = (): THREE.Vector3 => {
      const nav = navStateRef.current;

      const dLon = normalizeLon(nav.targetLon - nav.focusLon);
      nav.focusLon = normalizeLon(nav.focusLon + dLon * 0.18);
      nav.focusLat = clampLat(nav.focusLat + (nav.targetLat - nav.focusLat) * 0.18);
      nav.altitude += (nav.targetAltitude - nav.altitude) * 0.18;
      nav.tiltDeg += (nav.targetTiltDeg - nav.tiltDeg) * 0.18;

      const dBear = ((nav.targetBearingDeg - nav.bearingDeg + 540) % 360) - 180;
      nav.bearingDeg = (nav.bearingDeg + dBear * 0.18 + 360) % 360;

      const { elevM } = sampleElevationAtLatLon(nav.focusLat, nav.focusLon);
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
      const { elevM: underCamElev } = sampleElevationAtLatLon(camLatLon.lat, camLatLon.lon);
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

      return focusPoint3D;
    };

    // ========================================================================
    // UPDATE 3D BEACONS & PROJECTED HUD MARKERS FOR THE 4 EXPEDITION SITES
    // ========================================================================
    let frameCounter = 0;

    const updateSiteBeaconsAndMarkers = () => {
      const camPos = camera.position;
      const camDir = camPos.clone().normalize();
      const camRadius = camPos.length();
      const horizonCos = GLOBE_RADIUS / Math.max(GLOBE_RADIUS + 0.01, camRadius);
      const pulsePhase = (performance.now() * 0.0022) % 1.0;

      const newProjected: ProjectedMarkerPos[] = [];
      const w = container.clientWidth;
      const h = container.clientHeight;

      for (const entry of beaconEntries) {
        const { site, group, pulseRing } = entry;
        const { elevM } = sampleElevationAtLatLon(site.lat, site.lon);
        const surfR = elevationMetersToRadius(elevM, paramsRef.current.exaggeration);
        const pos3D = latLonToVector3(site.lat, site.lon, surfR);
        const normal = pos3D.clone().normalize();

        group.position.copy(pos3D);
        group.lookAt(pos3D.clone().add(normal));

        // Scale 3D beacon dynamically with camera distance so it is visible from orbit AND close up
        const distToCam = camPos.distanceTo(pos3D);
        const beaconScale = Math.max(0.025, Math.min(3.2, distToCam * 0.022));
        group.scale.setScalar(beaconScale);

        // Animate pulsing ring
        const pScale = 0.8 + pulsePhase * 1.4;
        pulseRing.scale.set(pScale, pScale, 1);
        (pulseRing.material as THREE.MeshBasicMaterial).opacity = (1.0 - pulsePhase) * 0.75;

        // Project to 2D screen coordinates for clickable HUD pin
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

        newProjected.push({
          site,
          x: screenX,
          y: screenY,
          visible: inScreen,
          distKm: (distToCam / GLOBE_RADIUS) * MARS_RADIUS_KM,
        });
      }

      if (frameCounter % 2 === 0) {
        setProjectedMarkers(newProjected);
      }
    };

    // ========================================================================
    // SELECTIVE QUALITY + LAZY WATCHED-ONLY QUADTREE LOD ENGINE
    // ========================================================================
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

        // 1. Strict Geometric Horizon & Viewport Culling
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

        // 2. SELECTIVE QUALITY SUBDIVISION CRITERION:
        // - Tiles intersecting any of the 4 Expedition Sites subdivide up to Z=12 (25cm HiRISE / 6m CTX)
        // - All other tiles on Mars stop subdividing at Z=5 (MAX_GLOBAL_ZOOM = 5)
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
              new QuadTileNode(nextZ, r2, c2, node),
              new QuadTileNode(nextZ, r2, c2 + 1, node),
              new QuadTileNode(nextZ, r2 + 1, c2, node),
              new QuadTileNode(nextZ, r2 + 1, c2 + 1, node),
            ];
            for (const ch of node.children) {
              ch.buildOrUpdateMesh(
                paramsRef.current.exaggeration,
                paramsRef.current.wireframe,
                paramsRef.current.showTileBorders,
                tileGroup
              );
            }
          }

          node.setVisible(false, paramsRef.current.showTileBorders);
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

        node.setVisible(true, paramsRef.current.showTileBorders);
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
      if (frameCounter % 10 === 0) {
        setMaxRenderedZoom(highestZ);
        setVisibleTileCount(renderedTiles);

        const nav = navStateRef.current;
        const { elevM, node: activeNode } = sampleElevationAtLatLon(nav.focusLat, nav.focusLon);
        const altKm = Math.max(0.5, (nav.altitude / GLOBE_RADIUS) * MARS_RADIUS_KM);

        const activeZ = activeNode ? activeNode.z : highestZ;
        const cols = 2 * (1 << activeZ);
        const rows = 1 * (1 << activeZ);
        const cIdx = Math.min(
          cols - 1,
          Math.max(0, Math.floor(((normalizeLon(nav.focusLon) + 180) / 360) * cols))
        );
        const rIdx = Math.min(
          rows - 1,
          Math.max(0, Math.floor(((90 - nav.focusLat) / 180) * rows))
        );
        const resMpp = (2 * Math.PI * 3396200) / (cols * (activeNode ? activeNode.texSize : 256));

        const matchedSite = findIntersectingExpeditionSite(
          normalizeLon(nav.focusLon) - 0.05,
          nav.focusLat - 0.05,
          normalizeLon(nav.focusLon) + 0.05,
          nav.focusLat + 0.05
        );

        setCenterTileInfo({
          z: activeZ,
          row: rIdx,
          col: cIdx,
          lat: nav.focusLat,
          lon: normalizeLon(nav.focusLon),
          elevM,
          altitudeKm: altKm,
          resMetersPerPx: resMpp,
          qualityTierLabel: matchedSite
            ? `${matchedSite.role === 'PRIMARY LANDING SITE' ? 'ULTRA-HD' : 'HIGH-DETAIL'} (Max Z${matchedSite.maxZoom})`
            : `GLOBAL BASELINE (Capped Z${MAX_GLOBAL_ZOOM})`,
          activeSiteName: matchedSite ? matchedSite.name : null,
        });
      }
    };

    // Main Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const focusPoint3D = updateSphericalCamera();
      if (paramsRef.current.lockSunToCamera) {
        updateSunSystem();
      }
      updateQuadtreeLOD(focusPoint3D);
      updateSiteBeaconsAndMarkers();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('dblclick', onDoubleClick);
      domEl.removeEventListener('contextmenu', preventContext);
      rootsRef.current.forEach((r) => r.dispose(tileGroup));
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, [sampleElevationAtLatLon, updateSunSystem]);

  return (
    <div className="relative w-full h-screen bg-[#03050a] text-slate-100 overflow-hidden font-sans select-none">
      {/* 3D WebGL Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* =====================================================================
          INTERACTIVE 3D-PROJECTED EXPEDITION SITE MARKERS ON THE GLOBE
         ===================================================================== */}
      {showSiteMarkers && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {projectedMarkers.map(({ site, x, y, visible }) => {
            if (!visible) return null;
            const isSelected = selectedSite.id === site.id;
            const isPrimary = site.role === 'PRIMARY LANDING SITE';

            return (
              <div
                key={site.id}
                style={{
                  transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
                }}
                className="absolute top-0 left-0 -translate-x-1/2 -translate-y-full pb-2 pointer-events-auto group"
              >
                <button
                  onClick={() => flyToExpeditionSite(site)}
                  title={`Fly to ${site.name} (${site.qualityBadge})`}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg backdrop-blur-md border transition-all duration-200 shadow-lg hover:scale-105 ${
                    isSelected
                      ? 'bg-[#081220]/95 border-cyan-400/90 shadow-[0_0_16px_rgba(0,240,255,0.35)]'
                      : 'bg-[#0b0f17]/85 border-slate-600/80 hover:border-slate-400'
                  }`}
                >
                  {/* Pulsing Target Reticle Dot */}
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: site.color }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ backgroundColor: site.color }}
                    />
                  </span>

                  <div className="text-left leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-100 whitespace-nowrap">
                        {site.shortLabel}
                      </span>
                      <span
                        className={`text-[8px] font-mono px-1 py-0.2 rounded uppercase font-semibold ${
                          isPrimary
                            ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                            : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                        }`}
                      >
                        {isPrimary ? 'PRIMARY Z12' : 'HUB Z12'}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-300/80 font-mono whitespace-nowrap">
                      {site.lat >= 0 ? `${site.lat.toFixed(1)}°N` : `${Math.abs(site.lat).toFixed(1)}°S`},{' '}
                      {site.lon.toFixed(1)}°E • Click to Inspect
                    </div>
                  </div>
                </button>

                {/* Pointer Stem Down to 3D Beacon */}
                <div
                  className="mx-auto w-0.5 h-2.5 opacity-80"
                  style={{ backgroundColor: site.color }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Top-Left Header */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]" />
          <h1 className="text-lg md:text-2xl font-bold tracking-wider text-slate-50 uppercase drop-shadow">
            Mars Expedition Globe
          </h1>
        </div>
        <p className="text-xs text-slate-300/90 mt-0.5 max-w-lg drop-shadow">
          Selective High-Detail Streaming: <span className="text-cyan-300 font-semibold">Zoom 12 (25cm HiRISE / 6m CTX)</span> at 4 Expedition Hubs • <span className="text-amber-300 font-semibold">Zoom 5 Lightweight</span> Global Baseline
        </p>
      </div>

      {/* Bottom-Left: Live Quadtree Tile & Selective Quality Telemetry HUD */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0b0f17]/90 backdrop-blur-md border border-slate-700/70 p-4 rounded-xl shadow-2xl text-xs space-y-2 w-84 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="text-[11px] font-bold tracking-wider text-cyan-400 uppercase">
            Selective LOD Telemetry
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              streamingCount > 0
                ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {streamingCount > 0 ? `Streaming ${streamingCount} tiles` : 'Viewport Ready'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="text-slate-400">Region Quality Tier:</div>
          <div
            className={`font-mono font-semibold text-right ${
              centerTileInfo.activeSiteName ? 'text-cyan-300' : 'text-amber-300'
            }`}
          >
            {centerTileInfo.qualityTierLabel}
          </div>

          <div className="text-slate-400">Watched Tile (z/y/x):</div>
          <div className="font-mono text-slate-200 font-semibold text-right">
            z={centerTileInfo.z} / y={centerTileInfo.row} / x={centerTileInfo.col}
          </div>

          <div className="text-slate-400">Active Region:</div>
          <div className="font-mono text-emerald-300 text-right truncate">
            {centerTileInfo.activeSiteName || 'Global Baseline (Low-Res)'}
          </div>

          <div className="text-slate-400">Focus Coordinates:</div>
          <div className="font-mono text-slate-200 text-right">
            {centerTileInfo.lat >= 0
              ? `${centerTileInfo.lat.toFixed(3)}° N`
              : `${Math.abs(centerTileInfo.lat).toFixed(3)}° S`}
            , {centerTileInfo.lon.toFixed(3)}° E
          </div>

          <div className="text-slate-400">Surface Elevation:</div>
          <div className="font-mono text-emerald-400 text-right">
            {centerTileInfo.elevM.toFixed(0)} m
          </div>

          <div className="text-slate-400">Camera Altitude:</div>
          <div className="font-mono text-slate-200 text-right">
            {centerTileInfo.altitudeKm < 100
              ? `${centerTileInfo.altitudeKm.toFixed(1)} km`
              : `${Math.round(centerTileInfo.altitudeKm).toLocaleString()} km`}
          </div>

          <div className="text-slate-400">Ground Resolution:</div>
          <div className="font-mono text-slate-300 text-right">
            ~
            {centerTileInfo.resMetersPerPx < 100
              ? `${centerTileInfo.resMetersPerPx.toFixed(1)} m/px`
              : `${Math.round(centerTileInfo.resMetersPerPx).toLocaleString()} m/px`}
          </div>

          <div className="text-slate-400">Active Meshes:</div>
          <div className="font-mono text-slate-300 text-right">
            {visibleTileCount} patches
          </div>
        </div>

        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
          <span className="text-cyan-300 font-semibold">{selectedSite.name}:</span>{' '}
          {selectedSite.description}
        </div>
      </div>

      {/* Bottom-Right: The 4 High-Detail Expedition Sites Navigation Panel */}
      <div className="absolute bottom-4 right-4 z-10 bg-[#0b0f17]/90 backdrop-blur-md border border-slate-700/70 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 w-80 pointer-events-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-100 uppercase">
              High-Detail Expedition Sites
            </div>
            <div className="text-[9px] text-slate-400">
              Ultra/High-Res Z12 Unlocked • Rest of Mars Capped at Z5
            </div>
          </div>
          <button
            onClick={flyToGlobalOrbit}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-semibold border border-slate-700 transition-colors shrink-0"
            title="Zoom out to inspect all 4 markers across the globe"
          >
            Globe View
          </button>
        </div>

        <div className="space-y-1.5">
          {EXPEDITION_SITES.map((site) => {
            const isSelected = selectedSite.id === site.id;
            const isPrimary = site.role === 'PRIMARY LANDING SITE';
            return (
              <button
                key={site.id}
                onClick={() => flyToExpeditionSite(site)}
                className={`w-full text-left p-2 rounded-lg transition-all border ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: site.color }}
                    />
                    <span className="text-[11px] font-bold text-slate-100 truncate">
                      {site.name}
                    </span>
                  </div>
                  <span
                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                      isPrimary
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isPrimary ? 'PRIMARY' : 'HUB'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 pl-4">
                  {site.subtitle}
                </div>
                <div className="text-[9px] font-mono text-cyan-300/90 mt-0.5 pl-4">
                  {site.qualityBadge}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top-Right: Sun Illumination, Camera Tilt, Layer Architecture & Marker Controls */}
      <div className="absolute top-4 right-4 z-10 bg-[#0b0f17]/90 backdrop-blur-md border border-slate-700/70 p-4 rounded-xl shadow-2xl text-xs space-y-3 w-80 pointer-events-auto max-h-[58vh] overflow-y-auto">
        <div className="text-[11px] font-bold tracking-wider text-amber-400 uppercase border-b border-slate-800 pb-1 flex justify-between items-center">
          <span>Sun Illumination System</span>
          <button
            onClick={() => setLockSunToCamera(!lockSunToCamera)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
              lockSunToCamera
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {lockSunToCamera ? 'Locked to View' : 'Manual Angle'}
          </button>
        </div>

        {/* Sun Azimuth */}
        <div className={lockSunToCamera ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex justify-between mb-0.5">
            <span className="text-slate-400">Sun Longitude (Azimuth):</span>
            <span className="font-mono text-amber-300">{sunAzimuth}° E</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={sunAzimuth}
            onChange={(e) => setSunAzimuth(parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Sun Elevation */}
        <div className={lockSunToCamera ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex justify-between mb-0.5">
            <span className="text-slate-400">Sun Latitude (Altitude):</span>
            <span className="font-mono text-amber-300">{sunElevation}°</span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            step="1"
            value={sunElevation}
            onChange={(e) => setSunElevation(parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Sun Intensity & Ambient Fill */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between mb-0.5 text-[10px]">
              <span className="text-slate-400">Sunlight:</span>
              <span className="font-mono text-amber-300">{sunIntensity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={sunIntensity}
              onChange={(e) => setSunIntensity(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between mb-0.5 text-[10px]">
              <span className="text-slate-400">Sky Fill:</span>
              <span className="font-mono text-amber-300">{ambientIntensity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={ambientIntensity}
              onChange={(e) => setAmbientIntensity(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Camera Pitch / 3D Tilt Angle & Exaggeration */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-slate-400">Camera 3D Tilt Angle:</span>
              <span className="font-mono text-cyan-400">{cameraTiltUI}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="65"
              step="1"
              value={cameraTiltUI}
              onChange={(e) => handleTiltChange(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-slate-400">3D Elevation Exaggeration:</span>
              <span className="font-mono text-cyan-400">{exaggeration.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={exaggeration}
              onChange={(e) => setExaggeration(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Surface Layer Selector & Extensible Scientific Layer Slots */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <label className="text-slate-300 text-[11px] block font-medium">
            Active Base Imagery Layer:
          </label>
          <div className="grid grid-cols-3 gap-1 bg-[#06080d] p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => handleLayerModeChange('realistic')}
              className={`py-1.5 px-1.5 rounded text-[10px] font-medium transition-all ${
                layerMode === 'realistic'
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_#0891b2]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Realistic
            </button>
            <button
              onClick={() => handleLayerModeChange('color_hillshade')}
              className={`py-1.5 px-1.5 rounded text-[10px] font-medium transition-all ${
                layerMode === 'color_hillshade'
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_#0891b2]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Color DEM
            </button>
            <button
              onClick={() => handleLayerModeChange('orbital_raw')}
              className={`py-1.5 px-1.5 rounded text-[10px] font-medium transition-all ${
                layerMode === 'orbital_raw'
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_#0891b2]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw CTX
            </button>
          </div>

          {/* Reserved Slot for Future Optional Layers (Thermal, CO2, etc.) */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium">Optional Scientific Overlays:</span>
              <span className="text-[9px] font-mono text-slate-500">EXTENSIBLE SLOTS</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {FUTURE_SCIENTIFIC_LAYERS.map((slot) => (
                <span
                  key={slot.id}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/70 text-slate-400 border border-slate-700/60"
                  title={`NASA Trek Layer: ${slot.trekProductLabel} (Ready for future activation)`}
                >
                  {slot.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Marker & Visual Toggles */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-medium">Show Expedition Site Markers</span>
            <button
              onClick={() => setShowSiteMarkers(!showSiteMarkers)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                showSiteMarkers
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {showSiteMarkers ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Show Quadtree Tile Borders</span>
            <button
              onClick={() => setShowTileBorders(!showTileBorders)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                showTileBorders
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {showTileBorders ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">3D Mesh Wireframe</span>
            <button
              onClick={() => setWireframe(!wireframe)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                wireframe
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {wireframe ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">Martian Atmosphere Glow</span>
            <button
              onClick={() => setShowAtmosphere(!showAtmosphere)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                showAtmosphere
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {showAtmosphere ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Initial Startup Overlay */}
      {initialLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#03050a]/90 backdrop-blur-md">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium tracking-widest text-slate-200 uppercase">
            Initializing Selective-LOD Mars Expedition Globe...
          </p>
          <p className="text-xs text-cyan-400 mt-1 font-mono">
            Origin: Jezero Crater Delta Front (Perseverance Landing Site)...
          </p>
        </div>
      )}
    </div>
  );
}
