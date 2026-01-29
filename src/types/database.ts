// Database Types for Matanuska Tariff Management System

export interface DieselPrice {
  id: string
  price_date: string
  price_per_liter: number
  previous_price: number | null
  percentage_change: number | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Client {
  id: string
  client_code: string
  company_name: string
  trading_name: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  vat_number: string | null
  registration_number: string | null
  payment_terms: number
  credit_limit: number | null
  currency: 'ZAR' | 'USD'
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Route {
  id: string
  route_code: string
  origin: string
  destination: string
  distance_km: number | null
  estimated_hours: number | null
  route_description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientRoute {
  id: string
  client_id: string
  route_id: string
  base_rate: number
  current_rate: number
  rate_type: string
  currency: 'ZAR' | 'USD'
  minimum_charge: number | null
  effective_date: string
  is_active: boolean
  notes: string | null
  route_description: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
  route?: Route
}

export interface TariffHistory {
  id: string
  client_route_id: string
  client_id: string
  route_id: string
  period_month: string
  previous_rate: number | null
  new_rate: number
  currency: 'ZAR' | 'USD'
  diesel_price_at_change: number | null
  diesel_percentage_change: number | null
  adjustment_percentage: number | null
  adjustment_reason: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  // Joined fields - using Partial for flexible querying
  client?: Partial<Client>
  route?: Partial<Route>
  client_route?: Partial<ClientRoute>
}

export interface MasterControlSetting {
  id: string
  setting_key: string
  setting_value: string
  setting_type: string
  description: string | null
  updated_at: string
  updated_by: string | null
}

export interface Document {
  id: string
  client_id: string
  document_type: string
  document_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  version: number
  is_current: boolean
  expiry_date: string | null
  notes: string | null
  uploaded_at: string
  uploaded_by: string | null
  // Joined fields - using Partial for flexible querying
  client?: Partial<Client>
}

export interface DocumentType {
  id: string
  type_code: string
  type_name: string
  description: string | null
  is_required: boolean
  valid_for_days: number | null
  created_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// View Types
export interface CurrentClientRate {
  client_id: string
  client_code: string
  company_name: string
  route_id: string
  route_code: string
  origin: string
  destination: string
  distance_km: number | null
  client_route_id: string
  base_rate: number
  current_rate: number
  rate_type: string
  minimum_charge: number | null
  effective_date: string
  is_active: boolean
}

export interface DieselPriceTrend {
  price_date: string
  price_per_liter: number
  previous_price: number | null
  percentage_change: number | null
  moving_avg_3m: number
  moving_avg_6m: number
}

export interface ClientDocumentStatus {
  client_id: string
  client_code: string
  company_name: string
  type_code: string
  type_name: string
  is_required: boolean
  document_id: string | null
  document_name: string | null
  uploaded_at: string | null
  expiry_date: string | null
  status: 'Valid' | 'Missing' | 'Expired' | 'Expiring Soon'
}

// Form Types
export interface ClientFormData {
  client_code: string
  company_name: string
  trading_name?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  vat_number?: string
  registration_number?: string
  payment_terms: number
  credit_limit?: number
  is_active: boolean
  notes?: string
}

export interface RouteFormData {
  route_code: string
  origin: string
  destination: string
  distance_km?: number
  estimated_hours?: number
  route_description?: string
  is_active: boolean
}

export interface ClientRouteFormData {
  client_id: string
  route_id: string
  base_rate: number
  current_rate: number
  rate_type: string
  minimum_charge?: number
  effective_date: string
  is_active: boolean
  notes?: string
}

export interface DieselPriceFormData {
  price_date: string
  price_per_liter: number
  notes?: string
}

// Dashboard Stats
export interface DashboardStats {
  totalClients: number
  activeClients: number
  totalRoutes: number
  currentDieselPrice: number
  dieselPriceChange: number
  pendingAdjustments: number
  documentsExpiring: number
}

// Rate Calculation
export interface RateCalculation {
  clientRouteId: string
  clientName: string
  routeCode: string
  currentRate: number
  baseRate: number
  proposedRate: number
  adjustmentPercentage: number
  dieselImpact: number
}
