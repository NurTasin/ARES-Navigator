# ARES-NAVIGATOR — Project Details

**Team Starora** · *Martian Surface EVA & Autonomous Rover Tactical Command Platform*

---

## 1. What does it do or how does it work?

### What it does
**ARES-NAVIGATOR** is an autonomous, physics-driven planetary mission control and surface navigation platform engineered for the upcoming Artemis-to-Mars human landing era. It serves as both a flight director's console in Mission Control on Earth and an in-suit tactical copilot for Lead EVA Astronaut.

When human explorers step onto Mars, they will face a hostile environment governed by unforgiving physics: 0.38g low-gravity instability causing severe rollover risks at slopes $>15^\circ$, loose regolith with low thermal inertia causing sudden $>80\%$ wheel slip, and steep crater scarps that triple metabolic heat production ($150\text{ W} \to 490\text{ W}$), boiling off spacesuit cooling water reserves. Furthermore, with no global magnetic field, unshielded Coronal Mass Ejection (CME) proton storms leave astronauts less than 45 minutes to find natural rock shelter.

ARES-NAVIGATOR solves these challenges by providing:
1. **Strict Bi-Directional Round-Trip A\* Routing:** Calculates an outbound path ($A \to B$) and an asymmetric return path ($B \to A$) that independently evaluates directional slope gravity penalties—preventing astronauts or rovers from embarking on a traverse they cannot safely climb or descend back from.
2. **Dual-Display Tactical Engine:** A high-performance WebGL/Three.js 3D terrain globe featuring custom bicubic elevation displacement shaders, alongside a planimetric 2D Tactical GIS directly streaming live NASA JPL Mars Trek WMS/WMTS tile pyramids without synthetic data.
3. **Six Autonomous Survival Engines:** Real-time physics solvers including Anti-Rollover Slope Radar, Bio-Metabolic Walkback Isochrones, RAD-Haven Solar Storm Dispatch, Nightfall Diurnal Freeze Watch, Radio Line-of-Sight Comms Grid, and Real-Time Sun Glare Hazard warnings.
4. **First-Person Astronaut Visor HUD (Cockpit Mode):** A one-click transition dropping the viewpoint to a realistic $1.8\text{ m}$ eye level on the Martian surface with a $360^\circ$ compass tape, pitch/roll ladder, and real-time PLSS telemetry.
5. **Autonomous Nini AI Tactical Copilot:** A context-aware assistant capable of answering planetary science inquiries and executing in-app mission directives (e.g., plotting traverses, switching spectral layers, or toggling shelter modes).
6. **Certified Mission Traverse Export:** Exports active routes into RFC 7946 GeoJSON, GPX 1.1 XML, and NASA PDS4 XML Observational Products.

### How it works
* **Unified Terrain Field:** Elevation samples from NASA MOLA/HRSC 16-bit DEMs are decoded into a bicubic continuous elevation and slope model. The 3D renderer, A\* pathfinder, and all safety algorithms query this exact same field, ensuring zero discrepancy between visuals and navigation logic.
* **Seven Interconnected NASA Data Layers:**
  1. *HiRISE 1.0m Stereo DTMs:* Sub-meter vertical topography and aspect angles for micro-slope calculations and line-of-sight raycasting.
  2. *HiRISE & CTX Panchromatic Imagery (0.25m–6m/px):* High-resolution surface geomorphology, boulder fields, and dune slipfaces.
  3. *MOLA Areoid Geoid Datum (3,396,200m Equator):* Global geodetic baseline pegged to the Mars water triple-point pressure datum ($610\text{ Pa}$).
  4. *Mars Odyssey THEMIS Thermal Inertia:* Infrared regolith compaction and shear strength mapping ($>350\text{ tiu}$ bedrock pavement, $\mu \approx 0.76$ vs. $<150\text{ tiu}$ loose dust, $\mu \approx 0.35$).
  5. *CRISM Spectral Mineralogy:* Identifies astrobiology targets including smectite clays, magnesium carbonates, and olivine basalts.
  6. *Curiosity RAD & NASA DONKI:* Space weather proton flux benchmarks to trigger emergency shelter routes.
  7. *Perseverance MEDA & Curiosity REMS:* Diurnal atmospheric pressure, dust optical depth ($\tau$), and sunset thermal plunge rates ($-18^\circ\text{C/hr}$).
* **Grounded Physics Models:** 
  * Metabolic load is calculated via the modified **Santee-Pandolf model at 0.38g**, accounting for astronaut body mass (80 kg), pressurized spacesuit and PLSS payload mass (55 kg), walking velocity, terrain slope grade, variable regolith compaction from THEMIS thermal inertia, and spacesuit joint bending resistance at 29.65 kPa (4.3 psi).
  * RAD-Haven performs 3D geometric raycasting along the solar vector to detect natural cliff alcoves with >50 g/cm² rock mass shielding, calculating an Emergency Sprint Path before peak flux arrival.
  * Comms grid computes topocentric elevation angles and canyon wall raycasts to Earth DSN stations and orbiters (MRO, Odyssey, TGO).

### Four High-Detail Operational Expedition Sites
ARES-NAVIGATOR is calibrated across four priority operational sites covering distinct scientific epochs and engineering challenges:
1. **Jezero Crater Delta Front ($18.4447^\circ\text{N}, 77.4508^\circ\text{E}$ | Elev: $-2,540\text{ m}$):**
   * *Science:* Ancient lacustrine lake and river delta explored by the Mars 2020 Perseverance mission. Rich in bottomset carbonates and clays with preserved sample tube caches at Three Forks.
   * *Operations:* Sub-meter 25cm HiRISE and 1.0m DTM elevation models plan safe $18^\circ$ delta scarp climbs while avoiding impassable boulder fields and Séítah dune crests.
2. **Mount Sharp / Gale Crater ($-4.7200^\circ\text{S}, 137.4800^\circ\text{E}$ | Elev: $-4,500\text{ m}$ to $+1,000\text{ m}$):**
   * *Science:* $5.5\text{ km}$ high sedimentary mound explored by Curiosity. Preserves the crucial transition from clay to sulfate beds and the 2025 boxwork mineral formations.
   * *Operations:* THEMIS thermal inertia maps wheel-slip risks across loose dune fields, preventing rovers and EVA crew from exceeding the $15^\circ$ critical tipping limit on steep bedrock benches.
3. **Arcadia Planitia ($46.2000^\circ\text{N}, -171.2000^\circ\text{E}$ | Elev: $-4,120\text{ m}$):**
   * *Science:* Smooth northern lowland plains hosting vast, shallow slab water-ice sheets confirmed by SHARAD orbital sounding radar (permittivity $\epsilon \approx 3.15$). High surface atmospheric pressure ($>750\text{ Pa}$).
   * *Operations:* Prime candidate for human Artemis-Mars base placement. Optimizes heavy logistics and ice-mining haul loops between habitats and excavation trenches within thermal battery limits.
4. **Melas Chasma / Valles Marineris ($-10.6500^\circ\text{S}, -68.1500^\circ\text{E}$ | Elev: $-4,900\text{ m}$):**
   * *Science:* Deepest canyon trough of Valles Marineris, plunging $9\text{ km}$ below the surrounding plateau. Exposes billions of years of crustal bedrock and volcanic basement rock.
   * *Operations:* Demonstrates the RAD-Haven Solar Storm Dispatch Engine. Towering canyon walls provide natural rock shielding ($>50\text{ g/cm}^2$), enabling 3D ray-tracing along the solar vector to route astronauts to radiation alcoves during coronal mass ejections.

---

## 2. What benefits does it have?

* **Eliminates the "Point of No Return":** By computing asymmetric round trips and dynamic walkback isochrones, it guarantees crew can return within remaining PLSS water and oxygen reserves under the **NASA EVA Rule of Half** (50% consumable reserve threshold).
* **Mitigates Planetary Hazard Exposure:** Instant automated alerts for rollover risks ($>15^\circ$), solar flare proton storms (RAD-Haven), low-sun glare hazards ($<22^\circ$ elevation), and communications blackout zones.
* **Fuses Disparate Tools into a Single Cockpit:** Replaces disconnected GIS viewers, static map printouts, and tabular spreadsheets with a single, live interactive tactical console.
* **Hyperlocalized Operational Precision:** Unlike global tools built for regional overviews, ARES-NAVIGATOR operates at meter-scale resolution calibrated across 4 high-detail expedition sites:
  * *Jezero Crater Delta:* Navigates $18^\circ$ delta scarps and Perseverance sample caches while avoiding boulder fields.
  * *Mount Sharp (Gale):* Manages loose dune fields and steep bedrock benches using THEMIS thermal inertia.
  * *Arcadia Planitia:* Optimizes ice-mining haul loops and heavy logistics over subsurface water-ice sheets.
  * *Melas Chasma (Valles Marineris):* Demonstrates the RAD-Haven engine inside a $9\text{ km}$ deep canyon with $>50\text{ g/cm}^2$ natural cliff shielding.
* **Certified Interoperability:** Generates standard flight data formats (RFC 7946 GeoJSON, GPX 1.1, and NASA PDS4 XML) ready for uplink to flight computers or mission log archives.
* **Zero Deployment Friction:** Runs entirely client-side in standard web browsers with no installation, software dependencies, or specialized hardware required.

---

## 3. What is the intended impact of the project?

* **Operational Flight Dispatch for Artemis-to-Mars:** Provides flight controllers and astronauts with a reliable, physics-grounded decision tool for planning surface traverses, evaluating abort scenarios, and managing life-support expendables.
* **Terrestrial Analogue Missions:** Directly applicable to Earth-based Mars analog research stations (e.g., MDRS, CHAPEA, AMADEE) for training crews in realistic life-support constraints, latency-aware comms, and traverse planning.
* **Planetary Science & Landing Site Evaluation:** Enables researchers and mission architects to quickly assess rover trafficability, slope hazards, and scientific target access across complex Martian stratigraphy.
* **Public Engagement & STEM Education:** Demystifies the realities of human spaceflight by letting students and the public explore real NASA planetary data, experiencing firsthand why surface exploration on another planet requires rigorous engineering.
* **Extensibility to the Moon & Beyond:** The core architectural framework (bicubic DTM terrain fields, 3D raycasting, and consumable walkback buffers) is directly transferable to lunar South Pole exploration under the Artemis program.

---

## 4. What tools, coding languages, hardware, or software did you use to develop your project?

| Category | Tools, Technologies & Resources |
|---|---|
| **Coding Languages** | TypeScript, JavaScript, HTML5 Canvas, CSS3 |
| **Frameworks & Libraries** | Next.js 16 (App Router), React 19, Three.js (WebGL), Tailwind CSS, Lucide Icons |
| **NASA Data & Planetary Services** | NASA JPL Mars Trek API, NASA PDS Geosciences Node (HiRISE Stereo DTMs), NASA Image and Video Library |
| **International & Partner Data** | ESA / DLR Mars Express HRSC Topography, USGS Astrogeology Geologic Map of Mars (SIM 3292) |
| **Data Exchange Formats** | RFC 7946 GeoJSON, GPX 1.1 XML, NASA PDS4 XML Observational Products |
| **Development Software** | Node.js, npm, Git, modern WebGL-capable web browsers |
| **Hardware Used** | Standard consumer laptops and desktops with internet connectivity (no specialized hardware or local GPU clusters required) |

---

## 5. How is your project creative?

1. **Round-Trip-First Paradigm:** Rather than treating route planning as a simple geometric line from A to B, ARES-NAVIGATOR treats the return journey as an indispensable survival constraint, computing asymmetric bidirectional paths that account for directional gravity.
2. **Deep Data Fusion Over Passive Overlays:** Instead of stacking visual map layers as passive pictures, ARES-NAVIGATOR fuses seven distinct NASA remote-sensing layers into a unified mathematical model—translating THEMIS thermal data into traction coefficients, HiRISE DTMs into slope vectors, and solar ephemeris into radiation shadows.
3. **True 0.38g Human Bio-Energetics:** Replaces Earth-based walking models with a modified Santee-Pandolf formulation specifically calibrated to Martian gravity, spacesuit mass, joint resistance at $29.65\text{ kPa}$, and variable soil compaction.
4. **Natural Topography as Active Shielding:** Reimagines Martian cliff alcoves as dynamic radiation shelters, using 3D vector raycasting to create automated evacuation routing during solar proton events.
5. **Seamless Multi-Perspective Cockpit:** Crew can fluidly move between an orbital 3D terrain globe, a 2D tactical planimetric GIS, a first-person $1.8\text{ m}$ helmet-visor HUD, and immersive $360^\circ$ rover Mastcam panoramas within a single application.
6. **An AI Copilot that Operates the System:** The Nini AI Copilot does not just generate descriptive text—it interprets live application telemetry and directly executes mission directives in the UI.
7. **Authentic Aerospace Aesthetics:** Replaces generic web design with a flight-console cockpit aesthetic: high-contrast telemetry, zero decorative emojis, stretchable sidebars with proportional internal scaling, and custom tactical scrollbars.

---

## 6. What factors did your team consider?

### Astronaut Safety & Physical Realism
* **Gravity Asymmetry:** Uphill cardiovascular exertion vs. downhill tumbling hazards on loose Martian regolith were evaluated independently.
* **Consumables Management:** The NASA EVA "Rule of Half" was built into the routing engine to guarantee a 50% life-support reserve margin.
* **Radiation & Thermal Constraints:** Factored in space weather proton flux benchmarks from Curiosity RAD and diurnal freeze countdowns based on Perseverance MEDA data.

### Scientific Grounding & Accuracy
* **Peer-Reviewed Formulations:** All algorithms are grounded in established aerospace and planetary science literature: NASA Design Reference Architecture 5.0, the NASA EVA Operations Foundation Document, Santee et al. (2001), and Christensen/Fergason THEMIS regolith models.
* **Zero Fabricated Data:** Every elevation sample, optical texture, and geologic layer is streamed directly from official NASA and USGS planetary endpoints.
* **True Martian Astronomical Geodesy:** Calculations use the MOLA Areoid datum ($3,396,200\text{ m}$ radius) and live Mars Sol Date / Local Solar Time ephemeris.

### Human Factors & Usability
* **Cockpit Cleanliness:** When switching to Visor HUD mode, all extraneous dashboard headers, footers, and panels collapse automatically to provide an unobstructed field of view.
* **Interactive Workspace Customization:** Sidebars can be dragged along the horizontal axis to expand workspace width without distorting typography or vertical spacing.
* **Visibility Control:** Every map legend, waypoint tag, science badge, and HUD overlay can be individually toggled or hidden to eliminate visual clutter.

### Architectural Performance & Security
* **Adaptive Level-of-Detail (LOD):** A quadtree tile engine with configurable supersampling ($0.75\times$ to $2.0\times$) ensures smooth 60 FPS performance on consumer laptops.
* **Secure NASA Proxying:** Upstream NASA rover panoramas are streamed through a validated server-side route handler that restricts requests to legitimate NASA PIA identifiers and allow-listed tiers, preventing open-proxy vulnerabilities.

### Transparent Limitations & Future Roadmap
* *Current Resolution:* A\* routing currently searches a $52\times52$ lattice over sampled DTM data; fine sub-meter hazards (small boulders) require manual review.
* *Simulated Feeds:* Certain biomedical signals (such as the ECG pulse trace) and real-time space weather alerts are user-triggered or simulated for demonstration.
* *Future Vision:* Integrating adaptive sub-meter micro-routing, live DONKI/GOES-R automated flare triggers, multi-agent crew/rover swarm coordination, and offline PWA tile caching for field operations.
