import {
  getCached, setCache, upsertObservations, updateSyncStatus, getSyncStatus
} from './cache.js';
import { PNW_PLACE_IDS } from './species.js';

const API_BASE = 'https://api.inaturalist.org/v1';
const RATE_LIMIT_MS = 1100;
const CACHE_TTL = 6 * 3600;
const SYNC_COOLDOWN = 3600;
const MAX_PER_PAGE = 200;
const MAX_PAGES = 10;

let lastRequestTime = 0;

async function rateLimitedFetch(url) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { 'User-Agent': 'PNW-Mushroom-Dashboard/1.0 (educational project)' }
  });

  if (!res.ok) {
    throw new Error(`iNaturalist API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchObservationsPage(taxonId, page = 1, perPage = MAX_PER_PAGE) {
  const placeIds = PNW_PLACE_IDS.join(',');
  const url = `${API_BASE}/observations?taxon_id=${taxonId}&place_id=${placeIds}&per_page=${perPage}&page=${page}&order=desc&order_by=observed_on&quality_grade=research,needs_id`;
  return rateLimitedFetch(url);
}

function parseObservation(obs) {
  const photo = obs.photos?.[0];
  const photoUrl = photo
    ? photo.url?.replace('square', 'medium')
    : null;

  return {
    id: obs.id,
    taxon_id: obs.taxon?.id || null,
    species_guess: obs.species_guess || obs.taxon?.name || '',
    quality_grade: obs.quality_grade || 'casual',
    latitude: obs.geojson?.coordinates?.[1] ?? null,
    longitude: obs.geojson?.coordinates?.[0] ?? null,
    observed_on: obs.observed_on || null,
    place_guess: obs.place_guess || '',
    photo_url: photoUrl,
    user_login: obs.user?.login || '',
    created_at: obs.created_at || '',
    updated_at: obs.updated_at || ''
  };
}

async function syncSpecies(taxonId, force = false) {
  const status = getSyncStatus(taxonId);
  const now = Math.floor(Date.now() / 1000);

  if (!force && status && (now - status.last_sync) < SYNC_COOLDOWN) {
    return { synced: false, cached: true, total: status.total_fetched };
  }

  let allObs = [];
  let page = 1;
  let totalResults = 0;

  try {
    while (page <= MAX_PAGES) {
      const data = await fetchObservationsPage(taxonId, page);
      totalResults = data.total_results || 0;
      const parsed = (data.results || []).map(parseObservation).filter(o => o.id);
      allObs.push(...parsed);

      if (!data.results || data.results.length < MAX_PER_PAGE || allObs.length >= totalResults) {
        break;
      }
      page++;
    }

    if (allObs.length > 0) {
      upsertObservations(allObs);
    }
    updateSyncStatus(taxonId, allObs.length, page);

    return { synced: true, cached: false, total: allObs.length, totalAvailable: totalResults };
  } catch (err) {
    console.error(`Error syncing taxon ${taxonId}:`, err.message);
    throw err;
  }
}

async function fetchTaxonDetails(taxonId) {
  const cacheKey = `taxon_${taxonId}`;
  const cached = getCached(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const data = await rateLimitedFetch(`${API_BASE}/taxa/${taxonId}`);
  const taxon = data.results?.[0];
  if (taxon) {
    const detail = {
      id: taxon.id,
      name: taxon.name,
      commonName: taxon.preferred_common_name || taxon.name,
      rank: taxon.rank,
      ancestorNames: taxon.ancestors?.map(a => a.name) || [],
      observationsCount: taxon.observations_count,
      photoUrl: taxon.default_photo?.medium_url || null,
      squareUrl: taxon.default_photo?.square_url || null,
      wikipediaSummary: taxon.wikipedia_summary || '',
      iconicTaxonName: taxon.iconic_taxon_name || ''
    };
    setCache(cacheKey, detail, CACHE_TTL);
    return detail;
  }
  return null;
}

async function fetchSpeciesCounts() {
  const cacheKey = 'species_counts_pnw';
  const cached = getCached(cacheKey, CACHE_TTL);
  if (cached) return cached;

  const placeIds = PNW_PLACE_IDS.join(',');
  const data = await rateLimitedFetch(
    `${API_BASE}/observations/species_counts?place_id=${placeIds}&iconic_taxa=Fungi&per_page=50&quality_grade=research`
  );

  const result = data.results?.map(r => ({
    taxonId: r.taxon?.id,
    name: r.taxon?.name,
    commonName: r.taxon?.preferred_common_name,
    count: r.count,
    photoUrl: r.taxon?.default_photo?.square_url
  })) || [];

  setCache(cacheKey, result, CACHE_TTL);
  return result;
}

export {
  syncSpecies,
  fetchTaxonDetails,
  fetchSpeciesCounts,
  rateLimitedFetch
};
