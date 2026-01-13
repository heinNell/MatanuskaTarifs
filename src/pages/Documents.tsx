import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, getDaysUntil } from '../lib/utils'
import type { Client, Document } from '../types'

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

function getDocumentStatus(doc: Document): { status: string; color: string } {
  if (!doc.expiry_date) return { status: 'Valid', color: 'badge-success' }
  
  const daysUntil = getDaysUntil(doc.expiry_date)
  
  if (daysUntil < 0) return { status: 'Expired', color: 'badge-danger' }
  if (daysUntil <= 30) return { status: 'Expiring Soon', color: 'badge-warning' }
  return { status: 'Valid', color: 'badge-success' }
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
  // Fixed: Only fetch and use the fields needed for the dropdown
  const [clients, setClients] = useState<Pick<Client, 'id' | 'client_code' | 'company_name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    loadDocuments()
    loadClients()
  }, [])

  useEffect(() => {
    filterDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, typeFilter, statusFilter, documents])

  async function loadDocuments() {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select(`
          *,
          client:clients(client_code, company_name)
        `)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })

      if (fetchError) throw fetchError
      
      setDocuments(data || [])
      setFilteredDocs(data || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError('Failed to load documents')
      setDocuments([])
      setFilteredDocs([])
    } finally {
      setLoading(false)
    }
  }

  async function loadClients() {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, client_code, company_name')
        .eq('is_active', true)
        .order('company_name')
      
      setClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
    }
  }

  function filterDocuments() {
    let filtered = documents

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        d =>
          d.document_name.toLowerCase().includes(term) ||
          d.client?.company_name?.toLowerCase().includes(term) ||
          d.client?.client_code?.toLowerCase().includes(term)
      )
    }

    if (typeFilter) {
      filtered = filtered.filter(d => d.document_type === typeFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter(d => {
        const { status } = getDocumentStatus(d)
        return status.toLowerCase() === statusFilter.toLowerCase()
      })
    }

    setFilteredDocs(filtered)
  }

  // Stats
  const totalDocs = documents.length
  const expiredDocs = documents.filter(d => {
    const { status } = getDocumentStatus(d)
    return status === 'Expired'
  }).length
  const expiringSoon = documents.filter(d => {
    const { status } = getDocumentStatus(d)
    return status === 'Expiring Soon'
  }).length

  const documentTypes = [...new Set(documents.map(d => d.document_type))]

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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading documents...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-gray-500 mt-1">Manage client documents and files</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
            >
              + Upload Document
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">D</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
                <p className="text-sm text-gray-500">Total Documents</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold text-lg">✓</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDocs - expiredDocs - expiringSoon}</p>
                <p className="text-sm text-gray-500">Valid</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="text-amber-600 font-bold text-lg">⏰</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{expiringSoon}</p>
                <p className="text-sm text-gray-500">Expiring Soon</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">!</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{expiredDocs}</p>
                <p className="text-sm text-gray-500">Expired</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-4"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="select-field"
                >
                  <option value="">All Types</option>
                  {documentTypes.map(type => (
                    <option key={type} value={type}>
                      {documentTypeLabels[type] || type}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select-field"
                >
                  <option value="">All Status</option>
                  <option value="valid">Valid</option>
                  <option value="expiring soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const { status, color } = getDocumentStatus(doc)
              const daysUntil = doc.expiry_date ? getDaysUntil(doc.expiry_date) : null

              return (
                <div
                  key={doc.id}
                  className="card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-bold text-lg">PDF</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${color}`}>{status}</span>
                        <span className="text-xs text-gray-500">v{doc.version}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate" title={doc.document_name}>
                        {doc.document_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {documentTypeLabels[doc.document_type] || doc.document_type}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <Link
                        to={`/clients/${doc.client_id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium truncate max-w-[60%]"
                      >
                        {doc.client?.company_name || 'Unknown Client'}
                      </Link>
                      <span className="text-gray-500">{doc.client?.client_code}</span>
                    </div>

                    {doc.expiry_date && (
                      <div className={`mt-2 text-sm ${status === 'Expired' ? 'text-red-600' : status === 'Expiring Soon' ? 'text-amber-600' : 'text-gray-500'}`}>
                        {status === 'Expired' ? (
                          <span>⚠️ Expired {formatDate(doc.expiry_date, 'dd MMM yyyy')}</span>
                        ) : status === 'Expiring Soon' ? (
                          <span>⏰ Expires in {daysUntil} days</span>
                        ) : (
                          <span>Expires: {formatDate(doc.expiry_date, 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Uploaded: {formatDate(doc.uploaded_at, 'dd MMM yyyy')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn-secondary flex-1 text-sm py-2">
                      View
                    </button>
                    <button className="btn-secondary flex-1 text-sm py-2">
                      Download
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredDocs.length === 0 && (
            <div className="card text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">F</span>
              </div>
              <p className="text-gray-500">No documents found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or upload new documents</p>
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <p className="text-sm text-gray-500 mt-1">Add a new document to a client's profile</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select className="select-field">
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} ({client.client_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type *
                </label>
                <select className="select-field">
                  <option value="">Select Type</option>
                  {Object.entries(documentTypeLabels).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input type="date" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea className="input-field" rows={2} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button className="btn-primary flex-1">
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}