import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Fuel, AlertTriangle } from 'lucide-react'
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of your tariff management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Diesel Price */}
        <div className="stat-card stat-card-amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Diesel Price</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(currentPrice?.price_per_liter || stats.currentDieselPrice)}
              </p>
              <div className={`flex items-center gap-1.5 mt-3 ${priceChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${priceChange >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  {priceChange >= 0 ? '↑' : '↓'} {formatPercentage(priceChange)}
                </span>
                <span className="text-gray-400 text-xs">vs last month</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Fuel className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* Active Clients */}
        <div className="stat-card stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeClients}</p>
              <p className="text-sm text-gray-400 mt-3">
                of {stats.totalClients} total clients
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Routes */}
        <div className="stat-card stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Routes</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRoutes}</p>
              <p className="text-sm text-gray-400 mt-3">
                Across all clients
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Documents Expiring */}
        <div className="stat-card stat-card-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Documents Expiring</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.documentsExpiring}</p>
              <p className={`text-sm mt-3 ${stats.documentsExpiring > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                {stats.documentsExpiring > 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Within 30 days
                  </span>
                ) : 'None expiring soon'}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
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
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-primary-50 hover:to-primary-100/50 transition-all duration-200 group border border-gray-100 hover:border-primary-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary-500/20 transition-shadow">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">Update Diesel Price</p>
                <p className="text-sm text-gray-500">Add new monthly price</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-primary-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/clients"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-green-50 hover:to-green-100/50 transition-all duration-200 group border border-gray-100 hover:border-green-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-green-500/20 transition-shadow">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">Manage Clients</p>
                <p className="text-sm text-gray-500">View and edit client profiles</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-green-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/tariff-history"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-purple-50 hover:to-purple-100/50 transition-all duration-200 group border border-gray-100 hover:border-purple-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-shadow">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">View History</p>
                <p className="text-sm text-gray-500">Tariff change history</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-purple-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/rate-sheets"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-amber-50 hover:to-amber-100/50 transition-all duration-200 group border border-gray-100 hover:border-amber-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-shadow">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">Rate Sheets</p>
                <p className="text-sm text-gray-500">Generate and export rate sheets</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto group-hover:text-amber-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
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
          <div className="table-container">
            <table className="w-full" style={{ minWidth: '700px' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header" style={{ minWidth: '140px' }}>Client</th>
                  <th className="table-header" style={{ minWidth: '130px' }}>Route</th>
                  <th className="table-header" style={{ minWidth: '90px' }}>Period</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>Prev Rate</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>New Rate</th>
                  <th className="table-header text-right" style={{ minWidth: '80px' }}>Change</th>
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
