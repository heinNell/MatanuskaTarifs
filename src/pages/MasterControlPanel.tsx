import
    {
        AlertTriangle,
        Calculator,
        Calendar,
        CheckCircle,
        Fuel,
        Info,
        Play,
        RefreshCw,
        Save,
        Settings,
        TrendingDown,
        TrendingUp,
    } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateAdjustedRate, formatCurrency, formatDate, formatPercentage, roundToDecimal } from '../lib/utils'
import type { DieselPrice, RateCalculation } from '../types'

// Demo data
const demoDieselPrices: DieselPrice[] = [
  { id: '1', price_date: '2025-01-01', price_per_liter: 21.50, previous_price: null, percentage_change: null, notes: 'Base price', created_at: '', updated_at: '', created_by: null },
  { id: '2', price_date: '2025-02-01', price_per_liter: 21.85, previous_price: 21.50, percentage_change: 1.63, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '3', price_date: '2025-03-01', price_per_liter: 22.10, previous_price: 21.85, percentage_change: 1.14, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '4', price_date: '2025-04-01', price_per_liter: 21.95, previous_price: 22.10, percentage_change: -0.68, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '5', price_date: '2025-05-01', price_per_liter: 22.30, previous_price: 21.95, percentage_change: 1.59, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '6', price_date: '2025-06-01', price_per_liter: 22.75, previous_price: 22.30, percentage_change: 2.02, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '7', price_date: '2025-07-01', price_per_liter: 23.10, previous_price: 22.75, percentage_change: 1.54, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '8', price_date: '2025-08-01', price_per_liter: 22.90, previous_price: 23.10, percentage_change: -0.87, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '9', price_date: '2025-09-01', price_per_liter: 22.65, previous_price: 22.90, percentage_change: -1.09, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '10', price_date: '2025-10-01', price_per_liter: 22.80, previous_price: 22.65, percentage_change: 0.66, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '11', price_date: '2025-11-01', price_per_liter: 23.15, previous_price: 22.80, percentage_change: 1.54, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '12', price_date: '2025-12-01', price_per_liter: 23.45, previous_price: 23.15, percentage_change: 1.30, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '13', price_date: '2026-01-01', price_per_liter: 23.75, previous_price: 23.45, percentage_change: 1.28, notes: 'Current price', created_at: '', updated_at: '', created_by: null },
]

const demoSettings: Record<string, string> = {
  base_diesel_price: '21.50',
  diesel_impact_percentage: '35',
  auto_adjust_threshold: '2.5',
  max_monthly_increase: '10',
  rounding_precision: '2',
  effective_day_of_month: '1',
}

const demoRateCalculations: RateCalculation[] = [
  { clientRouteId: '1', clientName: 'ABC Manufacturing', routeCode: 'JHB-CPT', currentRate: 4950, baseRate: 4500, proposedRate: 5071.50, adjustmentPercentage: 2.45, dieselImpact: 0.85 },
  { clientRouteId: '2', clientName: 'ABC Manufacturing', routeCode: 'JHB-DBN', currentRate: 2420, baseRate: 2200, proposedRate: 2479.40, adjustmentPercentage: 2.45, dieselImpact: 0.85 },
  { clientRouteId: '3', clientName: 'Cape Foods', routeCode: 'JHB-CPT', currentRate: 4950, baseRate: 4500, proposedRate: 5071.50, adjustmentPercentage: 2.45, dieselImpact: 0.85 },
  { clientRouteId: '4', clientName: 'Cape Foods', routeCode: 'CPT-PE', currentRate: 3080, baseRate: 2800, proposedRate: 3155.60, adjustmentPercentage: 2.45, dieselImpact: 0.85 },
  { clientRouteId: '5', clientName: 'Durban Chemical', routeCode: 'JHB-DBN', currentRate: 2640, baseRate: 2400, proposedRate: 2704.80, adjustmentPercentage: 2.45, dieselImpact: 0.85 },
]

export default function MasterControlPanel() {
  const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>(demoDieselPrices)
  const [settings, setSettings] = useState<Record<string, string>>(demoSettings)
  const [rateCalculations, setRateCalculations] = useState<RateCalculation[]>(demoRateCalculations)
  const [_loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [newPriceDate, setNewPriceDate] = useState('')
  const [newPriceValue, setNewPriceValue] = useState('')
  const [newPriceNotes, setNewPriceNotes] = useState('')
  const [applyingRates, setApplyingRates] = useState(false)
  const [selectedCalculations, setSelectedCalculations] = useState<string[]>([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    try {
      const { data: prices } = await supabase
        .from('diesel_prices')
        .select('*')
        .order('price_date', { ascending: true })

      if (prices && prices.length > 0) {
        setDieselPrices(prices)
      }

      const { data: settingsData } = await supabase
        .from('master_control_settings')
        .select('*')

      if (settingsData) {
        const settingsMap: Record<string, string> = {}
        settingsData.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value
        })
        setSettings(prev => ({ ...prev, ...settingsMap }))
      }

      // Load client routes for rate calculations
      await calculateProposedRates()
    } catch (error) {
      console.log('Using demo data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function calculateProposedRates() {
    const currentPrice = dieselPrices[dieselPrices.length - 1]
    const basePrice = parseFloat(settings.base_diesel_price)
    const impactPercent = parseFloat(settings.diesel_impact_percentage)
    
    if (!currentPrice) return

    const dieselChangePercent = ((currentPrice.price_per_liter - basePrice) / basePrice) * 100
    
    // Update demo calculations with actual values
    const updated = demoRateCalculations.map(calc => {
      const proposedRate = calculateAdjustedRate(calc.baseRate, dieselChangePercent, impactPercent)
      const adjustmentPercentage = ((proposedRate - calc.currentRate) / calc.currentRate) * 100
      return {
        ...calc,
        proposedRate: roundToDecimal(proposedRate, 2),
        adjustmentPercentage: roundToDecimal(adjustmentPercentage, 2),
        dieselImpact: roundToDecimal(dieselChangePercent * (impactPercent / 100), 2),
      }
    })
    setRateCalculations(updated)
  }

  async function handleAddDieselPrice(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase.from('diesel_prices').insert({
        price_date: newPriceDate,
        price_per_liter: parseFloat(newPriceValue),
        notes: newPriceNotes || null,
      })

      if (error) throw error

      // Refresh data
      await loadData()
      setShowAddPrice(false)
      setNewPriceDate('')
      setNewPriceValue('')
      setNewPriceNotes('')
    } catch (error) {
      console.error('Error adding diesel price:', error)
      // For demo, add to local state
      const newPrice: DieselPrice = {
        id: Date.now().toString(),
        price_date: newPriceDate,
        price_per_liter: parseFloat(newPriceValue),
        previous_price: dieselPrices[dieselPrices.length - 1]?.price_per_liter || null,
        percentage_change: dieselPrices.length > 0 
          ? ((parseFloat(newPriceValue) - dieselPrices[dieselPrices.length - 1].price_per_liter) / dieselPrices[dieselPrices.length - 1].price_per_liter) * 100
          : null,
        notes: newPriceNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }
      setDieselPrices([...dieselPrices, newPrice])
      setShowAddPrice(false)
      setNewPriceDate('')
      setNewPriceValue('')
      setNewPriceNotes('')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('master_control_settings')
          .update({ setting_value: value })
          .eq('setting_key', key)
      }
      await calculateProposedRates()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleApplySelectedRates() {
    if (selectedCalculations.length === 0) return
    setApplyingRates(true)
    
    try {
      // In real implementation, this would update client_routes and create tariff_history records
      const currentPrice = dieselPrices[dieselPrices.length - 1]
      
      for (const calcId of selectedCalculations) {
        const calc = rateCalculations.find(c => c.clientRouteId === calcId)
        if (!calc) continue

        // Record in tariff_history
        await supabase.from('tariff_history').insert({
          client_route_id: calc.clientRouteId,
          period_month: new Date().toISOString().slice(0, 10),
          previous_rate: calc.currentRate,
          new_rate: calc.proposedRate,
          diesel_price_at_change: currentPrice?.price_per_liter,
          diesel_percentage_change: currentPrice?.percentage_change,
          adjustment_percentage: calc.adjustmentPercentage,
          adjustment_reason: 'Monthly diesel price adjustment',
        })

        // Update client_routes
        await supabase
          .from('client_routes')
          .update({ current_rate: calc.proposedRate })
          .eq('id', calc.clientRouteId)
      }

      // Refresh calculations
      await calculateProposedRates()
      setSelectedCalculations([])
    } catch (error) {
      console.error('Error applying rates:', error)
    } finally {
      setApplyingRates(false)
    }
  }

  const currentPrice = dieselPrices[dieselPrices.length - 1]
  const basePrice = parseFloat(settings.base_diesel_price)
  const totalDieselChange = currentPrice 
    ? roundToDecimal(((currentPrice.price_per_liter - basePrice) / basePrice) * 100, 2)
    : 0

  const chartData = dieselPrices.slice(-12).map(dp => ({
    date: formatDate(dp.price_date, 'MMM yy'),
    price: dp.price_per_liter,
    change: dp.percentage_change || 0,
  }))

  const toggleCalculation = (id: string) => {
    setSelectedCalculations(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAllCalculations = () => {
    if (selectedCalculations.length === rateCalculations.length) {
      setSelectedCalculations([])
    } else {
      setSelectedCalculations(rateCalculations.map(c => c.clientRouteId))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Control Panel</h1>
          <p className="text-gray-500 mt-1">Manage diesel prices and tariff calculations</p>
        </div>
        <button
          onClick={() => setShowAddPrice(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Fuel className="w-4 h-4" />
          Add New Price
        </button>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Price</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(currentPrice?.price_per_liter || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Base Price</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(basePrice)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totalDieselChange >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {totalDieselChange >= 0 ? (
                <TrendingUp className={`w-5 h-5 ${totalDieselChange >= 0 ? 'text-red-600' : 'text-green-600'}`} />
              ) : (
                <TrendingDown className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Change</p>
              <p className={`text-xl font-bold ${totalDieselChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercentage(totalDieselChange)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Diesel Impact</p>
              <p className="text-xl font-bold text-gray-900">
                {settings.diesel_impact_percentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Chart */}
        <div className="lg:col-span-2 card">
          <h2 className="card-header">Diesel Price History</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `R${value}`}
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'price' ? formatCurrency(value) : formatPercentage(value),
                    name === 'price' ? 'Price/L' : 'Change'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="card">
          <h2 className="card-header flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Calculation Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Diesel Price (R/L)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.base_diesel_price}
                onChange={(e) => setSettings({ ...settings, base_diesel_price: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diesel Impact on Tariff (%)
              </label>
              <input
                type="number"
                step="1"
                value={settings.diesel_impact_percentage}
                onChange={(e) => setSettings({ ...settings, diesel_impact_percentage: e.target.value })}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                How much diesel price affects final tariff
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto-Adjust Threshold (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.auto_adjust_threshold}
                onChange={(e) => setSettings({ ...settings, auto_adjust_threshold: e.target.value })}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum change to trigger adjustment
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Monthly Increase (%)
              </label>
              <input
                type="number"
                step="1"
                value={settings.max_monthly_increase}
                onChange={(e) => setSettings({ ...settings, max_monthly_increase: e.target.value })}
                className="input-field"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Rate Calculations Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Proposed Rate Adjustments</h2>
            <p className="text-sm text-gray-500">
              Based on {formatPercentage(totalDieselChange)} diesel price change from base
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => calculateProposedRates()}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recalculate
            </button>
            <button
              onClick={handleApplySelectedRates}
              disabled={selectedCalculations.length === 0 || applyingRates}
              className="btn-success flex items-center gap-2"
            >
              {applyingRates ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Apply Selected ({selectedCalculations.length})
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Rate Calculation Formula:</strong> New Rate = Base Rate × (1 + Diesel Change % × Impact %)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              With {settings.diesel_impact_percentage}% diesel impact, a {formatPercentage(totalDieselChange)} diesel change results in 
              a {formatPercentage(totalDieselChange * (parseFloat(settings.diesel_impact_percentage) / 100))} tariff adjustment.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">
                  <input
                    type="checkbox"
                    checked={selectedCalculations.length === rateCalculations.length}
                    onChange={selectAllCalculations}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="table-header">Client</th>
                <th className="table-header">Route</th>
                <th className="table-header text-right">Base Rate</th>
                <th className="table-header text-right">Current Rate</th>
                <th className="table-header text-right">Proposed Rate</th>
                <th className="table-header text-right">Adjustment</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rateCalculations.map((calc) => (
                <tr
                  key={calc.clientRouteId}
                  className={`hover:bg-gray-50 ${selectedCalculations.includes(calc.clientRouteId) ? 'bg-blue-50' : ''}`}
                >
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      checked={selectedCalculations.includes(calc.clientRouteId)}
                      onChange={() => toggleCalculation(calc.clientRouteId)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="table-cell font-medium">{calc.clientName}</td>
                  <td className="table-cell">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {calc.routeCode}
                    </span>
                  </td>
                  <td className="table-cell text-right text-gray-500">{formatCurrency(calc.baseRate)}</td>
                  <td className="table-cell text-right">{formatCurrency(calc.currentRate)}</td>
                  <td className="table-cell text-right font-semibold text-primary-600">
                    {formatCurrency(calc.proposedRate)}
                  </td>
                  <td className="table-cell text-right">
                    <span className={`badge ${calc.adjustmentPercentage >= 0 ? 'badge-danger' : 'badge-success'}`}>
                      {formatPercentage(calc.adjustmentPercentage)}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    {calc.adjustmentPercentage > parseFloat(settings.max_monthly_increase) ? (
                      <span className="badge badge-warning flex items-center gap-1 justify-center">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds Max
                      </span>
                    ) : (
                      <span className="badge badge-success flex items-center gap-1 justify-center">
                        <CheckCircle className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price History Table */}
      <div className="card">
        <h2 className="card-header">Recent Price History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Date</th>
                <th className="table-header text-right">Price/L</th>
                <th className="table-header text-right">Previous</th>
                <th className="table-header text-right">Change</th>
                <th className="table-header">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dieselPrices.slice().reverse().slice(0, 12).map((price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(price.price_date, 'dd MMM yyyy')}
                    </div>
                  </td>
                  <td className="table-cell text-right font-medium">{formatCurrency(price.price_per_liter)}</td>
                  <td className="table-cell text-right text-gray-500">
                    {price.previous_price ? formatCurrency(price.previous_price) : '-'}
                  </td>
                  <td className="table-cell text-right">
                    {price.percentage_change !== null ? (
                      <span className={`badge ${price.percentage_change >= 0 ? 'badge-danger' : 'badge-success'}`}>
                        {formatPercentage(price.percentage_change)}
                      </span>
                    ) : (
                      <span className="badge badge-info">Base</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-500">{price.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Price Modal */}
      {showAddPrice && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Diesel Price</h3>
              <p className="text-sm text-gray-500 mt-1">Enter the new monthly diesel price</p>
            </div>
            <form onSubmit={handleAddDieselPrice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Date
                </label>
                <input
                  type="date"
                  value={newPriceDate}
                  onChange={(e) => setNewPriceDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Liter (R)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPriceValue}
                  onChange={(e) => setNewPriceValue(e.target.value)}
                  className="input-field"
                  placeholder="23.75"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newPriceNotes}
                  onChange={(e) => setNewPriceNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="Any relevant notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPrice(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
