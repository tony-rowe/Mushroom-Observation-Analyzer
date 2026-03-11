import { OREGON_REGIONS, SPECIES_ECOLOGY } from './regions.js';
import { PNW_SPECIES } from './species.js';
import { getHeatmapData } from './cache.js';

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = [polygon[i][1], polygon[i][0]];
    const [xj, yj] = [polygon[j][1], polygon[j][0]];
    if ((yi > lon) !== (yj > lon) && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function scoreSeasonality(species, month) {
  const season = species.season;
  if (!season) return { score: 0, label: 'No season data', detail: '' };

  const isPeak = season.peak?.includes(month);
  const inSeason = (() => {
    if (season.start <= season.end) return month >= season.start && month <= season.end;
    return month >= season.start || month <= season.end;
  })();
  const adjacent = (() => {
    const before = season.start === 1 ? 12 : season.start - 1;
    const after = season.end === 12 ? 1 : season.end + 1;
    return month === before || month === after;
  })();

  if (isPeak) return { score: 40, label: 'Peak season', detail: `Peak fruiting month for ${species.commonName}` };
  if (inSeason) return { score: 28, label: 'In season', detail: `Active fruiting period` };
  if (adjacent) return { score: 12, label: 'Shoulder season', detail: `Just outside main season — early/late finds possible` };
  return { score: 0, label: 'Out of season', detail: `Not expected to fruit this month` };
}

function scoreHabitat(species, region) {
  const ecology = SPECIES_ECOLOGY[species.id];
  if (!ecology) return { score: 10, label: 'Unknown', detail: '' };

  const regionForests = new Set(region.forestTypes);
  const preferredForests = ecology.preferredForests || [];

  if (preferredForests.length === 0) {
    const hasSoil = ecology.soilPreference?.some(s =>
      region.soilTypes.includes(s) || s === 'disturbed'
    );
    return hasSoil
      ? { score: 20, label: 'Suitable habitat', detail: `Soil conditions match (${region.name})` }
      : { score: 10, label: 'Marginal habitat', detail: 'May occur in disturbed areas' };
  }

  const matches = preferredForests.filter(f => regionForests.has(f));
  const ratio = matches.length / preferredForests.length;

  if (ratio >= 0.5) return { score: 25, label: 'Excellent habitat', detail: `Key tree species present: ${matches.join(', ').replace(/_/g, ' ')}` };
  if (ratio >= 0.25) return { score: 18, label: 'Good habitat', detail: `Some preferred trees: ${matches.join(', ').replace(/_/g, ' ')}` };
  if (matches.length > 0) return { score: 12, label: 'Partial habitat', detail: `Limited preferred trees present` };
  return { score: 3, label: 'Poor habitat', detail: 'Preferred tree species not present in this zone' };
}

function scoreElevation(species, region) {
  const ecology = SPECIES_ECOLOGY[species.id];
  if (!ecology?.elevationRange) return { score: 8, label: 'Unknown', detail: '' };

  const { min: sMin, max: sMax } = ecology.elevationRange;
  const rTypical = region.elevation.typical;
  const rMin = region.elevation.min;
  const rMax = region.elevation.max;

  const overlapMin = Math.max(sMin, rMin);
  const overlapMax = Math.min(sMax, rMax);

  if (overlapMin <= overlapMax) {
    const overlapRange = overlapMax - overlapMin;
    const speciesRange = sMax - sMin;
    const coverage = overlapRange / speciesRange;

    if (rTypical >= sMin && rTypical <= sMax) {
      if (coverage >= 0.5) return { score: 15, label: 'Ideal elevation', detail: `Region spans ${rMin}-${rMax}m, species prefers ${sMin}-${sMax}m — strong overlap` };
      return { score: 12, label: 'Good elevation', detail: `Partial overlap with preferred elevation range` };
    }
    return { score: 8, label: 'Edge of range', detail: `Some elevation overlap but typical elevation is marginal` };
  }
  return { score: 0, label: 'Wrong elevation', detail: `Region (${rMin}-${rMax}m) outside species range (${sMin}-${sMax}m)` };
}

function scorePrecipitation(species, region, month) {
  const ecology = SPECIES_ECOLOGY[species.id];
  if (!ecology) return { score: 5, label: 'Unknown', detail: '' };

  const monthPrecip = region.monthlyPrecip[month - 1] || 0;
  const prevMonthPrecip = region.monthlyPrecip[(month - 2 + 12) % 12] || 0;
  const effectivePrecip = monthPrecip * 0.4 + prevMonthPrecip * 0.6;

  const optimal = ecology.optimalPrecipMonth;
  const ratio = effectivePrecip / optimal;

  if (ratio >= 0.7 && ratio <= 2.0) return { score: 10, label: 'Good moisture', detail: `~${Math.round(effectivePrecip)}mm effective rainfall — adequate for fruiting` };
  if (ratio >= 0.4 && ratio < 0.7) return { score: 6, label: 'Moderate moisture', detail: `~${Math.round(effectivePrecip)}mm — may limit fruiting` };
  if (ratio > 2.0) return { score: 7, label: 'Very wet', detail: `~${Math.round(effectivePrecip)}mm — saturated conditions` };
  return { score: 2, label: 'Too dry', detail: `~${Math.round(effectivePrecip)}mm — insufficient moisture for fruiting` };
}

function scoreTemperature(species, region, month) {
  const ecology = SPECIES_ECOLOGY[species.id];
  if (!ecology?.tempRange) return { score: 5, label: 'Unknown', detail: '' };

  const temp = region.monthlyTemp[month - 1];
  const { min, max, optimal } = ecology.tempRange;

  if (temp >= min && temp <= max) {
    const dist = Math.abs(temp - optimal);
    const range = max - min;
    const closeness = 1 - (dist / range);
    if (closeness >= 0.6) return { score: 10, label: 'Ideal temperature', detail: `~${temp}°C — near optimal ${optimal}°C` };
    return { score: 7, label: 'Suitable temperature', detail: `~${temp}°C — within fruiting range (${min}-${max}°C)` };
  }

  const distOutside = temp < min ? min - temp : temp - max;
  if (distOutside <= 3) return { score: 3, label: 'Marginal temperature', detail: `~${temp}°C — just outside preferred range` };
  return { score: 0, label: 'Too ' + (temp < min ? 'cold' : 'warm'), detail: `~${temp}°C — well outside range (${min}-${max}°C)` };
}

function scoreHistorical(species, region) {
  try {
    const points = getHeatmapData(species.taxonId);
    if (!points || points.length === 0) return { score: 2, label: 'No data', detail: 'No cached observations yet' };

    const inRegion = points.filter(p => pointInPolygon(p.latitude, p.longitude, region.polygon));
    const density = inRegion.length;

    if (density >= 50) return { score: 10, label: `${density} observations`, detail: 'Major documented hotspot' };
    if (density >= 20) return { score: 8, label: `${density} observations`, detail: 'Well-documented area' };
    if (density >= 5) return { score: 5, label: `${density} observations`, detail: 'Some documented finds' };
    if (density >= 1) return { score: 3, label: `${density} observation(s)`, detail: 'Sparse records' };
    return { score: 1, label: 'No records here', detail: 'No documented observations in this zone (may still occur)' };
  } catch {
    return { score: 2, label: 'No data', detail: '' };
  }
}

function generatePrediction(species, region, month) {
  const seasonScore = scoreSeasonality(species, month);
  const habitatScore = scoreHabitat(species, region);
  const elevationScore = scoreElevation(species, region);
  const precipScore = scorePrecipitation(species, region, month);
  const tempScore = scoreTemperature(species, region, month);
  const historicalScore = scoreHistorical(species, region);

  const totalScore = seasonScore.score + habitatScore.score + elevationScore.score +
    precipScore.score + tempScore.score + historicalScore.score;

  const ecology = SPECIES_ECOLOGY[species.id] || {};

  let confidence = 'low';
  if (totalScore >= 75) confidence = 'very-high';
  else if (totalScore >= 55) confidence = 'high';
  else if (totalScore >= 40) confidence = 'moderate';

  return {
    speciesId: species.id,
    regionId: region.id,
    score: totalScore,
    maxScore: 110,
    confidence,
    factors: {
      season: seasonScore,
      habitat: habitatScore,
      elevation: elevationScore,
      precipitation: precipScore,
      temperature: tempScore,
      historical: historicalScore
    },
    tip: ecology.tips || '',
    accessTip: ecology.accessTip || ''
  };
}

function getPredictions(month) {
  const predictions = [];

  for (const species of PNW_SPECIES) {
    for (const region of OREGON_REGIONS) {
      const pred = generatePrediction(species, region, month);
      predictions.push({
        species: { id: species.id, commonName: species.commonName, scientificName: species.scientificName, emoji: species.emoji, color: species.color, edibility: species.edibility, season: species.season },
        region: { id: region.id, name: region.name, description: region.description, nearestTowns: region.nearestTowns, forests: region.forests },
        ...pred
      });
    }
  }

  predictions.sort((a, b) => b.score - a.score);
  return predictions;
}

function getRegionPredictions(regionId, month) {
  const region = OREGON_REGIONS.find(r => r.id === regionId);
  if (!region) return [];
  return PNW_SPECIES.map(species => {
    const pred = generatePrediction(species, region, month);
    return { species: { id: species.id, commonName: species.commonName, emoji: species.emoji, color: species.color, season: species.season }, ...pred };
  }).sort((a, b) => b.score - a.score);
}

function getSpeciesPredictions(speciesId, month) {
  const species = PNW_SPECIES.find(s => s.id === speciesId);
  if (!species) return [];
  return OREGON_REGIONS.map(region => {
    const pred = generatePrediction(species, region, month);
    return { region: { id: region.id, name: region.name, description: region.description, nearestTowns: region.nearestTowns, forests: region.forests, polygon: region.polygon }, ...pred };
  }).sort((a, b) => b.score - a.score);
}

function getTopPicks(month, limit = 10) {
  const all = getPredictions(month);
  return all.slice(0, limit);
}

function getRegionsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: OREGON_REGIONS.map(r => ({
      type: 'Feature',
      properties: { id: r.id, name: r.name, description: r.description },
      geometry: {
        type: 'Polygon',
        coordinates: [[...r.polygon, r.polygon[0]].map(([lon, lat]) => [lon, lat])]
      }
    }))
  };
}

export { getPredictions, getRegionPredictions, getSpeciesPredictions, getTopPicks, getRegionsGeoJSON };
