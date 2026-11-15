<div align="center">

<img src="public/starora.png" alt="Team Starora" width="160" />

# ARES-NAVIGATOR
### Martian Surface EVA & Autonomous Rover Tactical Command Platform

**Team Starora · Comprehensive Technical Overview & Mission Architecture**  
*Formulated for the Artemis-to-Mars Era Planetary Exploration Challenge*

</div>

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [The Challenge & Problem Statement](#2-the-challenge--problem-statement)
3. [System Capabilities: What ARES-NAVIGATOR Does](#3-system-capabilities-what-ares-navigator-does)
4. [Data Fusion Architecture: How 7 NASA Layers Interact](#4-data-fusion-architecture-how-7-nasa-layers-interact)
5. [The 6 Core Autonomous Survival Engines Grounded in Physics](#5-the-6-core-autonomous-survival-engines-grounded-in-physics)
6. [Four High-Detail Expedition Sites & Operational Case Studies](#6-four-high-detail-expedition-sites--operational-case-studies)
7. [System Architecture & Technology Stack](#7-system-architecture--technology-stack)
8. [NASA Mission Traverse Export Engine](#8-nasa-mission-traverse-export-engine)
9. [Human Factors & Crew Cockpit Experience](#9-human-factors--crew-cockpit-experience)
10. [Data Sources, Public Resources & Standards](#10-data-sources-public-resources--standards)
11. [Project Verification & Operational Feasibility](#11-project-verification--operational-feasibility)
12. [Team & Attribution](#12-team--attribution)

---

## 1. Executive Summary

**ARES-NAVIGATOR** is an autonomous, physics-driven planetary mission control and surface navigation platform engineered by **Team Starora**. Operating directly in modern web browsers without installation, it bridges the perilous divide between macro-scale orbital planetary science and the hyperlocalized, meter-scale survivability constraints confronting crewed Mars surface exploration (Marswalk EVA) and autonomous rover operations.

ARES-NAVIGATOR serves a dual role: an operational flight director’s console in Mission Control on Earth, and a real-time, heads-up tactical navigation copilot for Lead EVA Astronaut **Sadia A. Puspo**. By fusing seven real NASA remote-sensing layers over an interconnected physical terrain field, the platform evaluates terrain steepness, terramechanic soil shear strength, human metabolic load, unshielded space radiation, and orbital communications blackout zones—guaranteeing that every planned traverse is survivable **both outbound and return** before crew or robotic assets leave habitat airlocks.

```mermaid
flowchart LR
    subgraph OrbitalData["7 NASA Planetary Data Layers"]
        D1["HiRISE 1m DTM Topo"]
        D2["CTX/HiRISE Panchromatic"]
        D3["MOLA Areoid Datum"]
        D4["THEMIS Thermal Inertia"]
        D5["CRISM Mineralogy"]
        D6["Curiosity RAD & DONKI"]
        D7["MEDA / REMS Weather"]
    end

    subgraph FusionEngine["Unified Physics & Data Fusion"]
        TF["Bicubic Unified Terrain Field"]
        SM["Bekker-Wong Soil Mechanics"]
        BM["0.38g Santee-Pandolf Metabolics"]
        RT["Solar Vector 3D Ray-Tracing"]
    end

    subgraph SurvivalEngines["6 Autonomous Survival Engines"]
        E1["Anti-Rollover Radar"]
        E2["Walkback Isochrone"]
        E3["RAD-Haven SPE Dispatch"]
        E4["Nightfall Freeze Watch"]
        E5["RF Comms Line-of-Sight"]
        E6["Solar Shadow & Glare Engine"]
    end

    subgraph Interface["Tactical Dispatch Interfaces"]
        UI1["3D Photorealistic Globe"]
        UI2["2D Planimetric GIS (Live WMTS)"]
        UI3["1.8m Visor Cockpit HUD"]
        UI4["Nini Autonomous AI Copilot"]
        UI5["PDS4 XML / GPX Export"]
    end

    OrbitalData --> FusionEngine
    FusionEngine --> SurvivalEngines
    SurvivalEngines --> Interface
```

---

## 2. The Challenge & Problem Statement

Humanity stands on the threshold of the Artemis-to-Mars era. When human crews step onto the Martian surface, mission dispatchers and astronauts will face an environment governed by ruthless physical realities that cannot be managed with Earth-centric mapping software:

1. **Low Gravity Instability (0.38g):** Because downward gravitational restoring torque is cut by 62%, rovers and spacesuited astronauts experience catastrophic rollover instability at slope angles far lower than on Earth ($>15^\circ$).
2. **Terramechanic Wheel-Trap Hazard:** Fine, air-fall dust with low thermal inertia lacks shear strength, precipitating sudden $80\%+$ wheel slip capable of permanently entrenching multi-billion-dollar robotic rovers and exhausting human crews.
3. **Biomedical "Point of No Return":** Astronaut spacesuit Portable Life Support Systems (PLSS) rely on sublimating water ice into the Martian vacuum to reject metabolic heat. Climbing steep crater scarps triples metabolic expenditure ($150\text{ W} \to 490\text{ W}$), boiling off water reserves at accelerated rates. Naive Euclidean distance estimates result in fatal PLSS depletion.
4. **Unshielded Proton Radiation:** Mars lacks an intrinsic global dipole magnetic field. When a Coronal Mass Ejection (CME) triggers a Solar Particle Event (SPE), astronauts caught on open plains have less than 45 minutes to reach natural rock shelter before absorbing toxic radiation doses.
5. **Topographic Communications Blackouts:** Deep canyon walls and crater scarps sever direct Line-of-Sight (LOS) to Earth’s Deep Space Network (DSN) and low-altitude relay orbiters, introducing complete tactical isolation.

Current planetary tools are either static 2D map viewers or offline GIS packages that treat route planning as a flat geometric problem. **ARES-NAVIGATOR** solves this challenge by delivering an integrated, real-time tactical dispatch suite that runs directly on live NASA orbital telemetry.

---

## 3. System Capabilities: What ARES-NAVIGATOR Does

ARES-NAVIGATOR delivers a complete operational loop for planetary surface operations:

* **Strict Bi-Directional Round-Trip A\* Routing:** Calculates outbound traverse ($A \to B$) and an asymmetric return path ($B \to A$) that accounts for directional slope gravity penalties—distinguishing cardiovascular uphill strain from downhill slip and cliff tumbling hazards.
* **Dual Display Engine (3D Globe + 2D Tactical Planimetric GIS):**
  * *3D Globe:* High-performance WebGL/Three.js globe executing custom GPU bicubic elevation displacement shaders over high-resolution digital terrain models.
  * *2D Tactical GIS:* Direct integration with live NASA JPL Mars Trek WMS/WMTS tile servers, rendering sub-meter MRO CTX, THEMIS Day/Night IR, USGS Geologic units, and MOLA topographic relief without synthetic or fabricated data.
* **First-Person Astronaut Visor HUD (Cockpit Mode):** Instant transition that drops the virtual camera to a realistic $1.8\text{ m}$ eye level on the Martian surface, projecting a dynamic $360^\circ$ compass tape, artificial horizon pitch/roll ladder, and live PLSS biomedical telemetry.
* **Dynamic 0.38g Biometrics & Elevation Scrub Simulator:** Hovering along the elevation profile dynamically accelerates astronaut heart rate ($72\text{ bpm} \to 138+\text{ bpm}$) and feedwater cooling sublimation based on the instantaneous slope gradient.
* **Autonomous Nini AI Tactical Copilot:** A context-aware tactical assistant capable of answering planetary science inquiries, executing in-app mission directives (e.g., plotting science traverses, switching spectral layers, or toggling radiation shelters), and maintaining complete window resizability with proportional scaling.
* **Stretchable X-Axis Tactical Sidebars:** The Round-Trip Planner and EVA Telemetry sidebars can be stretched horizontally on the X-axis while maintaining vertical spacing, fitted with custom-themed aerospace scrollbars.
* **Certified NASA Mission Traverse Export:** Exports active routes into standard GIS and flight hardware formats: RFC 7946 GeoJSON, GPX 1.1 XML, and NASA PDS4 XML Observational Products.

---

## 4. Data Fusion Architecture: How 7 NASA Layers Interact

A core criterion for planetary missions is whether scientific data is meaningfully integrated into operational decision-making or merely overlaid as passive pictures. In ARES-NAVIGATOR, seven NASA datasets are fused into an interconnected survival engine:

```
[HiRISE 1m DTM Topo] ───────► Elevation, Slopes & Horizon Raycasting
                                      │
[CTX / HiRISE Optical] ─────► Boulder Fields & Visual Morphometry
                                      │
[MOLA Areoid Datum] ────────► 0m Geodetic Elevation (610 Pa Triple Point)
                                      │
[THEMIS Thermal Inertia] ───► Soil Shear Strength (μ=0.35 Dust vs μ=0.76 Rock)
                                      │
[CRISM Mineralogy] ─────────► Astrobiology Target Identification (Clays/Carbonates)
                                      │
[Curiosity RAD & DONKI] ────► SPE Proton Flux Benchmarks (Evacuation Trigger)
                                      │
[MEDA / REMS Weather] ──────► Diurnal Freeze Watch (Sunset Thermal Plunge -18°C/hr)
```

| Layer | NASA Sensor / Product ID | Resolution | Operational Role in ARES-NAVIGATOR |
|---|---|---|---|
| **1. Stereo Topography** | MRO HiRISE Stereo DTM (`DTEEC_049390_1985`) | 1.0 m DTM | Supplies sub-meter vertical elevations, surface normals, and aspect angles for micro-slope calculations and line-of-sight raycasting. |
| **2. Optical Panchromatic** | MRO HiRISE & CTX Mosaics | 0.25 m – 6.0 m/px | Resolves surface geomorphology, bedrock fractures, boulder fields, and sand dune slipfaces. |
| **3. Geodetic Baseline** | MOLA Areoid Geoid (`3,396,200m`) | 200 m global | Defines Mars $0\text{ m}$ elevation datum pegged to the atmospheric water triple-point pressure datum ($610\text{ Pa}$). |
| **4. Thermal Inertia** | Mars Odyssey THEMIS Day/Night IR | 100 m/px | Calibrates regolith compaction and shear strength, classifying terrain into high-traction bedrock pavement ($>350\text{ tiu}, \mu \approx 0.76$) versus wheel-trapping fine dust ($<150\text{ tiu}, \mu \approx 0.35$). |
| **5. Spectral Mineralogy** | MRO CRISM Targeted Spectral Ribbons | 18 – 36 m/px | Identifies hydrated phyllosilicates (smectite clays), magnesium carbonates, and olivine basalts for astrobiology target ranking. |
| **6. Space Weather** | Curiosity RAD & NASA DONKI | In-situ / Heliophysics | Feeds real-time energetic proton flux benchmarks to trigger automated evacuation routes during SPE events. |
| **7. Atmospheric Telemetry**| Perseverance MEDA & Curiosity REMS | Diurnal in-situ | Drives Diurnal Freeze Watch, modeling local barometric pressure ($710\text{ Pa}$), dust optical depth ($\tau$), and sunset thermal plunge rates ($-18^\circ\text{C/hr}$ down to $-105^\circ\text{C}$). |

---

## 5. The 6 Core Autonomous Survival Engines Grounded in Physics

### 5.1. Dynamic Anti-Rollover Slope Radar
Calibrated specifically to the reduced restoring torque of Martian gravity ($g = 3.72076\text{ m/s}^2$):
* **Green ($<8^\circ$):** Nominal travel corridor; full rover speed ($4.2\text{ km/h}$) and normal EVA walking pace ($3.6\text{ km/h}$).
* **Amber ($8^\circ - 15^\circ$):** Traction caution corridor; motor torque increased, vehicle speed governed by 50%, astronaut step cadence shortened.
* **Red ($>15^\circ$):** Critical rollover and scarp tumbling barrier. Absolute traversal cutoff enforced in A\* pathfinding.

### 5.2. Bio-Metabolic Walkback Isochrone (Point of No Return)
Unlike naive circular radius buffers, ARES-NAVIGATOR calculates an anisotropic boundary based on the modified **Santee-Pandolf metabolic load formulation at 0.38g**:

$$\dot{M} = 0.378 \cdot \left[ 1.5W + 2.0(W + L)\left(\frac{L}{W}\right)^2 + \eta(W + L)(0.1v + 0.18v^2 + 0.0054vG) \right] + C_{\text{suit}}$$

* $W = 80\text{ kg}$ (Astronaut body mass)
* $L = 55\text{ kg}$ (xEMU Spacesuit + PLSS backpack + science payloads)
* $v = \text{walking velocity in m/s}$
* $G = 100 \cdot \tan(\theta_{\text{slope}})$ (Terrain grade percentage)
* $\eta = \text{THEMIS regolith coefficient}$ ($\text{Class A Rock} = 1.0$, $\text{Class B Sand} = 1.35$, $\text{Class C Dust} = 2.10$)
* $C_{\text{suit}} = 45\text{ W}$ (Spacesuit joint bending resistance at $29.65\text{ kPa} / 4.3\text{ psi}$)

Steep crater scarps and loose regolith drastically increase metabolic heat production ($\dot{M} \approx 490\text{ W}$), accelerating PLSS sublimator water burn ($>600\text{ g/h}$). The walkback isochrone pinches inward along uphill and sandy corridors to strictly enforce the **NASA EVA Rule of Half** (50% consumable reserve threshold).

### 5.3. RAD-Haven Emergency Dispatch (SPE Solar Particle Storms)
Mars lacks ozone and an intrinsic magnetosphere. When solar monitors detect CME proton storms ($>100\text{ MeV}$ proton flux), the engine performs 3D geometric raycasting along the solar vector to locate natural cliff overhangs providing $>50\text{ g/cm}^2$ rock mass shielding:

$$\theta_{\text{shield}}(\phi_{\text{solar}}) \ge \theta_{\text{solar\_elevation}} \implies \text{Dose}_{\text{surface}} = \text{Dose}_{\text{free\_space}} \cdot (1 - \text{Shielding\_Fraction})$$

RAD-Haven automatically computes an **Emergency Sprint Path** with an arrival ETA before peak proton flux arrives, ensuring radiation exposure remains within NASA career limits.

### 5.4. Nightfall Diurnal Freeze Watch
Tracks Local True Solar Time (LTST) and sun zenith angle. Displays an active countdown to the rapid post-dusk thermal drop (plunging at $-18^\circ\text{C/hr}$ down to $-105^\circ\text{C}$), alerting crews before vehicle batteries must divert propulsion power to life-critical survival warmers.

### 5.5. Radio Line-of-Sight (LOS) Comms Grid
Simulates topographic line-of-sight raycasts to the **Deep Space Network (DSN)** on Earth (Goldstone, Madrid, Canberra) taking into account Earth-Mars orbital geometry and one-way light time latency ($4.2 - 21.0\text{ min}$). It also models relay passes for Mars Reconnaissance Orbiter (MRO, $310\text{ km}$), Mars Odyssey ($400\text{ km}$), and ExoMars TGO ($400\text{ km}$), flagging canyon blackout zones where crater rims block transmission.

### 5.6. Real-Time Solar Shadow & Glare Hazard Engine
Uses astronomical orbital mechanics (Mars Sol Date, Solar Longitude $L_s$, Equation of Time) to position the directional sun vector. When heading within $\pm32^\circ$ of low-angle morning or dusk sun ($<22^\circ$ elevation), it flags a **Direct Sun Glare Hazard**, alerting the astronaut to engage the xEMU electrochromic gold helmet filter.

---

## 6. Four High-Detail Expedition Sites & Operational Case Studies

ARES-NAVIGATOR is calibrated across four priority operational sites covering distinct scientific epochs and engineering challenges:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Jezero Crater Delta Front (18.4447°N, 77.4508°E | Elev: -2,540 m)        │
│    • Perseverance M2020 sample cache caches at Three Forks                  │
│    • 25cm HiRISE & 1m DTM scarp routing avoiding boulder & dune traps       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Mount Sharp / Gale Crater (-4.7200°S, 137.4800°E | Elev: -4,500m to +1km)│
│    • Curiosity MSL clay-to-sulfate transition & 2025 boxwork minerals       │
│    • THEMIS thermal inertia maps wheel-slip risks across loose dune fields  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Arcadia Planitia (46.2000°N, -171.2000°E | Elev: -4,120 m)               │
│    • Subsurface slab water-ice sheets confirmed by SHARAD (permittivity 3.1)│
│    • Artemis-Mars base placement & heavy logistics ice-mining haul loops    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Melas Chasma / Valles Marineris (-10.6500°S, -68.1500°E | Elev: -4,900 m)│
│    • 9 km deep canyon exposing ancient crustal basement rock                │
│    • Demonstrates RAD-Haven: canyon walls provide >50 g/cm² rock shielding   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Jezero Crater Delta Front
* **Coordinates & Datum:** $18.4447^\circ\text{N}, 77.4508^\circ\text{E}$ | Elevation: $-2,540\text{ m}$
* **Planetary Science:** Ancient lacustrine lake and river delta explored by NASA's Mars 2020 Perseverance rover. Features rich bottomset smectite clays, magnesium carbonates, and preserved sample caches at Three Forks.
* **Operational Challenge:** Steep $18^\circ$ delta scarp climbs, dense boulder hazard fields, and sand dunes in Séítah. Handled via sub-meter HiRISE stereo DTMs.

### 2. Mount Sharp (Aeolis Mons) / Gale Crater
* **Coordinates & Datum:** $-4.7200^\circ\text{S}, 137.4800^\circ\text{E}$ | Elevation: $-4,500\text{ m}$ to $+1,000\text{ m}$
* **Planetary Science:** $5.5\text{ km}$ high sedimentary mound explored by Curiosity. Preserves the major planetary drying transition from clay-bearing to sulfate-bearing stratigraphy and the landmark 2025 boxwork mineral formations.
* **Operational Challenge:** Extreme elevation changes and loose dune fields where THEMIS thermal inertia prevents wheel-slip entrenchment.

### 3. Arcadia Planitia
* **Coordinates & Datum:** $46.2000^\circ\text{N}, -171.2000^\circ\text{E}$ | Elevation: $-4,120\text{ m}$
* **Planetary Science:** Smooth northern lowland plains hosting vast, shallow subsurface water-ice sheets confirmed by SHARAD orbital sounding radar (dielectric permittivity $\epsilon \approx 3.15$). High surface pressure ($>750\text{ Pa}$).
* **Operational Challenge:** Prime candidate for human Artemis-Mars base establishment. ARES-NAVIGATOR models heavy logistics and ice-mining haul loops between habitat zones and extraction trenches.

### 4. Melas Chasma (Valles Marineris)
* **Coordinates & Datum:** $-10.6500^\circ\text{S}, -68.1500^\circ\text{E}$ | Elevation: $-4,900\text{ m}$
* **Planetary Science:** Deepest canyon chasm of Valles Marineris, plunging $9\text{ km}$ below the surrounding plateau. Exposes billions of years of volcanic and crustal basement rock.
* **Operational Challenge:** Demonstrates the RAD-Haven Solar Storm Dispatch Engine. Towering canyon walls provide natural rock shielding ($>50\text{ g/cm}^2$), enabling 3D ray-tracing along the solar vector to route astronauts to radiation alcoves during coronal mass ejections.

---

## 7. System Architecture & Technology Stack

```
app/
├── page.tsx                      # Server entry point & SEO metadata
├── layout.tsx                    # Clean viewport wrapper & font definitions
├── globals.css                   # Custom aerospace HUD styling & scrollbar
├── MarsGlobeViewer.tsx           # Primary client controller & Three.js 3D engine
├── MarsRoverStreetViewModal.tsx  # Immersive 360° Rover Street View (Mastcam-Z / Mastcam)
├── algorithms/
│   ├── bioTerramechanics.ts      # Santee-Pandolf 0.38g metabolics & walkback isochrone
│   ├── radHavenSpe.ts            # Solar vector raycasting & SPE rock shelter haven solver
│   └── rfComms.ts                # Direct-to-Earth & orbiter line-of-sight comms mapper
├── components/
│   ├── MarsTactical2DMap.tsx     # 2D Planimetric Tactical GIS canvas (Live NASA WMTS)
│   ├── VisorHudOverlay.tsx       # First-person 1.8m astronaut helmet visor HUD
│   ├── AresTacticalAiCopilot.tsx # Resizable Nini AI Tactical Copilot
│   └── TraverseExportModal.tsx   # NASA PDS4 XML, GPX 1.1 & GeoJSON export modal
├── api/nasa-pano/route.ts        # Secure upstream streaming proxy for NASA PIA panoramas
└── data/marsLandmarks.ts         # Curated landmark database & coordinate search
```

| Layer | Technology | Engineering Purpose |
|---|---|---|
| **App Framework** | **Next.js 16** (App Router, Turbopack) | Modern server/client architecture, SSR hydration handling, and API route handlers. |
| **Component UI** | **React 19** | Concurrent UI state management across dual-map displays and HUD panels. |
| **3D Planetary Graphics** | **Three.js (WebGL)** | Custom bicubic elevation displacement shaders, GPU instancing, quadtree level-of-detail (LOD) tile streaming. |
| **2D Tactical GIS** | **HTML5 Canvas / Live WMTS** | High-performance planimetric 2D map engine rendering live raster tile pyramids from NASA JPL Mars Trek. |
| **Biomechanics & Physics** | **Custom TypeScript** | Native implementation of Santee-Pandolf metabolics, Bekker-Wong soil traction, MOLA Areoid geodesy, and 3D raycasting. |
| **Styling & Cyber-HUD** | **Tailwind CSS** | High-contrast aerospace cockpit styling, responsive layout, and tactical HUD scrollbars. |

---

## 8. NASA Mission Traverse Export Engine

Traverses planned in ARES-NAVIGATOR can be exported into certified flight hardware and mission planning standards:

1. **GeoJSON (RFC 7946):** Full spatial vector geometry containing coordinates, point classifications, segment slope angles, and estimated energy expenditures.
2. **GPX 1.1 (GPS Exchange Format):** Complete route with elevation tags (`<ele>`), timestamps, and track points compatible with commercial off-the-shelf handheld GPS units.
3. **NASA PDS4 XML Observational Product:** Structured XML complying with the **Planetary Data System (PDS4)** Information Model, including mission metadata, target planetary bodies, astronaut identifier tags, and life-support margin verifications.

---

## 9. Human Factors & Crew Cockpit Experience

* **Visor HUD Mode:** A dedicated first-person perspective simulating the astronaut's helmet visor (xEMU). Automatically hides dashboard chrome, drops the viewpoint to $1.8\text{ m}$ eye level, and displays compass heading tape, artificial horizon pitch/roll ladder, and life-support telemetry.
* **Proportional Copilot Resizing:** The Nini AI window is resizable from $320\text{px}$ to $860\text{px}$ with proportional internal card and typography scaling.
* **Stretchable Panels:** Sidebars can be dragged along the horizontal axis, expanding workspace width without distorting card typography or vertical spacing.
* **Tactical Scrollbars:** Replaces generic operating system scrollbars with custom 6px cyan and deep-slate glowing rails (`.ares-scrollbar`).

---

## 10. Data Sources, Public Resources & Standards

### NASA & Space Agency Telemetry
* **NASA JPL Mars Trek API (`trek.nasa.gov`):** Live WMS/WMTS tile pyramids (MOLA Topography, MOLA Shaded Relief, CTX Mosaics, HiRISE 25cm Orthomosaics).
* **NASA PDS Geosciences Node:** HiRISE Stereo Digital Terrain Models (`DTEEC_049390_1985_049324_1985_A01`) providing 1.0m elevation grids.
* **NASA Image and Video Library:** Curated high-resolution rover panoramas from Mars 2020 Mastcam-Z and MSL Curiosity Mastcam.
* **ESA / DLR (German Aerospace Center):** Mars Express High Resolution Stereo Camera (HRSC) data blended into the 200m global DEM.
* **USGS Astrogeology Science Center:** USGS SIM 3292 Global Geologic Map of Mars and Viking MDIM 2.1 global color mosaics.

### NASA Mission Foundation Documents
* **NASA Mars Design Reference Architecture 5.0 (NASA-SP-2009-566):** Baseline parameters for crew mass, EVA durations, and PLSS capacities.
* **NASA EVA Operations Foundation Document (NASA-SP-20205009657):** The "Rule of Half" consumable reserve protocols and spacesuit joint bending resistance parameters.
* **Santee, W. R. et al. (2001):** Metabolic prediction formulations for load carriage.
* **Christensen, P. R. et al. (2001) & Fergason et al. (2006):** THEMIS thermal inertia regolith compaction models.

---

## 11. Project Verification & Operational Feasibility

* **TypeScript Compilation:** Fully type-checked (`npx tsc --noEmit`) with zero errors across all modules.
* **Zero Fabrication:** All maps, elevations, and imagery are real planetary data streamed from live space agency endpoints.
* **Web Native:** Requires no local installation, plugin, or specialized hardware—accessible via any WebGL-capable browser.

---

## 12. Team & Attribution

Developed by **Team Starora** for planetary exploration and astronaut safety in the Artemis-to-Mars era.
