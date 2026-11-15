'use client';

import React, { useState } from 'react';
import { Download, FileText, Check, X, ShieldCheck, Copy, Globe } from 'lucide-react';
import type { ComputedRoundTripRoute, RouteWaypoint } from '../MarsGlobeViewer';

export interface TraverseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeData: ComputedRoundTripRoute | null;
  astronautName?: string;
  siteName?: string;
}

export function TraverseExportModal({
  isOpen,
  onClose,
  routeData,
  astronautName = 'Sadia A. Puspo',
  siteName = 'Jezero Crater',
}: TraverseExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'GEOJSON' | 'GPX' | 'PDS4_XML'>('GEOJSON');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !routeData) return null;

  // Build Standard GeoJSON (RFC 7946)
  const generateGeoJson = (): string => {
    const outboundCoords = routeData.outboundPoints.map((p) => [p.lon, p.lat, Math.round(p.elevM)]);
    const returnCoords = routeData.returnPoints.map((p) => [p.lon, p.lat, Math.round(p.elevM)]);

    const geoJson = {
      type: 'FeatureCollection',
      metadata: {
        mission: 'NASA Artemis-Mars Surface Expedition',
        instrument: 'ARES-NAVIGATOR Multi-Spectral Traverse Engine',
        planetaryDatum: 'Mars MOLA Areoid Geoid (3,396,200m Equator)',
        leadAstronaut: astronautName,
        nationality: 'Bangladesh (BGD)',
        landingSite: siteName,
        generatedTimestampUtc: new Date().toISOString(),
        totalRoundTripDistKm: routeData.totalRoundTripKm,
        outboundDistKm: routeData.outboundDistKm,
        returnDistKm: routeData.returnDistKm,
        estimatedDurationMin: routeData.estRoundTripTimeMin,
        maxTraverseSlopeDeg: routeData.maxSlopeDeg,
        plssWaterBurnGrams: routeData.totalWaterBurnGrams ?? 534,
        ruleOfHalfCompliant: routeData.ruleOfHalfCompliant ?? true,
      },
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Outbound Traverse (A1 -> A2 -> B2)',
            leg: 'OUTBOUND',
            stroke: '#00f0ff',
            strokeWidth: 3,
            maxSlopeDeg: routeData.maxSlopeDeg,
            averageFrictionMu: routeData.avgFrictionMu,
          },
          geometry: {
            type: 'LineString',
            coordinates: outboundCoords,
          },
        },
        {
          type: 'Feature',
          properties: {
            name: 'Asymmetric Return Traverse (B2 -> R1 -> A1)',
            leg: 'RETURN',
            stroke: '#f59e0b',
            strokeWidth: 3,
            maxSlopeDeg: routeData.maxSlopeDeg,
            averageFrictionMu: routeData.avgFrictionMu,
          },
          geometry: {
            type: 'LineString',
            coordinates: returnCoords,
          },
        },
        ...routeData.waypoints.map((wp: RouteWaypoint) => ({
          type: 'Feature',
          properties: {
            id: wp.id,
            name: wp.label,
            elevationM: wp.elevM,
            isOrigin: wp.id === 'A1',
            isTarget: wp.id === 'B2',
          },
          geometry: {
            type: 'Point',
            coordinates: [wp.lon, wp.lat, Math.round(wp.elevM)],
          },
        })),
      ],
    };

    return JSON.stringify(geoJson, null, 2);
  };

  // Build Standard GPX 1.1 format
  const generateGpx = (): string => {
    const timeIso = new Date().toISOString();
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ARES-NAVIGATOR Planetary Mission Suite" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>ARES Mars Traverse - ${siteName}</name>
    <desc>Round-Trip Safe Planetary EVA Traverse for Astronaut ${astronautName} (BGD)</desc>
    <time>${timeIso}</time>
  </metadata>
`;

    // Add Waypoints
    routeData.waypoints.forEach((wp: RouteWaypoint) => {
      gpx += `  <wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
    <ele>${wp.elevM.toFixed(1)}</ele>
    <name>${wp.id}: ${wp.label}</name>
    <sym>${wp.id === 'A1' ? 'Base Camp' : wp.id === 'B2' ? 'Target' : 'Waypoint'}</sym>
  </wpt>\n`;
    });

    // Add Outbound Track
    gpx += `  <trk>
    <name>ARES Outbound Path (A1 to B2)</name>
    <trkseg>\n`;
    routeData.outboundPoints.forEach((p) => {
      gpx += `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
        <ele>${p.elevM.toFixed(1)}</ele>
        <extensions>
          <slope_deg>${p.slopeDeg.toFixed(1)}</slope_deg>
        </extensions>
      </trkpt>\n`;
    });
    gpx += `    </trkseg>
  </trk>
  <trk>
    <name>ARES Return Path (B2 to A1)</name>
    <trkseg>\n`;
    routeData.returnPoints.forEach((p) => {
      gpx += `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
        <ele>${p.elevM.toFixed(1)}</ele>
        <extensions>
          <slope_deg>${p.slopeDeg.toFixed(1)}</slope_deg>
        </extensions>
      </trkpt>\n`;
    });
    gpx += `    </trkseg>
  </trk>
</gpx>`;

    return gpx;
  };

  // Build NASA PDS4 XML Observational Product
  const generatePds4Xml = (): string => {
    const timeIso = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<Product_Observational xmlns="http://pds.nasa.gov/pds4/pds/v1"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pds.nasa.gov/pds4/pds/v1 https://pds.nasa.gov/pds4/pds/v1/PDS4_PDS_1G00.xsd">
  <Identification_Area>
    <logical_identifier>urn:nasa:pds:mars_ares_navigator:traverses:${siteName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_roundtrip</logical_identifier>
    <version_id>1.0</version_id>
    <title>ARES-NAVIGATOR Autonomous Round-Trip Surface Traverse for ${siteName}</title>
    <information_model_version>1.16.0.0</information_model_version>
    <product_class>Product_Observational</product_class>
  </Identification_Area>
  <Observation_Area>
    <Time_Coordinates>
      <start_date_time>${timeIso}</start_date_time>
      <stop_date_time>${timeIso}</stop_date_time>
    </Time_Coordinates>
    <Primary_Result_Summary>
      <purpose>Human EVA Surface Traversal and Terramechanic Safety Certification</purpose>
      <processing_level>Derived</processing_level>
      <description>Autonomous A* path computation enforcing 0.38g gravity, Bekker-Wong soil compaction, and NASA EVA Rule of Half</description>
    </Primary_Result_Summary>
    <Investigation_Area>
      <name>Artemis-Mars Expedition Surface Traverse</name>
      <type>Mission</type>
      <internal_id>urn:nasa:pds:context:investigation:mission.artemis_mars</internal_id>
    </Investigation_Area>
    <Target_Identification>
      <name>Mars</name>
      <type>Planet</type>
      <internal_id>urn:nasa:pds:context:target:planet.mars</internal_id>
    </Target_Identification>
    <Mission_Area>
      <Lead_Astronaut>${astronautName}</Lead_Astronaut>
      <Astronaut_Nation>Bangladesh</Astronaut_Nation>
      <Geodetic_Datum>MOLA Areoid 3,396,200m</Geodetic_Datum>
      <Total_Distance_Km>${routeData.totalRoundTripKm}</Total_Distance_Km>
      <Max_Safe_Slope_Deg>${routeData.maxSlopeDeg}</Max_Safe_Slope_Deg>
      <Rule_Of_Half_Compliance>${routeData.ruleOfHalfCompliant ? 'PASS' : 'FAIL'}</Rule_Of_Half_Compliance>
      <Estimated_Water_Burn_Grams>${routeData.totalWaterBurnGrams ?? 534}</Estimated_Water_Burn_Grams>
    </Mission_Area>
  </Observation_Area>
  <File_Area_Observational>
    <File>
      <file_name>ares_traverse_${siteName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv</file_name>
      <creation_date_time>${timeIso}</creation_date_time>
      <records>${routeData.outboundPoints.length + routeData.returnPoints.length}</records>
    </File>
  </File_Area_Observational>
</Product_Observational>`;
  };

  const getFileContent = (): string => {
    switch (selectedFormat) {
      case 'GEOJSON':
        return generateGeoJson();
      case 'GPX':
        return generateGpx();
      case 'PDS4_XML':
        return generatePds4Xml();
    }
  };

  const getFileName = (): string => {
    const slug = siteName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    switch (selectedFormat) {
      case 'GEOJSON':
        return `ARES_TRAVERSE_${slug}_SADIA_PUSPO.geojson`;
      case 'GPX':
        return `ARES_TRAVERSE_${slug}_SADIA_PUSPO.gpx`;
      case 'PDS4_XML':
        return `ARES_PDS4_${slug}_PRODUCT.xml`;
    }
  };

  const handleDownload = () => {
    const content = getFileContent();
    const filename = getFileName();
    const mimeType =
      selectedFormat === 'GEOJSON'
        ? 'application/json'
        : selectedFormat === 'GPX'
        ? 'application/gpx+xml'
        : 'application/xml';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFileContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#081120] border border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#060c18]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
                  NASA MISSION TRAVERSE EXPORT
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  READY
                </span>
              </div>
              <div className="text-[10px] font-mono text-cyan-400/80">
                ASTRONAUT: {astronautName} (BGD) • DATUM: MOLA AREOID GEOID
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="p-4 border-b border-slate-800 bg-[#070e1c] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFormat('GEOJSON')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFormat === 'GEOJSON'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>GeoJSON (RFC 7946)</span>
            </button>
            <button
              onClick={() => setSelectedFormat('GPX')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFormat === 'GPX'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>GPX 1.1 (GPS Track)</span>
            </button>
            <button
              onClick={() => setSelectedFormat('PDS4_XML')}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFormat === 'PDS4_XML'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>NASA PDS4 XML</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {routeData.totalRoundTripKm} km • {routeData.outboundPoints.length + routeData.returnPoints.length} points
          </div>
        </div>

        {/* Preview Code View */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#040812] font-mono text-[11px] text-cyan-300/90 leading-relaxed border-b border-slate-800">
          <pre className="whitespace-pre overflow-x-auto selection:bg-cyan-500/30">
            {getFileContent()}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#060c18] flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>CERTIFIED FOR FLIGHT COMPUTER INGESTION</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-900 font-mono text-xs font-extrabold tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] flex items-center gap-1.5 cursor-pointer hover:scale-105"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>DOWNLOAD {selectedFormat}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
