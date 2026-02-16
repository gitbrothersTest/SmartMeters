
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t, language } = useLanguage();
  const { addToCart } = useCart();

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
      <div className="relative h-64 overflow-hidden bg-gray-50 flex items-center justify-center p-4">
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                product.stockStatus === 'in_stock' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
                {product.stockStatus === 'in_stock' ? t('product.stock_in') : t('product.stock_request')}
            </span>
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{product.category}</div>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-lg font-bold text-slate-800 mb-2 hover:text-accent line-clamp-2">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {product.shortDescription[language]}
        </p>
        
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-900">{product.price} {product.currency}</span>
            <span className="text-[10px] text-gray-400">+ TVA</span>
          </div>
          
          <div className="flex space-x-2">
            <Link 
              to={`/product/${product.id}`}
              className="p-2 text-gray-500 hover:text-accent hover:bg-gray-50 rounded transition-colors"
              title={t('shop.details')}
            >
              <Eye size={20} />
            </Link>
            <button 
              onClick={() => addToCart(product, 1)}
              className="bg-primary text-white p-2 rounded hover:bg-accent transition-colors flex items-center gap-2"
              title={t('shop.add_to_cart')}
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
