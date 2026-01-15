import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BarChart3, Check, X, Calendar, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calculateAdjustedRate, formatCurrency, formatDate, formatPercentage, getFirstWednesdayOfMonth, isFirstWednesdayOfMonth, getCurrentMonthAdjustmentDate, roundToDecimal } from '../lib/utils'
import type { ClientRoute, DieselPrice, RateCalculation, Route } from '../types'

// Type for monthly adjustment record
interface MonthlyAdjustment {
  id: string
  adjustment_month: string
  diesel_percentage_change: number
  applied_at: string
  total_routes_adjusted: number
  notes: string | null
}

const defaultSettings: Record<string, string> = {
  base_diesel_price: '21.50',
  diesel_impact_percentage: '35',
  auto_adjust_threshold: '2.5',
  max_monthly_increase: '10',
  rounding_precision: '2',
  effective_day_of_month: '1',
}

export default function MasterControlPanel() {
  const [dieselPrices, setDieselPrices] = useState<DieselPrice[]>([])
  const [settings, setSettings] = useState<Record<string, string>>(defaultSettings)
  const [rateCalculations, setRateCalculations] = useState<RateCalculation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [newPriceDate, setNewPriceDate] = useState('')
  const [newPriceValue, setNewPriceValue] = useState('')
  const [newPriceNotes, setNewPriceNotes] = useState('')
  const [applyingRates, setApplyingRates] = useState(false)
  const [selectedCalculations, setSelectedCalculations] = useState<string[]>([])
  
  // Monthly adjustment state
  const [showMonthlyAdjustment, setShowMonthlyAdjustment] = useState(false)
  const [monthlyAdjustmentPercentage, setMonthlyAdjustmentPercentage] = useState('')
  const [monthlyAdjustmentNotes, setMonthlyAdjustmentNotes] = useState('')
  const [applyingMonthlyAdjustment, setApplyingMonthlyAdjustment] = useState(false)
  const [currentMonthAdjusted, setCurrentMonthAdjusted] = useState(false)
  const [lastAdjustment, setLastAdjustment] = useState<MonthlyAdjustment | null>(null)
  const [isFirstWednesday, setIsFirstWednesday] = useState(false)
  const [allClientRoutes, setAllClientRoutes] = useState<(ClientRoute & { client?: { company_name: string; client_code: string }, route?: Route })[]>([])

  useEffect(() => {
    loadData()
    checkFirstWednesday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function checkFirstWednesday() {
    setIsFirstWednesday(isFirstWednesdayOfMonth())
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      // Load diesel prices
      const { data: prices, error: pricesError } = await supabase
        .from('diesel_prices')
        .select('*')
        .order('price_date', { ascending: true })

      if (pricesError) throw pricesError
      setDieselPrices(prices || [])

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('master_control_settings')
        .select('*')

      if (settingsError) throw settingsError
      
      if (settingsData && settingsData.length > 0) {
        const settingsMap: Record<string, string> = { ...defaultSettings }
        settingsData.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value
        })
        setSettings(settingsMap)
      }

      // Check if current month adjustment has been done
      const currentMonthDate = getCurrentMonthAdjustmentDate()
      const { data: adjustmentData } = await supabase
        .from('monthly_adjustments')
        .select('*')
        .eq('adjustment_month', currentMonthDate)
        .single()

      if (adjustmentData) {
        setCurrentMonthAdjusted(true)
        setLastAdjustment(adjustmentData)
      } else {
        setCurrentMonthAdjusted(false)
        // Get last adjustment for reference
        const { data: lastAdj } = await supabase
          .from('monthly_adjustments')
          .select('*')
          .order('adjustment_month', { ascending: false })
          .limit(1)
          .single()
        
        setLastAdjustment(lastAdj || null)
      }

      // Load client routes for rate calculations
      await loadClientRoutes(prices || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadClientRoutes(prices: DieselPrice[]) {
    try {
      const { data: clientRoutes, error: routesError } = await supabase
        .from('client_routes')
        .select(`
          *,
          client:clients(id, client_code, company_name),
          route:routes(id, route_code, origin, destination)
        `)
        .eq('is_active', true)

      if (routesError) throw routesError

      if (clientRoutes && clientRoutes.length > 0) {
        setAllClientRoutes(clientRoutes)
        calculateProposedRates(clientRoutes, prices)
      }
    } catch (err) {
      console.error('Error loading client routes:', err)
    }
  }

  function calculateProposedRates(clientRoutes: (ClientRoute & { client?: { company_name: string }, route?: Route })[], prices: DieselPrice[]) {
    const currentPrice = prices[prices.length - 1]
    const basePrice = parseFloat(settings.base_diesel_price)
    const impactPercent = parseFloat(settings.diesel_impact_percentage)
    
    if (!currentPrice) {
      setRateCalculations([])
      return
    }

    const dieselChangePercent = ((currentPrice.price_per_liter - basePrice) / basePrice) * 100
    
    const calculations: RateCalculation[] = clientRoutes.map(cr => {
      const proposedRate = calculateAdjustedRate(cr.base_rate, dieselChangePercent, impactPercent)
      const adjustmentPercentage = cr.current_rate > 0 
        ? ((proposedRate - cr.current_rate) / cr.current_rate) * 100 
        : 0
      
      return {
        clientRouteId: cr.id,
        clientName: cr.client?.company_name || 'Unknown',
        routeCode: cr.route?.route_code || 'N/A',
        currentRate: cr.current_rate,
        baseRate: cr.base_rate,
        proposedRate: roundToDecimal(proposedRate, 2),
        adjustmentPercentage: roundToDecimal(adjustmentPercentage, 2),
        dieselImpact: roundToDecimal(dieselChangePercent * (impactPercent / 100), 2),
      }
    })
    
    setRateCalculations(calculations)
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
      // Reload data to recalculate rates with new settings
      await loadData()
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
      await loadData()
      setSelectedCalculations([])
    } catch (error) {
      console.error('Error applying rates:', error)
    } finally {
      setApplyingRates(false)
    }
  }

  // Handle monthly diesel adjustment - applies percentage change to ALL active client routes
  async function handleApplyMonthlyAdjustment(e: React.FormEvent) {
    e.preventDefault()
    
    const percentage = parseFloat(monthlyAdjustmentPercentage)
    if (isNaN(percentage)) {
      setError('Please enter a valid percentage')
      return
    }

    setApplyingMonthlyAdjustment(true)
    setError(null)

    try {
      const currentMonthDate = getCurrentMonthAdjustmentDate()
      const currentPrice = dieselPrices[dieselPrices.length - 1]
      let successCount = 0

      // Apply adjustment to all active client routes
      for (const clientRoute of allClientRoutes) {
        const previousRate = clientRoute.current_rate
        // Apply percentage: positive increases rates, negative decreases
        const newRate = roundToDecimal(previousRate * (1 + percentage / 100), 2)

        // Record in tariff_history with the previous month's info
        const { error: historyError } = await supabase.from('tariff_history').insert({
          client_route_id: clientRoute.id,
          client_id: clientRoute.client_id,
          route_id: clientRoute.route_id,
          period_month: currentMonthDate,
          previous_rate: previousRate,
          new_rate: newRate,
          currency: clientRoute.currency || 'ZAR',
          diesel_price_at_change: currentPrice?.price_per_liter || null,
          diesel_percentage_change: percentage,
          adjustment_percentage: percentage,
          adjustment_reason: `Monthly diesel adjustment: ${percentage >= 0 ? '+' : ''}${percentage}%`,
        })

        if (historyError) {
          console.error('Error creating tariff history:', historyError)
          continue
        }

        // Update client_routes with new rate
        const { error: updateError } = await supabase
          .from('client_routes')
          .update({ 
            current_rate: newRate,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientRoute.id)

        if (updateError) {
          console.error('Error updating client route:', updateError)
          continue
        }

        successCount++
      }

      // Record the monthly adjustment
      await supabase.from('monthly_adjustments').insert({
        adjustment_month: currentMonthDate,
        diesel_percentage_change: percentage,
        total_routes_adjusted: successCount,
        notes: monthlyAdjustmentNotes || null,
      })

      // Reset form and refresh data
      setShowMonthlyAdjustment(false)
      setMonthlyAdjustmentPercentage('')
      setMonthlyAdjustmentNotes('')
      await loadData()
    } catch (error) {
      console.error('Error applying monthly adjustment:', error)
      setError('Failed to apply monthly adjustment')
    } finally {
      setApplyingMonthlyAdjustment(false)
    }
  }

  // Get the next first Wednesday
  const today = new Date()
  const nextFirstWednesday = getFirstWednesdayOfMonth(today.getFullYear(), today.getMonth())
  const isNextMonth = nextFirstWednesday < today
  const displayFirstWednesday = isNextMonth 
    ? getFirstWednesdayOfMonth(
        today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(), 
        today.getMonth() === 11 ? 0 : today.getMonth() + 1
      )
    : nextFirstWednesday

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* First Wednesday Notification Banner */}
      {isFirstWednesday && !currentMonthAdjusted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">It's the First Wednesday of the Month!</p>
            <p className="text-amber-700 text-sm">Time to apply the monthly diesel price adjustment to all client rates.</p>
          </div>
          <button
            onClick={() => setShowMonthlyAdjustment(true)}
            className="btn-primary"
          >
            Apply Monthly Adjustment
          </button>
        </div>
      )}

      {/* Already adjusted banner */}
      {currentMonthAdjusted && lastAdjustment && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-green-600 text-2xl">✅</span>
          <div className="flex-1">
            <p className="font-semibold text-green-800">Monthly Adjustment Completed</p>
            <p className="text-green-700 text-sm">
              Adjusted {lastAdjustment.total_routes_adjusted} routes by {formatPercentage(lastAdjustment.diesel_percentage_change)} on {formatDate(lastAdjustment.applied_at, 'dd MMM yyyy HH:mm')}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Control Panel</h1>
          <p className="text-gray-500 mt-1">Manage diesel prices and tariff calculations</p>
          {!currentMonthAdjusted && (
            <p className="text-sm text-amber-600 mt-1">
              Next adjustment due: {formatDate(displayFirstWednesday.toISOString(), 'EEEE, dd MMMM yyyy')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!currentMonthAdjusted && (
            <button
              onClick={() => setShowMonthlyAdjustment(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Monthly Adjustment
            </button>
          )}
          <button
            onClick={() => setShowAddPrice(true)}
            className="btn-primary flex items-center gap-2"
          >
            + Add New Price
          </button>
        </div>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-amber-600">D</span>
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
              <span className="text-lg font-bold text-blue-600">B</span>
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
              <span className={`text-lg font-bold ${totalDieselChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalDieselChange >= 0 ? '↑' : '↓'}
              </span>
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
              <span className="text-lg font-bold text-purple-600">%</span>
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
          <h2 className="card-header">
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
              {saving ? 'Saving...' : 'Save Settings'}
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
              onClick={() => loadData()}
              className="btn-secondary flex items-center gap-2"
            >
              ↻ Recalculate
            </button>
            <button
              onClick={handleApplySelectedRates}
              disabled={selectedCalculations.length === 0 || applyingRates}
              className="btn-success flex items-center gap-2"
            >
              {applyingRates ? 'Applying...' : `▶ Apply Selected (${selectedCalculations.length})`}
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <span className="text-blue-600 flex-shrink-0 mt-0.5">ℹ️</span>
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

        <div className="table-container">
          <table className="w-full" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header" style={{ minWidth: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedCalculations.length === rateCalculations.length}
                    onChange={selectAllCalculations}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="table-header" style={{ minWidth: '150px' }}>Client</th>
                <th className="table-header" style={{ minWidth: '130px' }}>Route</th>
                <th className="table-header text-right" style={{ minWidth: '100px' }}>Base Rate</th>
                <th className="table-header text-right" style={{ minWidth: '100px' }}>Current Rate</th>
                <th className="table-header text-right" style={{ minWidth: '110px' }}>Proposed Rate</th>
                <th className="table-header text-right" style={{ minWidth: '90px' }}>Adjustment</th>
                <th className="table-header text-center" style={{ minWidth: '80px' }}>Status</th>
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
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Exceeds Max
                      </span>
                    ) : (
                      <span className="badge badge-success flex items-center gap-1 justify-center">
                        <Check className="w-3.5 h-3.5" />
                        Ready
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rateCalculations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No rate calculations available</p>
              <p className="text-sm text-gray-400 mt-1">Add client routes to see proposed adjustments</p>
            </div>
          )}
        </div>
      </div>

      {/* Price History Table */}
      <div className="card overflow-hidden">
        <h2 className="card-header">Recent Price History</h2>
        <div className="table-container">
          <table className="w-full" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header" style={{ minWidth: '130px' }}>Date</th>
                <th className="table-header text-right" style={{ minWidth: '90px' }}>Price/L</th>
                <th className="table-header text-right" style={{ minWidth: '90px' }}>Previous</th>
                <th className="table-header text-right" style={{ minWidth: '80px' }}>Change</th>
                <th className="table-header" style={{ minWidth: '120px' }}>Notes</th>
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
                  {saving ? 'Saving...' : 'Save Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Adjustment Modal */}
      {showMonthlyAdjustment && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Diesel Rate Adjustment</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Apply percentage change to all {allClientRoutes.length} active client routes
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleApplyMonthlyAdjustment} className="p-6 space-y-4">
              {/* Summary info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Month:</span>
                  <span className="font-medium">{formatDate(getCurrentMonthAdjustmentDate(), 'MMMM yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Routes to Adjust:</span>
                  <span className="font-medium">{allClientRoutes.length} active routes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Diesel Price:</span>
                  <span className="font-medium">{formatCurrency(currentPrice?.price_per_liter || 0)}/L</span>
                </div>
                {lastAdjustment && !currentMonthAdjusted && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Adjustment:</span>
                    <span className="font-medium">
                      {formatPercentage(lastAdjustment.diesel_percentage_change)} in {formatDate(lastAdjustment.adjustment_month, 'MMM yyyy')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diesel Price Change (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyAdjustmentPercentage}
                    onChange={(e) => setMonthlyAdjustmentPercentage(e.target.value)}
                    className="input-field pr-8"
                    placeholder="e.g., 5.5 or -3.2"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter positive value for increase, negative for decrease
                </p>
              </div>

              {monthlyAdjustmentPercentage && !isNaN(parseFloat(monthlyAdjustmentPercentage)) && (
                <div className={`rounded-lg p-4 ${parseFloat(monthlyAdjustmentPercentage) >= 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className={`text-sm font-medium ${parseFloat(monthlyAdjustmentPercentage) >= 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {parseFloat(monthlyAdjustmentPercentage) >= 0 ? '📈 Rate Increase' : '📉 Rate Decrease'}
                  </p>
                  <p className={`text-sm mt-1 ${parseFloat(monthlyAdjustmentPercentage) >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                    All rates will be {parseFloat(monthlyAdjustmentPercentage) >= 0 ? 'increased' : 'decreased'} by {Math.abs(parseFloat(monthlyAdjustmentPercentage)).toFixed(2)}%
                  </p>
                  <div className="mt-2 text-xs">
                    <span className={parseFloat(monthlyAdjustmentPercentage) >= 0 ? 'text-red-600' : 'text-green-600'}>
                      Example: R1,000 → R{(1000 * (1 + parseFloat(monthlyAdjustmentPercentage) / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={monthlyAdjustmentNotes}
                  onChange={(e) => setMonthlyAdjustmentNotes(e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="Reason for this adjustment..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This action will update rates for ALL active client routes and save the previous rates to history. This cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthlyAdjustment(false)
                    setMonthlyAdjustmentPercentage('')
                    setMonthlyAdjustmentNotes('')
                  }}
                  className="btn-secondary flex-1"
                  disabled={applyingMonthlyAdjustment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingMonthlyAdjustment || !monthlyAdjustmentPercentage}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {applyingMonthlyAdjustment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Applying...
                    </>
                  ) : (
                    'Apply Adjustment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
