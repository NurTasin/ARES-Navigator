'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface JezeroMetadata {
  minElevation: number;
  maxElevation: number;
  width: number;
  height: number;
  bbox: number[];
  center: { lon: number; lat: number };
  name: string;
}

type TextureMode = 'realistic' | 'topographic' | 'shaded';

export default function JezeroViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [metadata, setMetadata] = useState<JezeroMetadata | null>(null);
  const [exaggeration, setExaggeration] = useState<number>(2.2);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [textureMode, setTextureMode] = useState<TextureMode>('realistic');
  const [sunAngle, setSunAngle] = useState<number>(45);

  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rawElevationsRef = useRef<Float32Array | null>(null);
  const texturesRef = useRef<{ [key: string]: THREE.Texture }>({});

  // Dynamic vertical exaggeration updates
  useEffect(() => {
    if (!terrainMeshRef.current || !rawElevationsRef.current || !metadata) return;

    const geometry = terrainMeshRef.current.geometry as THREE.PlaneGeometry;
    const posAttr = geometry.attributes.position;
    const elevations = rawElevationsRef.current;
    const minElev = metadata.minElevation;
    const maxElev = metadata.maxElevation;
    const elevRange = maxElev - minElev || 1;

    for (let i = 0; i < posAttr.count; i++) {
      const elev = elevations[i];
      const norm = (elev - minElev) / elevRange;
      posAttr.setZ(i, norm * 15 * (exaggeration / 2.0));
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [exaggeration, metadata]);

  // Wireframe toggle
  useEffect(() => {
    if (terrainMeshRef.current) {
      const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.wireframe = wireframe;
      mat.needsUpdate = true;
    }
  }, [wireframe]);

  // Texture mode toggle (Realistic / Topographic / Shaded)
  useEffect(() => {
    if (!terrainMeshRef.current) return;
    const mat = terrainMeshRef.current.material as THREE.MeshStandardMaterial;

    if (textureMode === 'realistic' && texturesRef.current.realistic) {
      mat.map = texturesRef.current.realistic;
      mat.color.setHex(0xffffff);
      mat.roughness = 0.85;
    } else if (textureMode === 'topographic' && texturesRef.current.topographic) {
      mat.map = texturesRef.current.topographic;
      mat.color.setHex(0xffffff);
      mat.roughness = 0.80;
    } else if (textureMode === 'shaded') {
      mat.map = null;
      mat.color.setHex(0xb26038); // Pure Martian terracotta clay shading
      mat.roughness = 0.90;
    }
    mat.needsUpdate = true;
  }, [textureMode]);

  // Sun lighting rotation
  useEffect(() => {
    if (!sunLightRef.current) return;
    const rad = (sunAngle * Math.PI) / 180;
    const radius = 90;
    sunLightRef.current.position.set(Math.cos(rad) * radius, Math.sin(rad) * radius, 70);
  }, [sunAngle]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene with Martian atmospheric haze
    const scene = new THREE.Scene();
    const marsHaze = new THREE.Color(0x1a0f0a);
    scene.background = marsHaze;
    scene.fog = new THREE.FogExp2(0x1a0f0a, 0.0035);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -65, 55);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Orbit Controls with restricted tilt and smooth damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 220;
    controls.minDistance = 12;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.set(0, 0, 0);

    // Lighting (Warm Martian Sun + Atmospheric Sky Ambient)
    const ambientLight = new THREE.AmbientLight(0xffdfcb, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedb, 2.2);
    sunLight.position.set(65, -45, 75);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Soft Martian horizon backlight (sky bounce)
    const skyBounce = new THREE.DirectionalLight(0x734832, 0.5);
    skyBounce.position.set(-60, 50, -10);
    scene.add(skyBounce);

    // Martian Base Ring Frame
    const ringBase = new THREE.RingGeometry(57, 59, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x3d2015, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringBase, ringMat);
    ringMesh.position.z = -0.2;
    scene.add(ringMesh);

    async function loadData() {
      try {
        const [metaRes, binRes] = await Promise.all([
          fetch('/mars/jezero_meta.json'),
          fetch('/mars/jezero_dem_256.bin'),
        ]);

        const meta: JezeroMetadata = await metaRes.json();
        const buffer = await binRes.arrayBuffer();
        const elevations = new Float32Array(buffer);
        rawElevationsRef.current = elevations;
        setMetadata(meta);

        // Load both textures
        const textureLoader = new THREE.TextureLoader();
        const [realTex, topoTex] = await Promise.all([
          textureLoader.loadAsync('/mars/jezero_realistic.png'),
          textureLoader.loadAsync('/mars/jezero_texture.png'),
        ]);

        realTex.colorSpace = THREE.SRGBColorSpace;
        realTex.wrapS = THREE.ClampToEdgeWrapping;
        realTex.wrapT = THREE.ClampToEdgeWrapping;

        topoTex.colorSpace = THREE.SRGBColorSpace;
        topoTex.wrapS = THREE.ClampToEdgeWrapping;
        topoTex.wrapT = THREE.ClampToEdgeWrapping;

        texturesRef.current = {
          realistic: realTex,
          topographic: topoTex,
        };

        // Plane Geometry
        const planeSize = 80;
        const geom = new THREE.PlaneGeometry(
          planeSize,
          planeSize,
          meta.width - 1,
          meta.height - 1
        );

        const posAttr = geom.attributes.position;
        const minElev = meta.minElevation;
        const maxElev = meta.maxElevation;
        const elevRange = maxElev - minElev || 1;

        for (let i = 0; i < posAttr.count; i++) {
          const elev = elevations[i];
          const norm = (elev - minElev) / elevRange;
          posAttr.setZ(i, norm * 15 * 1.1);
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();

        // Realistic PBR Material
        const material = new THREE.MeshStandardMaterial({
          map: realTex,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geom, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        terrainMeshRef.current = mesh;

        // Perseverance Rover Landing Pin (Octavia E. Butler Landing: 18.4447°N, 77.4508°E)
        // Bbox: lon [77.05, 77.85], lat [18.00, 18.80]
        const lonNorm = (77.4508 - 77.05) / (77.85 - 77.05);
        const latNorm = (18.4447 - 18.00) / (18.80 - 18.00);

        const markerX = (lonNorm - 0.5) * planeSize;
        const markerY = (latNorm - 0.5) * planeSize;

        const colIdx = Math.round(lonNorm * (meta.width - 1));
        const rowIdx = Math.round((1 - latNorm) * (meta.height - 1));
        const sampleIdx = Math.min(
          Math.max(rowIdx * meta.width + colIdx, 0),
          elevations.length - 1
        );
        const markerElev = elevations[sampleIdx];
        const markerZ = ((markerElev - minElev) / elevRange) * 15 * 1.1;

        // 3D Landing Marker Pin
        const pinGroup = new THREE.Group();
        pinGroup.position.set(markerX, markerY, markerZ);

        const pinGeom = new THREE.CylinderGeometry(0.3, 0.05, 3.5, 16);
        pinGeom.rotateX(Math.PI / 2);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x007799,
          roughness: 0.2,
          metalness: 0.8,
        });
        const pin = new THREE.Mesh(pinGeom, pinMat);
        pin.position.z = 1.75;
        pinGroup.add(pin);

        // Pulsing Ring Beacon
        const ringGeom = new THREE.RingGeometry(1.2, 1.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const beaconRing = new THREE.Mesh(ringGeom, ringMat);
        beaconRing.position.z = 0.1;
        pinGroup.add(beaconRing);

        scene.add(pinGroup);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load Mars terrain:', err);
      }
    }

    loadData();

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
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
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#110a07] text-slate-100 overflow-hidden font-sans select-none">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Header Overlay */}
      <div className="absolute top-5 left-5 z-10 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse shadow-[0_0_12px_#f59e0b]" />
          <h1 className="text-xl md:text-2xl font-bold tracking-wider text-amber-50 uppercase drop-shadow-md">
            Jezero Crater 3D
          </h1>
        </div>
        <p className="text-xs text-amber-200/70 mt-1 max-w-sm drop-shadow">
          NASA Mars Trek MGS MOLA + MEX HRSC High-Resolution Topography & Realistic Surface Drape
        </p>
      </div>

      {/* Telemetry / Info Card */}
      <div className="absolute bottom-5 left-5 z-10 bg-[#1e130e]/85 backdrop-blur-md border border-amber-900/40 p-4 rounded-xl shadow-2xl text-xs space-y-2 max-w-xs pointer-events-auto">
        <div className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase border-b border-amber-900/40 pb-1 flex justify-between">
          <span>Surface Telemetry</span>
          <span className="text-[10px] text-amber-500/80">MOLA / HRSC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Target Coordinates:</span>
          <span className="font-mono text-amber-100">77.45° E, 18.40° N</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Crater Floor:</span>
          <span className="font-mono text-cyan-400">
            {metadata ? `${metadata.minElevation.toFixed(0)} m` : '-2760 m'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Crater Rim:</span>
          <span className="font-mono text-amber-300">
            {metadata ? `${metadata.maxElevation.toFixed(0)} m` : '-1380 m'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Rim Relief:</span>
          <span className="font-mono text-emerald-400">
            {metadata
              ? `${(metadata.maxElevation - metadata.minElevation).toFixed(0)} m`
              : '1380 m'}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-amber-950 text-[10px] text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span>Cyan Pin: Perseverance Landing Site</span>
        </div>
      </div>

      {/* Interactive Controls Overlay */}
      <div className="absolute top-5 right-5 z-10 bg-[#1e130e]/85 backdrop-blur-md border border-amber-900/40 p-4 rounded-xl shadow-2xl text-xs space-y-4 w-72 pointer-events-auto">
        <div className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase border-b border-amber-900/40 pb-1">
          Visual & Layer Controls
        </div>

        {/* Visual Mode Selector */}
        <div>
          <label className="text-slate-300 text-[11px] block mb-1.5 font-medium">Surface Appearance:</label>
          <div className="grid grid-cols-3 gap-1 bg-[#120a07] p-1 rounded-lg border border-amber-950">
            <button
              onClick={() => setTextureMode('realistic')}
              className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                textureMode === 'realistic'
                  ? 'bg-amber-600 text-white shadow-[0_0_10px_#d97706]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Realistic Mars
            </button>
            <button
              onClick={() => setTextureMode('shaded')}
              className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                textureMode === 'shaded'
                  ? 'bg-amber-600 text-white shadow-[0_0_10px_#d97706]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clay Shaded
            </button>
            <button
              onClick={() => setTextureMode('topographic')}
              className={`py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                textureMode === 'topographic'
                  ? 'bg-amber-600 text-white shadow-[0_0_10px_#d97706]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Topography
            </button>
          </div>
        </div>

        {/* Vertical Exaggeration Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Vertical Relief Scale:</span>
            <span className="font-mono text-amber-200">{exaggeration.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={exaggeration}
            onChange={(e) => setExaggeration(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>0.5x (True Scale)</span>
            <span>2.2x (Default)</span>
            <span>5.0x (Dramatic)</span>
          </div>
        </div>

        {/* Dynamic Sun Lighting Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Sun Light Azimuth:</span>
            <span className="font-mono text-amber-200">{sunAngle}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={sunAngle}
            onChange={(e) => setSunAngle(parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Wireframe Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-950">
          <span className="text-slate-300">Wireframe Mesh</span>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
              wireframe
                ? 'bg-red-600 text-white shadow-[0_0_10px_#ef4444]'
                : 'bg-[#291710] text-slate-300 hover:bg-[#382016]'
            }`}
          >
            {wireframe ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Navigation Instructions */}
        <div className="text-[11px] text-slate-400 border-t border-amber-950 pt-2 space-y-1">
          <p>• <span className="text-amber-200">Left Click + Drag:</span> Orbit & Rotate 360°</p>
          <p>• <span className="text-amber-200">Right Click + Drag:</span> Pan across crater</p>
          <p>• <span className="text-amber-200">Scroll:</span> Zoom into delta & rim</p>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#110a07]/90 backdrop-blur-md">
          <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium tracking-widest text-amber-200 uppercase">
            Loading Jezero Topography & High-Res Textures...
          </p>
          <p className="text-xs text-slate-400 mt-1">Fetching NASA MGS MOLA & HRSC Datasets</p>
        </div>
      )}
    </div>
  );
}
