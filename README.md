<div align="center">

# 🍜 FoodFlow

### Modern Food Shop Management System

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

A full-stack, real-time food shop POS and management system — customer ordering, kitchen dashboard, inventory tracking, and sales analytics, all in one app.

[**Customer Menu →**](#) · [**Admin Dashboard →**](#) · [**Setup Guide ↓**](#-quick-start)

</div>

---

## ✨ Features

### 🛍️ Customer Interface
- **Menu browsing** — category tabs, search, item detail modal
- **Cart** — quantity controls, per-item notes, live total
- **Order placement** — Dine-in (table number) or Pickup
- **Order confirmation** — unique order number displayed instantly
- **Dark / Light mode**

### 🏪 Admin Interface

| Page | What you can do |
|------|----------------|
| **Dashboard** | Live sales stats, 7-day revenue chart, popular items, recent orders |
| **Kitchen Orders** | Real-time order cards, one-click status updates (Pending → Preparing → Ready → Completed) |
| **Menu Management** | Create / edit / delete items, image upload, toggle availability |
| **Categories** | Add categories with emoji icons, set sort order |
| **Inventory** | Track ingredient stock, low-stock alerts, manual adjustments (Stock In / Out / Waste) |
| **Sales Analytics** | Bar & pie charts — daily, weekly, monthly, yearly views |
| **Reports** | Download CSV: Sales, Inventory, Low Stock, Popular Menu, Profit |
| **Users** | Manage staff with 4 permission roles |
| **Settings** | Shop name, logo, currency, tax rate, opening hours, receipt template |

### ⚙️ Technical Highlights
- ⚡ **Real-time** order updates via Supabase Realtime (no polling)
- 🔐 **Row Level Security** — customers can order without accounts; staff access is gated
- 📦 **Auto inventory deduction** when orders are completed (via Postgres trigger)
- 🔔 **Notifications** — new order, low stock, sold out alerts
- 📱 **Fully responsive** — works on mobile, tablet, desktop
- 🌙 **Dark mode** — persisted to localStorage
- 🌏 **Multi-currency** — THB, USD, EUR, JPY, MMK, SGD, MYR

---

## 🗂️ Project Structure

```
food-shop/
├── database_schema.sql          # Full Supabase schema (run this first)
├── .env.example                 # Environment variable template
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── App.tsx                  # Router setup
    ├── main.tsx
    ├── index.css
    ├── types/index.ts           # All TypeScript types
    ├── lib/
    │   └── supabase.ts          # Supabase client
    ├── contexts/
    │   ├── AuthContext.tsx      # Auth state + helpers
    │   ├── CartContext.tsx      # Shopping cart state
    │   └── ThemeContext.tsx     # Dark/light mode
    ├── components/
    │   └── shared/UI.tsx        # Button, Card, Modal, Badge, Input, etc.
    └── pages/
        ├── customer/
        │   └── CustomerHome.tsx # Full customer ordering experience
        └── admin/
            ├── AdminLayout.tsx  # Sidebar nav + topbar shell
            ├── AdminLogin.tsx
            ├── AdminDashboard.tsx
            ├── AdminOrders.tsx  # Kitchen real-time screen
            ├── AdminMenu.tsx
            ├── AdminCategories.tsx
            ├── AdminInventory.tsx
            ├── AdminSales.tsx
            ├── AdminReports.tsx
            ├── AdminUsers.tsx
            └── AdminSettings.tsx
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) account

---

### Step 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/food-shop.git
cd food-shop
npm install
```

---

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Save your **Project URL** and **anon public key** (found in Project Settings → API)

---

### Step 3 — Run the database schema

In **Supabase → SQL Editor**, paste the entire content of `database_schema.sql` and click **Run**.

This creates:
- All tables (orders, menu_items, categories, ingredients, profiles, etc.)
- Row Level Security policies
- Auto-triggers (order numbering, inventory deduction, notifications)
- Sample menu data (13 Thai dishes across 5 categories)
- Sample ingredients

---

### Step 4 — Create a storage bucket

In **Supabase → Storage**:
1. Click **New bucket**
2. Name it `food-images`
3. Toggle **Public bucket** → ON

---

### Step 5 — Create your admin user

In **Supabase → Authentication → Users** → **Add user**:
```
Email:    admin@foodflow.com
Password: admin123
```

Then in **SQL Editor**, run:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@foodflow.com';
```

---

### Step 6 — Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### Step 7 — Run the app

```bash
npm run dev
```

| URL | Interface |
|-----|-----------|
| `http://localhost:5173/` | Customer ordering menu |
| `http://localhost:5173/admin/login` | Admin dashboard login |

---

## 👥 User Roles

| Role | Dashboard | Orders | Menu | Inventory | Sales | Reports | Users | Settings |
|------|-----------|--------|------|-----------|-------|---------|-------|----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Kitchen Staff** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Cashier** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🌐 Deployment (Vercel)

```bash
npm run build
```

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy ✅

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| Build tool | Vite 5 |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| File storage | Supabase Storage |
| Charts | Recharts |
| Icons | Lucide React |
| Routing | React Router v6 |
| Date utils | date-fns |
| Notifications | react-hot-toast |

---

## 🗺️ Roadmap

- [ ] Online payment (Stripe / PromptPay QR)
- [ ] QR code table ordering
- [ ] Customer loyalty points
- [ ] Discount / coupon system
- [ ] Kitchen display monitor (separate fullscreen view)
- [ ] Receipt printing (thermal printer via WebUSB / ESC/POS)
- [ ] Barcode scanning for inventory
- [ ] AI sales prediction
- [ ] Multiple branch support
- [ ] Delivery integration

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
Built with ❤️ using React + Supabase
</div>
