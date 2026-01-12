import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    DollarSign,
    FileWarning,
    Fuel,
    Route,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils'
import type { DieselPrice, TariffHistory } from '../types'

// Demo data for development
const demoDieselPrices: DieselPrice[] = [
  { id: '1', price_date: '2025-07-01', price_per_liter: 23.10, previous_price: 22.75, percentage_change: 1.54, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '2', price_date: '2025-08-01', price_per_liter: 22.90, previous_price: 23.10, percentage_change: -0.87, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '3', price_date: '2025-09-01', price_per_liter: 22.65, previous_price: 22.90, percentage_change: -1.09, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '4', price_date: '2025-10-01', price_per_liter: 22.80, previous_price: 22.65, percentage_change: 0.66, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '5', price_date: '2025-11-01', price_per_liter: 23.15, previous_price: 22.80, percentage_change: 1.54, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '6', price_date: '2025-12-01', price_per_liter: 23.45, previous_price: 23.15, percentage_change: 1.30, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '7', price_date: '2026-01-01', price_per_liter: 23.75, previous_price: 23.45, percentage_change: 1.28, notes: null, created_at: '', updated_at: '', created_by: null },
]

const demoStats = {
  totalClients: 8,
  activeClients: 8,
  totalRoutes: 10,
  currentDieselPrice: 23.75,
  dieselPriceChange: 1.28,
  pendingAdjustments: 3,
  documentsExpiring: 2,
}

export default function Dashboard() {
  const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>(demoDieselPrices)
  const [stats, setStats] = useState(demoStats)
  const [recentHistory, setRecentHistory] = useState<TariffHistory[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // Try to load from Supabase, fall back to demo data
      const { data: prices } = await supabase
        .from('diesel_prices')
        .select('*')
        .order('price_date', { ascending: true })
        .limit(12)

      if (prices && prices.length > 0) {
        setDieselPrices(prices)
      }

      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      const { count: routeCount } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (clientCount !== null || routeCount !== null) {
        setStats(prev => ({
          ...prev,
          activeClients: clientCount || prev.activeClients,
          totalClients: clientCount || prev.totalClients,
          totalRoutes: routeCount || prev.totalRoutes,
        }))
      }

      const { data: history } = await supabase
        .from('tariff_history')
        .select(`
          *,
          client:clients(client_code, company_name),
          route:routes(route_code, origin, destination)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (history) {
        setRecentHistory(history)
      }
    } catch (error) {
      console.log('Using demo data:', error)
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

  return (
    <div className="space-y-6 animate-fade-in">
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
                {priceChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{formatPercentage(priceChange)}</span>
                <span className="text-gray-500 text-sm">vs last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Fuel className="w-6 h-6 text-amber-600" />
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
              <Users className="w-6 h-6 text-blue-600" />
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
              <Route className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending Adjustments */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Adjustments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingAdjustments}</p>
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Requires review
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
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
              View details
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
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
                <Fuel className="w-5 h-5 text-primary-600" />
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
                <Users className="w-5 h-5 text-green-600" />
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
                <Calendar className="w-5 h-5 text-purple-600" />
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
                <FileWarning className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Documents</p>
                <p className="text-sm text-gray-500">{stats.documentsExpiring} expiring soon</p>
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
            View all
            <ArrowRight className="w-4 h-4" />
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
                      <p className="font-medium">{(item.client as any)?.company_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{(item.client as any)?.client_code}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium">{(item.route as any)?.route_code || 'N/A'}</p>
                      <p className="text-xs text-gray-500">
                        {(item.route as any)?.origin} → {(item.route as any)?.destination}
                      </p>
                    </td>
                    <td className="table-cell">{formatDate(item.period_month, 'MMM yyyy')}</td>
                    <td className="table-cell text-right">{formatCurrency(item.previous_rate)}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(item.new_rate)}</td>
                    <td className="table-cell text-right">
                      <span className={`badge ${item.adjustment_percentage && item.adjustment_percentage >= 0 ? 'badge-danger' : 'badge-success'}`}>
                        {formatPercentage(item.adjustment_percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent tariff changes</p>
            <p className="text-sm text-gray-400 mt-1">Changes will appear here as they are made</p>
          </div>
        )}
      </div>
    </div>
  )
}
