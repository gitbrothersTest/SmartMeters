
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, FileText, Check, ShieldCheck } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();

  const product = products.find(p => p.id === id);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://picsum.photos/500/500?grayscale&blur=2';
    e.currentTarget.alt = 'Image not available';
  };

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <Link to="/shop" className="text-accent hover:underline">Return to Shop</Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumb / Back */}
        <Link to="/shop" className="inline-flex items-center text-gray-500 hover:text-accent mb-6">
          <ArrowLeft size={16} className="mr-1" /> Back to Shop
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Image Section */}
            <div className="lg:w-1/2 p-8 bg-white flex items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100">
              <img 
                src={product.image} 
                alt={product.name}
                onError={handleImageError} 
                className="max-h-[500px] w-auto object-contain mix-blend-multiply"
              />
            </div>

            {/* Info Section */}
            <div className="lg:w-1/2 p-8 lg:p-12">
              <div className="mb-2">
                <span className="text-xs font-bold text-accent bg-green-50 px-2 py-1 rounded uppercase tracking-wider">
                  {product.category}
                </span>
              </div>
              
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              <p className="text-sm text-gray-500 mb-6">SKU: {product.sku}</p>

              <div className="text-3xl font-bold text-slate-900 mb-6 flex items-baseline">
                {product.price} {product.currency}
                <span className="text-sm font-normal text-gray-400 ml-2">+ TVA</span>
              </div>

              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-700 leading-relaxed">
                  {product.fullDescription[language]}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10 border-b border-gray-100 pb-10">
                <button 
                  onClick={() => addToCart(product, 1)}
                  className="flex-1 bg-primary text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  {t('shop.add_to_cart')}
                </button>
                {product.datasheetUrl && (
                  <button className="flex-1 border border-gray-300 text-gray-700 py-4 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <FileText size={20} />
                    {t('product.datasheet')}
                  </button>
                )}
              </div>

              {/* Specs Table */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t('product.specs')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <tbody>
                      {Object.entries(product.specs).map(([key, value], index) => (
                        <tr key={key} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 px-4 font-medium text-gray-600 border-b border-gray-100">{key}</td>
                          <td className="py-2 px-4 text-slate-800 border-b border-gray-100">{value}</td>
                        </tr>
                      ))}
                      {product.protocol && (
                         <tr className="bg-white">
                            <td className="py-2 px-4 font-medium text-gray-600 border-b border-gray-100">Protocol</td>
                            <td className="py-2 px-4 text-slate-800 border-b border-gray-100">
                                <div className="flex gap-2">
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{product.protocol}</span>
                                </div>
                            </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
