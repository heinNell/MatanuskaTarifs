import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSupabase } from '../context/SupabaseContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', label: 'D' },
  { name: 'Master Control', href: '/master-control', label: 'M' },
  { name: 'Clients', href: '/clients', label: 'C' },
  { name: 'Routes', href: '/routes', label: 'R' },
  { name: 'Rate Sheets', href: '/rate-sheets', label: 'S' },
  { name: 'Tariff History', href: '/tariff-history', label: 'H' },
  { name: 'Documents', href: '/documents', label: 'F' },
  { name: 'Settings', href: '/settings', label: '⚙' },
]

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dieselPrice, setDieselPrice] = useState<number | null>(null)
  const { user, signOut } = useSupabase()
  const navigate = useNavigate()

  useEffect(() => {
    loadDieselPrice()
  }, [])

  async function loadDieselPrice() {
    try {
      const { data } = await supabase
        .from('diesel_prices')
        .select('price_per_liter')
        .order('price_date', { ascending: false })
        .limit(1)
        .single()
      
      if (data) {
        setDieselPrice(data.price_per_liter)
      }
    } catch (error) {
      console.error('Error loading diesel price:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-white">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Matanuska</h1>
              <p className="text-xs text-gray-500">Tariff Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold">{item.label}</span>
              <span>{item.name}</span>
              <span className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100">→</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Sign out"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            ☰
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Current Diesel Price</p>
              <p className="text-sm font-semibold text-gray-900">
                {dieselPrice !== null ? `${formatCurrency(dieselPrice)} / L` : 'Loading...'}
              </p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
