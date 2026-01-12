import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileText,
    FolderOpen,
    Search,
    Trash2,
    Upload
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, getDaysUntil } from '../lib/utils'
import type { Document } from '../types'

// Demo documents
const demoDocuments: Document[] = [
  { id: '1', client_id: '1', document_type: 'SLA', document_name: 'ABC Manufacturing - SLA 2026.pdf', file_path: '/documents/abc-sla.pdf', file_size: 245000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: '2026-12-31', notes: null, uploaded_at: '2026-01-05', uploaded_by: null, client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' } },
  { id: '2', client_id: '1', document_type: 'CREDIT_APP', document_name: 'ABC Manufacturing - Credit Application.pdf', file_path: '/documents/abc-credit.pdf', file_size: 156000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: null, notes: null, uploaded_at: '2024-01-15', uploaded_by: null, client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' } },
  { id: '3', client_id: '1', document_type: 'RATE_CARD', document_name: 'ABC Manufacturing - Rate Card Jan 2026.pdf', file_path: '/documents/abc-rates.pdf', file_size: 89000, mime_type: 'application/pdf', version: 3, is_current: true, expiry_date: '2026-01-31', notes: null, uploaded_at: '2026-01-01', uploaded_by: null, client: { client_code: 'CLI001', company_name: 'ABC Manufacturing' } },
  { id: '4', client_id: '2', document_type: 'SLA', document_name: 'Cape Foods - SLA 2026.pdf', file_path: '/documents/cape-sla.pdf', file_size: 312000, mime_type: 'application/pdf', version: 2, is_current: true, expiry_date: '2026-06-30', notes: null, uploaded_at: '2025-07-01', uploaded_by: null, client: { client_code: 'CLI002', company_name: 'Cape Foods International' } },
  { id: '5', client_id: '2', document_type: 'CONTRACT', document_name: 'Cape Foods - Master Contract.pdf', file_path: '/documents/cape-contract.pdf', file_size: 567000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: '2027-12-31', notes: null, uploaded_at: '2025-01-01', uploaded_by: null, client: { client_code: 'CLI002', company_name: 'Cape Foods International' } },
  { id: '6', client_id: '3', document_type: 'INSURANCE', document_name: 'DCS - Insurance Certificate.pdf', file_path: '/documents/dcs-insurance.pdf', file_size: 198000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: '2025-12-15', notes: 'Expired - needs renewal', uploaded_at: '2024-12-15', uploaded_by: null, client: { client_code: 'CLI003', company_name: 'Durban Chemical Supplies' } },
  { id: '7', client_id: '4', document_type: 'SLA', document_name: 'EP Distributors - SLA.pdf', file_path: '/documents/ep-sla.pdf', file_size: 234000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: '2026-03-31', notes: null, uploaded_at: '2025-04-01', uploaded_by: null, client: { client_code: 'CLI004', company_name: 'Eastern Province Distributors' } },
  { id: '8', client_id: '5', document_type: 'BEE_CERT', document_name: 'GSW - BEE Certificate.pdf', file_path: '/documents/gsw-bee.pdf', file_size: 145000, mime_type: 'application/pdf', version: 1, is_current: true, expiry_date: '2026-02-28', notes: null, uploaded_at: '2025-03-01', uploaded_by: null, client: { client_code: 'CLI005', company_name: 'Gauteng Steel Works' } },
]

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
  const [documents, setDocuments] = useState<Document[]>(demoDocuments)
  const [filteredDocs, setFilteredDocs] = useState(demoDocuments)
  const [_loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [])

  useEffect(() => {
    filterDocuments()
  }, [searchTerm, typeFilter, statusFilter, documents])

  async function loadDocuments() {
    try {
      const { data } = await supabase
        .from('documents')
        .select(`
          *,
          client:clients(client_code, company_name)
        `)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })

      if (data && data.length > 0) {
        setDocuments(data)
        setFilteredDocs(data)
      }
    } catch (error) {
      console.log('Using demo data:', error)
    } finally {
      setLoading(false)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">Manage client documents and files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
            <p className="text-sm text-gray-500">Total Documents</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalDocs - expiredDocs - expiringSoon}</p>
            <p className="text-sm text-gray-500">Valid</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{expiringSoon}</p>
            <p className="text-sm text-gray-500">Expiring Soon</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
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
                  <FileText className="w-6 h-6 text-red-600" />
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
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Expired {formatDate(doc.expiry_date, 'dd MMM yyyy')}
                      </span>
                    ) : status === 'Expiring Soon' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires in {daysUntil} days
                      </span>
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
                <button className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1">
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1">
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredDocs.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or upload new documents</p>
        </div>
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
                  <option value="1">ABC Manufacturing (CLI001)</option>
                  <option value="2">Cape Foods International (CLI002)</option>
                  <option value="3">Durban Chemical Supplies (CLI003)</option>
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
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
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
