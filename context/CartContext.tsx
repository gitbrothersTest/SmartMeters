import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Discount } from '../types';
import { DISCOUNTS } from '../constants';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  discountCode: string | null;
  discountValue: number;
  applyDiscount: (code: string) => boolean;
  removeDiscount: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('smartmeters_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [discountCode, setDiscountCode] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('smartmeters_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setItems([]);
    setDiscountCode(null);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate Discount
  let discountValue = 0;
  if (discountCode) {
    const discount = DISCOUNTS.find(d => d.code === discountCode);
    if (discount) {
      if (discount.type === 'percent') {
        discountValue = (subtotal * discount.value) / 100;
      } else {
        discountValue = discount.value;
      }
    }
  }

  // Ensure total doesn't go below 0
  const total = Math.max(0, subtotal - discountValue);

  const applyDiscount = (code: string): boolean => {
    const valid = DISCOUNTS.find(d => d.code === code);
    if (valid) {
      setDiscountCode(code);
      return true;
    }
    return false;
  };

  const removeDiscount = () => {
    setDiscountCode(null);
  };

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      subtotal, 
      total, 
      discountCode,
      discountValue,
      applyDiscount,
      removeDiscount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
