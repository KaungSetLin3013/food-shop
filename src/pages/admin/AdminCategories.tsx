import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Card, Input, Modal, ConfirmDialog, EmptyState, Spinner } from '../../components/shared/UI'
import type { Category } from '../../types'
import toast from 'react-hot-toast'

const ICONS = ['🍜','🍚','🥤','🍟','🍰','🥗','🍕','🍔','🌮','🍣','🍛','🥘','🍲','☕','🧃','🍦','🧁','🥪','🍗','🥩','🐟','🥦','🫕','🫔']

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteCat, setDeleteCat] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', icon: '🍽️', sort_order: '0' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
    setLoading(false)
  }

  function openCreate() {
    setEditCat(null)
    setForm({ name: '', icon: '🍽️', sort_order: String(categories.length + 1) })
    setModalOpen(true)
  }

  function openEdit(cat: Category) {
    setEditCat(cat)
    setForm({ name: cat.name, icon: cat.icon, sort_order: String(cat.sort_order) })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: form.name, icon: form.icon, sort_order: parseInt(form.sort_order) }
    const { error } = editCat
      ? await supabase.from('categories').update(payload).eq('id', editCat.id)
      : await supabase.from('categories').insert(payload)
    if (error) toast.error('Failed to save')
    else { toast.success(editCat ? 'Category updated' : 'Category created'); setModalOpen(false); loadCategories() }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteCat) return
    setDeleting(true)
    const { error } = await supabase.from('categories').delete().eq('id', deleteCat.id)
    if (error) toast.error(error.message.includes('foreign') ? 'Cannot delete: category has menu items' : 'Failed to delete')
    else { toast.success('Category deleted'); loadCategories() }
    setDeleteCat(null)
    setDeleting(false)
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Category</Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon="📁" title="No categories yet" action={<Button onClick={openCreate}><Plus size={16} /> Add First Category</Button>} />
      ) : (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <GripVertical size={16} className="text-gray-300 dark:text-gray-600 cursor-grab" />
                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center text-xl">
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{cat.name}</p>
                  <p className="text-xs text-gray-400">Sort order: {cat.sort_order}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteCat(cat)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? 'Edit Category' : 'New Category'} size="sm">
        <div className="p-6 space-y-4">
          <Input label="Name *" placeholder="e.g. Noodles" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Icon</label>
            <div className="mt-1.5 grid grid-cols-8 gap-2">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all ${form.icon === icon ? 'bg-brand-100 dark:bg-brand-900/30 ring-2 ring-brand-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <Input label="Sort Order" type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editCat ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleteCat?.name}"? All menu items in this category will also be deleted.`}
        loading={deleting}
      />
    </div>
  )
}
