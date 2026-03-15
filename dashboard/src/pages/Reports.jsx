import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

const STREAMLIT_URL = import.meta.env.VITE_STREAMLIT_URL || 'http://localhost:8501';

export default function Reports() {
  const { data, loading, error } = useApi('/reports/summary');

  const rollingSeries = data?.rolling?.series || [];
  const recent7d = data?.recent7d || {};
  const cache = data?.cache || {};

  const avgPerDay = useMemo(() => {
    if (!recent7d.total) return 0;
    return (recent7d.total / 7).toFixed(1);
  }, [recent7d.total]);

  if (loading) return <LoadingSpinner message="Loading reporting data..." />;
  if (error) return <p className="text-red-600 text-sm">Failed to load reports: {error}</p>;

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-green-900 mb-1">Reporting Center</h1>
        <p className="text-green-700 text-sm">
          Rolling trends, weekly activity, and cache health based on your local observation store.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Observations (7d)" value={recent7d.total?.toLocaleString?.() || '0'} />
        <StatCard label="Average / day" value={avgPerDay} />
        <StatCard label="Delta vs prior week" value={(recent7d.deltaVsPreviousWeek || 0).toLocaleString()} />
        <StatCard label="Cached observations" value={cache.observations?.toLocaleString?.() || '0'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Rolling 7-day activity</h2>
          <p className="text-sm text-green-700 mb-4">Daily observations and rolling accumulation window.</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis dataKey="day" tick={{ fill: '#166534', fontSize: 11 }} />
                <YAxis tick={{ fill: '#166534', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #86efac',
                    background: 'rgba(255,255,255,0.97)',
                    color: '#14532d'
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={false} name="Daily" />
                <Line type="monotone" dataKey="rolling" stroke="#f59e0b" strokeWidth={2} dot={false} name="Rolling (7d)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Top species (last 7 days)</h2>
          <p className="text-sm text-green-700 mb-4">Based on cached PNW observations.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(recent7d.topSpecies || []).slice(0, 10).map((item) => (
              <div key={item.taxonId} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                <p className="text-sm text-green-900">{item.commonName}</p>
                <p className="text-sm font-semibold text-green-700">{item.count.toLocaleString()}</p>
              </div>
            ))}
            {(!recent7d.topSpecies || recent7d.topSpecies.length === 0) && (
              <p className="text-sm text-green-700">No observations in the last 7 days.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Quality breakdown (7d)</h2>
          <p className="text-sm text-green-700 mb-4">Research vs needs-id mix in the last week.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(recent7d.byQuality || []).map((q) => ({ quality: q.quality_grade, count: q.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis dataKey="quality" tick={{ fill: '#166534', fontSize: 11 }} />
                <YAxis tick={{ fill: '#166534', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #86efac',
                    background: 'rgba(255,255,255,0.97)',
                    color: '#14532d'
                  }}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold text-green-900 mb-1">Cache and Streamlit integration</h2>
          <div className="space-y-2 text-sm text-green-800">
            <p><strong>Primary cache DB:</strong> <code>{cache.dbPath || 'dashboard/data/cache.db'}</code></p>
            <p><strong>DB size:</strong> {cache.dbSizeMb ?? 0} MB</p>
            <p><strong>Synced taxa:</strong> {cache.syncedTaxa ?? 0}</p>
            <p><strong>Latest cached observation:</strong> {cache.latestObservation || 'n/a'}</p>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-900 font-medium">Streamlit reports are integrated as a companion app.</p>
            <p className="text-xs text-green-700 mt-1">
              Start it with <code>python3 -m streamlit run streamlit/app.py</code> and open:
            </p>
            <a href={STREAMLIT_URL} target="_blank" rel="noreferrer" className="text-sm text-green-800 underline break-all">
              {STREAMLIT_URL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="glass-card p-4">
      <p className="text-sm text-green-700">{label}</p>
      <p className="text-2xl font-bold text-green-900">{value}</p>
    </div>
  );
}
