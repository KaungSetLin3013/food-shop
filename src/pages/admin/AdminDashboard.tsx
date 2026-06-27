import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Clock, CheckCircle, AlertTriangle, Star } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { StatsCard, Card, Badge, Spinner } from '../../components/shared/UI'
import type { Order, MenuItem } from '../../types'
import { format, subDays } from 'date-fns'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ today_sales: 0, today_orders: 0, pending_orders: 0, completed_orders: 0, low_stock_count: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [popularItems, setPopularItems] = useState<{ name: string; count: number; revenue: number }[]>([])
  const [chartData, setChartData] = useState<{ date: string; revenue: number; orders: number }[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('฿')

  useEffect(() => {
    loadAll()
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadStats(), loadRecentOrders(), loadPopular(), loadChartData(), loadSettings()])
    setLoading(false)
  }

  async function loadSettings() {
    const { data } = await supabase.from('shop_settings').select('currency_symbol').single()
    if (data) setCurrencySymbol(data.currency_symbol)
  }

  async function loadStats() {
    const today = new Date().toISOString().split('T')[0]
    const { data: todayOrders } = await supabase.from('orders').select('total_amount, status').gte('created_at', today + 'T00:00:00').lte('created_at', today + 'T23:59:59')
    const { count: pending } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: completed } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', today + 'T00:00:00')
    const { count: lowStock } = await supabase.from('ingredients').select('*', { count: 'exact', head: true }).filter('current_stock', 'lte', 'minimum_stock')

    const orders = todayOrders || []
    setStats({
      today_sales: orders.reduce((s, o) => s + Number(o.total_amount), 0),
      today_orders: orders.length,
      pending_orders: pending || 0,
      completed_orders: completed || 0,
      low_stock_count: lowStock || 0,
    })
  }

  async function loadRecentOrders() {
    const { data } = await supabase.from('orders').select('*, items:order_items(*, menu_item:menu_items(name))').order('created_at', { ascending: false }).limit(5)
    if (data) setRecentOrders(data as Order[])
  }

  async function loadPopular() {
    const { data } = await supabase.from('order_items').select('menu_item:menu_items(name), quantity, subtotal').limit(200)
    if (!data) return
    const map: Record<string, { name: string; count: number; revenue: number }> = {}
    data.forEach((item: any) => {
      const name = item.menu_item?.name || 'Unknown'
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
      map[name].count += item.quantity
      map[name].revenue += Number(item.subtotal)
    })
    setPopularItems(Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5))
  }

  async function loadChartData() {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      return format(d, 'yyyy-MM-dd')
    })
    const { data } = await supabase.from('orders').select('created_at, total_amount').gte('created_at', days[0] + 'T00:00:00').neq('status', 'cancelled')
    const grouped: Record<string, { revenue: number; orders: number }> = {}
    days.forEach(d => { grouped[d] = { revenue: 0, orders: 0 } })
    if (data) {
      data.forEach(o => {
        const d = o.created_at.split('T')[0]
        if (grouped[d]) { grouped[d].revenue += Number(o.total_amount); grouped[d].orders += 1 }
      })
    }
    setChartData(days.map(d => ({ date: format(new Date(d), 'EEE'), revenue: grouped[d].revenue, orders: grouped[d].orders })))
  }

  const statusColor = (s: string) => ({
    pending: 'pending', preparing: 'preparing', ready: 'ready', completed: 'completed', cancelled: 'cancelled'
  }[s] || 'default') as any

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Today's Sales" value={`${currencySymbol}${stats.today_sales.toFixed(0)}`} icon={<TrendingUp size={20} />} color="orange" />
        <StatsCard title="Today's Orders" value={stats.today_orders} icon={<ShoppingBag size={20} />} color="blue" />
        <StatsCard title="Pending" value={stats.pending_orders} icon={<Clock size={20} />} color="purple" subtitle="Awaiting action" />
        <StatsCard title="Completed" value={stats.completed_orders} icon={<CheckCircle size={20} />} color="green" subtitle="Today" />
        <StatsCard title="Low Stock" value={stats.low_stock_count} icon={<AlertTriangle size={20} />} color="red" subtitle="Ingredients" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `${currencySymbol}${v}`} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#f9fafb', fontSize: '12px' }}
                formatter={(v: number) => [`${currencySymbol}${v.toFixed(0)}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Popular items */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-brand-500" /> Popular Items
          </h2>
          <div className="space-y-3">
            {popularItems.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No sales data yet</p>
            ) : popularItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.count} sold • {currencySymbol}{item.revenue.toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Orders</h2>
          <a href="/admin/orders" className="text-sm text-brand-500 hover:text-brand-600 font-medium">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Table</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{order.order_number}</td>
                  <td className="py-3 font-medium text-gray-900 dark:text-white">{order.customer_name}</td>
                  <td className="py-3 text-gray-500 dark:text-gray-400">{order.table_number || order.pickup_name || '—'}</td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-white">{currencySymbol}{Number(order.total_amount).toFixed(0)}</td>
                  <td className="py-3"><Badge variant={statusColor(order.status)}>{order.status}</Badge></td>
                  <td className="py-3 text-gray-400 text-xs">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && <p className="text-center text-gray-400 py-8">No orders yet today</p>}
        </div>
      </Card>
    </div>
  )
}
