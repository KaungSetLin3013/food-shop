import React, { createContext, useContext, useState } from 'react';
import type { CartItem, MenuItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(menuItem: MenuItem, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.menu_item.id === menuItem.id);
      if (existing) {
        return prev.map(i =>
          i.menu_item.id === menuItem.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { menu_item: menuItem, quantity }];
    });
  }

  function removeItem(itemId: string) {
    setItems(prev => prev.filter(i => i.menu_item.id !== itemId));
  }

  function updateQuantity(itemId: string, qty: number) {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev =>
      prev.map(i => i.menu_item.id === itemId ? { ...i, quantity: qty } : i)
    );
  }

  function updateNotes(itemId: string, notes: string) {
    setItems(prev =>
      prev.map(i => i.menu_item.id === itemId ? { ...i, notes } : i)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.menu_item.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
