import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Trash, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Card, Input, Select, Modal, ConfirmDialog, Badge, EmptyState, Spinner } from '../../components/shared/UI'
import type { Ingredient, StockAdjustment } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const UNITS = ['g', 'kg', 'ml', 'l', 'pcs', 'bottle', 'bag', 'box'].map(u => ({ value: u, label: u }))
const ADJ_TYPES = [
  { value: 'stock_in', label: '📦 Stock In', color: 'green' },
  { value: 'stock_out', label: '📤 Stock Out', color: 'blue' },
  { value: 'waste', label: '🗑️ Waste', color: 'red' },
  { value: 'adjustment', label: '⚖️ Manual Adjustment', color: 'gray' },
]

export default function AdminInventory() {
  const { user } = useAuth()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [adjModal, setAdjModal] = useState<Ingredient | null>(null)
  const [deleteItem, setDeleteItem] = useState<Ingredient | null>(null)
  const [editItem, setEditItem] = useState<Ingredient | null>(null)
  const [form, setForm] = useState({ name: '', current_stock: '0', unit: 'g', minimum_stock: '100', supplier: '', cost_per_unit: '0' })
  const [adjForm, setAdjForm] = useState({ type: 'stock_in', quantity: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadIngredients() }, [])

  async function loadIngredients() {
    setLoading(true)
    const { data } = await supabase.from('ingredients').select('*').order('name')
    if (data) setIngredients(data)
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', current_stock: '0', unit: 'g', minimum_stock: '100', supplier: '', cost_per_unit: '0' })
    setModalOpen(true)
  }

  function openEdit(ing: Ingredient) {
    setEditItem(ing)
    setForm({ name: ing.name, current_stock: String(ing.current_stock), unit: ing.unit, minimum_stock: String(ing.minimum_stock), supplier: ing.supplier || '', cost_per_unit: String(ing.cost_per_unit) })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { name: form.name, current_stock: parseFloat(form.current_stock), unit: form.unit, minimum_stock: parseFloat(form.minimum_stock), supplier: form.supplier || null, cost_per_unit: parseFloat(form.cost_per_unit) }
    const { error } = editItem
      ? await supabase.from('ingredients').update(payload).eq('id', editItem.id)
      : await supabase.from('ingredients').insert(payload)
    if (error) toast.error('Failed to save')
    else { toast.success(editItem ? 'Updated' : 'Ingredient added'); setModalOpen(false); loadIngredients() }
    setSaving(false)
  }

  async function handleAdjustment() {
    if (!adjModal || !adjForm.quantity) { toast.error('Enter quantity'); return }
    setSaving(true)
    const qty = parseFloat(adjForm.quantity)
    const { error: adjError } = await supabase.from('stock_adjustments').insert({
      ingredient_id: adjModal.id,
      type: adjForm.type,
      quantity: qty,
      notes: adjForm.notes || null,
      created_by: user?.id,
    })
    if (adjError) { toast.error('Failed'); setSaving(false); return }
    let newStock = adjModal.current_stock
    if (adjForm.type === 'stock_in') newStock += qty
    else if (adjForm.type === 'stock_out' || adjForm.type === 'waste') newStock = Math.max(0, newStock - qty)
    else newStock = qty // adjustment = set to value
    await supabase.from('ingredients').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', adjModal.id)
    toast.success('Stock updated')
    setAdjModal(null)
    setAdjForm({ type: 'stock_in', quantity: '', notes: '' })
    loadIngredients()
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteItem) return
    const { error } = await supabase.from('ingredients').delete().eq('id', deleteItem.id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deleted'); loadIngredients() }
    setDeleteItem(null)
  }

  const lowStock = ingredients.filter(i => i.current_stock < i.minimum_stock)

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{ingredients.length} ingredients</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Ingredient</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Low Stock Alert</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{lowStock.map(i => i.name).join(', ')} — below minimum stock level</p>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Ingredient</th>
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Current Stock</th>
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Min Stock</th>
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Supplier</th>
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {ingredients.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400">No ingredients yet</td></tr>
              ) : ingredients.map(ing => {
                const isLow = ing.current_stock < ing.minimum_stock
                const pct = Math.min(100, (ing.current_stock / ing.minimum_stock) * 100)
                return (
                  <tr key={ing.id} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors', isLow && 'bg-red-50/50 dark:bg-red-900/10')}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{ing.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">฿{Number(ing.cost_per_unit).toFixed(2)}/{ing.unit}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className={clsx('font-semibold', isLow ? 'text-red-500' : 'text-gray-900 dark:text-white')}>
                          {ing.current_stock} {ing.unit}
                        </p>
                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                          <div className={clsx('h-full rounded-full transition-all', pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{ing.minimum_stock} {ing.unit}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{ing.supplier || '—'}</td>
                    <td className="px-5 py-4">
                      <Badge variant={isLow ? 'warning' : 'success'}>{isLow ? 'Low Stock' : 'OK'}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setAdjModal(ing); setAdjForm({ type: 'stock_in', quantity: '', notes: '' }) }} className="text-xs font-semibold text-brand-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">Adjust</button>
                        <button onClick={() => openEdit(ing)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => setDeleteItem(ing)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Ingredient' : 'Add Ingredient'} size="md">
        <div className="p-6 space-y-4">
          <Input label="Name *" placeholder="e.g. Chicken Breast" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current Stock" type="number" min="0" step="0.001" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} />
            <Select label="Unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} options={UNITS} />
          </div>
          <Input label="Minimum Stock (alert threshold)" type="number" min="0" step="0.001" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Supplier" placeholder="Supplier name" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            <Input label="Cost per Unit (฿)" type="number" min="0" step="0.0001" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* Adjustment modal */}
      <Modal open={!!adjModal} onClose={() => setAdjModal(null)} title={`Adjust Stock: ${adjModal?.name}`} size="sm">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ADJ_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setAdjForm(f => ({ ...f, type: t.value }))}
                className={clsx('py-3 px-3 rounded-xl text-sm font-semibold border-2 transition-all text-left', adjForm.type === t.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'border-gray-200 dark:border-gray-700 text-gray-500')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            label={`Quantity (${adjModal?.unit}) ${adjForm.type === 'adjustment' ? '— set total to' : ''}`}
            type="number" min="0" step="0.001" placeholder="0"
            value={adjForm.quantity}
            onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))}
          />
          <Input label="Notes (optional)" placeholder="Reason for adjustment..." value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAdjModal(null)}>Cancel</Button>
            <Button onClick={handleAdjustment} loading={saving}>Apply</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Delete Ingredient" message={`Delete "${deleteItem?.name}"?`} />
    </div>
  )
}
