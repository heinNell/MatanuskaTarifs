import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils'
import type { DieselPrice, TariffHistory } from '../types'

interface DashboardStats {
  totalClients: number
  activeClients: number
  totalRoutes: number
  currentDieselPrice: number
  dieselPriceChange: number
  pendingAdjustments: number
  documentsExpiring: number
}

const initialStats: DashboardStats = {
  totalClients: 0,
  activeClients: 0,
  totalRoutes: 0,
  currentDieselPrice: 0,
  dieselPriceChange: 0,
  pendingAdjustments: 0,
  documentsExpiring: 0,
}

export default function Dashboard() {
  const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>([])
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [recentHistory, setRecentHistory] = useState<TariffHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    setError(null)
    
    try {
      // Load diesel prices
      const { data: prices, error: pricesError } = await supabase
        .from('diesel_prices')
        .select('*')
        .order('price_date', { ascending: true })
        .limit(12)

      if (pricesError) throw pricesError
      setDieselPrices(prices || [])

      // Get latest diesel price for stats
      const latestPrice = prices && prices.length > 0 ? prices[prices.length - 1] : null
      
      // Load client counts
      const { count: activeClientCount, error: clientError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (clientError) throw clientError

      const { count: totalClientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Load route counts
      const { count: routeCount, error: routeError } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (routeError) throw routeError

      // Load expiring documents count (within 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const { count: expiringDocsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_current', true)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])

      setStats({
        activeClients: activeClientCount || 0,
        totalClients: totalClientCount || 0,
        totalRoutes: routeCount || 0,
        currentDieselPrice: latestPrice?.price_per_liter || 0,
        dieselPriceChange: latestPrice?.percentage_change || 0,
        pendingAdjustments: 0,
        documentsExpiring: expiringDocsCount || 0,
      })

      // Load recent tariff history
      const { data: history, error: historyError } = await supabase
        .from('tariff_history')
        .select(`
          *,
          client:clients(client_code, company_name),
          route:routes(route_code, origin, destination)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (historyError) throw historyError
      setRecentHistory(history || [])
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const chartData = dieselPrices.map(dp => ({
    date: formatDate(dp.price_date, 'MMM yy'),
    price: dp.price_per_liter,
  }))

  const currentPrice = dieselPrices[dieselPrices.length - 1]
  const priceChange = currentPrice?.percentage_change || stats.dieselPriceChange

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-500 font-bold">!</span>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded text-red-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your tariff management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Diesel Price */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Diesel Price</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(currentPrice?.price_per_liter || stats.currentDieselPrice)}
              </p>
              <div className={`flex items-center gap-1 mt-2 ${priceChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span className="text-sm font-medium">
                  {priceChange >= 0 ? '↑' : '↓'} {formatPercentage(priceChange)}
                </span>
                <span className="text-gray-500 text-sm">vs last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-bold text-lg">D</span>
            </div>
          </div>
        </div>

        {/* Active Clients */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeClients}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.totalClients} total clients
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">C</span>
            </div>
          </div>
        </div>

        {/* Active Routes */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Routes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRoutes}</p>
              <p className="text-sm text-gray-500 mt-2">
                Across all clients
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-lg">R</span>
            </div>
          </div>
        </div>

        {/* Documents Expiring */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Documents Expiring</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.documentsExpiring}</p>
              <p className="text-sm text-amber-600 mt-2">
                {stats.documentsExpiring > 0 ? 'Within 30 days' : 'None expiring soon'}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-bold text-lg">!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diesel Price Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Diesel Price Trend</h2>
              <p className="text-sm text-gray-500">Last 12 months price history</p>
            </div>
            <Link
              to="/master-control"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View details →
            </Link>
          </div>
          {dieselPrices.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `R${value}`}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [`R ${value.toFixed(2)}`, 'Price per liter']}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>No diesel price data available</p>
                <Link to="/master-control" className="text-primary-600 text-sm mt-2 block">
                  Add diesel prices in Master Control
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/master-control"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 font-bold">D</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Update Diesel Price</p>
                <p className="text-sm text-gray-500">Add new monthly price</p>
              </div>
            </Link>

            <Link
              to="/clients"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">C</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Clients</p>
                <p className="text-sm text-gray-500">View and edit client profiles</p>
              </div>
            </Link>

            <Link
              to="/tariff-history"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">H</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">View History</p>
                <p className="text-sm text-gray-500">Tariff change history</p>
              </div>
            </Link>

            <Link
              to="/documents"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 font-bold">F</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Documents</p>
                <p className="text-sm text-gray-500">{stats.documentsExpiring > 0 ? `${stats.documentsExpiring} expiring soon` : 'Manage files'}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Tariff Changes</h2>
            <p className="text-sm text-gray-500">Latest rate adjustments across all clients</p>
          </div>
          <Link
            to="/tariff-history"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            View all →
          </Link>
        </div>

        {recentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Client</th>
                  <th className="table-header">Route</th>
                  <th className="table-header">Period</th>
                  <th className="table-header text-right">Previous Rate</th>
                  <th className="table-header text-right">New Rate</th>
                  <th className="table-header text-right">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium">{(item.client as { company_name?: string })?.company_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{(item.client as { client_code?: string })?.client_code}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium">{(item.route as { route_code?: string })?.route_code || 'N/A'}</p>
                      <p className="text-xs text-gray-500">
                        {(item.route as { origin?: string })?.origin} → {(item.route as { destination?: string })?.destination}
                      </p>
                    </td>
                    <td className="table-cell">{formatDate(item.period_month, 'MMM yyyy')}</td>
                    <td className="table-cell text-right">{formatCurrency(item.previous_rate)}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(item.new_rate)}</td>
                    <td className="table-cell text-right">
                      <span className={`badge ${item.adjustment_percentage && item.adjustment_percentage >= 0 ? 'badge-danger' : 'badge-success'}`}>
                        {item.adjustment_percentage && item.adjustment_percentage >= 0 ? '↑' : '↓'} {formatPercentage(item.adjustment_percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-2xl">H</span>
            </div>
            <p className="text-gray-500">No recent tariff changes</p>
            <p className="text-sm text-gray-400 mt-1">Changes will appear here as they are made</p>
          </div>
        )}
      </div>
    </div>
  )
}
