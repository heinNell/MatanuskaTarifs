import { AlertTriangle, Calendar, Download, Eye, FileEdit, FileText, Palette, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import
  {
    downloadPdf,
    generateClientRateSheet,
    openPdfInNewTab,
    type OrganizationBranding,
    type RateSheetData,
  } from '../lib/pdfGenerator'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import type { Client, ClientRoute, Route } from '../types'

// Default terms and conditions
const defaultTermsAndConditions = `1. Rates are subject to fuel price fluctuations and may be adjusted monthly based on the current diesel price.
2. All rates are quoted in South African Rand (ZAR) and exclude VAT unless otherwise stated.
3. Payment terms are as per the client agreement. Late payments may incur interest charges.
4. Minimum charges apply regardless of load size or weight.
5. Rates are valid for the period specified above. Extensions require written confirmation.
6. Additional charges may apply for special handling, hazardous materials, or after-hours deliveries.
7. The company reserves the right to adjust rates with 30 days written notice.
8. These rates supersede all previous quotations for the same routes.`

// Default branding
const defaultBranding: OrganizationBranding = {
  companyName: 'Matanuska Transport',
  tagline: 'Your Trusted Logistics Partner',
  address: '123 Logistics Drive, Johannesburg, 2000',
  phone: '+27 11 555 0000',
  email: 'rates@matanuska.co.za',
  website: 'www.matanuska.co.za',
  vatNumber: '4000000000',
  registrationNumber: '2020/000000/07',
  primaryColor: '#1e40af',
  accentColor: '#3b82f6',
}

// Business profiles - different companies with their own VAT/registration and addresses
interface BusinessProfile {
  id: string
  name: string
  country: string
  vatNumber: string
  registrationNumber: string
  address: string
  phone: string
  email: string
}

const defaultBusinessProfiles: BusinessProfile[] = [
  {
    id: 'sa',
    name: 'Matanuska (Pty) Ltd',
    country: 'South Africa',
    vatNumber: '4710136013',
    registrationNumber: '2019/542290/07',
    address: 'PO BOX 25148, Boksburg, 1462, South Africa',
    phone: '+27 66 273 1270',
    email: 'heinrich@matanuska.co.za',
  },
  {
    id: 'zim',
    name: 'Matanuska (Pvt) Ltd',
    country: 'Zimbabwe',
    vatNumber: '2000321177',
    registrationNumber: '',
    address: '1 Abercorn Street, Harare, Zimbabwe',
    phone: '+27 66 273 1270',
    email: 'heinrich@matanuska.co.za',
  },
]

interface SavedRateSheet {
  id: string
  client_id: string
  client_name: string
  reference: string
  effective_date: string
  valid_until: string
  custom_notes: string | null
  terms: string | null
  prepared_by: string | null
  created_at: string
}

export default function RateSheets() {
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientRoutes, setClientRoutes] = useState<(ClientRoute & { route?: Partial<Route> })[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Rate sheet form state
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().split('T')[0]
  })
  const [customNotes, setCustomNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState(defaultTermsAndConditions)
  const [preparedBy, setPreparedBy] = useState('')
  const [reference, setReference] = useState('')
  const [vatInclusive, setVatInclusive] = useState(false)
  
  // Branding state
  const [branding, setBranding] = useState<OrganizationBranding>(defaultBranding)
  const [showBrandingModal, setShowBrandingModal] = useState(false)
  const [tempBranding, setTempBranding] = useState<OrganizationBranding>(defaultBranding)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Business profile state
  const [businessProfiles] = useState<BusinessProfile[]>(defaultBusinessProfiles)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('sa')
  
  // Saved rate sheets (for future use)
  const [_savedRateSheets, _setSavedRateSheets] = useState<SavedRateSheet[]>([])
  const [activeTab, setActiveTab] = useState<'generate' | 'saved' | 'branding'>('generate')

  useEffect(() => {
    loadClients()
    loadSavedBranding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-select client from URL parameter
  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setSelectedClient(client)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clients])

  useEffect(() => {
    if (selectedClient) {
      loadClientRoutes(selectedClient.id)
      generateReference()
    } else {
      setClientRoutes([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient])

  async function loadClients() {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('company_name')

      if (fetchError) throw fetchError
      setClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  async function loadClientRoutes(clientId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('client_routes')
        .select(`
          *,
          route:routes(*)
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)

      if (fetchError) throw fetchError
      setClientRoutes(data || [])
    } catch (err) {
      console.error('Error loading client routes:', err)
      setError('Failed to load client routes')
    }
  }

  async function loadSavedBranding() {
    try {
      // Load branding settings
      const { data: brandingData, error: brandingError } = await supabase
        .from('master_control_settings')
        .select('*')
        .eq('setting_key', 'organization_branding')
        .single()

      if (brandingError) {
        console.log('No saved branding found or error:', brandingError.message)
      } else if (brandingData?.setting_value) {
        const savedBranding = JSON.parse(brandingData.setting_value)
        console.log('Loaded saved branding:', savedBranding)
        setBranding({ ...defaultBranding, ...savedBranding })
      }

      // Load saved terms & conditions
      const { data: termsData, error: termsError } = await supabase
        .from('master_control_settings')
        .select('*')
        .eq('setting_key', 'default_terms_conditions')
        .single()

      if (termsError) {
        console.log('No saved terms found or error:', termsError.message)
      } else if (termsData?.setting_value) {
        setTermsAndConditions(termsData.setting_value)
      }

      // Load saved custom notes
      const { data: notesData, error: notesError } = await supabase
        .from('master_control_settings')
        .select('*')
        .eq('setting_key', 'default_custom_notes')
        .single()

      if (notesError) {
        console.log('No saved notes found or error:', notesError.message)
      } else if (notesData?.setting_value) {
        setCustomNotes(notesData.setting_value)
      }
    } catch (err) {
      console.error('Error loading saved branding:', err)
      // Use default branding and terms
    }
  }

  async function saveDefaultTerms() {
    try {
      const { error: saveError } = await supabase
        .from('master_control_settings')
        .upsert(
          {
            setting_key: 'default_terms_conditions',
            setting_value: termsAndConditions,
            setting_type: 'text',
            description: 'Default terms and conditions for all rate sheets',
          },
          { onConflict: 'setting_key' }
        )
      
      if (saveError) {
        console.error('Supabase error saving terms:', saveError)
        setError('Failed to save terms: ' + saveError.message)
        return
      }
      
      setError(null)
      // Show success feedback
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Terms & Conditions saved as default template!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (err) {
      console.error('Error saving terms:', err)
      setError('Failed to save terms & conditions')
    }
  }

  async function saveDefaultNotes() {
    try {
      const { error: saveError } = await supabase
        .from('master_control_settings')
        .upsert(
          {
            setting_key: 'default_custom_notes',
            setting_value: customNotes,
            setting_type: 'text',
            description: 'Default custom notes for all rate sheets',
          },
          { onConflict: 'setting_key' }
        )
      
      if (saveError) {
        console.error('Supabase error saving notes:', saveError)
        setError('Failed to save notes: ' + saveError.message)
        return
      }
      
      setError(null)
      // Show success feedback
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Custom Notes saved as default template!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (err) {
      console.error('Error saving notes:', err)
      setError('Failed to save custom notes')
    }
  }

  async function saveBranding(brandingToSave?: typeof branding) {
    const dataToSave = brandingToSave || tempBranding
    try {
      const { error: saveError } = await supabase
        .from('master_control_settings')
        .upsert(
          {
            setting_key: 'organization_branding',
            setting_value: JSON.stringify(dataToSave),
            setting_type: 'json',
            description: 'Organization branding for rate sheets',
          },
          { onConflict: 'setting_key' }
        )

      if (saveError) {
        console.error('Supabase error saving branding:', saveError)
        setError('Failed to save branding settings: ' + saveError.message)
        return
      }

      if (!brandingToSave) {
        setBranding(tempBranding)
        setShowBrandingModal(false)
      }
      
      // Show success feedback
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.textContent = 'Branding settings saved successfully!'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
    } catch (err) {
      console.error('Error saving branding:', err)
      setError('Failed to save branding settings')
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file must be smaller than 2MB')
      return
    }

    setUploadingLogo(true)
    setError(null)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const updatedBranding = { ...branding, logoBase64: base64 }
        setBranding(updatedBranding)
        
        // Auto-save branding with the new logo
        try {
          const { error: saveError } = await supabase
            .from('master_control_settings')
            .upsert(
              {
                setting_key: 'organization_branding',
                setting_value: JSON.stringify(updatedBranding),
                setting_type: 'json',
                description: 'Organization branding for rate sheets',
              },
              { onConflict: 'setting_key' }
            )
          
          if (saveError) {
            console.error('Supabase error auto-saving logo:', saveError)
            setError('Failed to save logo: ' + saveError.message)
          } else {
            // Show success feedback
            const successMsg = document.createElement('div')
            successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
            successMsg.textContent = 'Logo uploaded and saved as default!'
            document.body.appendChild(successMsg)
            setTimeout(() => successMsg.remove(), 3000)
          }
        } catch (saveErr) {
          console.error('Error auto-saving logo:', saveErr)
        }
        
        setUploadingLogo(false)
      }
      reader.onerror = () => {
        setError('Failed to read logo file')
        setUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error uploading logo:', err)
      setError('Failed to upload logo')
      setUploadingLogo(false)
    }
  }

  function removeLogo() {
    setBranding({ ...branding, logoBase64: undefined })
  }

  function generateReference() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setReference(`RS-${year}${month}-${random}`)
  }

  async function handleGeneratePdf(preview = false) {
    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    if (clientRoutes.length === 0) {
      setError('Selected client has no routes configured')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // Get selected business profile
      const selectedProfile = businessProfiles.find(p => p.id === selectedProfileId) || businessProfiles[0]
      
      // Use USD for Zimbabwe company, otherwise use client's currency or ZAR
      const currency = selectedProfile.id === 'zim' ? 'USD' : (selectedClient.currency || 'ZAR')

      const rateSheetData: RateSheetData = {
        client: selectedClient,
        routes: clientRoutes,
        effectiveDate,
        validUntil,
        customNotes: customNotes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        preparedBy: preparedBy || undefined,
        reference,
        currency,
        vatInclusive,
      }
      const brandingWithProfile: OrganizationBranding = {
        ...branding,
        companyName: selectedProfile.name,
        vatNumber: selectedProfile.vatNumber,
        registrationNumber: selectedProfile.registrationNumber,
        address: selectedProfile.address,
        phone: selectedProfile.phone,
        email: selectedProfile.email,
      }

      const pdf = generateClientRateSheet(rateSheetData, brandingWithProfile)
      const filename = `RateSheet_${selectedClient.client_code}_${effectiveDate}.pdf`

      if (preview) {
        openPdfInNewTab(pdf)
      } else {
        downloadPdf(pdf, filename)
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  function openBrandingModal() {
    setTempBranding({ ...branding })
    setShowBrandingModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Sheets</h1>
          <p className="text-gray-500 mt-1">Generate professional rate sheets for clients</p>
        </div>
        <button
          onClick={openBrandingModal}
          className="btn-secondary flex items-center gap-2"
        >
          <Palette className="w-4 h-4" />
          Branding Settings
        </button>
      </div>

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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'generate'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generate Rate Sheet
            </div>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'branding'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
              </svg>
              Branding Preview
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <div className="card">
              <h3 className="card-header">
                Select Client
              </h3>
              <div className="relative">
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === e.target.value)
                    setSelectedClient(client || null)
                  }}
                  className="input-field appearance-none pr-10"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.client_code} - {client.company_name}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
              </div>

              {selectedClient && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedClient.company_name}</p>
                  <p className="text-sm text-gray-500">{selectedClient.contact_person}</p>
                  <p className="text-sm text-gray-500">{selectedClient.email}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {clientRoutes.length} route(s) configured
                  </p>
                </div>
              )}
            </div>

            {/* Business Profile Selection */}
            <div className="card">
              <h3 className="card-header flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
                Business Entity
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Select which company entity to use on the rate sheet.
              </p>
              <div className="space-y-3">
                {businessProfiles.map((profile) => (
                  <label
                    key={profile.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedProfileId === profile.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessProfile"
                      value={profile.id}
                      checked={selectedProfileId === profile.id}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{profile.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          profile.country === 'South Africa' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {profile.country === 'South Africa' ? '🇿🇦 SA' : '🇿🇼 ZIM'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <p>VAT: {profile.vatNumber}{profile.registrationNumber ? ` | Reg: ${profile.registrationNumber}` : ''}</p>
                        <p className="text-xs text-gray-400">{profile.address}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date & Reference */}
            <div className="card">
              <h3 className="card-header flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Reference
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="input-field font-mono"
                    />
                    <button
                      onClick={generateReference}
                      className="btn-secondary px-3"
                      title="Generate new reference"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prepared By
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vatInclusive}
                    onChange={(e) => setVatInclusive(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    VAT Inclusive
                  </span>
                  <span className="text-xs text-gray-500">
                    (Shows "VAT Incl" on rate column if checked)
                  </span>
                </label>
              </div>
            </div>

            {/* Routes Preview */}
            {selectedClient && clientRoutes.length > 0 && (
              <div className="card overflow-hidden">
                <h3 className="card-header flex items-center justify-between">
                  <span>Routes & Rates</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedProfileId === 'zim' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedProfileId === 'zim' ? '$ USD' : 'R ZAR'}
                  </span>
                </h3>
                <div className="table-container">
                  <table className="w-full" style={{ minWidth: '500px' }}>
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="table-header" style={{ minWidth: '90px' }}>Route</th>
                        <th className="table-header" style={{ minWidth: '180px' }}>Origin → Destination</th>
                        <th className="table-header text-right" style={{ minWidth: '110px' }}>Current Rate</th>
                        <th className="table-header" style={{ minWidth: '80px' }}>Type</th>
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
                          <td className="table-cell text-right font-semibold">
                            {formatCurrency(cr.current_rate, selectedProfileId === 'zim' ? 'USD' : (selectedClient?.currency as 'ZAR' | 'USD' || 'ZAR'))}
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-info">
                              {cr.rate_type.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Custom Notes */}
            <div className="card">
              <h3 className="card-header flex items-center gap-2">
                <FileEdit className="w-4 h-4" />
                Custom Notes
              </h3>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Add any special notes or comments for this rate sheet..."
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => setCustomNotes('')}
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                >
                  Clear notes
                </button>
                <button
                  onClick={saveDefaultNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save as Default
                </button>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="card">
              <h3 className="card-header">
                Terms & Conditions
              </h3>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="input-field font-mono text-sm"
                rows={10}
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => setTermsAndConditions(defaultTermsAndConditions)}
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                >
                  Reset to system default
                </button>
                <button
                  onClick={saveDefaultTerms}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save as Default
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Save your terms & conditions once to use across all future rate sheets. 
                The saved template will automatically load when you open this page.
              </p>
            </div>
          </div>

          {/* Right Column - Preview & Actions */}
          <div className="space-y-6">
            {/* Quick Preview Card */}
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Rate Sheet Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedClient ? selectedClient.company_name : 'Select a client to preview'}
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleGeneratePdf(true)}
                    disabled={!selectedClient || generating}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview PDF
                  </button>
                  <button
                    onClick={() => handleGeneratePdf(false)}
                    disabled={!selectedClient || generating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Branding Preview */}
            <div className="card">
              <h3 className="card-header">
                Current Branding
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  <div 
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: branding.accentColor }}
                  />
                  <span className="text-sm text-gray-500">Brand Colors</span>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{branding.companyName}</p>
                  <p className="text-gray-500">{branding.tagline}</p>
                </div>
                <button
                  onClick={openBrandingModal}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Edit branding settings →
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="card bg-amber-50 border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">💡 Tips</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Ensure client routes are set up before generating</li>
                <li>• Customize notes for specific client requirements</li>
                <li>• Preview before downloading to check formatting</li>
                <li>• Update branding to match your company identity</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding Form */}
          <div className="card">
            <h3 className="card-header">
              Organization Details
            </h3>
            <div className="space-y-4">
              {/* Logo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-start gap-4">
                  {branding.logoBase64 ? (
                    <div className="relative">
                      <img 
                        src={branding.logoBase64} 
                        alt="Company Logo" 
                        className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-white p-2"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Remove logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <span className="text-gray-400 text-2xl">🖼️</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <span className="btn-secondary inline-flex items-center gap-2">
                        {uploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {branding.logoBase64 ? 'Change Logo' : 'Upload Logo'}
                          </>
                        )}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG up to 2MB. Recommended: 200x200px or similar aspect ratio.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={branding.companyName}
                  onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={branding.tagline || ''}
                  onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={branding.address}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={branding.phone}
                    onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={branding.email}
                    onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={branding.website || ''}
                  onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={branding.vatNumber || ''}
                    onChange={(e) => setBranding({ ...branding, vatNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={branding.registrationNumber || ''}
                    onChange={(e) => setBranding({ ...branding, registrationNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="input-field font-mono flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="input-field font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setBranding(defaultBranding)}
                className="btn-secondary flex items-center gap-2"
              >
                ↻ Reset to Default
              </button>
              <button
                onClick={() => saveBranding(branding)}
                className="btn-primary flex items-center gap-2"
              >
                Save Branding
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="card">
            <h3 className="card-header">Preview</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header Preview */}
              <div 
                className="p-6 flex items-center gap-4"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {branding.logoBase64 && (
                  <img 
                    src={branding.logoBase64} 
                    alt="Logo" 
                    className="w-16 h-16 object-contain bg-white rounded-lg p-1"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{branding.companyName}</h2>
                  {branding.tagline && (
                    <p className="text-sm text-white/80 mt-1">{branding.tagline}</p>
                  )}
                </div>
              </div>
              
              {/* Content Preview */}
              <div className="p-6 space-y-4">
                <div 
                  className="text-lg font-semibold"
                  style={{ color: branding.primaryColor }}
                >
                  CLIENT RATE SHEET
                </div>
                
                <div 
                  className="h-1 w-20 rounded"
                  style={{ backgroundColor: branding.accentColor }}
                />
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">Sample Client Name</p>
                  <p className="text-sm text-gray-500">Sample Address, City</p>
                </div>
                
                <div 
                  className="p-3 rounded text-white text-sm"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  Effective: {formatDate(new Date().toISOString(), 'dd MMM yyyy')}
                </div>
                
                <div className="border-t pt-4 text-sm text-gray-500">
                  <p>{branding.address}</p>
                  <p>{branding.phone} | {branding.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branding Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Organization Branding</h2>
                <button
                  onClick={() => setShowBrandingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Logo Upload in Modal */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {tempBranding.logoBase64 ? (
                    <div className="relative">
                      <img 
                        src={tempBranding.logoBase64} 
                        alt="Company Logo" 
                        className="w-20 h-20 object-contain border border-gray-200 rounded-lg bg-white p-2"
                      />
                      <button
                        onClick={() => setTempBranding({ ...tempBranding, logoBase64: undefined })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        title="Remove logo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <span className="text-gray-400 text-xl">🖼️</span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
                          const reader = new FileReader()
                          reader.onload = () => {
                            setTempBranding({ ...tempBranding, logoBase64: reader.result as string })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                    <span className="btn-secondary text-sm inline-flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      {tempBranding.logoBase64 ? 'Change' : 'Upload'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={tempBranding.companyName}
                    onChange={(e) => setTempBranding({ ...tempBranding, companyName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tempBranding.tagline || ''}
                    onChange={(e) => setTempBranding({ ...tempBranding, tagline: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={tempBranding.address}
                    onChange={(e) => setTempBranding({ ...tempBranding, address: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={tempBranding.phone}
                    onChange={(e) => setTempBranding({ ...tempBranding, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={tempBranding.email}
                    onChange={(e) => setTempBranding({ ...tempBranding, email: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={tempBranding.website || ''}
                    onChange={(e) => setTempBranding({ ...tempBranding, website: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={tempBranding.vatNumber || ''}
                    onChange={(e) => setTempBranding({ ...tempBranding, vatNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={tempBranding.registrationNumber || ''}
                    onChange={(e) => setTempBranding({ ...tempBranding, registrationNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempBranding.primaryColor}
                      onChange={(e) => setTempBranding({ ...tempBranding, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tempBranding.primaryColor}
                      onChange={(e) => setTempBranding({ ...tempBranding, primaryColor: e.target.value })}
                      className="input-field font-mono flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={tempBranding.accentColor}
                      onChange={(e) => setTempBranding({ ...tempBranding, accentColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tempBranding.accentColor}
                      onChange={(e) => setTempBranding({ ...tempBranding, accentColor: e.target.value })}
                      className="input-field font-mono flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowBrandingModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => saveBranding()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                Save Branding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
