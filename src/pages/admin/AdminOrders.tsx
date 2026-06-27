import { useState, useEffect } from 'react'
import { Clock, User, MapPin, ChevronDown, RefreshCw, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Badge, Card, Select, Button, EmptyState, Spinner } from '../../components/shared/UI'
import type { Order, OrderStatus } from '../../types'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'preparing', label: 'Preparing', color: 'bg-blue-500' },
  { value: 'ready', label: 'Ready', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
]

const STATUS_NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
  cancelled: null,
}

const STATUS_ACTIONS: Record<OrderStatus, string> = {
  pending: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Complete Order',
  completed: '',
  cancelled: '',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | OrderStatus>('active')
  const [updating, setUpdating] = useState<string | null>(null)
  const [currencySymbol, setCurrencySymbol] = useState('฿')

  useEffect(() => {
    loadOrders()
    loadSettings()
    const ch = supabase.channel('orders-kitchen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          toast.success(`New order: ${(payload.new as Order).order_number}`, { duration: 5000 })
          loadOrders()
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('shop_settings').select('currency_symbol').single()
    if (data) setCurrencySymbol(data.currency_symbol)
  }

  async function loadOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name, image_url))')
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: true })
    if (data) setOrders(data as Order[])
    setLoading(false)
  }

  async function loadAllOrders() {
    setLoading(true)
    const query = supabase.from('orders').select('*, items:order_items(*, menu_item:menu_items(name, image_url))').order('created_at', { ascending: false }).limit(50)
    if (filter !== 'active') query.eq('status', filter)
    const { data } = await query
    if (data) setOrders(data as Order[])
    setLoading(false)
  }

  useEffect(() => {
    if (filter === 'active') loadOrders()
    else loadAllOrders()
  }, [filter])

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    setUpdating(orderId)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) toast.error('Failed to update order')
    else toast.success(`Order marked as ${newStatus}`)
    setUpdating(null)
  }

  const statusBadge = (s: OrderStatus) => <Badge variant={s as any}>{STATUSES.find(x => x.value === s)?.label || s}</Badge>
  const elapsed = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Kitchen Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time order management</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => filter === 'active' ? loadOrders() : loadAllOrders()}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('active')}
          className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2', filter === 'active' ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
          Active Orders
        </button>
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={clsx('px-4 py-2 rounded-xl text-sm font-semibold transition-all', filter === s.value ? 'bg-brand-500 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}
          >
            {s.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon="🍳" title="No orders found" description={filter === 'active' ? "All clear! No active orders right now." : "No orders match this filter."} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const nextStatus = STATUS_NEXT[order.status]
            const isUpdating = updating === order.id
            const ageMs = Date.now() - new Date(order.created_at).getTime()
            const isUrgent = order.status === 'pending' && ageMs > 600000 // 10 min

            return (
              <Card key={order.id} className={clsx('overflow-hidden', isUrgent && 'ring-2 ring-red-400')}>
                {/* Header */}
                <div className={clsx('px-4 py-3 flex items-center justify-between', {
                  'bg-amber-50 dark:bg-amber-900/20': order.status === 'pending',
                  'bg-blue-50 dark:bg-blue-900/20': order.status === 'preparing',
                  'bg-green-50 dark:bg-green-900/20': order.status === 'ready',
                  'bg-gray-50 dark:bg-gray-800': order.status === 'completed' || order.status === 'cancelled',
                })}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{order.order_number}</span>
                    {isUrgent && <span className="text-xs text-red-500 font-semibold animate-pulse">URGENT</span>}
                  </div>
                  {statusBadge(order.status)}
                </div>

                {/* Info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <User size={13} />
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    {(order.table_number || order.pickup_name) && (
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <MapPin size={13} />
                        <span>{order.table_number || order.pickup_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <Clock size={11} />
                    {elapsed(order.created_at)}
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-2">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold px-2 py-0.5 rounded-lg min-w-[28px] text-center">{item.quantity}×</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{(item as any).menu_item?.name}</p>
                        {item.notes && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">📝 {item.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {order.notes && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-400">📝 {order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{currencySymbol}{Number(order.total_amount).toFixed(0)}</span>
                  <div className="flex gap-2">
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        onClick={() => updateStatus(order.id, 'cancelled')}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {nextStatus && (
                      <button
                        onClick={() => updateStatus(order.id, nextStatus)}
                        disabled={isUpdating}
                        className={clsx(
                          'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 text-white',
                          { 'bg-blue-500 hover:bg-blue-600': order.status === 'pending', 'bg-green-500 hover:bg-green-600': order.status === 'preparing', 'bg-gray-500 hover:bg-gray-600': order.status === 'ready' }
                        )}
                      >
                        {isUpdating && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                        {STATUS_ACTIONS[order.status]}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
