import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import SpeciesPage from './pages/SpeciesPage';
import SpeciesDetail from './pages/SpeciesDetail';
import Predictions from './pages/Predictions';
import Training from './pages/Training';
import Import from './pages/Import';
import { useApi } from './hooks/useApi';

function Sidebar({ species, syncing }) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-[#0a130a] to-[#060b06] border-r border-green-900/40 flex flex-col z-40 overflow-hidden">
      <div className="p-5 border-b border-green-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mushroom-gold/20 flex items-center justify-center text-xl">
            🍄
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">PNW Mushrooms</h1>
            <p className="text-[10px] text-green-500 font-mono uppercase tracking-widest">Live Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          Dashboard
        </NavLink>
        <NavLink to="/map" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          Heatmap Explorer
        </NavLink>
        <NavLink to="/forecast" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Foraging Forecast
        </NavLink>
        <NavLink to="/training" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          Field Guide & Training
        </NavLink>
        <NavLink to="/import" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Import Species
        </NavLink>
        <NavLink to="/species" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Fungi Species
        </NavLink>

        <div className="pt-4 pb-2 px-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-green-700">Quick Access</p>
        </div>
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
          {species?.map(s => (
            <NavLink
              key={s.id}
              to={`/species/${s.id}`}
              className={({isActive}) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  isActive
                    ? 'text-mushroom-gold bg-mushroom-gold/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-green-900/30'
                }`
              }
            >
              <span>{s.emoji}</span>
              <span className="truncate">{s.commonName}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {syncing && (
        <div className="p-3 border-t border-green-900/30">
          <div className="flex items-center gap-2 text-xs text-green-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Syncing data...
          </div>
        </div>
      )}
    </aside>
  );
}

export default function App() {
  const { data: speciesData } = useApi('/species');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        const data = await res.json();
        setSyncing(data.count > 0);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar species={speciesData?.species} syncing={syncing} />
      <main className="flex-1 ml-64 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/forecast" element={<Predictions />} />
          <Route path="/training" element={<Training />} />
          <Route path="/import" element={<Import />} />
          <Route path="/species" element={<SpeciesPage />} />
          <Route path="/species/:id" element={<SpeciesDetail />} />
        </Routes>
      </main>
    </div>
  );
}
