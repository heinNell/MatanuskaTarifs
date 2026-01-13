import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatNumber } from '../lib/utils'
import type { Route, RouteFormData } from '../types'

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
        r.destination.toLowerCase().includes(term)
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
          <span className="text-red-500 flex-shrink-0">⚠️</span>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-gray-500 mt-1">Manage transportation routes</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          + Add Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-blue-600">R</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
            <p className="text-sm text-gray-500">Total Routes</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-green-600">✓</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeRoutes}</p>
            <p className="text-sm text-gray-500">Active Routes</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-purple-600">📍</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(totalDistance)} km</p>
            <p className="text-sm text-gray-500">Total Network</p>
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
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Route Code</th>
                <th className="table-header">Origin</th>
                <th className="table-header">Destination</th>
                <th className="table-header text-right">Distance</th>
                <th className="table-header text-right">Est. Hours</th>
                <th className="table-header">Description</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(route)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(route)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl text-gray-300 block mb-4">🛤️</span>
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
                    Description
                  </label>
                  <textarea
                    value={formData.route_description}
                    onChange={(e) => setFormData({ ...formData, route_description: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Route description..."
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
    </div>
  )
}
