import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Check } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';
import { ProductCategory } from '../types';

const Shop: React.FC = () => {
  const { products, isLoading, error, fetchProducts } = useProducts();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // -- State for Filters (Temp vs Applied) --
  // We initialize temp state from URL params, but we don't fetch until "Apply"
  const [tempFilters, setTempFilters] = useState({
      category: searchParams.get('category') || 'ALL',
      manufacturer: searchParams.get('manufacturer') || 'ALL',
      protocol: searchParams.get('protocol') || 'ALL'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load from URL on mount
  useEffect(() => {
      const cat = searchParams.get('category') || 'ALL';
      const man = searchParams.get('manufacturer') || 'ALL';
      const prot = searchParams.get('protocol') || 'ALL';
      
      setTempFilters({ category: cat, manufacturer: man, protocol: prot });
      
      // Fetch initial data based on URL
      fetchProducts({ category: cat, manufacturer: man, protocol: prot });
  }, []); // Run once on mount

  const handleFilterChange = (key: string, value: string) => {
      setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
      // 1. Update URL
      const newParams: any = {};
      if (tempFilters.category !== 'ALL') newParams.category = tempFilters.category;
      if (tempFilters.manufacturer !== 'ALL') newParams.manufacturer = tempFilters.manufacturer;
      if (tempFilters.protocol !== 'ALL') newParams.protocol = tempFilters.protocol;
      setSearchParams(newParams);

      // 2. Fetch Data
      fetchProducts({
          ...tempFilters,
          search: searchTerm
      });
  };

  // Hardcoded filter options (mapping to DB columns)
  // In a more advanced version, these could come from an API call /api/filters
  const manufacturers = ['NoARK', 'SmartMeter', 'Siemens', 'AquaTech'];
  const protocols = ['Modbus', 'M-Bus', 'Pulse', 'RS485'];

  // Client-side sorting is fine for current page results
  const sortedProducts = [...products].sort((a, b) => {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-24">
              <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold border-b pb-2">
                <Filter size={20} />
                {t('shop.filters')}
              </div>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-sm text-gray-500 uppercase">{t('shop.category')}</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="category" 
                      checked={tempFilters.category === 'ALL'} 
                      onChange={() => handleFilterChange('category', 'ALL')}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm">All</span>
                  </label>
                  {Object.values(ProductCategory).map(cat => (
                    <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category" 
                        checked={tempFilters.category === cat} 
                        onChange={() => handleFilterChange('category', cat)}
                        className="text-accent focus:ring-accent"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Manufacturer Filter */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-sm text-gray-500 uppercase">Producător</h4>
                <select 
                    value={tempFilters.manufacturer}
                    onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-accent outline-none"
                >
                    <option value="ALL">Toți</option>
                    {manufacturers.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
              </div>

              {/* Protocol Filter */}
              <div className="mb-8">
                <h4 className="font-semibold mb-3 text-sm text-gray-500 uppercase">Protocol</h4>
                <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="protocol" 
                            checked={tempFilters.protocol === 'ALL'} 
                            onChange={() => handleFilterChange('protocol', 'ALL')}
                            className="text-accent focus:ring-accent"
                        />
                        <span className="text-sm">Oricare</span>
                    </label>
                    {protocols.map(p => (
                        <label key={p} className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="protocol" 
                                checked={tempFilters.protocol === p} 
                                onChange={() => handleFilterChange('protocol', p)}
                                className="text-accent focus:ring-accent"
                            />
                            <span className="text-sm">{p}</span>
                        </label>
                    ))}
                </div>
              </div>

              {/* Apply Button */}
              <button 
                onClick={applyFilters}
                className="w-full bg-accent text-white py-2 rounded font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> Aplică Filtrele
              </button>

            </div>
          </div>

          {/* Main Content */}
          <div className="flex-grow">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-auto flex-grow max-w-md">
                <input
                  type="text"
                  placeholder={t('shop.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()} // Search on Enter
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-accent"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>
              
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="border border-gray-300 rounded py-2 px-4 focus:outline-none focus:border-accent bg-white"
              >
                <option value="asc">{t('shop.price_asc')}</option>
                <option value="desc">{t('shop.price_desc')}</option>
              </select>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                    <p className="mt-4 text-gray-500">Se încarcă produsele...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-500">
                    <p>{error}</p>
                    <button onClick={applyFilters} className="mt-4 underline">Încearcă din nou</button>
                </div>
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">Nu am găsit produse conform filtrelor selectate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
