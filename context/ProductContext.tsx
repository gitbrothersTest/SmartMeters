import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';
import { PRODUCTS } from '../constants';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (filters?: any) => Promise<void>;
  updateProduct: (updatedProduct: Product) => void;
  deleteProduct: (id: string) => void;
  addProduct: (product: Product) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async (filters: any = {}) => {
    setIsLoading(true);
    setError(null);
    try {
        const queryParams = new URLSearchParams();
        if (filters.category && filters.category !== 'ALL') queryParams.append('category', filters.category);
        if (filters.manufacturer && filters.manufacturer !== 'ALL') queryParams.append('manufacturer', filters.manufacturer);
        if (filters.protocol && filters.protocol !== 'ALL') queryParams.append('protocol', filters.protocol);
        if (filters.search) queryParams.append('search', filters.search);

        const response = await fetch(`/api/products?${queryParams.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }
        
        const data = await response.json();
        setProducts(data);
    } catch (err: any) {
        console.warn("API connection failed, falling back to mock data.", err);
        
        // --- Fallback Logic: Filter mock data locally ---
        let filtered = [...PRODUCTS];
        
        if (filters.category && filters.category !== 'ALL') {
            filtered = filtered.filter(p => p.category === filters.category);
        }
        if (filters.manufacturer && filters.manufacturer !== 'ALL') {
            filtered = filtered.filter(p => p.manufacturer === filters.manufacturer);
        }
        if (filters.protocol && filters.protocol !== 'ALL') {
            filtered = filtered.filter(p => p.protocol && p.protocol.includes(filters.protocol));
        }
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.sku.toLowerCase().includes(term)
            );
        }
        
        setProducts(filtered);
        // We do not set error here to keep the UI usable
    } finally {
        setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Admin Mock Functions (Client-side only)
  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  return (
    <ProductContext.Provider value={{ 
        products, 
        isLoading, 
        error, 
        fetchProducts,
        updateProduct, 
        deleteProduct, 
        addProduct 
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};