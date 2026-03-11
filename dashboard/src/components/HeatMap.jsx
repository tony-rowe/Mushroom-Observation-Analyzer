import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const HEATMAP_SCRIPT = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';

let heatScriptLoaded = false;
function loadHeatScript() {
  if (heatScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (window.L?.heatLayer) { heatScriptLoaded = true; resolve(); return; }
    const s = document.createElement('script');
    s.src = HEATMAP_SCRIPT;
    s.onload = () => { heatScriptLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function HeatLayer({ points, options = {} }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    loadHeatScript().then(() => {
      if (!mounted || !window.L?.heatLayer) return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      if (points.length === 0) return;

      const heatPoints = points.map(p => [p.latitude, p.longitude, 0.6]);
      layerRef.current = window.L.heatLayer(heatPoints, {
        radius: options.radius || 18,
        blur: options.blur || 25,
        maxZoom: options.maxZoom || 13,
        max: options.max || 1.0,
        gradient: options.gradient || {
          0.0: '#0a2f1a',
          0.2: '#166534',
          0.4: '#22c55e',
          0.6: '#facc15',
          0.8: '#f97316',
          1.0: '#dc2626'
        },
        minOpacity: 0.4,
        ...options
      }).addTo(map);
    });

    return () => {
      mounted = false;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map, options.radius, options.blur]);

  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        fitted.current = true;
      }
    }
  }, [points, map]);

  return null;
}

export default function HeatMap({
  points = [],
  height = '500px',
  className = '',
  showControls = true,
  speciesFilter = null,
  species = [],
  onSpeciesFilterChange
}) {
  const [radius, setRadius] = useState(18);
  const [blur, setBlur] = useState(25);

  const PNW_CENTER = [45.5, -122.0];
  const PNW_ZOOM = 6;

  return (
    <div className={`relative ${className}`}>
      <div style={{ height }} className="rounded-2xl overflow-hidden border border-green-800/30">
        <MapContainer
          center={PNW_CENTER}
          zoom={PNW_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />
          <HeatLayer points={points} options={{ radius, blur }} />
          <FitBounds points={points} />
        </MapContainer>
      </div>

      {showControls && (
        <div className="absolute bottom-4 right-4 glass-card p-3 space-y-2 z-[1000]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">Radius</span>
            <input
              type="range" min="5" max="40" value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-20 accent-mushroom-gold"
            />
            <span className="text-[10px] text-gray-500 w-6">{radius}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-12">Blur</span>
            <input
              type="range" min="5" max="50" value={blur}
              onChange={e => setBlur(Number(e.target.value))}
              className="w-20 accent-mushroom-gold"
            />
            <span className="text-[10px] text-gray-500 w-6">{blur}</span>
          </div>

          <div className="flex items-center gap-1 pt-1">
            <div className="h-2 flex-1 rounded-full" style={{
              background: 'linear-gradient(to right, #0a2f1a, #166534, #22c55e, #facc15, #f97316, #dc2626)'
            }} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-500">
            <span>Low</span><span>High</span>
          </div>
        </div>
      )}

      {species.length > 0 && onSpeciesFilterChange && (
        <div className="absolute top-4 right-4 glass-card p-3 z-[1000] max-h-60 overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest text-green-600 mb-2">Filter Species</p>
          <label className="flex items-center gap-2 text-xs text-gray-300 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!speciesFilter}
              onChange={() => onSpeciesFilterChange(null)}
              className="accent-mushroom-gold"
            />
            All Species
          </label>
          {species.map(s => (
            <label key={s.id} className="flex items-center gap-2 text-xs text-gray-400 mb-0.5 cursor-pointer hover:text-gray-200">
              <input
                type="checkbox"
                checked={speciesFilter === s.taxonId}
                onChange={() => onSpeciesFilterChange(speciesFilter === s.taxonId ? null : s.taxonId)}
                className="accent-mushroom-gold"
              />
              <span>{s.emoji}</span>
              <span className="truncate">{s.commonName}</span>
            </label>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-4 glass-card px-3 py-1.5 z-[1000]">
        <span className="text-xs text-gray-400">
          <span className="text-mushroom-gold font-semibold">{points.length.toLocaleString()}</span> observations
        </span>
      </div>
    </div>
  );
}
