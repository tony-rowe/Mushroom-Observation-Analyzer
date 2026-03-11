import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi, apiPost } from '../hooks/useApi';
import HeatMap from '../components/HeatMap';
import SpeciesCard from '../components/SpeciesCard';
import { SeasonalChart, MultiSpeciesChart, QualityPieChart } from '../components/Charts';
import LoadingSpinner, { SkeletonCard } from '../components/LoadingSpinner';
import { formatNumber, MONTH_FULL } from '../utils/formatters';

export default function Dashboard() {
  const { data: speciesData, loading: speciesLoading } = useApi('/species');
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApi('/stats');
  const { data: heatmapData, loading: heatmapLoading, refetch: refetchHeatmap } = useApi('/heatmap');
  const [syncing, setSyncing] = useState(false);

  const species = speciesData?.species || [];
  const stats = statsData?.global || {};
  const speciesStats = statsData?.species || [];
  const points = heatmapData?.points || [];

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await apiPost('/sync-all');
      setTimeout(() => {
        refetchStats();
        refetchHeatmap();
        setSyncing(false);
      }, 5000);
    } catch { setSyncing(false); }
  };

  const currentMonth = new Date().getMonth() + 1;
  const inSeasonNow = species.filter(s => {
    const { start, end } = s.season || {};
    if (!start) return false;
    if (start <= end) return currentMonth >= start && currentMonth <= end;
    return currentMonth >= start || currentMonth <= end;
  });

  const qualityData = speciesStats.reduce((acc, s) => {
    (s.byQuality || []).forEach(q => {
      const existing = acc.find(a => a.quality_grade === q.quality_grade);
      if (existing) existing.count += q.count;
      else acc.push({ ...q });
    });
    return acc;
  }, []);

  const isLoading = speciesLoading || statsLoading;

  if (isLoading && !statsData) {
    return (
      <div className="fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-500">Loading PNW mushroom data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            PNW Mushroom Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Tracking {species.length} edible species across the Pacific Northwest
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSyncAll} disabled={syncing} className="btn-primary flex items-center gap-2">
            {syncing ? (
              <>
                <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Observations"
          value={formatNumber(stats.totalObs || 0)}
          icon="📊"
          color="text-mushroom-gold"
        />
        <StatCard
          label="Species Tracked"
          value={species.length}
          icon="🍄"
          color="text-green-400"
        />
        <StatCard
          label="In Season Now"
          value={inSeasonNow.length}
          subtext={MONTH_FULL[currentMonth - 1]}
          icon="🌿"
          color="text-emerald-400"
        />
        <StatCard
          label="Research Grade"
          value={formatNumber(qualityData.find(q => q.quality_grade === 'research')?.count || 0)}
          icon="✅"
          color="text-green-300"
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Observation Heatmap</h2>
            <p className="text-xs text-gray-500">All PNW edible mushroom observations</p>
          </div>
          <Link to="/map" className="btn-ghost text-xs">
            Full Map View →
          </Link>
        </div>
        {heatmapLoading ? (
          <LoadingSpinner message="Loading heatmap data..." />
        ) : (
          <HeatMap points={points} height="450px" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Seasonal Activity</h2>
          <p className="text-xs text-gray-500 mb-4">Observations by month across all species</p>
          <SeasonalChart data={stats.byMonth || []} height={260} />
        </div>
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Observations by Species</h2>
          <p className="text-xs text-gray-500 mb-4">Top species by observation count</p>
          <MultiSpeciesChart speciesStats={speciesStats} height={260} />
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold text-white mb-1">Quality Distribution</h2>
        <p className="text-xs text-gray-500 mb-4">Observation verification grades</p>
        <div className="h-64">
          <QualityPieChart data={qualityData} height={250} />
        </div>
      </div>

      {inSeasonNow.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                🌿 In Season Now — {MONTH_FULL[currentMonth - 1]}
              </h2>
              <p className="text-xs text-gray-500">{inSeasonNow.length} species currently fruiting in the PNW</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inSeasonNow.map(s => (
              <SpeciesCard key={s.id} species={s} stats={speciesStats.find(st => st.id === s.id)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">All Tracked Species</h2>
            <p className="text-xs text-gray-500">{species.length} PNW edible mushrooms</p>
          </div>
          <Link to="/species" className="btn-ghost text-xs">View All →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {species.slice(0, 8).map(s => (
            <SpeciesCard key={s.id} species={s} stats={speciesStats.find(st => st.id === s.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, icon, color }) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-green-900/40 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {subtext && <p className="text-[10px] text-gray-600">{subtext}</p>}
      </div>
    </div>
  );
}
