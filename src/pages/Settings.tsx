import
    {
        AlertTriangle,
        Bell,
        Calculator,
        CheckCircle,
        Database,
        RefreshCw,
        Save,
        Shield
    } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Default settings
const defaultSettings: Record<string, { value: string; type: string; description: string }> = {
  base_diesel_price: { value: '21.50', type: 'decimal', description: 'Base diesel price for calculations (ZAR per liter)' },
  diesel_impact_percentage: { value: '35', type: 'decimal', description: 'Percentage of diesel cost impact on tariffs' },
  auto_adjust_threshold: { value: '2.5', type: 'decimal', description: 'Minimum diesel price change (%) to trigger auto-adjustment' },
  max_monthly_increase: { value: '10', type: 'decimal', description: 'Maximum allowed monthly rate increase (%)' },
  rounding_precision: { value: '2', type: 'integer', description: 'Decimal places for rate calculations' },
  effective_day_of_month: { value: '1', type: 'integer', description: 'Day of month when new rates become effective' },
}

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [_loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('calculation')

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase
        .from('master_control_settings')
        .select('*')

      if (data) {
        const newSettings = { ...defaultSettings }
        data.forEach(s => {
          if (newSettings[s.setting_key]) {
            newSettings[s.setting_key].value = s.setting_value
          }
        })
        setSettings(newSettings)
      }
    } catch (error) {
      console.log('Using default settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    try {
      for (const [key, setting] of Object.entries(settings)) {
        await supabase
          .from('master_control_settings')
          .upsert({
            setting_key: key,
            setting_value: setting.value,
            setting_type: setting.type,
            description: setting.description,
          })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value },
    }))
    setSaved(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure system settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <nav className="card p-2 space-y-1">
            <button
              onClick={() => setActiveSection('calculation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'calculation'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calculator className="w-5 h-5" />
              <span className="font-medium">Calculation</span>
            </button>
            <button
              onClick={() => setActiveSection('database')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'database'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">Database</span>
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'notifications'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="font-medium">Notifications</span>
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'security'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Security</span>
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'calculation' && (
            <>
              <div className="card">
                <h2 className="card-header flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-400" />
                  Tariff Calculation Settings
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Diesel Price (ZAR per liter)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.base_diesel_price.value}
                      onChange={(e) => updateSetting('base_diesel_price', e.target.value)}
                      className="input-field max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.base_diesel_price.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Diesel Impact Percentage
                    </label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        step="1"
                        value={settings.diesel_impact_percentage.value}
                        onChange={(e) => updateSetting('diesel_impact_percentage', e.target.value)}
                        className="input-field"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.diesel_impact_percentage.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-Adjust Threshold
                    </label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        step="0.1"
                        value={settings.auto_adjust_threshold.value}
                        onChange={(e) => updateSetting('auto_adjust_threshold', e.target.value)}
                        className="input-field"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.auto_adjust_threshold.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Monthly Increase
                    </label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        step="1"
                        value={settings.max_monthly_increase.value}
                        onChange={(e) => updateSetting('max_monthly_increase', e.target.value)}
                        className="input-field"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.max_monthly_increase.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rounding Precision
                    </label>
                    <select
                      value={settings.rounding_precision.value}
                      onChange={(e) => updateSetting('rounding_precision', e.target.value)}
                      className="select-field max-w-xs"
                    >
                      <option value="0">0 decimal places</option>
                      <option value="1">1 decimal place</option>
                      <option value="2">2 decimal places</option>
                      <option value="3">3 decimal places</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.rounding_precision.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Day of Month
                    </label>
                    <select
                      value={settings.effective_day_of_month.value}
                      onChange={(e) => updateSetting('effective_day_of_month', e.target.value)}
                      className="select-field max-w-xs"
                    >
                      <option value="1">1st</option>
                      <option value="15">15th</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.effective_day_of_month.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formula Reference */}
              <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Rate Calculation Formula</h3>
                <div className="bg-white rounded-lg p-4 font-mono text-sm">
                  <p>New Rate = Base Rate × (1 + Diesel Change % × Diesel Impact %)</p>
                </div>
                <p className="text-sm text-blue-700 mt-3">
                  Example: With a 5% diesel price increase and 35% impact factor, the tariff would increase by 1.75%
                </p>
              </div>
            </>
          )}

          {activeSection === 'database' && (
            <div className="card">
              <h2 className="card-header flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                Database Connection
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Connected to Supabase</p>
                    <p className="text-sm text-green-600">Database is online and accessible</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supabase URL
                  </label>
                  <input
                    type="text"
                    value={(import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL || 'Not configured'}
                    disabled
                    className="input-field bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Status
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-700">Active</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Data Export</h4>
                  <div className="flex gap-3">
                    <button className="btn-secondary">Export Clients</button>
                    <button className="btn-secondary">Export Routes</button>
                    <button className="btn-secondary">Export History</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card">
              <h2 className="card-header flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-400" />
                Notification Preferences
              </h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Diesel Price Updates</p>
                    <p className="text-sm text-gray-500">Notify when diesel prices change significantly</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 h-5 w-5" />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Document Expiry Warnings</p>
                    <p className="text-sm text-gray-500">Alert when documents are about to expire</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 h-5 w-5" />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Rate Adjustment Approvals</p>
                    <p className="text-sm text-gray-500">Notify when rate adjustments need approval</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary-600 h-5 w-5" />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Weekly Summary Reports</p>
                    <p className="text-sm text-gray-500">Receive weekly email summaries</p>
                  </div>
                  <input type="checkbox" className="rounded border-gray-300 text-primary-600 h-5 w-5" />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card">
              <h2 className="card-header flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-400" />
                Security Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Password Requirements</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Minimum 8 characters</p>
                    <p>• At least one uppercase letter</p>
                    <p>• At least one number</p>
                    <p>• At least one special character</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Session Settings</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Timeout
                    </label>
                    <select className="select-field max-w-xs">
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="480">8 hours</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Two-Factor Authentication</h4>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">2FA Not Enabled</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Enable two-factor authentication for enhanced security
                      </p>
                      <button className="btn-secondary mt-3 text-sm">Enable 2FA</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
