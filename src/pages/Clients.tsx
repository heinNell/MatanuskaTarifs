import
    {
        Building2,
        ChevronRight,
        Download,
        Edit,
        Eye,
        Mail,
        MapPin,
        MoreVertical,
        Phone,
        Plus,
        Search,
        Trash2,
        Users
    } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import type { Client, ClientFormData } from '../types'

// Demo clients data - only used as fallback when Supabase is not configured
const demoClients: Client[] = [
  { id: '1', client_code: 'CLI001', company_name: 'ABC Manufacturing (Pty) Ltd', trading_name: 'ABC Manufacturing', contact_person: 'John Smith', email: 'john@abcmfg.co.za', phone: '+27 11 555 1234', address: '123 Industrial Road', city: 'Johannesburg', province: 'Gauteng', postal_code: '2000', vat_number: '4123456789', registration_number: null, payment_terms: 30, credit_limit: 500000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '2', client_code: 'CLI002', company_name: 'Cape Foods International', trading_name: 'Cape Foods', contact_person: 'Sarah Johnson', email: 'sarah@capefoods.co.za', phone: '+27 21 555 5678', address: '45 Harbour Street', city: 'Cape Town', province: 'Western Cape', postal_code: '8001', vat_number: '4234567890', registration_number: null, payment_terms: 30, credit_limit: 750000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '3', client_code: 'CLI003', company_name: 'Durban Chemical Supplies', trading_name: 'DCS', contact_person: 'Mike Williams', email: 'mike@dcs.co.za', phone: '+27 31 555 9012', address: '78 Port Road', city: 'Durban', province: 'KwaZulu-Natal', postal_code: '4001', vat_number: '4345678901', registration_number: null, payment_terms: 45, credit_limit: 1000000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '4', client_code: 'CLI004', company_name: 'Eastern Province Distributors', trading_name: 'EP Distributors', contact_person: 'Lisa Brown', email: 'lisa@epdist.co.za', phone: '+27 41 555 3456', address: '234 Main Street', city: 'Port Elizabeth', province: 'Eastern Cape', postal_code: '6001', vat_number: '4456789012', registration_number: null, payment_terms: 30, credit_limit: 350000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '5', client_code: 'CLI005', company_name: 'Gauteng Steel Works', trading_name: 'GSW', contact_person: 'David Miller', email: 'david@gsw.co.za', phone: '+27 12 555 7890', address: '567 Steel Avenue', city: 'Pretoria', province: 'Gauteng', postal_code: '0001', vat_number: '4567890123', registration_number: null, payment_terms: 60, credit_limit: 2000000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '6', client_code: 'CLI006', company_name: 'Free State Agri Holdings', trading_name: 'FS Agri', contact_person: 'Emma Davis', email: 'emma@fsagri.co.za', phone: '+27 51 555 2345', address: '89 Farm Road', city: 'Bloemfontein', province: 'Free State', postal_code: '9300', vat_number: '4678901234', registration_number: null, payment_terms: 30, credit_limit: 600000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '7', client_code: 'CLI007', company_name: 'Lowveld Timber Products', trading_name: 'LTP', contact_person: 'James Wilson', email: 'james@ltp.co.za', phone: '+27 13 555 6789', address: '12 Forest Lane', city: 'Nelspruit', province: 'Mpumalanga', postal_code: '1200', vat_number: '4789012345', registration_number: null, payment_terms: 30, credit_limit: 450000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
  { id: '8', client_code: 'CLI008', company_name: 'Garden Route Retail Group', trading_name: 'GR Retail', contact_person: 'Anna Thompson', email: 'anna@grretail.co.za', phone: '+27 44 555 0123', address: '56 George Street', city: 'George', province: 'Western Cape', postal_code: '6530', vat_number: '4890123456', registration_number: null, payment_terms: 30, credit_limit: 300000, is_active: true, notes: null, created_at: '', updated_at: '', created_by: null },
]

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL
  return url && url !== 'https://placeholder.supabase.co'
}

const initialFormData: ClientFormData = {
  client_code: '',
  company_name: '',
  trading_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  vat_number: '',
  registration_number: '',
  payment_terms: 30,
  credit_limit: 0,
  is_active: true,
  notes: '',
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, clients])

  async function loadClients() {
    setLoading(true)
    setError(null)
    
    try {
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, using demo data')
        setClients(demoClients)
        setFilteredClients(demoClients)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('company_name')

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError)
        setError(`Failed to load clients: ${fetchError.message}`)
        // Fall back to demo data on error
        setClients(demoClients)
        setFilteredClients(demoClients)
        return
      }

      // Use data from Supabase (even if empty array)
      setClients(data || [])
      setFilteredClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
      setError('Failed to connect to database')
      setClients(demoClients)
      setFilteredClients(demoClients)
    } finally {
      setLoading(false)
    }
  }

  function filterClients() {
    let filtered = clients

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.company_name.toLowerCase().includes(term) ||
          c.client_code.toLowerCase().includes(term) ||
          c.trading_name?.toLowerCase().includes(term) ||
          c.contact_person?.toLowerCase().includes(term) ||
          c.city?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => (statusFilter === 'active' ? c.is_active : !c.is_active))
    }

    setFilteredClients(filtered)
  }

  function openAddModal() {
    setFormData(initialFormData)
    setEditingClient(null)
    setShowAddModal(true)
  }

  function openEditModal(client: Client) {
    setFormData({
      client_code: client.client_code,
      company_name: client.company_name,
      trading_name: client.trading_name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      province: client.province || '',
      postal_code: client.postal_code || '',
      vat_number: client.vat_number || '',
      registration_number: client.registration_number || '',
      payment_terms: client.payment_terms,
      credit_limit: client.credit_limit || 0,
      is_active: client.is_active,
      notes: client.notes || '',
    })
    setEditingClient(client)
    setShowAddModal(true)
    setActiveDropdown(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Check if we're working with demo data or Supabase isn't configured
      const isEditingDemoData = editingClient && !isValidUUID(editingClient.id)
      
      if (!isSupabaseConfigured() || isEditingDemoData) {
        // Handle locally for demo mode
        if (editingClient) {
          setClients(clients.map(c => (c.id === editingClient.id ? { ...c, ...formData, updated_at: new Date().toISOString() } : c)))
        } else {
          const newClient: Client = {
            ...formData,
            id: `demo-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: null,
            trading_name: formData.trading_name || null,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            city: formData.city || null,
            province: formData.province || null,
            postal_code: formData.postal_code || null,
            vat_number: formData.vat_number || null,
            registration_number: formData.registration_number || null,
            credit_limit: formData.credit_limit || null,
            notes: formData.notes || null,
          }
          setClients([...clients, newClient])
        }
        setShowAddModal(false)
        setFormData(initialFormData)
        return
      }

      if (editingClient) {
        // Update existing client in Supabase
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClient.id)

        if (updateError) {
          throw new Error(`Failed to update client: ${updateError.message}`)
        }
      } else {
        // Insert new client in Supabase
        const { error: insertError } = await supabase
          .from('clients')
          .insert({
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          throw new Error(`Failed to create client: ${insertError.message}`)
        }
      }

      // Reload clients from database to ensure consistency
      await loadClients()
      setShowAddModal(false)
      setFormData(initialFormData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      console.error('Error saving client:', err)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Helper to check if ID is a valid UUID (from Supabase) vs demo data ID
  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Are you sure you want to delete ${client.company_name}?`)) return

    setError(null)
    
    try {
      // Check if this is demo data (non-UUID ID) or Supabase not configured
      if (!isSupabaseConfigured() || !isValidUUID(client.id)) {
        // Local state only - remove from current list
        setClients(clients.filter(c => c.id !== client.id))
        setActiveDropdown(null)
        return
      }

      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (deleteError) {
        throw new Error(`Failed to delete client: ${deleteError.message}`)
      }
      
      await loadClients()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client'
      console.error('Error deleting client:', err)
      setError(errorMessage)
    }
    setActiveDropdown(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading clients...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your client profiles and tariffs</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="select-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            <p className="text-sm text-gray-500">Total Clients</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{clients.filter(c => c.is_active).length}</p>
            <p className="text-sm text-gray-500">Active Clients</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(clients.map(c => c.province).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500">Provinces Covered</p>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="card hover:shadow-md transition-shadow relative group"
          >
            {/* Dropdown menu */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setActiveDropdown(activeDropdown === client.id ? null : client.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {activeDropdown === client.id && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <Link
                    to={`/clients/${client.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Link>
                  <button
                    onClick={() => openEditModal(client)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Client
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Client
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold text-lg">
                  {client.company_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${client.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {client.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{client.client_code}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-1 truncate">{client.company_name}</h3>
                {client.trading_name && (
                  <p className="text-sm text-gray-500 truncate">t/a {client.trading_name}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {client.contact_person && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{client.contact_person}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.city && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{client.city}, {client.province}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Credit Limit</p>
                <p className="font-semibold text-gray-900">{formatCurrency(client.credit_limit)}</p>
              </div>
              <Link
                to={`/clients/${client.id}`}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No clients found</p>
          <p className="text-sm text-gray-400 mt-1">
            {clients.length === 0 
              ? 'Click "Add Client" to create your first client' 
              : 'Try adjusting your search or filter criteria'}
          </p>
        </div>
      )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingClient ? 'Update client information' : 'Enter the new client details'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Code *
                    </label>
                    <input
                      type="text"
                      value={formData.client_code}
                      onChange={(e) => setFormData({ ...formData, client_code: e.target.value.toUpperCase() })}
                      className="input-field"
                      placeholder="CLI001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trading Name
                    </label>
                    <input
                      type="text"
                      value={formData.trading_name}
                      onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <select
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="select-field"
                    >
                      <option value="">Select Province</option>
                      <option value="Gauteng">Gauteng</option>
                      <option value="Western Cape">Western Cape</option>
                      <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                      <option value="Eastern Cape">Eastern Cape</option>
                      <option value="Free State">Free State</option>
                      <option value="Mpumalanga">Mpumalanga</option>
                      <option value="Limpopo">Limpopo</option>
                      <option value="North West">North West</option>
                      <option value="Northern Cape">Northern Cape</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Financial Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms (Days)
                    </label>
                    <input
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Limit (R)
                    </label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Client is Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
