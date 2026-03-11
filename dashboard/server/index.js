import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getObservationStats, getGlobalStats, getHeatmapData, getObservationsForTaxon, getAllObservations } from './cache.js';
import { syncSpecies, fetchTaxonDetails } from './api.js';
import { PNW_SPECIES, PNW_PLACE_IDS } from './species.js';
import { getTopPicks, getSpeciesPredictions, getRegionPredictions, getRegionsGeoJSON, setCalibration, getCalibration } from './predictions.js';
import { runBacktest } from './backtest.js';
import { loadCerts } from './ssl.js';
import { ALL_SPECIES, CATEGORIES } from './all-species.js';
import { getSpeciesPhotos, getQuizPhotos } from './photos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.API_PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const app = express();
app.use(cors());
app.use(express.json());

const syncProgress = new Map();
let lastBacktestResult = null;

app.get('/api/species', (_req, res) => {
  res.json({ species: PNW_SPECIES, placeIds: PNW_PLACE_IDS });
});

app.get('/api/species/:id', async (req, res) => {
  try {
    const species = PNW_SPECIES.find(s => s.id === req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });

    const [taxonDetails, stats] = await Promise.all([
      fetchTaxonDetails(species.taxonId).catch(() => null),
      Promise.resolve(getObservationStats(species.taxonId))
    ]);

    res.json({ species, taxonDetails, stats });
  } catch (err) {
    console.error('Error fetching species detail:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync/:taxonId', async (req, res) => {
  const taxonId = parseInt(req.params.taxonId);
  const force = req.query.force === 'true';

  if (syncProgress.get(taxonId)) {
    return res.json({ status: 'already_syncing' });
  }

  syncProgress.set(taxonId, true);
  try {
    const result = await syncSpecies(taxonId, force);
    res.json({ status: 'ok', ...result });
  } catch (err) {
    console.error(`Sync error for taxon ${taxonId}:`, err);
    res.status(500).json({ error: err.message });
  } finally {
    syncProgress.delete(taxonId);
  }
});

app.post('/api/sync-all', async (_req, res) => {
  res.json({ status: 'started', total: PNW_SPECIES.length });

  (async () => {
    for (const species of PNW_SPECIES) {
      if (!syncProgress.get(species.taxonId)) {
        syncProgress.set(species.taxonId, true);
        try {
          await syncSpecies(species.taxonId);
          console.log(`Synced: ${species.commonName} (${species.taxonId})`);
        } catch (err) {
          console.error(`Failed to sync ${species.commonName}:`, err.message);
        } finally {
          syncProgress.delete(species.taxonId);
        }
      }
    }
    console.log('Background sync complete for all species.');
  })();
});

app.get('/api/sync-progress', (_req, res) => {
  const syncing = Array.from(syncProgress.keys());
  res.json({ syncing, count: syncing.length });
});

app.get('/api/stats', (_req, res) => {
  try {
    const stats = getGlobalStats();
    const speciesStats = PNW_SPECIES.map(s => {
      const sStats = getObservationStats(s.taxonId);
      return { id: s.id, taxonId: s.taxonId, commonName: s.commonName, ...sStats };
    });
    res.json({ global: stats, species: speciesStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/heatmap', (req, res) => {
  try {
    const taxonId = req.query.taxon_id ? parseInt(req.query.taxon_id) : null;
    const points = getHeatmapData(taxonId);
    res.json({ points, count: points.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const limit = parseInt(req.query.limit) || 15;
    const topPicks = getTopPicks(month, limit);
    res.json({ month, calibrated: !!getCalibration(), topPicks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions/species/:id', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const predictions = getSpeciesPredictions(req.params.id, month);
    res.json({ month, speciesId: req.params.id, calibrated: !!getCalibration(), predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predictions/region/:id', (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const predictions = getRegionPredictions(req.params.id, month);
    res.json({ month, regionId: req.params.id, calibrated: !!getCalibration(), predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/regions/geojson', (_req, res) => {
  try {
    res.json(getRegionsGeoJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/observations', (req, res) => {
  try {
    const taxonId = req.query.taxon_id ? parseInt(req.query.taxon_id) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    let obs;
    if (taxonId) {
      obs = getObservationsForTaxon(taxonId);
    } else {
      obs = getAllObservations();
    }
    res.json({ observations: obs.slice(0, limit), total: obs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backtest', (_req, res) => {
  try {
    const result = runBacktest();
    setCalibration(result);
    lastBacktestResult = result;
    res.json({ status: 'ok', calibration: result });
  } catch (err) {
    console.error('Backtest error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backtest', (_req, res) => {
  res.json({ calibration: lastBacktestResult, calibrated: !!getCalibration() });
});

app.get('/api/field-guide', (req, res) => {
  const category = req.query.category;
  let species = ALL_SPECIES;
  if (category && category !== 'all') {
    species = species.filter(s => s.category === category);
  }
  res.json({ species, categories: CATEGORIES, total: species.length });
});

app.get('/api/field-guide/:id', (req, res) => {
  const species = ALL_SPECIES.find(s => s.id === req.params.id);
  if (!species) return res.status(404).json({ error: 'Species not found' });
  res.json(species);
});

app.get('/api/photos/:taxonId', async (req, res) => {
  try {
    const taxonId = parseInt(req.params.taxonId);
    const count = Math.min(parseInt(req.query.count) || 20, 50);
    const photos = await getSpeciesPhotos(taxonId, count);
    res.json({ taxonId, photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/quiz', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const count = Math.min(parseInt(req.query.count) || 10, 30);
    let pool = ALL_SPECIES.filter(s => s.taxonId);
    if (category !== 'all') pool = pool.filter(s => s.category === category);

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    const taxonIds = shuffled.map(s => s.taxonId);
    const photos = await getQuizPhotos(taxonIds, 3);

    const questions = [];
    for (const species of shuffled) {
      const speciesPhotos = photos.filter(p => p.taxonId === species.taxonId);
      if (speciesPhotos.length === 0) continue;
      const photo = speciesPhotos[Math.floor(Math.random() * speciesPhotos.length)];

      const wrongPool = pool.filter(s => s.id !== species.id && s.category === species.category);
      const wrongs = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [species, ...wrongs].sort(() => Math.random() - 0.5);

      questions.push({
        photo: { url: photo.url, urlLarge: photo.urlLarge, attribution: photo.attribution, placeGuess: photo.placeGuess, observedOn: photo.observedOn },
        correctId: species.id,
        correctName: species.commonName,
        category: species.category,
        options: options.map(o => ({ id: o.id, commonName: o.commonName, scientificName: o.scientificName, emoji: o.emoji })),
        hint: species.idTips,
        lookalikes: species.lookalikes || []
      });
    }

    res.json({ questions, category, total: questions.length });
  } catch (err) {
    console.error('Quiz error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await initDb();
  console.log('Database initialized.');

  app.listen(PORT, () => {
    console.log(`HTTP API server running on http://localhost:${PORT}`);
  });

  const certs = loadCerts();
  if (certs) {
    try {
      https.createServer({ key: certs.key, cert: certs.cert }, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS API server running on https://localhost:${HTTPS_PORT} (${certs.source})`);
      });
    } catch (err) {
      console.error('Failed to start HTTPS server:', err.message);
    }
  }

  console.log('Starting background sync of all species...');
  for (const species of PNW_SPECIES) {
    syncProgress.set(species.taxonId, true);
    try {
      const result = await syncSpecies(species.taxonId);
      if (result.synced) {
        console.log(`  ✓ ${species.commonName}: ${result.total} observations`);
      } else {
        console.log(`  ✓ ${species.commonName}: cached (${result.total} obs)`);
      }
    } catch (err) {
      console.error(`  ✗ ${species.commonName}: ${err.message}`);
    } finally {
      syncProgress.delete(species.taxonId);
    }
  }
  console.log('Initial sync complete.');

  console.log('\nRunning prediction backtest and calibration...');
  try {
    lastBacktestResult = runBacktest();
    setCalibration(lastBacktestResult);
    console.log('Prediction engine calibrated from observation data.\n');
  } catch (err) {
    console.error('Backtest failed (using default weights):', err.message);
  }
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
