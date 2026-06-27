import { useState } from 'react'
import { FileText, Download, TrendingUp, Package, AlertTriangle, Star, DollarSign } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, Button, Spinner } from '../../components/shared/UI'
import toast from 'react-hot-toast'

type ReportType = 'sales' | 'inventory' | 'low_stock' | 'popular_menu' | 'profit'

const REPORTS = [
  { id: 'sales' as ReportType, title: 'Sales Report', desc: 'Revenue and order data by date range', icon: TrendingUp, color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' },
  { id: 'inventory' as ReportType, title: 'Inventory Report', desc: 'Current stock levels for all ingredients', icon: Package, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { id: 'low_stock' as ReportType, title: 'Low Stock Report', desc: 'Ingredients below minimum threshold', icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  { id: 'popular_menu' as ReportType, title: 'Popular Menu Report', desc: 'Best selling items ranked by sales', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { id: 'profit' as ReportType, title: 'Profit Report', desc: 'Estimated profit based on ingredient costs', icon: DollarSign, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
]

export default function AdminReports() {
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  async function generateReport(type: ReportType) {
    setGenerating(type)
    try {
      let rows: string[][] = []
      let filename = `${type}-report-${dateFrom}-to-${dateTo}.csv`

      if (type === 'sales') {
        const { data } = await supabase.from('orders').select('order_number, customer_name, table_number, pickup_name, status, total_amount, tax_amount, created_at').gte('created_at', dateFrom + 'T00:00:00').lte('created_at', dateTo + 'T23:59:59').order('created_at', { ascending: false })
        rows = [['Order #', 'Customer', 'Table/Pickup', 'Status', 'Amount', 'Tax', 'Date']]
        if (data) rows.push(...data.map(o => [o.order_number, o.customer_name, o.table_number || o.pickup_name || '', o.status, Number(o.total_amount).toFixed(2), Number(o.tax_amount).toFixed(2), new Date(o.created_at).toLocaleString()]))
      } else if (type === 'inventory') {
        const { data } = await supabase.from('ingredients').select('*').order('name')
        rows = [['Name', 'Current Stock', 'Unit', 'Min Stock', 'Supplier', 'Cost/Unit', 'Status', 'Updated']]
        if (data) rows.push(...data.map(i => [i.name, i.current_stock, i.unit, i.minimum_stock, i.supplier || '', Number(i.cost_per_unit).toFixed(4), i.current_stock < i.minimum_stock ? 'LOW' : 'OK', new Date(i.updated_at).toLocaleDateString()]))
      } else if (type === 'low_stock') {
        const { data } = await supabase.from('ingredients').select('*').filter('current_stock', 'lte', 'minimum_stock').order('current_stock')
        rows = [['Name', 'Current Stock', 'Unit', 'Min Stock', 'Shortage', 'Supplier']]
        if (data) rows.push(...data.map(i => [i.name, i.current_stock, i.unit, i.minimum_stock, (i.minimum_stock - i.current_stock).toFixed(3), i.supplier || '']))
      } else if (type === 'popular_menu') {
        const { data } = await supabase.from('order_items').select('menu_item:menu_items(name, price), quantity, subtotal').limit(1000)
        const map: Record<string, { name: string; price: number; count: number; revenue: number }> = {}
        if (data) data.forEach((i: any) => {
          const name = i.menu_item?.name || 'Unknown'
          if (!map[name]) map[name] = { name, price: i.menu_item?.price || 0, count: 0, revenue: 0 }
          map[name].count += i.quantity; map[name].revenue += Number(i.subtotal)
        })
        const sorted = Object.values(map).sort((a, b) => b.count - a.count)
        rows = [['Rank', 'Item', 'Price', 'Units Sold', 'Revenue']]
        rows.push(...sorted.map((i, idx) => [String(idx + 1), i.name, Number(i.price).toFixed(2), String(i.count), i.revenue.toFixed(2)]))
      } else if (type === 'profit') {
        const { data: orderItems } = await supabase.from('order_items').select('menu_item:menu_items(name, price), quantity, subtotal').gte('created_at', dateFrom + 'T00:00:00').lte('created_at', dateTo + 'T23:59:59').limit(1000)
        rows = [['Report: Profit Estimate'], ['Period', `${dateFrom} to ${dateTo}`], [], ['Item', 'Qty', 'Revenue']]
        if (orderItems) orderItems.forEach((i: any) => rows.push([i.menu_item?.name || '', String(i.quantity), Number(i.subtotal).toFixed(2)]))
      }

      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      const a = document.createElement('a')
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
      a.download = filename
      a.click()
      toast.success('Report downloaded!')
    } catch (e) {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Download CSV reports</p>
      </div>

      {/* Date range */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Date Range (for date-filtered reports)</p>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(report => {
          const Icon = report.icon
          const isGenerating = generating === report.id
          return (
            <Card key={report.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${report.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{report.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{report.desc}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                loading={isGenerating}
                onClick={() => generateReport(report.id)}
              >
                <Download size={14} /> Download CSV
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
