import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type PriceEntry = {
  competitor: string;
  price: number;
};

type RouteRow = {
  id: string;
  origin: string;
  destination: string;
  prices: PriceEntry[];
};

const CompetitorPricing: React.FC = () => {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState<{ [routeId: string]: { name: string; price: string } }>({});
  const [sandboxPrices, setSandboxPrices] = useState<{ [routeId: string]: { competitor: string; price: number }[] }>({});
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutesAndPrices();
  }, []);

  async function fetchRoutesAndPrices() {
    setLoading(true);
    setError(null);
    try {
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('id, origin, destination');
      if (routesError) throw routesError;

      const { data: pricesData, error: pricesError } = await supabase
        .from('competitor_prices')
        .select('route_id, competitor, price');
      if (pricesError) throw pricesError;

      const mapped: RouteRow[] = (routesData || []).map((r: any) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        prices: [],
      }));

      const map: Record<string, PriceEntry[]> = {};
      (pricesData || []).forEach((p: any) => {
        if (!map[p.route_id]) map[p.route_id] = [];
        map[p.route_id].push({ competitor: p.competitor, price: p.price });
      });
      mapped.forEach((r) => {
        r.prices = map[r.id] || [];
      });

      const comps = Array.from(new Set((pricesData || []).map((p: any) => p.competitor)));
      setCompetitors(comps);
      setRoutes(mapped);
      // Initialize sandbox data from existing prices
      const initialSandbox: { [routeId: string]: { competitor: string; price: number }[] } = {};
      mapped.forEach((rr) => {
        const arr = map[rr.id] || [];
        initialSandbox[rr.id] = arr.map((a) => ({ competitor: a.competitor, price: a.price }));
      });
      // Merge with any persisted sandbox data
      const persisted = localStorage.getItem('competitor_pricing_sandbox');
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          Object.assign(initialSandbox, parsed);
        } catch {
          // ignore parsing errors
        }
      }
      setSandboxPrices(initialSandbox);
      // Initialize route picker to display all routes by default
      setSelectedRoutes(mapped.map((rr) => rr.id));
    } catch (e: any) {
      setError(e?.message ?? 'Error loading data');
    } finally {
      setLoading(false);
    }
  }

  async function addCompetitorForRoute(routeId: string) {
    const entry = newCompetitor[routeId];
    if (!entry || !entry.name || entry.name.trim() === '') {
      setError('Please enter a competitor name');
      return;
    }
    const price = Number(entry.price);
    if (Number.isNaN(price)) {
      setError('Please enter a valid price for the new competitor');
      return;
    }
    const route = routes.find((rr) => rr.id === routeId);
    if (route && route.prices.find((p) => p.competitor === entry.name)) {
      setError('Competitor already exists for this route');
      return;
    }
    // Update sandbox prices for the route to keep it independent
    setSandboxPrices((prev) => {
      const existing = prev[routeId] ? [...prev[routeId]] : [];
      existing.push({ competitor: entry.name, price });
      return { ...prev, [routeId]: existing };
    });
    setNewCompetitor((prev) => {
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
    setError(null);
  }

  function updatePrice(routeId: string, competitor: string, price: number) {
    // Update sandbox prices for isolation from main sheets
    setSandboxPrices((prev) => {
      const current = prev[routeId] ? [...prev[routeId]] : [];
      const idx = current.findIndex((p) => p.competitor === competitor);
      if (idx >= 0) {
        current[idx] = { competitor, price };
      } else {
        current.push({ competitor, price });
      }
      return { ...prev, [routeId]: current };
    });
  }

  async function saveAll() {
    setLoading(true);
    setError(null);
    try {
      // Persist sandbox data locally for independence from other sheets
      localStorage.setItem('competitor_pricing_sandbox', JSON.stringify(sandboxPrices));
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  function renderCompetitorRow(r: RouteRow) {
    return (
      <div key={r.id} className="border rounded p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{r.origin} → {r.destination}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(() => {
            const pricesForRoute = sandboxPrices[r.id] && sandboxPrices[r.id].length > 0
              ? sandboxPrices[r.id]
              : r.prices;
            return pricesForRoute.map((p) => (
              <div key={p.competitor} className="flex items-center space-x-2">
                <span className="truncate w-28">{p.competitor}</span>
                <input
                  className="border rounded px-2 py-1 w-20"
                  type="number"
                  value={p.price}
                  onChange={(e) => updatePrice(r.id, p.competitor, Number(e.target.value))}
                />
              </div>
            ));
          })()}
          {competitors.filter((c) => !(sandboxPrices[r.id] ?? r.prices).some((pp) => pp.competitor === c)).map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <span className="truncate w-28">{c}</span>
              <input
                className="border rounded px-2 py-1 w-20"
                type="number"
                value={0}
                onChange={(e) => updatePrice(r.id, c, Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        {/* Per-route per-competitor addition UI */}
        <div className="mt-3 flex items-center space-x-2">
          <input
            value={newCompetitor[r.id]?.name ?? ''}
            onChange={(e) => {
              const name = e.target.value;
              setNewCompetitor((prev) => ({
                ...prev,
                [r.id]: { ...(prev[r.id] || { name: '', price: '' }), name },
              }));
            }}
            placeholder="New competitor"
            className="border rounded px-2 py-1 w-40"
          />
          <input
            value={newCompetitor[r.id]?.price ?? ''}
            onChange={(e) => {
              const price = e.target.value;
              setNewCompetitor((prev) => ({
                ...prev,
                [r.id]: { ...(prev[r.id] || { name: '' }), price },
              }));
            }}
            placeholder="Price"
            className="border rounded px-2 py-1 w-20"
          />
          <button
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={() => addCompetitorForRoute(r.id)}
          >
            Add Competitor
          </button>
        </div>
      </div>
    );
  }

  // Route picker: allow selecting which routes to display in the comparison
  function toggleRoute(id: string) {
    setSelectedRoutes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Helper to determine which routes to display on this page
  const routesToDisplay = routes.filter((r) => selectedRoutes.length === 0 || selectedRoutes.includes(r.id));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Competitor Pricing Manager</h1>
      {error && <div className="bg-red-100 text-red-800 p-2 rounded mb-4">{error}</div>}
      {/* Route picker UI for independent comparison scope */}
      {routes.length > 0 && (
        <div className="mb-4 border rounded p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Show routes:</span>
          {routes.map((r) => (
            <label key={r.id} className="flex items-center space-x-2 text-sm">
              <input type="checkbox" checked={selectedRoutes.includes(r.id)} onChange={() => toggleRoute(r.id)} />
              <span>{r.origin} → {r.destination}</span>
            </label>
          ))}
        </div>
      )}
      <button
        onClick={fetchRoutesAndPrices}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Reload Routes & Prices'}
      </button>

      {routesToDisplay.map((r) => renderCompetitorRow(r))}
      <button onClick={saveAll} className="px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>
        {loading ? 'Saving...' : 'Save All Prices'}
      </button>
    </div>
  );
};

export default CompetitorPricing;
