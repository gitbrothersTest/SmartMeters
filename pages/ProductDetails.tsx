
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, FileText, Activity, Layers, Cpu, Server, Wifi, Download, FileCheck, FileQuestion } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products, isLoading: isContextLoading } = useProducts();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Effect to find or fetch product
  useEffect(() => {
    if (!id) return;

    // 1. Try to find in global context first (instant load)
    const foundInContext = products.find(p => p.id === id);
    if (foundInContext) {
        setProduct(foundInContext);
        setLoading(false);
        return;
    }

    // 2. If not in context (e.g. direct link, or list not filtered yet), fetch specific
    const fetchSpecificProduct = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/products/${id}`);
            if (!response.ok) {
                throw new Error('Product not found');
            }
            const data = await response.json();
            setProduct(data);
        } catch (err) {
            console.error("Error fetching specific product", err);
            setError('Product could not be loaded.');
        } finally {
            setLoading(false);
        }
    };

    fetchSpecificProduct();
  }, [id, products]);

  if (loading || isContextLoading && !product) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">{error || 'Product Not Found'}</h2>
        <Link to="/shop" className="text-accent hover:underline">{t('product.back_to_shop')}</Link>
      </div>
    );
  }

  // Parse protocol string to array if needed (handles DB inconsistency)
  const protocols = typeof product.protocol === 'string' 
    ? product.protocol.split(',').map(s => s.trim()) 
    : Array.isArray(product.protocol) ? product.protocol : [];

  // Generate Request Message
  const requestMessage = `Buna ziua,

Doresc documentatia pentru produsul ${product.name} cu codul SKU ${product.sku}

#Introduceti si alte detalii daca este nevoie

Va multumesc!`;

  // Determine availability
  const isUnavailable = !product.isActive || product.stockStatus === 'out_of_stock';

  return (
    <div className="bg-gray-50 py-12 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Link to="/shop" className="hover:text-accent">Shop</Link>
            <span>/</span>
            <span className="uppercase">{product.category}</span>
            <span>/</span>
            <span className="text-slate-800 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        <Link to="/shop" className="inline-flex items-center text-gray-500 hover:text-accent mb-6">
          <ArrowLeft size={16} className="mr-1" /> {t('product.back_to_shop')}
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Image Section */}
            <div className="lg:w-1/2 p-8 bg-white flex items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 relative min-h-[400px]">
                <div className="absolute top-4 left-4 z-10">
                    {isUnavailable ? (
                        <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {product.stockStatus === 'out_of_stock' ? t('product.out_of_stock') : t('product.unavailable')}
                        </span>
                    ) : product.stockStatus === 'in_stock' ? (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {t('product.stock_in')}
                        </span>
                    ) : (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {t('product.stock_request')}
                        </span>
                    )}
                </div>
              <img 
                src={product.image} 
                alt={product.name}
                className={`max-h-[500px] w-auto object-contain mix-blend-multiply transition-transform hover:scale-105 duration-500 ${isUnavailable ? 'grayscale opacity-70' : ''}`}
              />
            </div>

            {/* Info Section */}
            <div className="lg:w-1/2 p-8 lg:p-12">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={14} /> {product.manufacturer}
                    </span>
                    {product.series && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                            Seria {product.series}
                        </span>
                    )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2 mb-2">{product.name}</h1>
                <p className="text-sm text-gray-500 font-mono">SKU: {product.sku}</p>
              </div>

              {/* Price & Cart Block */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-8">
                {isUnavailable ? (
                    <div className="text-center py-4">
                        <span className="text-2xl font-bold text-gray-400 uppercase tracking-wider block mb-2">{t('product.unavailable')}</span>
                        <p className="text-sm text-gray-500">Acest produs nu este momentan disponibil pentru comandă.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-baseline mb-4">
                            <span className="text-4xl font-bold text-slate-900">{product.price} <span className="text-2xl">{product.currency}</span></span>
                            <span className="text-sm text-gray-500 ml-2 font-medium">+ TVA</span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button 
                            onClick={() => addToCart(product, 1)}
                            className="flex-1 bg-accent text-white py-3.5 px-6 rounded-lg font-bold text-lg hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                            <ShoppingCart size={20} />
                            {t('shop.add_to_cart')}
                            </button>
                        </div>
                    </>
                )}
              </div>

              {/* SECTION: Description */}
              <div className="mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FileText size={20} className="text-accent" />
                    {t('product.description')}
                </h3>
                <div className="prose prose-slate text-gray-600 leading-relaxed">
                    <p>{product.fullDescription[language] || product.fullDescription['ro']}</p>
                </div>
              </div>

              {/* SECTION: Documentation (Dynamic) */}
              <div className="mb-10">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <FileCheck size={20} className="text-accent" />
                    Documentație & Fișe Tehnice
                </h3>
                
                {product.datasheetUrl && product.datasheetUrl !== 'N/A' ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded border border-blue-100 text-blue-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <span className="block font-semibold text-slate-800">{t('product.datasheet')}</span>
                                <span className="text-xs text-gray-500">PDF Document</span>
                            </div>
                        </div>
                        <a 
                            href={product.datasheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded font-medium text-sm flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all"
                        >
                            <Download size={16} /> {t('product.download')}
                        </a>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded border border-amber-100 text-amber-600">
                                <FileQuestion size={24} />
                            </div>
                            <div>
                                <span className="block font-semibold text-slate-800">{t('product.docs_unavailable')}</span>
                                <span className="text-xs text-gray-500">{t('product.docs_request_sub')}</span>
                            </div>
                        </div>
                        <Link 
                            to={`/contact?message=${encodeURIComponent(requestMessage)}`}
                            className="bg-white text-amber-700 border border-amber-200 px-4 py-2 rounded font-medium text-sm flex items-center gap-2 hover:bg-amber-600 hover:text-white transition-all whitespace-nowrap"
                        >
                            {t('product.request_docs')}
                        </Link>
                    </div>
                )}
              </div>

              {/* SECTION: Characteristics & Specs */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Activity size={20} className="text-accent"/>
                    {t('product.specs')}
                </h3>
                
                <div className="grid grid-cols-1 gap-y-6">
                    {/* Primary Features Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Layers className="text-gray-400" size={16} />
                                <span className="text-xs font-bold text-gray-500 uppercase">Mounting</span>
                            </div>
                            <span className="font-semibold text-slate-900 block">{product.mounting || '-'}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Cpu className="text-gray-400" size={16} />
                                <span className="text-xs font-bold text-gray-500 uppercase">Max Capacity</span>
                            </div>
                            <span className="font-semibold text-slate-900 block">{product.maxCapacity ? `${product.maxCapacity}` : '-'}</span>
                        </div>
                    </div>

                    {/* Protocol Chips */}
                    {protocols.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <Wifi size={14} /> Communication Protocols
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {protocols.map((p, idx) => (
                                    <span key={idx} className="bg-white text-slate-700 border border-gray-200 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 shadow-sm">
                                        <Server size={12} className="text-accent" /> {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Specs Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="py-3 px-4 border-b border-gray-200">Caracteristică</th>
                                    <th className="py-3 px-4 border-b border-gray-200">Valoare</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {Object.entries(product.specs).map(([key, value], index) => (
                                <tr key={key} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-600 bg-white w-1/3">{key}</td>
                                    <td className="py-3 px-4 text-slate-900 bg-white">{value}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
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
