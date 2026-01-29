import { AlertTriangle, Pencil, Route as RouteIcon, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { formatNumber } from '../lib/utils'
import type { Route, RouteFormData } from '../types'

interface BulkUploadResult {
  success: number
  failed: number
  errors: string[]
}

const initialFormData: RouteFormData = {
  route_code: '',
  origin: '',
  destination: '',
  distance_km: undefined,
  estimated_hours: undefined,
  route_description: '',
  is_active: true,
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [formData, setFormData] = useState<RouteFormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkUploadResult, setBulkUploadResult] = useState<BulkUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, routes])

  async function loadRoutes() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('routes')
        .select('*')
        .order('route_code')

      if (fetchError) throw fetchError
      
      setRoutes(data || [])
      setFilteredRoutes(data || [])
    } catch (err) {
      console.error('Error loading routes:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load routes'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function filterRoutes() {
    if (!searchTerm) {
      setFilteredRoutes(routes)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = routes.filter(
      r =>
        r.route_code.toLowerCase().includes(term) ||
        r.origin.toLowerCase().includes(term) ||
        r.destination.toLowerCase().includes(term) ||
        (r.route_description || '').toLowerCase().includes(term)
    )
    setFilteredRoutes(filtered)
  }

  function openAddModal() {
    setFormData(initialFormData)
    setEditingRoute(null)
    setError(null)
    setShowModal(true)
  }

  function openEditModal(route: Route) {
    setFormData({
      route_code: route.route_code,
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km || undefined,
      estimated_hours: route.estimated_hours || undefined,
      route_description: route.route_description || '',
      is_active: route.is_active,
    })
    setEditingRoute(route)
    setError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (editingRoute) {
        const { error: updateError } = await supabase
          .from('routes')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRoute.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('routes')
          .insert({
            route_code: formData.route_code,
            origin: formData.origin,
            destination: formData.destination,
            distance_km: formData.distance_km || null,
            estimated_hours: formData.estimated_hours || null,
            route_description: formData.route_description || null,
            is_active: formData.is_active,
          })

        if (insertError) throw insertError
      }

      await loadRoutes()
      setShowModal(false)
      setFormData(initialFormData)
    } catch (err) {
      console.error('Error saving route:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save route'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(route: Route) {
    if (!confirm(`Delete route ${route.route_code}?`)) return

    try {
      const { error: deleteError } = await supabase
        .from('routes')
        .delete()
        .eq('id', route.id)

      if (deleteError) throw deleteError
      await loadRoutes()
    } catch (err) {
      console.error('Error deleting route:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete route'
      setError(errorMessage)
    }
  }

  // Download Excel template for bulk upload
  function downloadTemplate() {
    const templateData = [
      {
        route_code: 'JHB-CPT',
        origin: 'Johannesburg',
        destination: 'Cape Town',
        distance_km: 1400,
        estimated_hours: 16,
        route_description: 'Via N1 • Night delivery window',
        is_active: 'Yes'
      },
      {
        route_code: 'DBN-JHB',
        origin: 'Durban',
        destination: 'Johannesburg',
        distance_km: 580,
        estimated_hours: 6.5,
        route_description: 'Coastal to inland • Toll roads preferred',
        is_active: 'Yes'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 },  // route_code
      { wch: 20 },  // origin
      { wch: 20 },  // destination
      { wch: 12 },  // distance_km
      { wch: 14 },  // estimated_hours
      { wch: 35 },  // route_description
      { wch: 10 }   // is_active
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Routes Template')
    
    // Add instructions sheet
    const instructionsData = [
      { Instructions: 'Routes Bulk Upload Template' },
      { Instructions: '' },
      { Instructions: 'Column Descriptions:' },
      { Instructions: '• route_code: Unique code for the route (required) - e.g., JHB-CPT' },
      { Instructions: '• origin: Starting location (required)' },
      { Instructions: '• destination: End location (required)' },
      { Instructions: '• distance_km: Distance in kilometers (optional)' },
      { Instructions: '• estimated_hours: Estimated travel time in hours (optional)' },
      { Instructions: '• route_description: Unique comment to distinguish similar routes (optional)' },
      { Instructions: '• is_active: Yes or No (defaults to Yes if empty)' },
      { Instructions: '' },
      { Instructions: 'Notes:' },
      { Instructions: '• Delete the sample rows before uploading your data' },
      { Instructions: '• Route codes must be unique' },
      { Instructions: '• Use the comment field to differentiate routes with the same origin/destination' },
      { Instructions: '• Do not modify the column headers' }
    ]
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData)
    wsInstructions['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

    XLSX.writeFile(wb, 'routes_upload_template.xlsx')
  }

  // Handle file selection for bulk upload
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        setBulkUploading(true)
        setBulkUploadResult(null)
        
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

        if (jsonData.length === 0) {
          setBulkUploadResult({
            success: 0,
            failed: 0,
            errors: ['The Excel file contains no data rows']
          })
          return
        }

        const result = await processBulkUpload(jsonData)
        setBulkUploadResult(result)
        
        if (result.success > 0) {
          await loadRoutes()
        }
      } catch (err) {
        console.error('Error processing file:', err)
        setBulkUploadResult({
          success: 0,
          failed: 0,
          errors: ['Failed to process the Excel file. Please ensure it\'s a valid .xlsx file.']
        })
      } finally {
        setBulkUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
    reader.readAsBinaryString(file)
  }

  // Process the bulk upload data
  async function processBulkUpload(data: Record<string, unknown>[]): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Get existing route codes to check for duplicates
    const existingCodes = new Set(routes.map(r => r.route_code.toUpperCase()))

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // Excel row number (1-indexed + header)

      try {
        // Validate required fields
        const routeCode = String(row.route_code || '').trim().toUpperCase()
        const origin = String(row.origin || '').trim()
        const destination = String(row.destination || '').trim()

        if (!routeCode) {
          result.errors.push(`Row ${rowNum}: Route code is required`)
          result.failed++
          continue
        }

        if (!origin) {
          result.errors.push(`Row ${rowNum}: Origin is required`)
          result.failed++
          continue
        }

        if (!destination) {
          result.errors.push(`Row ${rowNum}: Destination is required`)
          result.failed++
          continue
        }

        // Check for duplicate route code
        if (existingCodes.has(routeCode)) {
          result.errors.push(`Row ${rowNum}: Route code "${routeCode}" already exists`)
          result.failed++
          continue
        }

        // Parse optional fields
        const distanceKm = row.distance_km ? parseFloat(String(row.distance_km)) : null
        const estimatedHours = row.estimated_hours ? parseFloat(String(row.estimated_hours)) : null
        const routeDescription = String(row.route_description || '').trim() || null
        const isActiveStr = String(row.is_active || 'Yes').trim().toLowerCase()
        const isActive = isActiveStr !== 'no' && isActiveStr !== 'false' && isActiveStr !== '0'

        // Validate numeric fields
        if (distanceKm !== null && isNaN(distanceKm)) {
          result.errors.push(`Row ${rowNum}: Invalid distance value`)
          result.failed++
          continue
        }

        if (estimatedHours !== null && isNaN(estimatedHours)) {
          result.errors.push(`Row ${rowNum}: Invalid estimated hours value`)
          result.failed++
          continue
        }

        // Insert into database
        const { error: insertError } = await supabase
          .from('routes')
          .insert({
            route_code: routeCode,
            origin,
            destination,
            distance_km: distanceKm,
            estimated_hours: estimatedHours,
            route_description: routeDescription,
            is_active: isActive
          })

        if (insertError) {
          result.errors.push(`Row ${rowNum}: ${insertError.message}`)
          result.failed++
        } else {
          result.success++
          existingCodes.add(routeCode) // Add to set to catch duplicates within the same upload
        }
      } catch (err) {
        result.errors.push(`Row ${rowNum}: Unexpected error`)
        result.failed++
      }
    }

    return result
  }

  const totalDistance = routes.reduce((sum, r) => sum + (r.distance_km || 0), 0)
  const activeRoutes = routes.filter(r => r.is_active).length

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
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Routes</h1>
          <p className="text-gray-500 mt-2">Manage transportation routes</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBulkUploadModal(true)} 
            className="btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Bulk Upload
          </button>
          <button onClick={openAddModal} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Route
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card stat-card-blue">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{routes.length}</p>
              <p className="text-sm font-medium text-gray-500">Total Routes</p>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{activeRoutes}</p>
              <p className="text-sm font-medium text-gray-500">Active Routes</p>
            </div>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(totalDistance)} km</p>
              <p className="text-sm font-medium text-gray-500">Total Network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Routes Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="w-full table-responsive">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header" style={{ minWidth: '100px' }}>Route Code</th>
                <th className="table-header" style={{ minWidth: '120px' }}>Origin</th>
                <th className="table-header" style={{ minWidth: '120px' }}>Destination</th>
                <th className="table-header text-right" style={{ minWidth: '90px' }}>Distance</th>
                <th className="table-header text-right" style={{ minWidth: '80px' }}>Hours</th>
                <th className="table-header" style={{ minWidth: '150px' }}>Comments</th>
                <th className="table-header" style={{ minWidth: '80px' }}>Status</th>
                <th className="table-header" style={{ minWidth: '80px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded font-medium">
                      {route.route_code}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">⬤</span>
                      {route.origin}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">⬤</span>
                      {route.destination}
                    </div>
                  </td>
                  <td className="table-cell text-right font-medium">
                    {route.distance_km ? `${formatNumber(route.distance_km)} km` : '-'}
                  </td>
                  <td className="table-cell text-right">
                    {route.estimated_hours ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-400">⏱️</span>
                        {route.estimated_hours}h
                      </div>
                    ) : '-'}
                  </td>
                  <td className="table-cell text-gray-500 text-sm max-w-xs truncate">
                    {route.route_description || '-'}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${route.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {route.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(route)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(route)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No routes found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route Code *
                  </label>
                  <input
                    type="text"
                    value={formData.route_code}
                    onChange={(e) => setFormData({ ...formData, route_code: e.target.value.toUpperCase() })}
                    className="input-field font-mono"
                    placeholder="JHB-CPT"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origin *
                  </label>
                  <input
                    type="text"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="input-field"
                    placeholder="Johannesburg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="input-field"
                    placeholder="Cape Town"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    value={formData.distance_km || ''}
                    onChange={(e) => setFormData({ ...formData, distance_km: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="input-field"
                    placeholder="1400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours || ''}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="input-field"
                    placeholder="16"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments
                  </label>
                  <textarea
                    value={formData.route_description}
                    onChange={(e) => setFormData({ ...formData, route_description: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Unique comment to distinguish similar routes"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Route is Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving...' : editingRoute ? 'Update' : 'Add Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bulk Upload Routes</h3>
                <p className="text-sm text-gray-500 mt-1">Upload multiple routes from Excel file</p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false)
                  setBulkUploadResult(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Download Template Section */}
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-5 border border-primary-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Step 1: Download Template</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Download the Excel template with the correct column format and sample data.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 font-medium rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Template (.xlsx)
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Step 2: Upload Your File</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Fill in your routes and upload the completed Excel file.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="bulk-upload-input"
                    />
                    <label
                      htmlFor="bulk-upload-input"
                      className={`mt-3 inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg border transition-colors text-sm cursor-pointer ${
                        bulkUploading 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      {bulkUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          Select Excel File
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload Results */}
              {bulkUploadResult && (
                <div className={`rounded-xl p-5 border ${
                  bulkUploadResult.failed === 0 && bulkUploadResult.success > 0
                    ? 'bg-green-50 border-green-200'
                    : bulkUploadResult.success === 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {bulkUploadResult.failed === 0 && bulkUploadResult.success > 0 ? (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">Upload Complete</h4>
                      <p className="text-sm text-gray-600">
                        <span className="text-green-600 font-medium">{bulkUploadResult.success} successful</span>
                        {bulkUploadResult.failed > 0 && (
                          <span className="text-red-600 font-medium"> • {bulkUploadResult.failed} failed</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {bulkUploadResult.errors.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-gray-700 mb-2">Errors:</p>
                      <ul className="space-y-1">
                        {bulkUploadResult.errors.map((error, idx) => (
                          <li key={idx} className="text-xs text-red-600 flex items-start gap-2">
                            <span className="text-red-400 mt-0.5">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowBulkUploadModal(false)
                  setBulkUploadResult(null)
                }}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
