export interface MarsLandmark {
  id: string;
  name: string;
  category: 'SAMPLE_DEPOT' | 'GEOLOGIC_FORMATION' | 'LANDING_SITE' | 'ASTRONOMICAL_HUB';
  siteId: 'jezero-delta' | 'mount-sharp-gale' | 'arcadia-planitia' | 'melas-chasma';
  lat: number;
  lon: number;
  elevationM: number;
  description: string;
  mineralogy: string; // CRISM Astrobiology scoring (smectite clays, olivine, Mg carbonates, sulfates)
  scienceValueScore: number; // 0 to 100 astrobiological priority rating
}

export const MARS_LANDMARKS: MarsLandmark[] = [
  // ==========================================================================
  // JEZERO CRATER DELTA FRONT (PRIMARY LANDING SITE)
  // ==========================================================================
  {
    id: 'jez-octavia',
    name: 'Octavia E. Butler Landing Site',
    category: 'LANDING_SITE',
    siteId: 'jezero-delta',
    lat: 18.4447,
    lon: 77.4508,
    elevationM: -2540,
    description: 'Mars 2020 touchdown coordinates on Jezero Crater floor.',
    mineralogy: 'Basaltic regolith with pyroxene and olivine sand',
    scienceValueScore: 82,
  },
  {
    id: 'jez-three-forks',
    name: 'Three Forks Sample Depot',
    category: 'SAMPLE_DEPOT',
    siteId: 'jezero-delta',
    lat: 18.4492,
    lon: 77.4318,
    elevationM: -2512,
    description: 'Primary Mars Sample Return titanium tube cache depot at delta foot.',
    mineralogy: 'Fine-grained mudstones rich in smectite clays & organic biosignature potential',
    scienceValueScore: 99,
  },
  {
    id: 'jez-kodiak',
    name: 'Kodiak Butte (Delta Remnant)',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'jezero-delta',
    lat: 18.418,
    lon: 77.426,
    elevationM: -2480,
    description: 'Steep-sided erosional mesa exhibiting classic delta bottomset and topset beds.',
    mineralogy: 'Fluvial bottomset sandstones with carbonate cementation',
    scienceValueScore: 94,
  },
  {
    id: 'jez-delta-scarp',
    name: 'Neretva Delta Front Scarp',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'jezero-delta',
    lat: 18.455,
    lon: 77.412,
    elevationM: -2465,
    description: '40-meter steep escarpment carved by ancient Neretva Vallis delta flow.',
    mineralogy: 'Layered magnesium carbonates, phyllosilicates, and fine river silt',
    scienceValueScore: 97,
  },
  {
    id: 'jez-south-seitah',
    name: 'South Séítah Dune Basin',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'jezero-delta',
    lat: 18.4285,
    lon: 77.4395,
    elevationM: -2558,
    description: 'Rippled dune corridor and igneous olivine cumulate bedrock unit.',
    mineralogy: 'Coarse olivine cumulate and volcanic basalt with high slip hazard',
    scienceValueScore: 86,
  },
  {
    id: 'jez-van-zyl',
    name: 'Van Zyl Overlook (Wright Field)',
    category: 'LANDING_SITE',
    siteId: 'jezero-delta',
    lat: 18.4525,
    lon: 77.4562,
    elevationM: -2535,
    description: 'High vantage point overlooking Ingenuity Mars Helicopter airfield.',
    mineralogy: 'Crater floor olivine-bearing layered floor unit',
    scienceValueScore: 84,
  },
  {
    id: 'jez-belva',
    name: 'Belva Impact Crater',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'jezero-delta',
    lat: 18.482,
    lon: 77.385,
    elevationM: -2410,
    description: '1 km wide excavated crater exposing deep delta stratigraphy and megabreccia.',
    mineralogy: 'Impact melt breccia and deep smectite clay layers',
    scienceValueScore: 91,
  },
  {
    id: 'jez-skrinkle',
    name: 'Skrinkle Haven Delta Topsets',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'jezero-delta',
    lat: 18.468,
    lon: 77.404,
    elevationM: -2440,
    description: 'Curved cross-bedded sandstone ridges from fast-moving delta river bars.',
    mineralogy: 'Fluvial gravel conglomerates and iron-rich oxides',
    scienceValueScore: 93,
  },

  // ==========================================================================
  // MOUNT SHARP / GALE CRATER (CURIOSITY LEGACY)
  // ==========================================================================
  {
    id: 'gale-bradbury',
    name: 'Bradbury Landing Site',
    category: 'LANDING_SITE',
    siteId: 'mount-sharp-gale',
    lat: -4.5895,
    lon: 137.4417,
    elevationM: -4501,
    description: 'Curiosity rover August 2012 landing site in northern Gale Crater.',
    mineralogy: 'Alluvial fan gravels with plagioclase feldspar and pyroxene',
    scienceValueScore: 80,
  },
  {
    id: 'gale-yellowknife',
    name: 'Yellowknife Bay Mudstones',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -4.5965,
    lon: 137.458,
    elevationM: -4512,
    description: 'Ancient freshwater mudstones where habitable lake environment was proven.',
    mineralogy: 'Smectite clay minerals and calcium sulfate vein networks',
    scienceValueScore: 96,
  },
  {
    id: 'gale-aeolis-peak',
    name: 'Aeolis Mons (Mount Sharp Peak)',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -5.08,
    lon: 137.85,
    elevationM: 1050,
    description: '5.5 km high central sedimentary mound rising from Gale Crater floor.',
    mineralogy: 'Stratified sulfates, hematite, and layered clay deposits',
    scienceValueScore: 98,
  },
  {
    id: 'gale-bagnold',
    name: 'Bagnold Dune Field',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -4.652,
    lon: 137.418,
    elevationM: -4415,
    description: 'Active dark basaltic sand dunes with steep slip faces.',
    mineralogy: 'Dark olivine-pyroxene windblown basaltic sand (low traction)',
    scienceValueScore: 85,
  },
  {
    id: 'gale-greenheugh',
    name: 'Greenheugh Pediment (Gator-Back Sandstone)',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -4.7125,
    lon: 137.3825,
    elevationM: -4080,
    description: 'Extensive sandstone caprock and wind-sculpted gator-back ridges.',
    mineralogy: 'Cross-bedded sandstone and diagenetic hematite concretions',
    scienceValueScore: 92,
  },
  {
    id: 'gale-boxwork-2025',
    name: 'Mount Sharp Boxwork Formations (Curiosity 2025 Discovery)',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -4.732,
    lon: 137.395,
    elevationM: -4010,
    description: 'Extensive mineral-cemented polygonal boxwork ridges studied by Curiosity in 2025, formed by deep groundwater circulation through fractured bedrock.',
    mineralogy: 'Polygonal sulfate and silicate-cemented fracture networks preserving ancient groundwater flow paths',
    scienceValueScore: 100,
  },
  {
    id: 'gale-marker-band',
    name: 'Marker Band Valley (Avanavero)',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'mount-sharp-gale',
    lat: -4.754,
    lon: 137.4085,
    elevationM: -3920,
    description: 'Thin dark rock layer preserving wave-rippled lake deposits.',
    mineralogy: 'Magnesium and calcium sulfates with ripple strata',
    scienceValueScore: 95,
  },

  // ==========================================================================
  // ARCADIA PLANITIA (HUMAN ISRU BASECAMP)
  // ==========================================================================
  {
    id: 'arcadia-basecamp',
    name: 'Arcadia Planitia ISRU Basecamp',
    category: 'ASTRONOMICAL_HUB',
    siteId: 'arcadia-planitia',
    lat: 46.2,
    lon: -171.2,
    elevationM: -4120,
    description: 'Human Mars landing zone with shallow glacial ice sheet for propellant synthesis.',
    mineralogy: 'Subsurface water ice (>90% purity) capped by 1m dust mantle',
    scienceValueScore: 95,
  },
  {
    id: 'arcadia-well-1',
    name: 'Subsurface Glacial Ice Well 1',
    category: 'SAMPLE_DEPOT',
    siteId: 'arcadia-planitia',
    lat: 46.35,
    lon: -171.05,
    elevationM: -4105,
    description: 'Designated Rodriguez well site for robotic thermal water extraction.',
    mineralogy: 'Massive sheet ice with low salinity and trace atmospheric dust',
    scienceValueScore: 97,
  },

  // ==========================================================================
  // MELAS CHASMA (VALLES MARINERIS)
  // ==========================================================================
  {
    id: 'melas-trough',
    name: 'Melas Basin Central Trough',
    category: 'ASTRONOMICAL_HUB',
    siteId: 'melas-chasma',
    lat: -10.65,
    lon: -68.15,
    elevationM: -4900,
    description: 'Deepest canyon floor in the solar system (-4.9 km elevation).',
    mineralogy: 'Interior layered deposits and hydrated iron sulfates',
    scienceValueScore: 94,
  },
  {
    id: 'melas-wall',
    name: 'Melas Chasma Canyon Wall Escarpment',
    category: 'GEOLOGIC_FORMATION',
    siteId: 'melas-chasma',
    lat: -10.45,
    lon: -68.35,
    elevationM: -1800,
    description: 'Spectacular 5 km high canyon wall with natural rock overhangs.',
    mineralogy: 'Exposed crustal flood basalt stratigraphy and mass-wasting debris',
    scienceValueScore: 92,
  },
];

export function searchMarsLandmarks(query: string): MarsLandmark[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return MARS_LANDMARKS.filter((lm) => {
    return (
      lm.name.toLowerCase().includes(q) ||
      lm.description.toLowerCase().includes(q) ||
      lm.mineralogy.toLowerCase().includes(q) ||
      lm.category.toLowerCase().includes(q) ||
      lm.siteId.toLowerCase().includes(q)
    );
  });
}

export function parseCoordinateQuery(
  query: string
): { lat: number; lon: number; label: string } | null {
  const cleaned = query.trim();
  // Regex to match e.g. "18.44, 77.45", "18.44 -77.45", "18.44N, 77.45E", "-4.58, 137.44"
  const match = cleaned.match(
    /^([+-]?\d+(?:\.\d+)?)\s*([NSns])?\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*([EWew])?$/
  );
  if (!match) return null;

  let lat = parseFloat(match[1]);
  if (match[2] && (match[2].toUpperCase() === 'S')) lat = -Math.abs(lat);

  let lon = parseFloat(match[3]);
  if (match[4] && (match[4].toUpperCase() === 'W')) lon = -Math.abs(lon);

  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    lat,
    lon,
    label: `COORDINATES (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
  };
}
