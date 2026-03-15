import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import SpeciesCard from '../components/SpeciesCard';
import LoadingSpinner, { SkeletonCard } from '../components/LoadingSpinner';
import { MONTHS } from '../utils/formatters';

export default function SpeciesPage() {
  const { data: speciesData, loading: speciesLoading } = useApi('/species');
  const { data: statsData, loading: statsLoading } = useApi('/stats');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const species = speciesData?.species || [];
  const speciesStats = statsData?.species || [];
  const currentMonth = new Date().getMonth() + 1;

  let filtered = [...species];

  if (filter === 'in-season') {
    filtered = filtered.filter(s => {
      const { start, end } = s.season || {};
      if (!start) return false;
      if (start <= end) return currentMonth >= start && currentMonth <= end;
      return currentMonth >= start || currentMonth <= end;
    });
  } else if (filter === 'choice') {
    filtered = filtered.filter(s => s.edibility?.toLowerCase().includes('choice'));
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.commonName.toLowerCase().includes(q) ||
      s.scientificName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }

  if (sortBy === 'observations') {
    filtered.sort((a, b) => {
      const aObs = speciesStats.find(s => s.id === a.id)?.total || 0;
      const bObs = speciesStats.find(s => s.id === b.id)?.total || 0;
      return bObs - aObs;
    });
  } else if (sortBy === 'season') {
    filtered.sort((a, b) => (a.season?.start || 13) - (b.season?.start || 13));
  }

  const isLoading = speciesLoading || statsLoading;

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-green-900 mb-1">Species Guide</h1>
        <p className="text-green-700 text-xs sm:text-sm">{species.length} tracked taxa in the Pacific Northwest dataset</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search species..."
            className="w-full bg-white border border-green-300 rounded-xl px-4 py-2.5 text-sm text-green-900 placeholder-green-500 focus:outline-none focus:border-mushroom-gold/50 transition-colors"
          />
          <svg className="absolute right-3 top-3 w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'in-season', label: 'In Season' },
            { value: 'choice', label: 'Choice Edible' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-mushroom-gold text-black'
                  : 'bg-green-100 text-green-800 hover:text-green-900 hover:bg-green-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-white border border-green-300 rounded-xl px-3 py-2 text-xs text-green-900 focus:outline-none w-full sm:w-auto"
        >
          <option value="name">Sort: Name</option>
          <option value="observations">Sort: Observations</option>
          <option value="season">Sort: Season Start</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <p className="text-xs text-green-700">{filtered.length} species shown</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filtered.map(s => (
              <SpeciesCard key={s.id} species={s} stats={speciesStats.find(st => st.id === s.id)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-green-700">
              No species match your search.
            </div>
          )}
        </>
      )}
    </div>
  );
}
