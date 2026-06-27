import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield, ChefHat, CreditCard, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Card, Input, Select, Modal, ConfirmDialog, Badge, EmptyState, Spinner } from '../../components/shared/UI'
import { useAuth } from '../../contexts/AuthContext'
import type { ShopUser, UserRole } from '../../types'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'admin', label: 'Admin', desc: 'Full access to everything', icon: <Shield size={16} />, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  { value: 'manager', label: 'Manager', desc: 'Manage menu, inventory, reports', icon: <Users size={16} />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  { value: 'kitchen_staff', label: 'Kitchen Staff', desc: 'View and update orders', icon: <ChefHat size={16} />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { value: 'cashier', label: 'Cashier', desc: 'Process orders and payments', icon: <CreditCard size={16} />, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
]

const roleColor = (role: UserRole) => ({ admin: 'danger', manager: 'warning', kitchen_staff: 'preparing', cashier: 'success' }[role] || 'default') as any
const roleLabel = (role: UserRole) => ROLES.find(r => r.value === role)?.label || role

export default function AdminUsers() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<ShopUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteUser, setDeleteUser] = useState<ShopUser | null>(null)
  const [editUser, setEditUser] = useState<ShopUser | null>(null)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'kitchen_staff' as UserRole })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setUsers(data as ShopUser[])
    setLoading(false)
  }

  function openCreate() {
    setEditUser(null)
    setForm({ email: '', name: '', password: '', role: 'kitchen_staff' })
    setModalOpen(true)
  }

  function openEdit(u: ShopUser) {
    setEditUser(u)
    setForm({ email: u.email, name: u.name, password: '', role: u.role })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!editUser && (!form.email.trim() || !form.password.trim())) { toast.error('Email and password required'); return }
    setSaving(true)
    try {
      if (editUser) {
        // Update name and role
        const { error } = await supabase.from('profiles').update({ name: form.name, role: form.role }).eq('id', editUser.id)
        if (error) throw error
        toast.success('User updated')
      } else {
        // Create via Supabase Admin API — in production use Edge Function
        // For demo: use signUp (will create profile via trigger)
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name, role: form.role } }
        })
        if (error) throw error
        // Update role if needed (trigger sets default)
        if (data.user) {
          await supabase.from('profiles').update({ role: form.role, name: form.name }).eq('id', data.user.id)
        }
        toast.success('User created — they need to verify their email')
      }
      setModalOpen(false)
      loadUsers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteUser) return
    setDeleting(true)
    // Note: deleting auth user requires admin privileges / service role key
    // For now we just remove the profile
    const { error } = await supabase.from('profiles').delete().eq('id', deleteUser.id)
    if (error) toast.error('Failed to delete user')
    else { toast.success('User removed'); loadUsers() }
    setDeleteUser(null)
    setDeleting(false)
  }

  async function changeRole(userId: string, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) toast.error('Failed to update role')
    else { toast.success('Role updated'); loadUsers() }
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{users.length} staff members</p>
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus size={16} /> Add User</Button>}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <Card key={r.value} className="p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>{r.icon}</div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{r.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
            <p className="text-xs text-brand-500 mt-2 font-medium">{users.filter(u => u.role === r.value).length} users</p>
          </Card>
        ))}
      </div>

      {/* Users table */}
      {users.length === 0 ? (
        <EmptyState icon="👥" title="No users yet" action={isAdmin ? <Button onClick={openCreate}><Plus size={16} /> Add First User</Button> : undefined} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">User</th>
                  <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                  <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Role</th>
                  <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Joined</th>
                  {isAdmin && <th className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className={clsx('hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors', isSelf && 'bg-brand-50/40 dark:bg-brand-900/10')}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{u.name} {isSelf && <span className="text-xs text-brand-500 font-normal">(you)</span>}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-5 py-4">
                        {isAdmin && !isSelf ? (
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value as UserRole)}
                            className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        ) : (
                          <Badge variant={roleColor(u.role)}>{roleLabel(u.role)}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors">
                              <Edit2 size={13} />
                            </button>
                            {!isSelf && (
                              <button onClick={() => setDeleteUser(u)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add Staff Member'} size="sm">
        <div className="p-6 space-y-4">
          <Input label="Full Name *" placeholder="e.g. Somchai Jaidee" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          {!editUser && (
            <>
              <Input label="Email *" type="email" placeholder="staff@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Password *" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  className={clsx(
                    'flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm',
                    form.role === r.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <span className={clsx('p-1.5 rounded-lg', r.color)}>{r.icon}</span>
                  <span className={clsx('font-semibold', form.role === r.value ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300')}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editUser ? 'Save' : 'Create User'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        title="Remove User"
        message={`Remove "${deleteUser?.name}" from the system? They will lose access immediately.`}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  )
}
