import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import type { Client, ClientRoute, Document, Route, TariffHistory } from '../types'

// Form data for adding/editing client routes
interface ClientRouteFormData {
  route_id: string
  base_rate: number
  current_rate: number
  rate_type: 'per_load' | 'per_km' | 'per_ton'
  minimum_charge: number
  effective_date: string
  notes: string
}

const initialRouteFormData: ClientRouteFormData = {
  route_id: '',
  base_rate: 0,
  current_rate: 0,
  rate_type: 'per_load',
  minimum_charge: 0,
  effective_date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [clientRoutes, setClientRoutes] = useState<(ClientRoute & { route?: Partial<Route> })[]>([])
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tariffHistory, setTariffHistory] = useState<TariffHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'routes' | 'documents' | 'history'>('routes')
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [_showUploadDoc, setShowUploadDoc] = useState(false)
  const [routeFormData, setRouteFormData] = useState<ClientRouteFormData>(initialRouteFormData)
  const [editingClientRoute, setEditingClientRoute] = useState<ClientRoute | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadClientData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadClientData() {
    setLoading(true)
    try {
      // Load client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (clientError) throw clientError
      if (clientData) setClient(clientData)

      // Load client routes with route details
      const { data: routesData } = await supabase
        .from('client_routes')
        .select(`
          *,
          route:routes(*)
        `)
        .eq('client_id', id)
        .eq('is_active', true)

      if (routesData) setClientRoutes(routesData)

      // Load all available routes for the dropdown
      const { data: allRoutes } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('route_code')

      if (allRoutes) setAvailableRoutes(allRoutes)

      // Load documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', id)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })

      if (docsData) setDocuments(docsData)

      // Load tariff history
      const { data: historyData } = await supabase
        .from('tariff_history')
        .select('*')
        .eq('client_id', id)
        .order('period_month', { ascending: false })
        .limit(10)

      if (historyData) setTariffHistory(historyData)
    } catch (err) {
      console.error('Error loading client data:', err)
      setError('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  function openAddRouteModal() {
    setRouteFormData(initialRouteFormData)
    setEditingClientRoute(null)
    setShowAddRoute(true)
  }

  function openEditRouteModal(clientRoute: ClientRoute) {
    setRouteFormData({
      route_id: clientRoute.route_id,
      base_rate: clientRoute.base_rate,
      current_rate: clientRoute.current_rate,
      rate_type: clientRoute.rate_type as 'per_load' | 'per_km' | 'per_ton',
      minimum_charge: clientRoute.minimum_charge || 0,
      effective_date: clientRoute.effective_date,
      notes: clientRoute.notes || '',
    })
    setEditingClientRoute(clientRoute)
    setShowAddRoute(true)
  }

  async function handleSaveRoute(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!routeFormData.route_id) {
        throw new Error('Please select a route')
      }

      if (editingClientRoute) {
        // Update existing client route
        const { error: updateError } = await supabase
          .from('client_routes')
          .update({
            route_id: routeFormData.route_id,
            base_rate: routeFormData.base_rate,
            current_rate: routeFormData.current_rate,
            rate_type: routeFormData.rate_type,
            minimum_charge: routeFormData.minimum_charge,
            effective_date: routeFormData.effective_date,
            notes: routeFormData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClientRoute.id)

        if (updateError) throw updateError

        // Record tariff history if rate changed
        if (editingClientRoute.current_rate !== routeFormData.current_rate) {
          await supabase.from('tariff_history').insert({
            client_route_id: editingClientRoute.id,
            client_id: id,
            route_id: routeFormData.route_id,
            period_month: new Date().toISOString().slice(0, 7) + '-01',
            previous_rate: editingClientRoute.current_rate,
            new_rate: routeFormData.current_rate,
            adjustment_percentage: ((routeFormData.current_rate - editingClientRoute.current_rate) / editingClientRoute.current_rate) * 100,
            adjustment_reason: 'Manual rate adjustment',
          })
        }
      } else {
        // Insert new client route
        const { error: insertError } = await supabase
          .from('client_routes')
          .insert({
            client_id: id,
            route_id: routeFormData.route_id,
            base_rate: routeFormData.base_rate,
            current_rate: routeFormData.current_rate,
            rate_type: routeFormData.rate_type,
            minimum_charge: routeFormData.minimum_charge,
            effective_date: routeFormData.effective_date,
            notes: routeFormData.notes || null,
            is_active: true,
          })

        if (insertError) throw insertError
      }

      await loadClientData()
      setShowAddRoute(false)
      setRouteFormData(initialRouteFormData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save route'
      console.error('Error saving route:', err)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRoute(clientRoute: ClientRoute) {
    if (!confirm('Are you sure you want to remove this route from the client?')) return

    try {
      const { error: deleteError } = await supabase
        .from('client_routes')
        .update({ is_active: false })
        .eq('id', clientRoute.id)

      if (deleteError) throw deleteError
      await loadClientData()
    } catch (err) {
      console.error('Error deleting route:', err)
      setError('Failed to delete route')
    }
  }

  // Get routes not already assigned to this client
  const unassignedRoutes = availableRoutes.filter(
    r => !clientRoutes.some(cr => cr.route_id === r.id) || editingClientRoute?.route_id === r.id
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500">Client not found</p>
          <Link to="/clients" className="text-primary-600 hover:underline mt-2 block">
            Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  const totalMonthlyRevenue = clientRoutes.reduce((sum, cr) => sum + cr.current_rate, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="text-gray-600">←</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
            <span className={`badge ${client.is_active ? 'badge-success' : 'badge-danger'}`}>
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            {client.trading_name && `t/a ${client.trading_name} • `}
            {client.client_code}
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          ✏️ Edit Client
        </button>
        <button
          onClick={() => navigate(`/rate-sheets?client=${client.id}`)}
          className="btn-primary flex items-center gap-2"
        >
          📄 Generate Rate Sheet
        </button>
      </div>

      {/* Client Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="card">
          <h3 className="card-header">
            Contact Information
          </h3>
          <div className="space-y-3">
            {client.contact_person && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {client.contact_person.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{client.contact_person}</p>
                  <p className="text-xs text-gray-500">Primary Contact</p>
                </div>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">@</span>
                <a href={`mailto:${client.email}`} className="text-primary-600 hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">☎️</span>
                <a href={`tel:${client.phone}`} className="text-gray-700 hover:text-gray-900">
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 mt-0.5">📍</span>
                <div className="text-gray-700">
                  <p>{client.address}</p>
                  <p>{client.city}, {client.province} {client.postal_code}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Info */}
        <div className="card">
          <h3 className="card-header">
            Financial Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Credit Limit</span>
              <span className="font-semibold text-gray-900">{formatCurrency(client.credit_limit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Terms</span>
              <span className="font-semibold text-gray-900">{client.payment_terms} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAT Number</span>
              <span className="font-mono text-sm text-gray-900">{client.vat_number || '-'}</span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Est. Monthly Revenue</p>
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalMonthlyRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card">
          <h3 className="card-header">
            Account Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Active Routes</span>
              <span className="text-2xl font-bold text-gray-900">{clientRoutes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Documents</span>
              <span className="text-2xl font-bold text-gray-900">{documents.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Rate Adjustments</span>
              <span className="text-2xl font-bold text-gray-900">{tariffHistory.length}</span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Client Since</p>
              <p className="font-medium text-gray-900">{formatDate(client.created_at, 'dd MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('routes')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'routes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              🛤️ Routes & Tariffs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              📄 Documents
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              📜 Tariff History
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'routes' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Routes</h3>
            <button
              onClick={openAddRouteModal}
              className="btn-primary flex items-center gap-2"
            >
              + Add Route
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Route</th>
                  <th className="table-header">Origin → Destination</th>
                  <th className="table-header text-right">Distance</th>
                  <th className="table-header text-right">Base Rate</th>
                  <th className="table-header text-right">Current Rate</th>
                  <th className="table-header">Rate Type</th>
                  <th className="table-header text-right">Min Charge</th>
                  <th className="table-header">Effective</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientRoutes.map((cr) => (
                  <tr key={cr.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {cr.route?.route_code ?? '-'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {cr.route?.origin ?? '-'} → {cr.route?.destination ?? '-'}
                    </td>
                    <td className="table-cell text-right">{cr.route?.distance_km ?? 0} km</td>
                    <td className="table-cell text-right text-gray-500">{formatCurrency(cr.base_rate)}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(cr.current_rate)}</td>
                    <td className="table-cell">
                      <span className="badge badge-info">{cr.rate_type.replace('_', ' ')}</span>
                    </td>
                    <td className="table-cell text-right">{formatCurrency(cr.minimum_charge)}</td>
                    <td className="table-cell">{formatDate(cr.effective_date, 'dd MMM yy')}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditRouteModal(cr)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit route tariff"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(cr)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Remove route"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {clientRoutes.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl text-gray-300 block mb-4">🛤️</span>
              <p className="text-gray-500">No routes configured</p>
              <p className="text-sm text-gray-400 mt-1">Add routes to start tracking tariffs</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            <button
              onClick={() => setShowUploadDoc(true)}
              className="btn-primary flex items-center gap-2"
            >
              ⬆️ Upload Document
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.document_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.document_type} • v{doc.version}
                    </p>
                    {doc.expiry_date && (
                      <p className={`text-xs mt-1 ${
                        new Date(doc.expiry_date) < new Date() 
                          ? 'text-red-600' 
                          : 'text-gray-500'
                      }`}>
                        {new Date(doc.expiry_date) < new Date() ? 'Expired' : 'Expires'}: {formatDate(doc.expiry_date, 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button className="btn-secondary flex-1 text-sm py-1.5 flex items-center justify-center gap-1">
                    👁️ View
                  </button>
                  <button className="btn-secondary flex-1 text-sm py-1.5 flex items-center justify-center gap-1">
                    ⬇️ Download
                  </button>
                </div>
              </div>
            ))}
          </div>
          {documents.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl text-gray-300 block mb-4">📄</span>
              <p className="text-gray-500">No documents uploaded</p>
              <p className="text-sm text-gray-400 mt-1">Upload SLAs, contracts, and other documents</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tariff Change History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Period</th>
                  <th className="table-header">Route</th>
                  <th className="table-header text-right">Previous Rate</th>
                  <th className="table-header text-right">New Rate</th>
                  <th className="table-header text-right">Adjustment</th>
                  <th className="table-header text-right">Diesel Price</th>
                  <th className="table-header">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tariffHistory.map((history) => {
                  const route = clientRoutes.find(cr => cr.route_id === history.route_id)?.route
                  return (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📅</span>
                          {formatDate(history.period_month, 'MMM yyyy')}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {route?.route_code || 'N/A'}
                        </span>
                      </td>
                      <td className="table-cell text-right text-gray-500">
                        {formatCurrency(history.previous_rate)}
                      </td>
                      <td className="table-cell text-right font-semibold">
                        {formatCurrency(history.new_rate)}
                      </td>
                      <td className="table-cell text-right">
                        <span className={`badge ${(history.adjustment_percentage || 0) >= 0 ? 'badge-danger' : 'badge-success'}`}>
                          {(history.adjustment_percentage || 0) >= 0 ? '↑' : '↓'}
                          {Math.abs(history.adjustment_percentage || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        {history.diesel_price_at_change ? formatCurrency(history.diesel_price_at_change) : '-'}
                      </td>
                      <td className="table-cell text-gray-500 text-sm">
                        {history.adjustment_reason || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {tariffHistory.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl text-gray-300 block mb-4">📜</span>
              <p className="text-gray-500">No tariff history</p>
              <p className="text-sm text-gray-400 mt-1">History will appear as rates are adjusted</p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {client.notes && (
        <div className="card">
          <h3 className="card-header">Notes</h3>
          <p className="text-gray-700">{client.notes}</p>
        </div>
      )}

      {/* Add/Edit Route Modal */}
      {showAddRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingClientRoute ? 'Edit Route Tariff' : 'Add Route to Client'}
                </h2>
                <button
                  onClick={() => setShowAddRoute(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-gray-500 text-xl">✕</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveRoute} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route <span className="text-red-500">*</span>
                </label>
                <select
                  value={routeFormData.route_id}
                  onChange={(e) => setRouteFormData({ ...routeFormData, route_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select a route</option>
                  {unassignedRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.route_code} - {route.origin} → {route.destination} ({route.distance_km}km)
                    </option>
                  ))}
                </select>
                {unassignedRoutes.length === 0 && !editingClientRoute && (
                  <p className="text-sm text-orange-600 mt-1">
                    All available routes are already assigned to this client
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Rate (R) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={routeFormData.base_rate}
                    onChange={(e) => setRouteFormData({ 
                      ...routeFormData, 
                      base_rate: parseFloat(e.target.value) || 0,
                      current_rate: routeFormData.current_rate === routeFormData.base_rate 
                        ? parseFloat(e.target.value) || 0 
                        : routeFormData.current_rate
                    })}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Starting/reference rate</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Rate (R) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={routeFormData.current_rate}
                    onChange={(e) => setRouteFormData({ ...routeFormData, current_rate: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Active billing rate</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={routeFormData.rate_type}
                    onChange={(e) => setRouteFormData({ ...routeFormData, rate_type: e.target.value as 'per_load' | 'per_km' | 'per_ton' })}
                    className="input-field"
                    required
                  >
                    <option value="per_load">Per Load</option>
                    <option value="per_km">Per Kilometer</option>
                    <option value="per_ton">Per Ton</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Charge (R)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={routeFormData.minimum_charge}
                    onChange={(e) => setRouteFormData({ ...routeFormData, minimum_charge: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={routeFormData.effective_date}
                  onChange={(e) => setRouteFormData({ ...routeFormData, effective_date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={routeFormData.notes}
                  onChange={(e) => setRouteFormData({ ...routeFormData, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Optional notes about this route tariff..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddRoute(false)}
                  className="btn-secondary flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={saving || (!editingClientRoute && unassignedRoutes.length === 0)}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    editingClientRoute ? 'Update Route' : 'Add Route'
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
