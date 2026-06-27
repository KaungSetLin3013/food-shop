import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Search, X, Plus, Minus, ChevronRight, Clock, Package, Check, Loader2, Moon, Sun, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../contexts/CartContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { Category, MenuItem } from '../../types'
import { Button, Badge, Input, Textarea, Modal, Spinner, EmptyState } from '../../components/shared/UI'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function CustomerHome() {
  const { isDark, toggle } = useTheme()
  const { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, totalAmount } = useCart()

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [shopName, setShopName] = useState('FoodFlow Kitchen')
  const [taxRate, setTaxRate] = useState(7)
  const [currencySymbol, setCurrencySymbol] = useState('฿')
  const [orderForm, setOrderForm] = useState({ name: '', table_or_pickup: '', order_type: 'dine-in', notes: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    loadData()
    const ch1 = supabase.channel('menu-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadMenuItems())
      .subscribe()
    return () => { supabase.removeChannel(ch1) }
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([loadCategories(), loadMenuItems(), loadSettings()])
    setLoading(false)
  }

  async function loadSettings() {
    const { data } = await supabase.from('shop_settings').select('*').single()
    if (data) {
      setShopName(data.shop_name)
      setTaxRate(data.tax_rate)
      setCurrencySymbol(data.currency_symbol)
    }
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  async function loadMenuItems() {
    const { data } = await supabase.from('menu_items').select('*, category:categories(*)').order('sort_order')
    if (data) setMenuItems(data as MenuItem[])
  }

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategory === 'all' || item.category_id === activeCategory
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  function getCartItem(id: string) { return items.find(i => i.menu_item.id === id) }

  function validateForm() {
    const errors: Record<string, string> = {}
    if (!orderForm.name.trim()) errors.name = 'Please enter your name'
    if (!orderForm.table_or_pickup.trim()) errors.table_or_pickup = orderForm.order_type === 'dine-in' ? 'Please enter table number' : 'Please enter pickup name'
    return errors
  }

  async function placeOrder() {
    const errors = validateForm()
    if (Object.keys(errors).length) { setFormErrors(errors); return }
    if (items.length === 0) { toast.error('Cart is empty'); return }
    setSubmitting(true)
    try {
      const taxAmount = totalAmount * (taxRate / 100)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderForm.name,
          table_number: orderForm.order_type === 'dine-in' ? orderForm.table_or_pickup : null,
          pickup_name: orderForm.order_type === 'pickup' ? orderForm.table_or_pickup : null,
          notes: orderForm.notes || null,
          status: 'pending',
          total_amount: totalAmount + taxAmount,
          tax_amount: taxAmount,
        })
        .select()
        .single()
      if (orderError || !order) throw orderError
      const orderItems = items.map(i => ({
        order_id: order.id,
        menu_item_id: i.menu_item.id,
        quantity: i.quantity,
        unit_price: i.menu_item.price,
        subtotal: i.menu_item.price * i.quantity,
        notes: i.notes || null,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError
      setOrderNumber(order.order_number)
      clearCart()
      setOrderModalOpen(false)
      setSuccessModalOpen(true)
      setOrderForm({ name: '', table_or_pickup: '', order_type: 'dine-in', notes: '' })
      setCartOpen(false)
    } catch (e: unknown) {
      toast.error('Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl animate-bounce">🍜</div>
        <Spinner size="lg" />
        <p className="text-gray-500 dark:text-gray-400">Loading menu...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white text-xl shadow-sm">
              <Store size={20} />
            </div>
            <div>
              <h1 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-none">{shopName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Order fresh & fast</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-sm hover:bg-brand-600 transition-colors"
            >
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-in">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search food..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                activeCategory === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  activeCategory === cat.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu grid */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <EmptyState icon="🍽️" title="No items found" description="Try a different category or search term" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(item => {
              const cartItem = getCartItem(item.id)
              const soldOut = !item.is_available || item.available_quantity === 0
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200"
                >
                  {/* Image */}
                  <div
                    className="relative h-48 bg-gradient-to-br from-brand-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        {item.category?.icon || '🍽️'}
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="cancelled" className="text-sm px-4 py-2">Sold Out</Badge>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Clock size={10} />
                        {item.preparation_time}m
                      </div>
                    </div>
                    {item.available_quantity <= 10 && !soldOut && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="warning">Only {item.available_quantity} left</Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3
                      className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-brand-500 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-brand-500">{currencySymbol}{item.price.toFixed(0)}</span>
                      {soldOut ? (
                        <Badge variant="cancelled">Sold Out</Badge>
                      ) : cartItem ? (
                        <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold text-brand-600 dark:text-brand-400 w-6 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { addItem(item); toast.success(`Added ${item.name}`) }}
                          className="flex items-center gap-1.5 bg-brand-500 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-brand-600 transition-all active:scale-95 shadow-sm shadow-brand-200 dark:shadow-brand-900"
                        >
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-brand-500 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-sm font-bold px-2.5 py-0.5 rounded-lg">{totalItems}</span>
              <span className="font-semibold">View Cart</span>
            </div>
            <span className="font-bold">{currencySymbol}{totalAmount.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Item detail modal */}
      <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} size="md">
        {selectedItem && (
          <div>
            <div className="h-56 bg-gradient-to-br from-brand-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 relative">
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">{selectedItem.category?.icon || '🍽️'}</div>
              )}
              <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedItem.name}</h2>
                <span className="text-2xl font-bold text-brand-500 shrink-0">{currencySymbol}{selectedItem.price.toFixed(0)}</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{selectedItem.description}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5"><Clock size={14} />{selectedItem.preparation_time} min</div>
                <div className="flex items-center gap-1.5"><Package size={14} />{selectedItem.available_quantity} available</div>
              </div>
              <div className="mt-6">
                {!selectedItem.is_available || selectedItem.available_quantity === 0 ? (
                  <Button disabled className="w-full" size="lg">Sold Out</Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => { addItem(selectedItem); setSelectedItem(null); toast.success(`Added ${selectedItem.name} to cart`) }}
                  >
                    <Plus size={18} /> Add to Cart
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative ml-auto w-full max-w-md bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={14} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <ShoppingCart size={48} strokeWidth={1} />
                <p className="font-medium">Cart is empty</p>
                <p className="text-sm">Add some delicious items!</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {items.map(cartItem => (
                    <div key={cartItem.menu_item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                        {cartItem.menu_item.image_url
                          ? <img src={cartItem.menu_item.image_url} alt="" className="w-full h-full object-cover" />
                          : cartItem.menu_item.category?.icon || '🍽️'
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{cartItem.menu_item.name}</p>
                          <button onClick={() => removeItem(cartItem.menu_item.id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-brand-500 font-bold text-sm">{currencySymbol}{(cartItem.menu_item.price * cartItem.quantity).toFixed(0)}</p>
                        <input
                          placeholder="Special notes..."
                          value={cartItem.notes || ''}
                          onChange={e => updateNotes(cartItem.menu_item.id, e.target.value)}
                          className="mt-1.5 w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQuantity(cartItem.menu_item.id, cartItem.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold w-5 text-center text-gray-900 dark:text-white">{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(cartItem.menu_item.id, cartItem.quantity + 1)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span><span>{currencySymbol}{totalAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Tax ({taxRate}%)</span><span>{currencySymbol}{(totalAmount * taxRate / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base">
                    <span>Total</span><span>{currencySymbol}{(totalAmount * (1 + taxRate / 100)).toFixed(0)}</span>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => { setCartOpen(false); setOrderModalOpen(true) }}>
                    Place Order <ChevronRight size={16} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order form modal */}
      <Modal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} title="Complete Your Order" size="md">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {(['dine-in', 'pickup'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderForm(f => ({ ...f, order_type: type }))}
                className={clsx(
                  'py-3 rounded-xl text-sm font-semibold border-2 transition-all capitalize',
                  orderForm.order_type === type
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                )}
              >
                {type === 'dine-in' ? '🪑 Dine In' : '🥡 Pickup'}
              </button>
            ))}
          </div>
          <Input
            label="Your Name *"
            placeholder="Enter your name"
            value={orderForm.name}
            onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
          />
          <Input
            label={orderForm.order_type === 'dine-in' ? 'Table Number *' : 'Pickup Name *'}
            placeholder={orderForm.order_type === 'dine-in' ? 'e.g. Table 5' : 'e.g. John'}
            value={orderForm.table_or_pickup}
            onChange={e => setOrderForm(f => ({ ...f, table_or_pickup: e.target.value }))}
            error={formErrors.table_or_pickup}
          />
          <Textarea
            label="Special Notes"
            placeholder="Any special requests? e.g. No onion, extra spicy..."
            value={orderForm.notes}
            onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
          />

          {/* Order summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Summary</p>
            {items.map(i => (
              <div key={i.menu_item.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{i.menu_item.name} × {i.quantity}</span>
                <span>{currencySymbol}{(i.menu_item.price * i.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span>{currencySymbol}{(totalAmount * (1 + taxRate / 100)).toFixed(0)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setOrderModalOpen(false)}>Back</Button>
            <Button className="flex-1" size="md" loading={submitting} onClick={placeOrder}>
              Confirm Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal open={successModalOpen} onClose={() => setSuccessModalOpen(false)} size="sm">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 animate-bounce-in">
            <Check size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Placed!</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your order is being prepared</p>
          <div className="mt-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl px-6 py-3">
            <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Order Number</p>
            <p className="text-2xl font-bold text-brand-500">{orderNumber}</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">We'll have it ready for you soon 🍜</p>
          <Button className="mt-6 w-full" onClick={() => setSuccessModalOpen(false)}>Back to Menu</Button>
        </div>
      </Modal>
    </div>
  )
}
