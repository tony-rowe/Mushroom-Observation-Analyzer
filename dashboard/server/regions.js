const OREGON_REGIONS = [
  {
    id: 'north-coast',
    name: 'North Coast',
    description: 'Astoria to Lincoln City. Sitka spruce and western hemlock forests drenched by Pacific storms.',
    nearestTowns: ['Astoria', 'Seaside', 'Tillamook', 'Lincoln City'],
    forests: ['Tillamook State Forest', 'Siuslaw National Forest (north)'],
    elevation: { min: 0, max: 500, typical: 150 },
    forestTypes: ['sitka_spruce', 'western_hemlock', 'douglas_fir'],
    soilTypes: ['clay', 'loam', 'sandy_loam'],
    annualPrecipitation: 2000,
    monthlyPrecip: [250, 200, 210, 140, 90, 60, 25, 30, 75, 170, 270, 280],
    monthlyTemp: [6, 7, 8, 10, 12, 14, 16, 16, 15, 11, 8, 6],
    canopyDensity: 0.85,
    polygon: [
      [-124.1, 46.25], [-123.65, 46.25], [-123.55, 45.85],
      [-123.6, 45.35], [-123.7, 44.9], [-124.05, 44.9],
      [-124.15, 45.4], [-124.1, 46.0]
    ]
  },
  {
    id: 'south-coast',
    name: 'South Coast',
    description: 'Florence to Brookings. Lush coastal forests with year-round moisture and mild temperatures.',
    nearestTowns: ['Florence', 'Coos Bay', 'Gold Beach', 'Brookings'],
    forests: ['Siuslaw National Forest (south)', 'Siskiyou National Forest'],
    elevation: { min: 0, max: 600, typical: 200 },
    forestTypes: ['sitka_spruce', 'western_hemlock', 'douglas_fir', 'tanoak'],
    soilTypes: ['clay', 'loam', 'serpentine'],
    annualPrecipitation: 1800,
    monthlyPrecip: [220, 180, 190, 120, 80, 40, 15, 20, 55, 150, 240, 250],
    monthlyTemp: [7, 8, 9, 11, 13, 15, 17, 17, 16, 12, 9, 7],
    canopyDensity: 0.80,
    polygon: [
      [-124.2, 44.9], [-123.75, 44.9], [-123.7, 44.2],
      [-123.8, 43.5], [-124.0, 42.85], [-124.2, 42.0],
      [-124.5, 42.0], [-124.5, 43.0], [-124.4, 44.0]
    ]
  },
  {
    id: 'coast-range',
    name: 'Coast Range Interior',
    description: 'Dense Douglas fir forests between the coast and Willamette Valley. Prime chanterelle territory.',
    nearestTowns: ['Forest Grove', 'Dallas', 'Philomath', 'Cottage Grove'],
    forests: ['Tillamook State Forest', 'Siuslaw NF', 'Elliott State Forest'],
    elevation: { min: 200, max: 1000, typical: 500 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'bigleaf_maple'],
    soilTypes: ['clay', 'loam', 'well_drained'],
    annualPrecipitation: 2200,
    monthlyPrecip: [280, 230, 240, 160, 100, 55, 20, 25, 70, 190, 300, 310],
    monthlyTemp: [4, 5, 7, 9, 12, 15, 18, 18, 15, 10, 6, 4],
    canopyDensity: 0.90,
    polygon: [
      [-123.65, 46.0], [-123.2, 46.0], [-123.1, 45.5],
      [-123.0, 44.9], [-123.2, 44.2], [-123.5, 43.5],
      [-123.7, 43.5], [-123.7, 44.2], [-123.6, 44.9],
      [-123.55, 45.5]
    ]
  },
  {
    id: 'willamette-valley',
    name: 'Willamette Valley',
    description: 'Oregon\'s heartland. Mixed forests on valley edges, urban parks, and riparian corridors. Disturbed soils great for shaggy manes.',
    nearestTowns: ['Portland', 'Salem', 'Eugene', 'Corvallis'],
    forests: ['Forest Park', 'Silver Falls SP', 'McDonald-Dunn Forest', 'urban parks'],
    elevation: { min: 15, max: 300, typical: 80 },
    forestTypes: ['oregon_oak', 'douglas_fir', 'bigleaf_maple', 'red_alder', 'ash'],
    soilTypes: ['clay', 'alluvial', 'silty_loam'],
    annualPrecipitation: 1100,
    monthlyPrecip: [150, 110, 115, 75, 55, 35, 10, 15, 40, 90, 160, 170],
    monthlyTemp: [4, 6, 8, 11, 14, 17, 20, 20, 17, 12, 7, 4],
    canopyDensity: 0.45,
    polygon: [
      [-123.2, 45.7], [-122.5, 45.7], [-122.4, 45.3],
      [-122.5, 44.8], [-122.7, 44.0], [-123.0, 43.7],
      [-123.2, 43.7], [-123.15, 44.2], [-123.05, 44.9],
      [-123.1, 45.3]
    ]
  },
  {
    id: 'mt-hood',
    name: 'Mt. Hood Corridor',
    description: 'Volcanic slopes with old-growth Douglas fir and hemlock transitioning to subalpine. Legendary mushroom country.',
    nearestTowns: ['Sandy', 'Government Camp', 'Welches', 'Zigzag'],
    forests: ['Mt. Hood National Forest'],
    elevation: { min: 300, max: 2000, typical: 900 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'noble_fir', 'pacific_silver_fir', 'mountain_hemlock'],
    soilTypes: ['volcanic', 'sandy_loam', 'pumice'],
    annualPrecipitation: 2500,
    monthlyPrecip: [300, 250, 260, 180, 120, 70, 30, 35, 90, 210, 330, 340],
    monthlyTemp: [0, 1, 3, 6, 9, 13, 17, 17, 13, 7, 3, 0],
    canopyDensity: 0.80,
    polygon: [
      [-122.3, 45.55], [-121.5, 45.55], [-121.4, 45.3],
      [-121.5, 45.05], [-121.7, 44.85], [-122.2, 44.85],
      [-122.45, 45.1], [-122.4, 45.35]
    ]
  },
  {
    id: 'central-cascades',
    name: 'Central Cascades',
    description: 'Willamette and Deschutes NF. Massive old-growth Douglas fir stands with thick moss carpet. The chanterelle motherload.',
    nearestTowns: ['Oakridge', 'Detroit', 'McKenzie Bridge', 'Blue River'],
    forests: ['Willamette National Forest', 'Umpqua National Forest (north)'],
    elevation: { min: 400, max: 2500, typical: 1000 },
    forestTypes: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'noble_fir'],
    soilTypes: ['volcanic', 'clay_loam', 'well_drained'],
    annualPrecipitation: 2200,
    monthlyPrecip: [270, 220, 230, 160, 110, 60, 20, 25, 70, 180, 290, 300],
    monthlyTemp: [1, 2, 4, 7, 10, 14, 18, 18, 14, 8, 3, 1],
    canopyDensity: 0.85,
    polygon: [
      [-122.5, 44.85], [-121.7, 44.85], [-121.5, 44.5],
      [-121.5, 43.8], [-121.7, 43.4], [-122.3, 43.4],
      [-122.6, 43.8], [-122.7, 44.3]
    ]
  },
  {
    id: 'southern-cascades',
    name: 'Southern Cascades',
    description: 'Crater Lake region. Mixed conifer with Shasta red fir. Drier than north, but excellent for fall boletes and matsutake.',
    nearestTowns: ['Klamath Falls', 'Chemult', 'Prospect', 'Union Creek'],
    forests: ['Rogue River–Siskiyou NF', 'Fremont-Winema NF', 'Crater Lake NP'],
    elevation: { min: 600, max: 2700, typical: 1400 },
    forestTypes: ['douglas_fir', 'white_fir', 'shasta_red_fir', 'lodgepole_pine', 'mountain_hemlock'],
    soilTypes: ['volcanic', 'pumice', 'sandy'],
    annualPrecipitation: 1200,
    monthlyPrecip: [150, 120, 130, 80, 55, 25, 10, 12, 35, 90, 160, 170],
    monthlyTemp: [-1, 0, 3, 5, 9, 13, 17, 17, 13, 7, 2, -1],
    canopyDensity: 0.65,
    polygon: [
      [-122.3, 43.4], [-121.5, 43.4], [-121.3, 43.0],
      [-121.2, 42.6], [-121.3, 42.0], [-122.0, 42.0],
      [-122.5, 42.5], [-122.5, 43.0]
    ]
  },
  {
    id: 'central-oregon',
    name: 'Central Oregon',
    description: 'Deschutes NF east of the Cascades. Pumice soils and pine forests — prime matsutake habitat.',
    nearestTowns: ['Bend', 'Sisters', 'La Pine', 'Sunriver'],
    forests: ['Deschutes National Forest', 'Ochoco National Forest'],
    elevation: { min: 900, max: 2200, typical: 1300 },
    forestTypes: ['ponderosa_pine', 'lodgepole_pine', 'white_fir', 'mountain_hemlock'],
    soilTypes: ['pumice', 'volcanic', 'sandy'],
    annualPrecipitation: 500,
    monthlyPrecip: [55, 40, 40, 25, 30, 18, 8, 10, 15, 30, 55, 60],
    monthlyTemp: [-2, 0, 3, 6, 10, 14, 19, 19, 14, 8, 2, -2],
    canopyDensity: 0.50,
    polygon: [
      [-121.5, 44.5], [-120.8, 44.5], [-120.5, 44.1],
      [-120.5, 43.5], [-120.8, 43.0], [-121.3, 43.0],
      [-121.5, 43.4], [-121.5, 43.8]
    ]
  },
  {
    id: 'columbia-gorge',
    name: 'Columbia River Gorge',
    description: 'Dramatic transition from wet west to dry east. Hardwood-rich forests in the moist western end, excellent for wood-decay species.',
    nearestTowns: ['Hood River', 'Cascade Locks', 'The Dalles'],
    forests: ['Columbia River Gorge NSA', 'Mt. Hood NF (north)'],
    elevation: { min: 20, max: 1200, typical: 400 },
    forestTypes: ['douglas_fir', 'bigleaf_maple', 'red_alder', 'oregon_oak', 'grand_fir'],
    soilTypes: ['basalt', 'loam', 'well_drained'],
    annualPrecipitation: 1900,
    monthlyPrecip: [240, 190, 200, 130, 85, 50, 20, 25, 60, 160, 260, 270],
    monthlyTemp: [2, 4, 7, 10, 13, 17, 20, 20, 17, 11, 5, 2],
    canopyDensity: 0.70,
    polygon: [
      [-122.5, 45.8], [-121.2, 45.8], [-121.2, 45.55],
      [-121.5, 45.55], [-122.3, 45.55], [-122.5, 45.55]
    ]
  },
  {
    id: 'rogue-valley',
    name: 'Rogue Valley & Siskiyous',
    description: 'Southern Oregon\'s diverse forests. Oak woodlands, mixed conifer, and the botanically rich Siskiyou Mountains.',
    nearestTowns: ['Ashland', 'Medford', 'Grants Pass', 'Jacksonville'],
    forests: ['Rogue River–Siskiyou NF', 'Applegate Valley'],
    elevation: { min: 300, max: 2000, typical: 700 },
    forestTypes: ['oregon_oak', 'douglas_fir', 'tanoak', 'madrone', 'white_fir', 'ponderosa_pine'],
    soilTypes: ['clay', 'serpentine', 'granitic', 'loam'],
    annualPrecipitation: 800,
    monthlyPrecip: [100, 80, 85, 50, 35, 18, 5, 8, 20, 60, 110, 120],
    monthlyTemp: [3, 5, 8, 11, 14, 19, 23, 22, 18, 12, 6, 3],
    canopyDensity: 0.55,
    polygon: [
      [-123.5, 43.0], [-122.5, 43.0], [-122.0, 42.5],
      [-122.0, 42.0], [-123.5, 42.0], [-123.8, 42.5]
    ]
  },
  {
    id: 'blue-mountains',
    name: 'Blue Mountains & NE Oregon',
    description: 'Remote eastern Oregon forests. Ponderosa pine and grand fir. Legendary spring morel country, especially after wildfires.',
    nearestTowns: ['La Grande', 'Baker City', 'John Day', 'Pendleton'],
    forests: ['Wallowa-Whitman NF', 'Umatilla NF', 'Malheur NF'],
    elevation: { min: 800, max: 2800, typical: 1500 },
    forestTypes: ['ponderosa_pine', 'grand_fir', 'douglas_fir', 'lodgepole_pine', 'engelmann_spruce'],
    soilTypes: ['volcanic', 'basalt', 'granitic', 'loam'],
    annualPrecipitation: 600,
    monthlyPrecip: [65, 50, 55, 35, 40, 30, 12, 15, 20, 40, 65, 70],
    monthlyTemp: [-4, -2, 2, 6, 10, 14, 19, 19, 14, 7, 1, -4],
    canopyDensity: 0.45,
    polygon: [
      [-120.5, 45.5], [-117.5, 45.5], [-117.0, 45.0],
      [-117.5, 44.0], [-118.5, 43.8], [-120.0, 43.8],
      [-120.5, 44.2]
    ]
  }
];

const SPECIES_ECOLOGY = {
  'pacific-golden-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar'],
    elevationRange: { min: 100, max: 1200 },
    optimalPrecipMonth: 150,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['clay_loam', 'well_drained', 'loam', 'clay'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'Look in mossy old-growth Douglas fir stands. Check south-facing slopes first — they warm faster. Golden caps hide in sword fern and duff. Return to productive patches — mycelium fruits in the same spots year after year.',
    accessTip: 'National Forest roads are your best access. Look for stands with 60+ year old Douglas fir with good moss cover.'
  },
  'white-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 4, max: 15, optimal: 10 },
    soilPreference: ['clay', 'loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 60 },
    tips: 'Found in older, wetter forests than golden chanterelles. Often in deep moss near the base of large hemlocks. Pale color makes them hard to spot — look for subtle bumps in the moss.',
    accessTip: 'Old-growth stands in the Coast Range and western Cascades are prime habitat.'
  },
  'yellowfoot-chanterelle': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'western_red_cedar', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 200,
    tempRange: { min: 2, max: 12, optimal: 7 },
    soilPreference: ['clay', 'loam', 'organic'],
    fruiting: { daysAfterRain: 10, minRainMm: 40 },
    tips: 'The winter chanterelle — fruits late fall through winter in huge troops. Look on rotting wood and deeply mossy areas. Often hundreds in one patch. Excellent dried for later use.',
    accessTip: 'Low-elevation coastal and Coast Range forests. Check where water pools and moss is thickest.'
  },
  'king-bolete': {
    preferredForests: ['douglas_fir', 'noble_fir', 'mountain_hemlock', 'spruce'],
    elevationRange: { min: 500, max: 2000 },
    optimalPrecipMonth: 100,
    tempRange: { min: 5, max: 18, optimal: 13 },
    soilPreference: ['volcanic', 'sandy_loam', 'well_drained'],
    fruiting: { daysAfterRain: 10, minRainMm: 30 },
    tips: 'Found at mid to high elevations in mixed conifer. Look along forest edges and clearings. Often near huckleberry patches. Check under noble fir at 3000-5000 ft in the Cascades.',
    accessTip: 'Cascade passes and high-elevation forest roads (FS roads). Santiam Pass, McKenzie Pass, and Mt. Hood areas.'
  },
  'admirable-bolete': {
    preferredForests: ['western_hemlock', 'douglas_fir'],
    elevationRange: { min: 100, max: 1200 },
    optimalPrecipMonth: 120,
    tempRange: { min: 8, max: 18, optimal: 13 },
    soilPreference: ['organic', 'loam'],
    fruiting: { daysAfterRain: 12, minRainMm: 30 },
    tips: 'Unique — grows directly on decaying hemlock logs and stumps, not soil. Dark velvety cap is distinctive. Look for large old hemlock snags and fallen logs.',
    accessTip: 'Old-growth hemlock forests in the Coast Range and western Cascades.'
  },
  'black-morel': {
    preferredForests: ['douglas_fir', 'grand_fir', 'ponderosa_pine', 'lodgepole_pine'],
    elevationRange: { min: 500, max: 2500 },
    optimalPrecipMonth: 60,
    tempRange: { min: 5, max: 20, optimal: 13 },
    soilPreference: ['volcanic', 'sandy', 'disturbed', 'burned'],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'THE spring mushroom. Post-fire morels appear in massive quantities the spring after a wildfire (1-2 year window). Natural morels fruit along river bottoms, old orchards, and disturbed ground. South-facing slopes produce first.',
    accessTip: 'Check previous year\'s burn scars — USFS publishes fire maps. Also: river bottoms in the Cascades and Blue Mountains. Snow level determines timing: lower = earlier.'
  },
  'chicken-of-the-woods': {
    preferredForests: ['oregon_oak', 'douglas_fir', 'bigleaf_maple', 'red_alder'],
    elevationRange: { min: 0, max: 1000 },
    optimalPrecipMonth: 50,
    tempRange: { min: 10, max: 25, optimal: 18 },
    soilPreference: [],
    fruiting: { daysAfterRain: 7, minRainMm: 15 },
    tips: 'Grows on dead or dying hardwoods and some conifers. Bright orange shelves impossible to miss. Harvest young, tender edges only — older growth is tough. Often returns to the same tree for years.',
    accessTip: 'Urban parks, oak groves, and hardwood areas in the Willamette Valley and Gorge.'
  },
  'hen-of-the-woods': {
    preferredForests: ['oregon_oak', 'bigleaf_maple', 'tanoak'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 60,
    tempRange: { min: 8, max: 20, optimal: 14 },
    soilPreference: ['clay', 'loam'],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Look at the base of large oaks. Can grow enormous — 20+ lbs. Gray-brown overlapping caps blend with bark and leaf litter. Check the same trees annually.',
    accessTip: 'Oak groves in the Willamette Valley and Rogue Valley. Applegate Valley oaks are productive.'
  },
  'lions-mane': {
    preferredForests: ['bigleaf_maple', 'red_alder', 'oregon_oak', 'tanoak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 80,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: [],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Grows on dead or wounded hardwoods. Cascading white spines are unmistakable. Often high up on standing dead trees — look UP. May fruit multiple times per season from the same wound.',
    accessTip: 'Hardwood-rich areas: Columbia Gorge, Willamette Valley riparian corridors, Coast Range maple groves.'
  },
  'coral-tooth': {
    preferredForests: ['bigleaf_maple', 'red_alder', 'tanoak'],
    elevationRange: { min: 0, max: 800 },
    optimalPrecipMonth: 80,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: [],
    fruiting: { daysAfterRain: 10, minRainMm: 25 },
    tips: 'Similar to Lion\'s Mane but branching like coral. Found on fallen hardwood logs. Beautiful white specimen.',
    accessTip: 'Dead logs in hardwood forests in the Gorge and valley margins.'
  },
  'western-matsutake': {
    preferredForests: ['lodgepole_pine', 'ponderosa_pine', 'mountain_hemlock', 'shore_pine'],
    elevationRange: { min: 800, max: 2000 },
    optimalPrecipMonth: 50,
    tempRange: { min: 2, max: 14, optimal: 8 },
    soilPreference: ['pumice', 'sandy', 'volcanic'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Oregon\'s most valuable wild mushroom. Fruits in pumice soils under shore pine and lodgepole. Look for "mushrumps" — subtle bumps in the duff. Spicy cinnamon-like aroma when fresh. Often near Rhododendron and beargrass.',
    accessTip: 'Central Oregon east of the Cascades — Chemult, Crescent Lake, and Deschutes NF pumice flats. Also good along the coast in shore pine forests.'
  },
  'lobster-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 80,
    tempRange: { min: 10, max: 20, optimal: 15 },
    soilPreference: ['clay', 'loam'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Not a mushroom itself — it\'s a parasite that colonizes Russula and Lactarius. Bright orange-red and hard to miss. Check areas where Russula species are abundant. Firm, dense, and delicious.',
    accessTip: 'Coast Range and western Cascades in mixed conifer stands where Russula are common.'
  },
  'hedgehog-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock', 'sitka_spruce'],
    elevationRange: { min: 50, max: 1000 },
    optimalPrecipMonth: 150,
    tempRange: { min: 3, max: 15, optimal: 10 },
    soilPreference: ['clay', 'loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'Often found alongside chanterelles. Identified by tooth-like spines under the cap instead of gills. Pale orange-cream color. Very mild, sweet flavor — a beginner-friendly species.',
    accessTip: 'Same spots as chanterelles — Coast Range and Cascade old-growth Douglas fir.'
  },
  'oyster-mushroom': {
    preferredForests: ['red_alder', 'bigleaf_maple', 'cottonwood', 'oregon_oak'],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 100,
    tempRange: { min: 0, max: 15, optimal: 8 },
    soilPreference: [],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'One of few mushrooms that fruits in cold/wet winter conditions. Found on dead and dying hardwoods, especially alder. Fan-shaped clusters. Mild anise-like aroma. Can fruit year-round in mild coastal climates.',
    accessTip: 'Riparian corridors with alder. Willamette Valley streams, coastal creeks. Also urban parks with dying hardwoods.'
  },
  'cauliflower-mushroom': {
    preferredForests: ['douglas_fir', 'western_hemlock'],
    elevationRange: { min: 200, max: 1200 },
    optimalPrecipMonth: 80,
    tempRange: { min: 8, max: 18, optimal: 14 },
    soilPreference: ['loam', 'well_drained'],
    fruiting: { daysAfterRain: 14, minRainMm: 30 },
    tips: 'Massive ruffled fungus growing at the base of Douglas fir. Can reach 30+ lbs. Pale cream to yellow. Noodle-like texture. One specimen can feed a family for a week.',
    accessTip: 'Base of large Douglas fir in mid-elevation Cascade and Coast Range forests.'
  },
  'black-trumpet': {
    preferredForests: ['oregon_oak', 'tanoak', 'bigleaf_maple', 'douglas_fir'],
    elevationRange: { min: 50, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 2, max: 12, optimal: 7 },
    soilPreference: ['clay', 'loam', 'mossy'],
    fruiting: { daysAfterRain: 14, minRainMm: 50 },
    tips: 'The "black gold" of winter foraging. Nearly invisible against dark forest floor — look for patches of dark funnels in mossy areas near oaks. Deeply aromatic, almost truffle-like when dried.',
    accessTip: 'Oak-associated areas in the southern Willamette Valley and Rogue Valley. Also tanoak forests on the south coast.'
  },
  'shaggy-mane': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 60,
    tempRange: { min: 5, max: 18, optimal: 12 },
    soilPreference: ['disturbed', 'clay', 'compacted', 'gravel'],
    fruiting: { daysAfterRain: 5, minRainMm: 15 },
    tips: 'Grows in disturbed ground — lawns, gravel shoulders, construction sites, paths. Distinctive tall white cylinders with shaggy scales. Must eat within hours of picking as they auto-digest (deliquesce) into black ink.',
    accessTip: 'Urban areas, roadsides, park lawns, gravel patches. Look after fall rains in the Willamette Valley.'
  },
  'giant-puffball': {
    preferredForests: [],
    elevationRange: { min: 0, max: 600 },
    optimalPrecipMonth: 50,
    tempRange: { min: 10, max: 22, optimal: 16 },
    soilPreference: ['loam', 'alluvial', 'rich'],
    fruiting: { daysAfterRain: 7, minRainMm: 20 },
    tips: 'Unmistakable white spheres in open areas. Cut open to verify — flesh must be pure white throughout. Any yellow or brown means too old. Great sliced thick and pan-fried.',
    accessTip: 'Open meadows, pastures, and park edges in the Willamette Valley.'
  },
  'oregon-black-truffle': {
    preferredForests: ['douglas_fir'],
    elevationRange: { min: 100, max: 800 },
    optimalPrecipMonth: 200,
    tempRange: { min: 2, max: 10, optimal: 5 },
    soilPreference: ['loam', 'well_drained', 'sandy_loam'],
    fruiting: { daysAfterRain: 21, minRainMm: 80 },
    tips: 'Fruits underground near Douglas fir roots in winter. Intensely aromatic — pineapple, chocolate, garlic notes. Requires raking through duff and topsoil. Train a dog for best results.',
    accessTip: 'Young Douglas fir plantations (15-40 years) in the Coast Range and western Cascades foothills.'
  },
  'oregon-white-truffle': {
    preferredForests: ['douglas_fir'],
    elevationRange: { min: 100, max: 800 },
    optimalPrecipMonth: 180,
    tempRange: { min: 3, max: 12, optimal: 7 },
    soilPreference: ['loam', 'well_drained', 'sandy_loam'],
    fruiting: { daysAfterRain: 21, minRainMm: 60 },
    tips: 'Fall-fruiting truffle found underground near Douglas fir. Garlicky, herbaceous aroma. Look where squirrels have been digging — they eat truffles. Second-growth fir stands (20-50 years) are ideal.',
    accessTip: 'Douglas fir plantations in the Coast Range foothills and Willamette Valley margins.'
  }
};

export { OREGON_REGIONS, SPECIES_ECOLOGY };
