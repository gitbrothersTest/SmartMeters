import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Discount } from '../types';

// STRICTLY retrieved from env
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL || '0', 10);

const logDebug = (action: string, details?: any) => {
    if (DEBUG_LEVEL > 0) {
        console.log(`[CartContext] ${action}`, details || '');
    }
};

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
  applyDiscount: (code: string) => Promise<boolean>;
  removeDiscount: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('smartmeter_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [activeDiscount, setActiveDiscount] = useState<Discount | null>(null);

  useEffect(() => {
    localStorage.setItem('smartmeter_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number) => {
    logDebug('AddToCart', { sku: product.sku, qty: quantity });
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
    logDebug('RemoveFromCart', productId);
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    logDebug('ClearCart');
    setItems([]);
    setDiscountCode(null);
    setActiveDiscount(null);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate Discount
  let discountValue = 0;
  if (activeDiscount) {
      if (activeDiscount.type === 'percent') {
        discountValue = (subtotal * activeDiscount.value) / 100;
      } else {
        discountValue = activeDiscount.value;
      }
  }

  // Ensure total doesn't go below 0
  const total = Math.max(0, subtotal - discountValue);

  const applyDiscount = async (code: string): Promise<boolean> => {
    logDebug('ApplyDiscount Attempt', code);
    try {
        const response = await fetch(`/api/validate-discount?code=${encodeURIComponent(code)}`);
        if (response.ok) {
            const discountData: Discount = await response.json();
            logDebug('Discount Validated', discountData);
            setDiscountCode(discountData.code);
            setActiveDiscount(discountData);
            return true;
        } else {
            console.warn("Discount invalid");
            return false;
        }
    } catch (err) {
        console.error("Error validating discount", err);
        return false;
    }
  };

  const removeDiscount = () => {
    setDiscountCode(null);
    setActiveDiscount(null);
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