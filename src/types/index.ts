export type UserRole = 'admin' | 'manager' | 'kitchen_staff' | 'cashier';

export interface ShopUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category?: Category;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  available_quantity: number;
  is_available: boolean;
  preparation_time: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ingredients?: MenuItemIngredient[];
}

export interface Ingredient {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  supplier?: string;
  cost_per_unit: number;
  updated_at: string;
}

export interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity_used: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  table_number?: string;
  pickup_name?: string;
  notes?: string;
  status: OrderStatus;
  total_amount: number;
  tax_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item?: MenuItem;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  type: 'stock_in' | 'stock_out' | 'waste' | 'adjustment';
  quantity: number;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface ShopSettings {
  id: string;
  shop_name: string;
  logo_url?: string;
  tax_rate: number;
  currency: string;
  currency_symbol: string;
  opening_time: string;
  closing_time: string;
  receipt_footer?: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  type: 'new_order' | 'low_stock' | 'sold_out' | 'large_order';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  avg_order: number;
}

export interface DashboardStats {
  today_sales: number;
  today_orders: number;
  pending_orders: number;
  completed_orders: number;
  low_stock_count: number;
  popular_items: { name: string; count: number }[];
}
