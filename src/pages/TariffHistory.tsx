import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    History,
    Search,
    TrendingDown,
    TrendingUp
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils'
import type { TariffHistory } from '../types'

// Demo history data
const demoHistory: TariffHistory[] = [
  { id: '1', client_route_id: '1', client_id: '1', route_id: '1', period_month: '2026-01-01', previous_rate: 4725, new_rate: 4950, diesel_price_at_change: 23.75, diesel_percentage_change: 1.28, adjustment_percentage: 4.76, adjustment_reason: 'Monthly diesel adjustment', approved_by: null, approved_at: null, created_at: '2026-01-01', client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' }, route: { route_code: 'JHB-CPT', origin: 'Johannesburg', destination: 'Cape Town' } },
  { id: '2', client_route_id: '2', client_id: '1', route_id: '2', period_month: '2026-01-01', previous_rate: 2310, new_rate: 2420, diesel_price_at_change: 23.75, diesel_percentage_change: 1.28, adjustment_percentage: 4.76, adjustment_reason: 'Monthly diesel adjustment', approved_by: null, approved_at: null, created_at: '2026-01-01', client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' }, route: { route_code: 'JHB-DBN', origin: 'Johannesburg', destination: 'Durban' } },
  { id: '3', client_route_id: '3', client_id: '2', route_id: '1', period_month: '2026-01-01', previous_rate: 4725, new_rate: 4950, diesel_price_at_change: 23.75, diesel_percentage_change: 1.28, adjustment_percentage: 4.76, adjustment_reason: 'Monthly diesel adjustment', approved_by: null, approved_at: null, created_at: '2026-01-01', client: { client_code: 'CLI002', company_name: 'Cape Foods International' }, route: { route_code: 'JHB-CPT', origin: 'Johannesburg', destination: 'Cape Town' } },
  { id: '4', client_route_id: '4', client_id: '2', route_id: '5', period_month: '2026-01-01', previous_rate: 2940, new_rate: 3080, diesel_price_at_change: 23.75, diesel_percentage_change: 1.28, adjustment_percentage: 4.76, adjustment_reason: 'Monthly diesel adjustment', approved_by: null, approved_at: null, created_at: '2026-01-01', client: { client_code: 'CLI002', company_name: 'Cape Foods International' }, route: { route_code: 'CPT-PE', origin: 'Cape Town', destination: 'Port Elizabeth' } },
  { id: '5', client_route_id: '5', client_id: '3', route_id: '2', period_month: '2026-01-01', previous_rate: 2520, new_rate: 2640, diesel_price_at_change: 23.75, diesel_percentage_change: 1.28, adjustment_percentage: 4.76, adjustment_reason: 'Monthly diesel adjustment', approved_by: null, approved_at: null, created_at: '2026-01-01', client: { client_code: 'CLI003', company_name: 'Durban Chemical Supplies' }, route: { route_code: 'JHB-DBN', origin: 'Johannesburg', destination: 'Durban' } },
  { id: '6', client_route_id: '1', client_id: '1', route_id: '1', period_month: '2025-10-01', previous_rate: 4600, new_rate: 4725, diesel_price_at_change: 22.80, diesel_percentage_change: 0.66, adjustment_percentage: 2.72, adjustment_reason: 'Quarterly review', approved_by: null, approved_at: null, created_at: '2025-10-01', client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' }, route: { route_code: 'JHB-CPT', origin: 'Johannesburg', destination: 'Cape Town' } },
  { id: '7', client_route_id: '2', client_id: '1', route_id: '2', period_month: '2025-10-01', previous_rate: 2250, new_rate: 2310, diesel_price_at_change: 22.80, diesel_percentage_change: 0.66, adjustment_percentage: 2.67, adjustment_reason: 'Quarterly review', approved_by: null, approved_at: null, created_at: '2025-10-01', client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' }, route: { route_code: 'JHB-DBN', origin: 'Johannesburg', destination: 'Durban' } },
  { id: '8', client_route_id: '3', client_id: '2', route_id: '1', period_month: '2025-07-01', previous_rate: 4500, new_rate: 4600, diesel_price_at_change: 23.10, diesel_percentage_change: 1.54, adjustment_percentage: 2.22, adjustment_reason: 'Mid-year adjustment', approved_by: null, approved_at: null, created_at: '2025-07-01', client: { client_code: 'CLI002', company_name: 'Cape Foods International' }, route: { route_code: 'JHB-CPT', origin: 'Johannesburg', destination: 'Cape Town' } },
]

export default function TariffHistoryPage() {
  const [history, setHistory] = useState<TariffHistory[]>(demoHistory)
  const [filteredHistory, setFilteredHistory] = useState(demoHistory)
  const [_loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    filterHistory()
  }, [searchTerm, periodFilter, history])

  async function loadHistory() {
    try {
      const { data } = await supabase
        .from('tariff_history')
        .select(`
          *,
          client:clients(client_code, company_name),
          route:routes(route_code, origin, destination)
        `)
        .order('period_month', { ascending: false })
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setHistory(data)
        setFilteredHistory(data)
      }
    } catch (error) {
      console.log('Using demo data:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterHistory() {
    let filtered = history

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        h =>
          h.client?.company_name?.toLowerCase().includes(term) ||
          h.client?.client_code?.toLowerCase().includes(term) ||
          h.route?.route_code?.toLowerCase().includes(term)
      )
    }

    if (periodFilter) {
      filtered = filtered.filter(h => h.period_month.startsWith(periodFilter))
    }

    setFilteredHistory(filtered)
    setCurrentPage(1)
  }

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get unique periods for filter
  const periods = [...new Set(history.map(h => h.period_month.slice(0, 7)))].sort().reverse()

  // Stats
  const totalAdjustments = history.length
  const avgAdjustment = history.reduce((sum, h) => sum + (h.adjustment_percentage || 0), 0) / history.length
  const recentAdjustments = history.filter(h => {
    const date = new Date(h.period_month)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return date >= threeMonthsAgo
  }).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariff History</h1>
          <p className="text-gray-500 mt-1">View all rate adjustments and changes</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export History
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <History className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalAdjustments}</p>
            <p className="text-sm text-gray-500">Total Adjustments</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(avgAdjustment)}</p>
            <p className="text-sm text-gray-500">Avg. Adjustment</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{recentAdjustments}</p>
            <p className="text-sm text-gray-500">Last 3 Months</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="select-field"
            >
              <option value="">All Periods</option>
              {periods.map(period => (
                <option key={period} value={period}>
                  {formatDate(`${period}-01`, 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Period</th>
                <th className="table-header">Client</th>
                <th className="table-header">Route</th>
                <th className="table-header text-right">Previous Rate</th>
                <th className="table-header text-right">New Rate</th>
                <th className="table-header text-right">Adjustment</th>
                <th className="table-header text-right">Diesel Price</th>
                <th className="table-header">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(item.period_month, 'MMM yyyy')}
                    </div>
                  </td>
                  <td className="table-cell">
                    <Link
                      to={`/clients/${item.client_id}`}
                      className="hover:text-primary-600"
                    >
                      <p className="font-medium">{item.client?.company_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{item.client?.client_code}</p>
                    </Link>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {item.route?.route_code || 'N/A'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.route?.origin} → {item.route?.destination}
                    </p>
                  </td>
                  <td className="table-cell text-right text-gray-500">
                    {formatCurrency(item.previous_rate)}
                  </td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(item.new_rate)}
                  </td>
                  <td className="table-cell text-right">
                    <span className={`badge flex items-center gap-1 justify-end ${(item.adjustment_percentage || 0) >= 0 ? 'badge-danger' : 'badge-success'}`}>
                      {(item.adjustment_percentage || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {formatPercentage(item.adjustment_percentage)}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    {item.diesel_price_at_change ? (
                      <div>
                        <p className="font-medium">{formatCurrency(item.diesel_price_at_change)}</p>
                        {item.diesel_percentage_change && (
                          <p className={`text-xs ${item.diesel_percentage_change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatPercentage(item.diesel_percentage_change)}
                          </p>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="table-cell text-gray-500 text-sm max-w-xs truncate">
                    {item.adjustment_reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No history records found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredHistory.length)} of{' '}
              {filteredHistory.length} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
