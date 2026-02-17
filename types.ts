
export type Language = 'ro' | 'en';

export enum ProductCategory {
  ELECTRIC = 'ELECTRIC',
  WATER = 'WATER',
  GAS = 'GAS',
  THERMAL = 'THERMAL',
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  
  // New Filterable Fields
  manufacturer: string;
  series?: string; // e.g. Monofazat, Trifazat
  mounting?: string; // e.g. DIN Rail
  protocol?: string; // Primary protocol
  maxCapacity?: number; // Numeric value for sorting

  shortDescription: {
    ro: string;
    en: string;
  };
  fullDescription: {
    ro: string;
    en: string;
  };
  category: ProductCategory;
  price: number;
  currency: string;
  stockStatus: 'in_stock' | 'on_request' | 'out_of_stock';
  isActive: boolean; // Controls visibility (Hidden from API if false)
  image: string;
  
  // Remaining detailed specs
  specs: Record<string, string>;
  datasheetUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Discount {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  expirationDate?: string;
}

export interface BillingDetails {
  name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  country: string;
  phone: string;
  email: string; // Contact email is top level, but kept here for type simplicity in form
  notes?: string;
}

export interface OrderData {
  customerEmail: string;
  notes: string;
  billing: BillingDetails;
  shipping: BillingDetails;
  items: CartItem[];
  subtotal: number;
  discountCode?: string;
  discountValue: number;
  total: number;
  // Tracking
  clientToken: string;
}
