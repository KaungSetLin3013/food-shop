import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Search, Upload, X, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Card, Badge, Input, Textarea, Select, Toggle, Modal, ConfirmDialog, EmptyState, Spinner } from '../../components/shared/UI'
import type { MenuItem, Category } from '../../types'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const EMPTY_FORM = { name: '', description: '', price: '', category_id: '', available_quantity: '100', is_available: true, preparation_time: '10', sort_order: '0', image_url: '' }

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [currencySymbol, setCurrencySymbol] = useState('฿')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: m }, { data: c }, { data: s }] = await Promise.all([
      supabase.from('menu_items').select('*, category:categories(*)').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('shop_settings').select('currency_symbol').single(),
    ])
    if (m) setItems(m as MenuItem[])
    if (c) setCategories(c)
    if (s) setCurrencySymbol(s.currency_symbol)
    setLoading(false)
  }

  function openCreate() {
    setEditItem(null)
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' })
    setImageFile(null)
    setImagePreview('')
    setModalOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category_id: item.category_id,
      available_quantity: String(item.available_quantity),
      is_available: item.is_available,
      preparation_time: String(item.preparation_time),
      sort_order: String(item.sort_order),
      image_url: item.image_url || '',
    })
    setImageFile(null)
    setImagePreview(item.image_url || '')
    setModalOpen(true)
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `menu/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('food-images').upload(path, file)
    if (error) return null
    const { data } = supabase.storage.from('food-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.category_id) { toast.error('Please fill in all required fields'); return }
    setSaving(true)
    try {
      let imageUrl = form.image_url
      if (imageFile) {
        const url = await uploadImage(imageFile)
        if (url) imageUrl = url
      }
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id,
        available_quantity: parseInt(form.available_quantity),
        is_available: form.is_available,
        preparation_time: parseInt(form.preparation_time),
        sort_order: parseInt(form.sort_order),
        image_url: imageUrl || null,
      }
      if (editItem) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editItem.id)
        if (error) throw error
        toast.success('Menu item updated')
      } else {
        const { error } = await supabase.from('menu_items').insert(payload)
        if (error) throw error
        toast.success('Menu item created')
      }
      setModalOpen(false)
      loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await supabase.from('menu_items').delete().eq('id', deleteItem.id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Item deleted'); loadAll() }
    setDeleteItem(null)
    setDeleting(false)
  }

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || item.category_id === catFilter
    return matchSearch && matchCat
  })

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Menu Items</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{items.length} items</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Item</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCatFilter('all')} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all', catFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>All</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5', catFilter === c.id ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🍽️" title="No items found" action={<Button onClick={openCreate}><Plus size={16} /> Add First Item</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="overflow-hidden group">
              <div className="relative h-40 bg-gradient-to-br from-brand-50 to-orange-100 dark:from-gray-800 dark:to-gray-700">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">{item.category?.icon || '🍽️'}</div>
                )}
                {!item.is_available && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Badge variant="cancelled">Unavailable</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)} className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 shadow-sm transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteItem(item)} className="w-8 h-8 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                  </div>
                  <p className="text-brand-500 font-bold text-sm shrink-0">{currencySymbol}{Number(item.price).toFixed(0)}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">Qty: {item.available_quantity}</span>
                  <Badge variant={item.is_available && item.available_quantity > 0 ? 'success' : 'cancelled'}>
                    {item.is_available && item.available_quantity > 0 ? 'Available' : 'Sold Out'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Add Menu Item'} size="lg">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image upload */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Photo</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1.5 h-40 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-colors relative overflow-hidden"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover absolute inset-0" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">Change photo</p>
                  </div>
                </>
              ) : (
                <>
                  <Image size={32} className="text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-400 mt-2">Click to upload photo</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <Input label="Name *" placeholder="e.g. Pad Thai" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select
            label="Category *"
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            options={categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
          <div className="md:col-span-2">
            <Textarea label="Description" placeholder="Describe this dish..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <Input label={`Price (${currencySymbol}) *`} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <Input label="Available Quantity" type="number" min="0" value={form.available_quantity} onChange={e => setForm(f => ({ ...f, available_quantity: e.target.value }))} />
          <Input label="Prep Time (min)" type="number" min="1" value={form.preparation_time} onChange={e => setForm(f => ({ ...f, preparation_time: e.target.value }))} />
          <Input label="Sort Order" type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Available for Order</p>
              <p className="text-xs text-gray-400 mt-0.5">Toggle visibility on the customer menu</p>
            </div>
            <Toggle checked={form.is_available} onChange={v => setForm(f => ({ ...f, is_available: v }))} />
          </div>
          <div className="md:col-span-2 flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Item'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  )
}
