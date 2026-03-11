import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getObservationStats, getGlobalStats, getHeatmapData, getObservationsForTaxon, getAllObservations } from './cache.js';
import { syncSpecies, fetchTaxonDetails } from './api.js';
import { PNW_SPECIES, PNW_PLACE_IDS } from './species.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.API_PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const syncProgress = new Map();

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

async function start() {
  await initDb();
  console.log('Database initialized.');

  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });

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
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
