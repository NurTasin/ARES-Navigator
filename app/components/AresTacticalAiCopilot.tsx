'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  ShieldAlert, 
  Compass, 
  Layers, 
  Activity, 
  Download, 
  Eye, 
  Check, 
  Terminal,
  Minimize2,
  Maximize2
} from 'lucide-react';
import type { ComputedRoundTripRoute } from '../MarsGlobeViewer';

export type CopilotActionType = 
  | 'PLOT_PRESET'
  | 'SET_VIEW_MODE'
  | 'SET_LAYER_MODE'
  | 'ENTER_VISOR'
  | 'OPEN_EXPORT'
  | 'TOGGLE_SPE'
  | 'TOGGLE_ROUTING'
  | 'SET_TRAVERSE_MODE';

export interface CopilotAction {
  action: CopilotActionType;
  payload?: any;
}

export interface AresTacticalAiCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  astronautName?: string;
  routeData: ComputedRoundTripRoute | null;
  currentSite: string;
  currentViewMode: '3D' | '2D';
  currentLayerMode: string;
  traverseMode: 'ROVER_AUTOPILOT' | 'ASTRONAUT_HIKE';
  onExecuteCommand: (cmd: CopilotAction) => void;
}

interface Message {
  id: string;
  sender: 'COPILOT' | 'ASTRONAUT';
  text: string;
  action?: CopilotAction;
  actionLabel?: string;
  timestamp: string;
}

export function AresTacticalAiCopilot({
  isOpen,
  onClose,
  astronautName = 'Sadia A. Puspo',
  routeData,
  currentSite,
  currentViewMode,
  currentLayerMode,
  traverseMode,
  onExecuteCommand,
}: AresTacticalAiCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'COPILOT',
      text: `Tactical AI Copilot online. Telemetry uplink established with Lead Astronaut ${astronautName} (BGD / Artemis-Mars Surface Expedition). I can optimize safe round-trip traverses, analyze 0.38g slope risks, locate rock shielding from solar particle events, or execute app directives for you.`,
      timestamp: '08:16 LTST',
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: 'Plot Delta Scarp', prompt: 'Plot route to Neretva Delta Scarp' },
    { label: 'Check Rule of Half', prompt: 'What is my PLSS Rule of Half water and oxygen margin?' },
    { label: 'Nearest SPE Shelter', prompt: 'Find nearest rock cliff shelter for solar storm evacuation' },
    { label: 'Switch to 2D Map', prompt: 'Switch to 2D tactical map view' },
    { label: 'Activate Visor HUD', prompt: 'Enter first-person astronaut visor mode' },
    { label: 'Export Traverse', prompt: 'Export this traverse into NASA PDS4 XML and GPX' },
  ];

  const handleSend = (textToSend?: string) => {
    const q = (textToSend ?? inputQuery).trim();
    if (!q) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'ASTRONAUT',
      text: q,
      timestamp: timeStr,
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputQuery('');

    // Generate accurate planetary copilot response & function dispatch
    setTimeout(() => {
      const lower = q.toLowerCase();
      let reply = '';
      let action: CopilotAction | undefined = undefined;
      let actionLabel: string | undefined = undefined;

      if (lower.includes('delta scarp') || lower.includes('neretva')) {
        reply = `Executing route dispatch to Neretva Delta Scarp (18.468°N, 77.412°E). Calculating asymmetric round-trip path enforcing 0.38g gravity and maximum scarp ascent pitch < 18°. Fluvial bottomset sandstones with carbonate cement detected along waypoint B2.`;
        action = { action: 'PLOT_PRESET', payload: 'neretva_delta_scarp' };
        actionLabel = 'EXECUTE DISPATCH: NERETVA SCARP';
        onExecuteCommand(action);
      } else if (lower.includes('three forks') || lower.includes('sample depot')) {
        reply = `Executing route dispatch to Three Forks Sample Depot (18.441°N, 77.447°E). This traverse inspects the primary Mars Sample Return titanium tube cache depot. Average slope is nominal at 4°, soil compaction is high-traction bedrock pavement (THEMIS 410 tiu).`;
        action = { action: 'PLOT_PRESET', payload: 'three_forks_depot' };
        actionLabel = 'EXECUTE DISPATCH: THREE FORKS';
        onExecuteCommand(action);
      } else if (lower.includes('kodiak') || lower.includes('butte')) {
        reply = `Executing route dispatch to Kodiak Butte Delta Remnant (18.411°N, 77.424°E). Stratigraphic layers contain magnesium-rich carbonates with top astrobiological habitability rating (94 SCI). Traverse maintains safe 50m buffer from steep cliff edges.`;
        action = { action: 'PLOT_PRESET', payload: 'kodiak_butte' };
        actionLabel = 'EXECUTE DISPATCH: KODIAK BUTTE';
        onExecuteCommand(action);
      } else if (lower.includes('2d') || lower.includes('map')) {
        reply = `Switching display engine to 2D Planimetric Tactical GIS Map powered by NASA JPL Mars Trek WMS tile servers. High-resolution MRO CTX, THEMIS IR, and MOLA topographic relief now active.`;
        action = { action: 'SET_VIEW_MODE', payload: '2D' };
        actionLabel = 'SWITCHED TO 2D MAP';
        onExecuteCommand(action);
      } else if (lower.includes('3d') || lower.includes('globe')) {
        reply = `Switching display engine to 3D Photorealistic Three.js Terrain Globe with HiRISE 1.0m DTM bicubic elevation rendering.`;
        action = { action: 'SET_VIEW_MODE', payload: '3D' };
        actionLabel = 'SWITCHED TO 3D GLOBE';
        onExecuteCommand(action);
      } else if (lower.includes('slope') || lower.includes('radar')) {
        reply = `Activating Dynamic Anti-Rollover Slope Radar. Color classification calibrated to Mars 0.38g weight restoring force: Green (<8° nominal), Amber (8°-15° caution), Red (>15° critical rollover).`;
        action = { action: 'SET_LAYER_MODE', payload: 'slope' };
        actionLabel = 'SLOPE RADAR ENGAGED';
        onExecuteCommand(action);
      } else if (lower.includes('themis') || lower.includes('thermal') || lower.includes('traction')) {
        reply = `Activating THEMIS Thermophysical Trafficability Layer. Regolith thermal inertia values >350 tiu indicate hard bedrock pavement with high wheel traction (μ ≈ 0.76). Values <150 tiu flag loose wheel-trapping fine dust.`;
        action = { action: 'SET_LAYER_MODE', payload: 'themis' };
        actionLabel = 'THEMIS IR ENGAGED';
        onExecuteCommand(action);
      } else if (lower.includes('crism') || lower.includes('mineral')) {
        reply = `Activating CRISM Spectral Mineralogy ribbons. False-color bands highlight hydrated smectite clays (orange-red), magnesium carbonates (gold-yellow), and olivine basaltic sands (cyan).`;
        action = { action: 'SET_LAYER_MODE', payload: 'crism' };
        actionLabel = 'CRISM SPECTRAL ENGAGED';
        onExecuteCommand(action);
      } else if (lower.includes('visor') || lower.includes('helmet') || lower.includes('first-person')) {
        reply = `Engaging Astronaut First-Person Visor HUD for Astronaut ${astronautName}. Camera positioning adjusted to 1.8m eye level above surface mesh with scrolling compass tape, pitch/roll ladder, and waypoint telemetry.`;
        action = { action: 'ENTER_VISOR' };
        actionLabel = 'VISOR HUD ACTIVE';
        onExecuteCommand(action);
      } else if (lower.includes('export') || lower.includes('gpx') || lower.includes('geojson') || lower.includes('pds4')) {
        reply = `Generating NASA Mission Traverse Export bundle for flight computer ingestion. Preparing GeoJSON (RFC 7946), GPX 1.1, and NASA PDS4 XML Observational Product.`;
        action = { action: 'OPEN_EXPORT' };
        actionLabel = 'OPEN EXPORT MODAL';
        onExecuteCommand(action);
      } else if (lower.includes('rule of half') || lower.includes('oxygen') || lower.includes('water') || lower.includes('plss')) {
        const waterGrams = routeData ? routeData.totalWaterBurnGrams : 534;
        const compliant = routeData ? routeData.ruleOfHalfCompliant : true;
        reply = `PLSS Telemetry Status for Astronaut ${astronautName}:
• Total Feedwater Sublimation Burn: ${waterGrams}g (out of 4,500g capacity).
• Rule of Half Limit: 2,250g max one-way, with 20% contingency margin (3,600g max round-trip).
• Compliance: ${compliant ? 'NOMINAL (PASS)' : 'CAUTION (EXCEEDS THRESHOLD)'}.
• Primary O₂ pressure: 25 MPa nominal (98% remaining).
• LiOH Scrubber: 92% chemical capacity remaining.`;
      } else if (lower.includes('spe') || lower.includes('radiation') || lower.includes('storm') || lower.includes('haven') || lower.includes('shelter')) {
        reply = `SPE Haven Ray-Tracing Engine Status:
Curiosity RAD and NASA DONKI monitors indicate background proton flux is currently nominal (<0.22 mSv/h). In the event of a Solar Particle Event (SPE), our 3D DTM geometric raycaster locates natural cliff scarps with >50 g/cm² rock shielding.
Closest certified radiation shelter: "Neretva South Cliff Scarp" (1.82 km, 28 min emergency sprint ETA).`;
        action = { action: 'TOGGLE_SPE' };
        actionLabel = 'SIMULATE SPE ALERT';
      } else if (lower.includes('night') || lower.includes('freeze') || lower.includes('temperature')) {
        reply = `Diurnal Freeze Watch Telemetry:
Current surface temperature: -18°C. Nightfall freeze countdown: 10h 11m remaining. At sunset, Perseverance MEDA models an extreme thermal plunge of -18°C/hr down to -105°C. All traverses must conclude before LTST 17:30 to avoid diverting battery power to survival heaters.`;
      } else {
        reply = `Received directive: "${q}". All planetary navigation systems are nominal in ${currentSite}. Current view is ${currentViewMode} with ${currentLayerMode} layer. Let me know if you would like me to plot a science traverse, check PLSS consumables, or inspect terrain hazards.`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `copilot-${Date.now()}`,
          sender: 'COPILOT',
          text: reply,
          action,
          actionLabel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 450);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 font-mono ${
        isMinimized
          ? 'bottom-4 right-4 w-72 bg-[#060c18]/95 border border-cyan-500/60 rounded-xl shadow-2xl p-2.5 flex items-center justify-between cursor-pointer'
          : 'bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[80vh] bg-[#070e1c]/98 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden'
      }`}
    >
      {/* Minimized Bar */}
      {isMinimized ? (
        <div 
          onClick={() => setIsMinimized(false)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-300 uppercase">ARES AI COPILOT</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
              className="p-1 text-slate-400 hover:text-cyan-300"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 text-slate-400 hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-[#050a14]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/50 text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    ARES AI COPILOT
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    LIVE
                  </span>
                </div>
                <div className="text-[9px] text-cyan-400/80">
                  ASTRONAUT: {astronautName} (BGD)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Minimize Copilot"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Close Copilot"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="p-2 border-b border-slate-800/80 bg-[#081224] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.prompt)}
                className="px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-400/70 text-slate-300 hover:text-cyan-200 text-[9px] font-mono whitespace-nowrap transition-all cursor-pointer"
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
                <div className="flex items-center gap-1 text-[9px] text-slate-500 mb-0.5">
                  <span>{m.sender === 'ASTRONAUT' ? astronautName : 'ARES COPILOT'}</span>
                  <span>•</span>
                  <span>{m.timestamp}</span>
                </div>

                <div
                  className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'ASTRONAUT'
                      ? 'bg-cyan-600/25 border border-cyan-400/60 text-cyan-100 rounded-br-xs'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-xs shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.action && m.actionLabel && (
                    <button
                      onClick={() => onExecuteCommand(m.action!)}
                      className="mt-2 w-full py-1 px-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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
              placeholder="Ask Copilot (e.g. 'Plot route to delta', 'Check oxygen')..."
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
        </>
      )}
    </div>
  );
}
