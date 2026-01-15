import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils'
import type { TariffHistory } from '../types'

export default function TariffHistoryPage() {
  const [history, setHistory] = useState<TariffHistory[]>([])
  const [filteredHistory, setFilteredHistory] = useState<TariffHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    filterHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, periodFilter, history])

  async function loadHistory() {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tariff_history')
        .select(`
          *,
          client:clients(client_code, company_name),
          route:routes(route_code, origin, destination)
        `)
        .order('period_month', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      setHistory(data || [])
      setFilteredHistory(data || [])
    } catch (err) {
      console.error('Error loading tariff history:', err)
      setError('Failed to load tariff history')
      setHistory([])
      setFilteredHistory([])
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
  const avgAdjustment = history.length > 0 
    ? history.reduce((sum, h) => sum + (h.adjustment_percentage || 0), 0) / history.length 
    : 0
  const recentAdjustments = history.filter(h => {
    const date = new Date(h.period_month)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return date >= threeMonthsAgo
  }).length

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tariff History</h1>
          <p className="text-gray-500 mt-1">View all rate adjustments and changes</p>
        </div>
        <button className="btn-secondary">
          Export History
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">H</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalAdjustments}</p>
            <p className="text-sm text-gray-500">Total Adjustments</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <span className="text-amber-600 font-bold text-lg">%</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(avgAdjustment)}</p>
            <p className="text-sm text-gray-500">Avg. Adjustment</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-green-600 font-bold text-lg">3M</span>
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
            <input
              type="text"
              placeholder="Search by client or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-4"
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
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="w-full table-responsive">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header" style={{ minWidth: '100px' }}>Period</th>
                <th className="table-header" style={{ minWidth: '150px' }}>Client</th>
                <th className="table-header" style={{ minWidth: '130px' }}>Route</th>
                <th className="table-header text-right" style={{ minWidth: '100px' }}>Prev Rate</th>
                <th className="table-header text-right" style={{ minWidth: '100px' }}>New Rate</th>
                <th className="table-header" style={{ minWidth: '70px' }}>Currency</th>
                <th className="table-header text-right" style={{ minWidth: '90px' }}>Adjustment</th>
                <th className="table-header text-right" style={{ minWidth: '100px' }}>Diesel Price</th>
                <th className="table-header" style={{ minWidth: '100px' }}>Reason</th>
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
                    {formatCurrency(item.previous_rate, item.currency || 'ZAR')}
                  </td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(item.new_rate, item.currency || 'ZAR')}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${item.currency === 'USD' ? 'badge-info' : 'badge-success'}`}>
                      {item.currency === 'USD' ? 'USD' : 'ZAR'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={`badge ${(item.adjustment_percentage || 0) >= 0 ? 'badge-danger' : 'badge-success'}`}>
                      {(item.adjustment_percentage || 0) >= 0 ? '↑' : '↓'} {formatPercentage(item.adjustment_percentage)}
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
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-2xl">H</span>
            </div>
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
                ← Prev
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
