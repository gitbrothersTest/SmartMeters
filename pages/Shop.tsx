import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';
import { ProductCategory } from '../types';

const Shop: React.FC = () => {
  const { products } = useProducts();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category') || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setFilterCategory(cat);
  }, [searchParams]);

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    if (cat === 'ALL') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  const filteredProducts = products
    .filter(p => {
      const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
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
              
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-sm text-gray-500 uppercase">{t('shop.category')}</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="category" 
                      checked={filterCategory === 'ALL'} 
                      onChange={() => handleCategoryChange('ALL')}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="text-sm">All</span>
                  </label>
                  {Object.values(ProductCategory).map(cat => (
                    <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="category" 
                        checked={filterCategory === cat} 
                        onChange={() => handleCategoryChange(cat)}
                        className="text-accent focus:ring-accent"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
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
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
