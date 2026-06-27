-- =============================================
-- FoodFlow Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SHOP SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name TEXT NOT NULL DEFAULT 'FoodFlow Kitchen',
  logo_url TEXT,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  currency TEXT NOT NULL DEFAULT 'THB',
  currency_symbol TEXT NOT NULL DEFAULT '฿',
  opening_time TIME NOT NULL DEFAULT '09:00',
  closing_time TIME NOT NULL DEFAULT '22:00',
  receipt_footer TEXT DEFAULT 'Thank you for your order!',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO shop_settings (shop_name) VALUES ('FoodFlow Kitchen') ON CONFLICT DO NOTHING;

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'kitchen_staff', 'cashier')) DEFAULT 'kitchen_staff',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
          COALESCE(NEW.raw_user_meta_data->>'role', 'kitchen_staff'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default categories
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Noodles', '🍜', 1),
  ('Rice', '🍚', 2),
  ('Drinks', '🥤', 3),
  ('Snacks', '🍟', 4),
  ('Desserts', '🍰', 5)
ON CONFLICT DO NOTHING;

-- =============================================
-- MENU ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  available_quantity INTEGER NOT NULL DEFAULT 100,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  preparation_time INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INGREDIENTS
-- =============================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'g',
  minimum_stock DECIMAL(10,3) NOT NULL DEFAULT 100,
  supplier TEXT,
  cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- MENU ITEM INGREDIENTS (recipe)
-- =============================================
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10,3) NOT NULL,
  UNIQUE(menu_item_id, ingredient_id)
);

-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  table_number TEXT,
  pickup_name TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('order_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- =============================================
-- ORDER ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT
);

-- =============================================
-- STOCK ADJUSTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out', 'waste', 'adjustment')),
  quantity DECIMAL(10,3) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('new_order', 'low_stock', 'sold_out', 'large_order')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Update menu_items updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS menu_items_updated_at ON menu_items;
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Decrease inventory when order is completed
CREATE OR REPLACE FUNCTION handle_order_completed()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  ingredient RECORD;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
      FOR ingredient IN 
        SELECT mii.ingredient_id, mii.quantity_used * item.quantity AS total_used
        FROM menu_item_ingredients mii
        WHERE mii.menu_item_id = item.menu_item_id
      LOOP
        UPDATE ingredients 
        SET current_stock = GREATEST(0, current_stock - ingredient.total_used),
            updated_at = NOW()
        WHERE id = ingredient.ingredient_id;
        
        -- Check if now below minimum stock
        INSERT INTO notifications (type, title, message)
        SELECT 'low_stock', 
               'Low Stock Alert',
               'Ingredient "' || i.name || '" is below minimum stock (' || i.current_stock || ' ' || i.unit || ' remaining)'
        FROM ingredients i
        WHERE i.id = ingredient.ingredient_id
          AND i.current_stock < i.minimum_stock;
      END LOOP;
      
      -- Decrease available_quantity on menu item
      UPDATE menu_items 
      SET available_quantity = GREATEST(0, available_quantity - item.quantity)
      WHERE id = item.menu_item_id;
      
      -- Mark as unavailable if quantity hits 0
      UPDATE menu_items 
      SET is_available = FALSE
      WHERE id = item.menu_item_id AND available_quantity = 0;
    END LOOP;
    
    -- Notification for completed order
    INSERT INTO notifications (type, title, message)
    VALUES ('new_order', 'Order Completed', 'Order ' || NEW.order_number || ' has been completed.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_completed ON orders;
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_completed();

-- Notification on new order
CREATE OR REPLACE FUNCTION handle_new_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (type, title, message)
  VALUES ('new_order', 'New Order!', 
          'Order ' || NEW.order_number || ' from ' || NEW.customer_name || 
          CASE WHEN NEW.table_number IS NOT NULL THEN ' (Table ' || NEW.table_number || ')' ELSE '' END);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_new_order();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read access (customers can browse menu)
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can read menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public can read shop settings" ON shop_settings FOR SELECT USING (true);

-- Customers can place orders (no auth required)
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- Authenticated users (staff) can read orders
CREATE POLICY "Staff can read orders" ON orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can update orders" ON orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can read order items" ON order_items FOR SELECT USING (auth.role() = 'authenticated');

-- Admin/Manager can manage menu
CREATE POLICY "Staff can manage menu items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Inventory management (authenticated)
CREATE POLICY "Staff can read ingredients" ON ingredients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage ingredients" ON ingredients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage menu item ingredients" ON menu_item_ingredients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can create stock adjustments" ON stock_adjustments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Staff can read stock adjustments" ON stock_adjustments FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');

-- Notifications
CREATE POLICY "Staff can read notifications" ON notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can update notifications" ON notifications FOR UPDATE USING (auth.role() = 'authenticated');

-- Settings
CREATE POLICY "Staff can update settings" ON shop_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for these tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;

-- =============================================
-- SAMPLE DATA
-- =============================================
-- Insert sample menu items (after categories exist)
DO $$
DECLARE
  noodles_id UUID;
  rice_id UUID;
  drinks_id UUID;
  snacks_id UUID;
  desserts_id UUID;
BEGIN
  SELECT id INTO noodles_id FROM categories WHERE name = 'Noodles' LIMIT 1;
  SELECT id INTO rice_id FROM categories WHERE name = 'Rice' LIMIT 1;
  SELECT id INTO drinks_id FROM categories WHERE name = 'Drinks' LIMIT 1;
  SELECT id INTO snacks_id FROM categories WHERE name = 'Snacks' LIMIT 1;
  SELECT id INTO desserts_id FROM categories WHERE name = 'Desserts' LIMIT 1;

  INSERT INTO menu_items (category_id, name, description, price, available_quantity, preparation_time, sort_order)
  VALUES
    (noodles_id, 'Pad Thai', 'Classic stir-fried rice noodles with shrimp, eggs, tofu, and peanuts', 120, 50, 15, 1),
    (noodles_id, 'Tom Yum Noodles', 'Spicy and sour soup with rice noodles, prawns, and mushrooms', 140, 30, 20, 2),
    (noodles_id, 'Boat Noodles', 'Rich dark broth noodles with pork and crispy croutons', 90, 40, 10, 3),
    (rice_id, 'Khao Pad Gai', 'Chicken fried rice with egg, vegetables, and soy sauce', 100, 60, 12, 1),
    (rice_id, 'Mango Sticky Rice', 'Sweet glutinous rice with fresh mango and coconut cream', 80, 25, 5, 2),
    (rice_id, 'Basil Pork Rice', 'Stir-fried minced pork with Thai basil over steamed rice', 95, 45, 10, 3),
    (drinks_id, 'Thai Iced Tea', 'Sweet creamy Thai tea with condensed milk over ice', 60, 100, 3, 1),
    (drinks_id, 'Coconut Water', 'Fresh young coconut water', 55, 80, 2, 2),
    (drinks_id, 'Lime Soda', 'Fresh squeezed lime with soda water and a touch of salt', 45, 100, 2, 3),
    (snacks_id, 'Spring Rolls', 'Crispy vegetable spring rolls with sweet chili dipping sauce (4 pcs)', 75, 50, 8, 1),
    (snacks_id, 'Satay Skewers', 'Grilled chicken skewers with peanut sauce (3 pcs)', 85, 40, 12, 2),
    (desserts_id, 'Coconut Ice Cream', 'Homemade coconut ice cream with toppings', 70, 35, 3, 1),
    (desserts_id, 'Banana Roti', 'Crispy roti with banana, condensed milk, and chocolate sauce', 65, 30, 8, 2)
  ON CONFLICT DO NOTHING;
  
  -- Sample ingredients
  INSERT INTO ingredients (name, current_stock, unit, minimum_stock, cost_per_unit)
  VALUES
    ('Rice Noodles', 5000, 'g', 500, 0.02),
    ('Chicken Breast', 3000, 'g', 500, 0.15),
    ('Jasmine Rice', 8000, 'g', 1000, 0.01),
    ('Eggs', 48, 'pcs', 10, 3.00),
    ('Cooking Oil', 2000, 'ml', 200, 0.05),
    ('Fish Sauce', 1000, 'ml', 100, 0.08),
    ('Shrimp', 2000, 'g', 300, 0.25),
    ('Tofu', 1500, 'g', 200, 0.10),
    ('Peanuts', 1000, 'g', 100, 0.12),
    ('Thai Basil', 500, 'g', 50, 0.20),
    ('Coconut Milk', 3000, 'ml', 300, 0.06),
    ('Lime', 30, 'pcs', 10, 2.50)
  ON CONFLICT DO NOTHING;
END $$;
