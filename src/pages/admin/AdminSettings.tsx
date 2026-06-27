import { useState, useEffect, useRef } from 'react'
import { Store, Clock, DollarSign, Receipt, Upload, Image, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Card, Input, Toggle, Spinner } from '../../components/shared/UI'
import type { ShopSettings } from '../../types'
import toast from 'react-hot-toast'

const CURRENCIES = [
  { code: 'THB', symbol: '฿', label: 'Thai Baht (฿)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'MMK', symbol: 'K', label: 'Myanmar Kyat (K)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit (RM)' },
]

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const logoRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    shop_name: '',
    logo_url: '',
    tax_rate: '7',
    currency: 'THB',
    currency_symbol: '฿',
    opening_time: '09:00',
    closing_time: '22:00',
    receipt_footer: 'Thank you for dining with us!',
  })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('shop_settings').select('*').single()
    if (data) {
      setSettingsId(data.id)
      setLogoPreview(data.logo_url || '')
      setForm({
        shop_name: data.shop_name,
        logo_url: data.logo_url || '',
        tax_rate: String(data.tax_rate),
        currency: data.currency,
        currency_symbol: data.currency_symbol,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        receipt_footer: data.receipt_footer || '',
      })
    }
    setLoading(false)
  }

  function handleCurrencyChange(code: string) {
    const found = CURRENCIES.find(c => c.code === code)
    setForm(f => ({ ...f, currency: code, currency_symbol: found?.symbol || code }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `logos/shop-logo.${ext}`
    const { error } = await supabase.storage.from('food-images').upload(path, file, { upsert: true })
    if (error) return null
    return supabase.storage.from('food-images').getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!form.shop_name.trim()) { toast.error('Shop name is required'); return }
    setSaving(true)
    try {
      let logoUrl = form.logo_url
      if (logoFile) {
        const url = await uploadLogo(logoFile)
        if (url) logoUrl = url
      }
      const payload = {
        shop_name: form.shop_name,
        logo_url: logoUrl || null,
        tax_rate: parseFloat(form.tax_rate),
        currency: form.currency,
        currency_symbol: form.currency_symbol,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        receipt_footer: form.receipt_footer,
        updated_at: new Date().toISOString(),
      }
      const { error } = settingsId
        ? await supabase.from('shop_settings').update(payload).eq('id', settingsId)
        : await supabase.from('shop_settings').insert(payload)
      if (error) throw error
      toast.success('Settings saved!')
      setLogoFile(null)
      loadSettings()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure your shop</p>
        </div>
        <Button onClick={handleSave} loading={saving}><Save size={16} /> Save Changes</Button>
      </div>

      {/* Shop Identity */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Store size={18} className="text-brand-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Shop Identity</h2>
        </div>

        {/* Logo upload */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shop Logo</label>
          <div className="mt-2 flex items-center gap-4">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-brand-400 transition-colors overflow-hidden bg-gray-50 dark:bg-gray-800"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Image size={28} className="text-gray-300 dark:text-gray-600" />
              )}
            </div>
            <div>
              <Button variant="secondary" size="sm" onClick={() => logoRef.current?.click()}>
                <Upload size={14} /> Upload Logo
              </Button>
              <p className="text-xs text-gray-400 mt-1.5">PNG, JPG up to 2MB</p>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>

        <Input
          label="Shop Name *"
          placeholder="e.g. FoodFlow Kitchen"
          value={form.shop_name}
          onChange={e => setForm(f => ({ ...f, shop_name: e.target.value }))}
        />
      </Card>

      {/* Financial */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={18} className="text-brand-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Financial</h2>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => handleCurrencyChange(c.code)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold text-left transition-all ${form.currency === c.code ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-xs">
          <Input
            label="Tax Rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="7"
            value={form.tax_rate}
            onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">Applied to all orders automatically</p>
        </div>
      </Card>

      {/* Hours */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-brand-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Opening Hours</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Opening Time</label>
            <input
              type="time"
              value={form.opening_time}
              onChange={e => setForm(f => ({ ...f, opening_time: e.target.value }))}
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Closing Time</label>
            <input
              type="time"
              value={form.closing_time}
              onChange={e => setForm(f => ({ ...f, closing_time: e.target.value }))}
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Card>

      {/* Receipt */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Receipt size={18} className="text-brand-500" />
          <h2 className="font-bold text-gray-900 dark:text-white">Receipt</h2>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Footer Message</label>
          <textarea
            rows={3}
            placeholder="Thank you for dining with us!"
            value={form.receipt_footer}
            onChange={e => setForm(f => ({ ...f, receipt_footer: e.target.value }))}
            className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Receipt preview */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Receipt Preview</p>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 font-mono text-xs text-gray-800 dark:text-gray-200 max-w-xs">
            <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-600 pb-3 mb-3">
              <p className="font-bold text-base">{form.shop_name || 'Your Shop Name'}</p>
              <p className="text-gray-500 mt-0.5">{form.opening_time} – {form.closing_time}</p>
            </div>
            <div className="space-y-1 border-b border-dashed border-gray-300 dark:border-gray-600 pb-3 mb-3">
              <div className="flex justify-between"><span>Pad Thai × 1</span><span>{form.currency_symbol}120</span></div>
              <div className="flex justify-between"><span>Thai Iced Tea × 2</span><span>{form.currency_symbol}120</span></div>
            </div>
            <div className="space-y-1 border-b border-dashed border-gray-300 dark:border-gray-600 pb-3 mb-3">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{form.currency_symbol}240</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax ({form.tax_rate}%)</span><span>{form.currency_symbol}{(240 * parseFloat(form.tax_rate || '0') / 100).toFixed(0)}</span></div>
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>{form.currency_symbol}{(240 * (1 + parseFloat(form.tax_rate || '0') / 100)).toFixed(0)}</span></div>
            </div>
            <p className="text-center text-gray-500">{form.receipt_footer || 'Thank you!'}</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} size="lg"><Save size={16} /> Save All Settings</Button>
      </div>
    </div>
  )
}
