import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { 
  Pencil, Trash2, Upload, MapPin, Phone, FileText, Route as RouteIcon, 
  History, Settings, X, Check, AlertTriangle, Plus, Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, getDaysUntil } from '../lib/utils'
import type { Client, ClientRoute, Document, Route, TariffHistory } from '../types'

// Form data for adding/editing client routes
interface ClientRouteFormData {
  route_id: string
  current_rate: number
  rate_type: 'per_load' | 'per_km' | 'per_ton'
  currency: 'ZAR' | 'USD'
  additional_charges: number
  include_vat: boolean
  effective_date: string
  notes: string
}

const initialRouteFormData: ClientRouteFormData = {
  route_id: '',
  current_rate: 0,
  rate_type: 'per_load',
  currency: 'ZAR',
  additional_charges: 0,
  include_vat: false,
  effective_date: new Date().toISOString().split('T')[0],
  notes: '',
}

// Document upload form data
interface DocumentUploadFormData {
  document_type: string
  document_name: string
  expiry_date: string
  notes: string
}

const initialDocumentFormData: DocumentUploadFormData = {
  document_type: '',
  document_name: '',
  expiry_date: '',
  notes: '',
}

const documentTypeLabels: Record<string, string> = {
  SLA: 'Service Level Agreement',
  CREDIT_APP: 'Credit Application',
  RATE_CARD: 'Rate Card',
  CONTRACT: 'Contract',
  INSURANCE: 'Insurance Certificate',
  TAX_CERT: 'Tax Clearance',
  BEE_CERT: 'BEE Certificate',
  OTHER: 'Other',
}

function getDocumentStatus(doc: Document): { status: string; color: string; daysUntil: number | null } {
  if (!doc.expiry_date) return { status: 'Valid', color: 'badge-success', daysUntil: null }
  
  const daysUntil = getDaysUntil(doc.expiry_date)
  
  if (daysUntil < 0) return { status: 'Expired', color: 'badge-danger', daysUntil }
  if (daysUntil <= 30) return { status: 'Expiring Soon', color: 'badge-warning', daysUntil }
  return { status: 'Valid', color: 'badge-success', daysUntil }
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
  const [showUploadDoc, setShowUploadDoc] = useState(false)
  const [routeFormData, setRouteFormData] = useState<ClientRouteFormData>(initialRouteFormData)
  const [documentFormData, setDocumentFormData] = useState<DocumentUploadFormData>(initialDocumentFormData)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingClientRoute, setEditingClientRoute] = useState<ClientRoute | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManageRoutes, setShowManageRoutes] = useState(false)
  const [allClientRoutes, setAllClientRoutes] = useState<(ClientRoute & { route?: Partial<Route> })[]>([])
  const [togglingRouteId, setTogglingRouteId] = useState<string | null>(null)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<'ZAR' | 'USD'>('ZAR')

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
      if (clientData) {
        setClient(clientData)
        setSelectedCurrency(clientData.currency || 'ZAR')
      }

      // Load client routes with route details (active only for main view)
      const { data: routesData } = await supabase
        .from('client_routes')
        .select(`
          *,
          route:routes(*)
        `)
        .eq('client_id', id)
        .eq('is_active', true)

      if (routesData) setClientRoutes(routesData)

      // Load ALL client routes (including inactive) for the manage routes modal
      const { data: allClientRoutesData } = await supabase
        .from('client_routes')
        .select(`
          *,
          route:routes(*)
        `)
        .eq('client_id', id)

      if (allClientRoutesData) setAllClientRoutes(allClientRoutesData)

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
    // Parse additional_charges and include_vat from notes if stored there, or use defaults
    const notesData = clientRoute.notes ? JSON.parse(clientRoute.notes) : {}
    setRouteFormData({
      route_id: clientRoute.route_id,
      current_rate: clientRoute.current_rate,
      rate_type: clientRoute.rate_type as 'per_load' | 'per_km' | 'per_ton',
      currency: clientRoute.currency || 'ZAR',
      additional_charges: notesData.additional_charges || 0,
      include_vat: notesData.include_vat || false,
      effective_date: clientRoute.effective_date,
      notes: notesData.notes || '',
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

      if (!client) {
        throw new Error('Client not found')
      }

      // Get client currency
      const clientCurrency = client.currency || 'ZAR'

      // Calculate total rate including additional charges and VAT
      const subtotal = routeFormData.current_rate + routeFormData.additional_charges
      const totalRate = routeFormData.include_vat ? subtotal * 1.15 : subtotal

      // Store additional charges and VAT info in notes as JSON
      const notesData = JSON.stringify({
        additional_charges: routeFormData.additional_charges,
        include_vat: routeFormData.include_vat,
        notes: routeFormData.notes,
      })

      if (editingClientRoute) {
        // Update existing client route
        const { error: updateError } = await supabase
          .from('client_routes')
          .update({
            route_id: routeFormData.route_id,
            base_rate: routeFormData.current_rate, // Base rate without extras
            current_rate: totalRate, // Total rate including additional charges and VAT
            rate_type: routeFormData.rate_type,
            currency: clientCurrency,
            minimum_charge: routeFormData.additional_charges, // Store additional charges here
            effective_date: routeFormData.effective_date,
            notes: notesData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClientRoute.id)

        if (updateError) throw updateError

        // Record tariff history if rate changed
        if (editingClientRoute.current_rate !== totalRate) {
          await supabase.from('tariff_history').insert({
            client_route_id: editingClientRoute.id,
            client_id: id,
            route_id: routeFormData.route_id,
            period_month: new Date().toISOString().slice(0, 7) + '-01',
            previous_rate: editingClientRoute.current_rate,
            new_rate: totalRate,
            currency: clientCurrency,
            adjustment_percentage: editingClientRoute.current_rate > 0 
              ? ((totalRate - editingClientRoute.current_rate) / editingClientRoute.current_rate) * 100 
              : 0,
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
            base_rate: routeFormData.current_rate, // Base rate without extras
            current_rate: totalRate, // Total rate including additional charges and VAT
            rate_type: routeFormData.rate_type,
            currency: clientCurrency,
            minimum_charge: routeFormData.additional_charges, // Store additional charges here
            effective_date: routeFormData.effective_date,
            notes: notesData,
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

  // Toggle a route's active status for this client
  async function handleToggleRoute(route: Route, isCurrentlyActive: boolean) {
    setTogglingRouteId(route.id)
    setError(null)

    try {
      // Check if this route has ever been assigned to this client
      const existingClientRoute = allClientRoutes.find(cr => cr.route_id === route.id)

      if (existingClientRoute) {
        // Route was previously assigned, just toggle is_active
        const { error: updateError } = await supabase
          .from('client_routes')
          .update({ 
            is_active: !isCurrentlyActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingClientRoute.id)

        if (updateError) throw updateError
      } else {
        // Route has never been assigned - need to set up with rates
        // Pre-fill form and open the add route modal
        setRouteFormData({
          route_id: route.id,
          current_rate: 0,
          rate_type: 'per_load',
          currency: 'ZAR',
          additional_charges: 0,
          include_vat: false,
          effective_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
        setEditingClientRoute(null)
        setShowManageRoutes(false)
        setShowAddRoute(true)
        setTogglingRouteId(null)
        return
      }

      await loadClientData()
    } catch (err) {
      console.error('Error toggling route:', err)
      setError('Failed to toggle route status')
    } finally {
      setTogglingRouteId(null)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill document name if empty
      if (!documentFormData.document_name) {
        setDocumentFormData(prev => ({
          ...prev,
          document_name: file.name.replace(/\.[^/.]+$/, '') // Remove extension
        }))
      }
    }
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !documentFormData.document_type) {
      setError('Please select a file and document type')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Generate a unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${id}/${Date.now()}_${documentFormData.document_name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // If bucket doesn't exist or storage not configured, save metadata only
        console.warn('Storage upload failed, saving metadata only:', uploadError.message)
      }

      // Get the latest version for this document type
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('version')
        .eq('client_id', id)
        .eq('document_type', documentFormData.document_type)
        .eq('is_current', true)
        .order('version', { ascending: false })
        .limit(1)

      const newVersion = existingDocs && existingDocs.length > 0 ? existingDocs[0].version + 1 : 1

      // Mark old versions as not current
      if (newVersion > 1) {
        await supabase
          .from('documents')
          .update({ is_current: false })
          .eq('client_id', id)
          .eq('document_type', documentFormData.document_type)
          .eq('is_current', true)
      }

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          client_id: id,
          document_type: documentFormData.document_type,
          document_name: documentFormData.document_name || selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          version: newVersion,
          is_current: true,
          expiry_date: documentFormData.expiry_date || null,
          notes: documentFormData.notes || null,
        })

      if (insertError) throw insertError

      // Reload documents and close modal
      await loadClientData()
      setShowUploadDoc(false)
      setDocumentFormData(initialDocumentFormData)
      setSelectedFile(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      console.error('Error uploading document:', err)
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDocument(doc: Document) {
    if (!confirm(`Are you sure you want to delete "${doc.document_name}"?`)) return

    try {
      // Try to delete from storage first
      if (doc.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path])
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (deleteError) throw deleteError
      
      await loadClientData()
    } catch (err) {
      console.error('Error deleting document:', err)
      setError('Failed to delete document')
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
          <Pencil className="w-4 h-4" />
          Edit Client
        </button>
        <button
          onClick={() => navigate(`/rate-sheets?client=${client.id}`)}
          className="btn-primary flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Generate Rate Sheet
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
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${client.phone}`} className="text-gray-700 hover:text-gray-900">
                  {client.phone}
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
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
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Currency</span>
              <button
                onClick={() => setShowCurrencyModal(true)}
                className="flex items-center gap-2 font-semibold text-gray-900 hover:text-primary-600 transition-colors"
              >
                <span className={`badge ${client.currency === 'USD' ? 'badge-info' : 'badge-success'}`}>
                  {client.currency || 'ZAR'}
                </span>
                <Pencil className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Credit Limit</span>
              <span className="font-semibold text-gray-900">{formatCurrency(client.credit_limit, client.currency || 'ZAR')}</span>
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
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalMonthlyRevenue, client.currency || 'ZAR')}</p>
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
              <RouteIcon className="w-4 h-4" />
              Routes & Tariffs
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
              <FileText className="w-4 h-4" />
              Documents
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
              <History className="w-4 h-4" />
              Tariff History
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'routes' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Routes</h3>
              <p className="text-sm text-gray-500 mt-1">
                {clientRoutes.length} of {availableRoutes.length} routes active for this client
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManageRoutes(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Routes
              </button>
              <button
                onClick={openAddRouteModal}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Route
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="w-full" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header" style={{ minWidth: '90px' }}>Route</th>
                  <th className="table-header" style={{ minWidth: '160px' }}>Origin → Destination</th>
                  <th className="table-header text-right" style={{ minWidth: '80px' }}>Distance</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>Rate</th>
                  <th className="table-header" style={{ minWidth: '90px' }}>Rate Type</th>
                  <th className="table-header" style={{ minWidth: '70px' }}>VAT</th>
                  <th className="table-header" style={{ minWidth: '100px' }}>Effective</th>
                  <th className="table-header" style={{ minWidth: '80px' }}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientRoutes.map((cr) => {
                  // Parse notes to check VAT status
                  let includesVat = false
                  try {
                    const notesData = cr.notes ? JSON.parse(cr.notes) : {}
                    includesVat = notesData.include_vat || false
                  } catch {
                    includesVat = false
                  }
                  return (
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
                      <td className="table-cell text-right font-semibold">{formatCurrency(cr.current_rate, client.currency || 'ZAR')}</td>
                      <td className="table-cell">
                        <span className="badge badge-info">{cr.rate_type.replace('_', ' ')}</span>
                      </td>
                      <td className="table-cell">
                        {includesVat ? (
                          <span className="badge badge-success">15%</span>
                        ) : (
                          <span className="badge badge-secondary">No</span>
                        )}
                      </td>
                      <td className="table-cell">{formatDate(cr.effective_date, 'dd MMM yy')}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRouteModal(cr)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit route tariff"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(cr)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {clientRoutes.length === 0 && (
            <div className="text-center py-12">
              <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No routes configured</p>
              <p className="text-sm text-gray-400 mt-1">Add routes to start tracking tariffs</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500 mt-1">
                {documents.length} document{documents.length !== 1 ? 's' : ''} • 
                {documents.filter(d => getDocumentStatus(d).status === 'Expired').length} expired • 
                {documents.filter(d => getDocumentStatus(d).status === 'Expiring Soon').length} expiring soon
              </p>
            </div>
            <button
              onClick={() => setShowUploadDoc(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const { status, color, daysUntil } = getDocumentStatus(doc)
              return (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-bold text-sm">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${color}`}>{status}</span>
                        <span className="text-xs text-gray-500">v{doc.version}</span>
                      </div>
                      <p className="font-medium text-gray-900 truncate" title={doc.document_name}>
                        {doc.document_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {doc.expiry_date && (
                      <div className={`text-sm mb-2 ${status === 'Expired' ? 'text-red-600' : status === 'Expiring Soon' ? 'text-amber-600' : 'text-gray-500'}`}>
                        {status === 'Expired' ? (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Expired {formatDate(doc.expiry_date, 'dd MMM yyyy')}
                          </span>
                        ) : status === 'Expiring Soon' ? (
                          <span>Expires in {daysUntil} days</span>
                        ) : (
                          <span>Expires: {formatDate(doc.expiry_date, 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded: {formatDate(doc.uploaded_at, 'dd MMM yyyy')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn-secondary flex-1 text-sm py-1.5 flex items-center justify-center gap-1">
                      View
                    </button>
                    <button className="btn-secondary flex-1 text-sm py-1.5 flex items-center justify-center gap-1">
                      Download
                    </button>
                    <button 
                      onClick={() => handleDeleteDocument(doc)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents uploaded</p>
              <p className="text-sm text-gray-400 mt-1">Upload SLAs, contracts, and other documents</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 px-4 pt-4">Tariff Change History</h3>
          <div className="table-container">
            <table className="w-full" style={{ minWidth: '800px' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header" style={{ minWidth: '100px' }}>Period</th>
                  <th className="table-header" style={{ minWidth: '90px' }}>Route</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>Prev Rate</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>New Rate</th>
                  <th className="table-header text-right" style={{ minWidth: '90px' }}>Adjustment</th>
                  <th className="table-header text-right" style={{ minWidth: '100px' }}>Diesel Price</th>
                  <th className="table-header" style={{ minWidth: '100px' }}>Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tariffHistory.map((history) => {
                  const route = clientRoutes.find(cr => cr.route_id === history.route_id)?.route
                  return (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
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
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="w-24">
                    <div className="input-field bg-gray-50 flex items-center justify-center font-medium text-gray-700">
                      {client.currency || 'ZAR'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={routeFormData.current_rate}
                      onChange={(e) => setRouteFormData({ ...routeFormData, current_rate: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">The billing rate for this route (in {client.currency || 'ZAR'})</p>
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
                    Additional Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={routeFormData.additional_charges}
                    onChange={(e) => setRouteFormData({ ...routeFormData, additional_charges: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Include VAT (15%)
                  </label>
                  <p className="text-xs text-gray-500">Add 15% VAT to the total rate</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRouteFormData({ ...routeFormData, include_vat: !routeFormData.include_vat })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    routeFormData.include_vat ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      routeFormData.include_vat ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Rate Summary */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">Rate Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Base Rate:</span>
                    <span className="font-medium">{formatCurrency(routeFormData.current_rate, client.currency || 'ZAR')}</span>
                  </div>
                  {routeFormData.additional_charges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">Additional Charges:</span>
                      <span className="font-medium">+ {formatCurrency(routeFormData.additional_charges, client.currency || 'ZAR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-blue-700">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(routeFormData.current_rate + routeFormData.additional_charges, client.currency || 'ZAR')}</span>
                  </div>
                  {routeFormData.include_vat && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">VAT (15%):</span>
                      <span className="font-medium">+ {formatCurrency((routeFormData.current_rate + routeFormData.additional_charges) * 0.15, client.currency || 'ZAR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-blue-800 font-semibold">Total Rate:</span>
                    <span className="font-bold text-blue-900">
                      {formatCurrency(
                        (routeFormData.current_rate + routeFormData.additional_charges) * (routeFormData.include_vat ? 1.15 : 1),
                        client.currency || 'ZAR'
                      )}
                    </span>
                  </div>
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

      {/* Manage Routes Modal */}
      {showManageRoutes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Manage Routes</h2>
                <button
                  onClick={() => setShowManageRoutes(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-gray-500 text-xl">✕</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Toggle routes on/off for {client?.company_name}. All routes are available by default - select which ones are active for this client.
              </p>
            </div>

            <div className="p-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {availableRoutes.map((route) => {
                  const existingClientRoute = allClientRoutes.find(cr => cr.route_id === route.id)
                  const isActive = existingClientRoute?.is_active ?? false
                  const hasRates = existingClientRoute != null
                  const isToggling = togglingRouteId === route.id

                  return (
                    <div
                      key={route.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isActive 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                            {route.route_code}
                          </span>
                          <span className="font-medium text-gray-900">
                            {route.origin} → {route.destination}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          {route.distance_km && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {route.distance_km} km
                            </span>
                          )}
                          {route.estimated_hours && (
                            <span>{route.estimated_hours} hrs</span>
                          )}
                          {hasRates && existingClientRoute && (
                            <span className="text-primary-600 font-medium">
                              {formatCurrency(existingClientRoute.current_rate, existingClientRoute.currency || 'ZAR')} ({existingClientRoute.rate_type?.replace('_', ' ')})
                            </span>
                          )}
                          {!hasRates && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              No rates configured
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasRates && isActive && (
                          <button
                            onClick={() => {
                              if (existingClientRoute) {
                                openEditRouteModal(existingClientRoute)
                                setShowManageRoutes(false)
                              }
                            }}
                            className="text-sm text-primary-600 hover:text-primary-800"
                          >
                            Edit Rates
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleRoute(route, isActive)}
                          disabled={isToggling}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isActive ? 'bg-green-500' : 'bg-gray-300'
                          } ${isToggling ? 'opacity-50' : ''}`}
                        >
                          {isToggling ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </span>
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {availableRoutes.length === 0 && (
                <div className="text-center py-12">
                  <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No routes available</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create routes in the Routes section first
                  </p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {clientRoutes.length} of {availableRoutes.length} routes active
                  </span>
                  <button
                    onClick={() => setShowManageRoutes(false)}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
                <button
                  onClick={() => {
                    setShowUploadDoc(false)
                    setDocumentFormData(initialDocumentFormData)
                    setSelectedFile(null)
                    setError(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-gray-500 text-xl">✕</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Add a document to {client.company_name}</p>
            </div>

            <form onSubmit={handleUploadDocument} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={documentFormData.document_type}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, document_type: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select Type</option>
                  {Object.entries(documentTypeLabels).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    selectedFile ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                  }`}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <span className="text-primary-600 font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                    </div>
                  )}
                  <input 
                    id="file-input"
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={documentFormData.document_name}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, document_name: e.target.value })}
                  className="input-field"
                  placeholder="Auto-filled from file name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={documentFormData.expiry_date}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, expiry_date: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty if document doesn't expire</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={documentFormData.notes}
                  onChange={(e) => setDocumentFormData({ ...documentFormData, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Optional notes about this document..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadDoc(false)
                    setDocumentFormData(initialDocumentFormData)
                    setSelectedFile(null)
                    setError(null)
                  }}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency Change Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Change Client Currency</h2>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select the currency for all rates and financial information for this client.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedCurrency('ZAR')}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  selectedCurrency === 'ZAR'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">R</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">ZAR</p>
                    <p className="text-sm text-gray-500">South African Rand</p>
                  </div>
                </div>
                {selectedCurrency === 'ZAR' && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </button>

              <button
                onClick={() => setSelectedCurrency('USD')}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  selectedCurrency === 'USD'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-700 font-bold text-sm">$</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">USD</p>
                    <p className="text-sm text-gray-500">United States Dollar</p>
                  </div>
                </div>
                {selectedCurrency === 'USD' && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSaving(true)
                  try {
                    const { error: updateError } = await supabase
                      .from('clients')
                      .update({ currency: selectedCurrency, updated_at: new Date().toISOString() })
                      .eq('id', id)

                    if (updateError) throw updateError
                    await loadClientData()
                    setShowCurrencyModal(false)
                  } catch (err) {
                    console.error('Error updating currency:', err)
                    setError('Failed to update currency')
                  } finally {
                    setSaving(false)
                  }
                }}
                className="btn-primary flex-1"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Currency'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
