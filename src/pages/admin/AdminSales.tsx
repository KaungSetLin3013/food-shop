import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, DollarSign, BarChart2, Download } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Card, StatsCard, Button, Select, Spinner } from '../../components/shared/UI'
import { format, subDays, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachWeekOfInterval } from 'date-fns'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4']

export default function AdminSales() {
  const [period, setPeriod] = useState<Period>('daily')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_revenue: 0, total_orders: 0, avg_order: 0, cancelled: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [topItems, setTopItems] = useState<any[]>([])
  const [catData, setCatData] = useState<any[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('฿')

  useEffect(() => { loadAll() }, [period])

  async function loadAll() {
    setLoading(true)
    const settings = await supabase.from('shop_settings').select('currency_symbol').single()
    if (settings.data) setCurrencySymbol(settings.data.currency_symbol)
    await Promise.all([loadStats(), loadChartData(), loadTopItems(), loadCategoryData()])
    setLoading(false)
  }

  function getRange() {
    const now = new Date()
    if (period === 'daily') return { start: subDays(now, 29), end: now }
    if (period === 'weekly') return { start: subDays(now, 83), end: now }
    if (period === 'monthly') return { start: startOfYear(now), end: now }
    return { start: new Date(now.getFullYear() - 3, 0, 1), end: now }
  }

  async function loadStats() {
    const { start } = getRange()
    const { data } = await supabase.from('orders').select('total_amount, status').gte('created_at', start.toISOString())
    if (!data) return
    const completed = data.filter(o => o.status !== 'cancelled')
    const cancelled = data.filter(o => o.status === 'cancelled').length
    const revenue = completed.reduce((s, o) => s + Number(o.total_amount), 0)
    setStats({ total_revenue: revenue, total_orders: completed.length, avg_order: completed.length ? revenue / completed.length : 0, cancelled })
  }

  async function loadChartData() {
    const { start, end } = getRange()
    const { data } = await supabase.from('orders').select('created_at, total_amount, status').gte('created_at', start.toISOString()).neq('status', 'cancelled')
    if (!data) return

    if (period === 'daily') {
      const days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'))
      const grouped: Record<string, { revenue: number; orders: number }> = {}
      days.forEach(d => { grouped[d] = { revenue: 0, orders: 0 } })
      data.forEach(o => {
        const d = o.created_at.split('T')[0]
        if (grouped[d]) { grouped[d].revenue += Number(o.total_amount); grouped[d].orders++ }
      })
      setChartData(days.map(d => ({ date: format(new Date(d), 'MMM d'), revenue: grouped[d].revenue, orders: grouped[d].orders })))
    } else if (period === 'monthly') {
      const months = Array.from({ length: 12 }, (_, i) => format(new Date(new Date().getFullYear(), i, 1), 'yyyy-MM'))
      const grouped: Record<string, { revenue: number; orders: number }> = {}
      months.forEach(m => { grouped[m] = { revenue: 0, orders: 0 } })
      data.forEach(o => {
        const m = o.created_at.slice(0, 7)
        if (grouped[m]) { grouped[m].revenue += Number(o.total_amount); grouped[m].orders++ }
      })
      setChartData(months.map(m => ({ date: format(new Date(m + '-01'), 'MMM'), revenue: grouped[m].revenue, orders: grouped[m].orders })))
    }
  }

  async function loadTopItems() {
    const { data } = await supabase.from('order_items').select('menu_item:menu_items(name), quantity, subtotal').limit(500)
    if (!data) return
    const map: Record<string, { name: string; count: number; revenue: number }> = {}
    data.forEach((item: any) => {
      const name = item.menu_item?.name || 'Unknown'
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
      map[name].count += item.quantity
      map[name].revenue += Number(item.subtotal)
    })
    setTopItems(Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8))
  }

  async function loadCategoryData() {
    const { data } = await supabase.from('order_items').select('menu_item:menu_items(category:categories(name)), subtotal').limit(500)
    if (!data) return
    const map: Record<string, number> = {}
    data.forEach((item: any) => {
      const cat = item.menu_item?.category?.name || 'Other'
      map[cat] = (map[cat] || 0) + Number(item.subtotal)
    })
    setCatData(Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value))
  }

  function exportCSV() {
    const rows = [['Date', 'Revenue', 'Orders'], ...chartData.map(d => [d.date, d.revenue, d.orders])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'sales.csv'; a.click()
  }

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Revenue analytics</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 text-sm font-semibold transition-colors capitalize ${period === p ? 'bg-brand-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{p}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download size={14} /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={`${currencySymbol}${stats.total_revenue.toFixed(0)}`} icon={<TrendingUp size={20} />} color="orange" />
        <StatsCard title="Total Orders" value={stats.total_orders} icon={<ShoppingBag size={20} />} color="blue" />
        <StatsCard title="Avg Order Value" value={`${currencySymbol}${stats.avg_order.toFixed(0)}`} icon={<DollarSign size={20} />} color="green" />
        <StatsCard title="Cancelled" value={stats.cancelled} icon={<BarChart2 size={20} />} color="red" />
      </div>

      {/* Revenue chart */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${currencySymbol}${v}`} />
            <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#f9fafb', fontSize: '12px' }} formatter={(v: number) => [`${currencySymbol}${v.toFixed(0)}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Items by Revenue</h2>
          <div className="space-y-3">
            {topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                    <span className="font-bold text-brand-500 ml-2 shrink-0">{currencySymbol}{item.revenue.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(item.revenue / topItems[0].revenue) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.count} sold</p>
                </div>
              </div>
            ))}
            {topItems.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No data yet</p>}
          </div>
        </Card>

        {/* Category breakdown */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue by Category</h2>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '12px', color: '#f9fafb', fontSize: '12px' }} formatter={(v: number) => `${currencySymbol}${v.toFixed(0)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
        </Card>
      </div>
    </div>
  )
}
