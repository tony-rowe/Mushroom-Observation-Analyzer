import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import HeatMap from '../components/HeatMap';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MapView() {
  const { data: speciesData } = useApi('/species');
  const [selectedTaxon, setSelectedTaxon] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const species = speciesData?.species || [];

  useEffect(() => {
    setLoading(true);
    const url = selectedTaxon ? `/api/heatmap?taxon_id=${selectedTaxon}` : '/api/heatmap';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setPoints(data.points || []);
        setTotalCount(data.count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedTaxon]);

  const selectedSpecies = species.find(s => s.taxonId === selectedTaxon);

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            🗺️ Heatmap Explorer
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            {selectedSpecies
              ? `Showing ${selectedSpecies.commonName} observations`
              : 'All PNW edible mushroom observations'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTaxon(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            !selectedTaxon
              ? 'bg-mushroom-gold text-black'
              : 'bg-green-100 text-green-800 hover:text-green-900 hover:bg-green-200'
          }`}
        >
          All Species ({totalCount.toLocaleString()})
        </button>
        {species.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedTaxon(s.taxonId === selectedTaxon ? null : s.taxonId)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedTaxon === s.taxonId
                ? 'bg-mushroom-gold text-black'
                : 'bg-green-100 text-green-800 hover:text-green-900 hover:bg-green-200'
            }`}
          >
            <span className="hidden sm:inline">{s.commonName.replace(/ \(.*\)/, '').split(' ').slice(-1)[0]}</span>
            <span className="sm:hidden">{s.commonName.split(' ').slice(-1)[0].substring(0, 3)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading heatmap..." />
      ) : (
        <HeatMap
          points={points}
          height="calc(100vh - 220px)"
          showControls={true}
        />
      )}
    </div>
  );
}
