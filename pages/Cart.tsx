
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, ArrowRight, Tag, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const Cart: React.FC = () => {
  const { 
    items, 
    updateQuantity, 
    removeFromCart, 
    subtotal, 
    total, 
    applyDiscount, 
    removeDiscount, 
    discountCode, 
    discountValue 
  } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleApplyDiscount = async () => {
    if (!promoInput.trim()) return;
    setIsValidating(true);
    setPromoError('');
    
    const success = await applyDiscount(promoInput);
    
    setIsValidating(false);
    if (success) {
      setPromoInput('');
      setPromoError('');
    } else {
      setPromoError('Invalid code');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('cart.empty')}</h2>
        <Link to="/shop" className="inline-block bg-primary text-white py-3 px-8 rounded-lg hover:bg-slate-800">
          {t('cart.continue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('cart.title')}</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-grow">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-500 uppercase">
                <div className="col-span-6">{t('cart.product')}</div>
                <div className="col-span-2 text-center">{t('cart.price')}</div>
                <div className="col-span-2 text-center">{t('cart.quantity')}</div>
                <div className="col-span-2 text-right">{t('cart.subtotal')}</div>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map(item => (
                  <div key={item.id} className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Product Info */}
                    <div className="col-span-6 flex items-center w-full">
                      <Link to={`/product/${item.id}`} className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded border border-gray-100 mr-4 flex items-center justify-center cursor-pointer hover:border-accent transition-colors">
                        <img 
                            src={item.image} 
                            alt={item.name} 
                            className="max-w-full max-h-full p-1 mix-blend-multiply" 
                        />
                      </Link>
                      <div>
                        <Link to={`/product/${item.id}`}>
                            <h3 className="font-bold text-slate-800 hover:text-accent transition-colors">{item.name}</h3>
                        </Link>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 text-center w-full md:w-auto flex justify-between md:justify-center md:block">
                        <span className="md:hidden text-gray-500 text-sm">{t('cart.price')}: </span>
                        <span>{item.price} {item.currency}</span>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center w-full md:w-auto py-2 md:py-0">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-100 text-gray-600"
                        >-</button>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center py-1 focus:outline-none"
                        />
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-100 text-gray-600"
                        >+</button>
                      </div>
                    </div>

                    {/* Subtotal & Remove */}
                    <div className="col-span-2 flex items-center justify-between w-full md:w-auto">
                        <span className="md:hidden text-gray-500 text-sm">{t('cart.total')}: </span>
                        <div className="font-bold text-slate-900 ml-auto md:ml-0">
                             {(item.price * item.quantity).toFixed(2)} {item.currency}
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
                <Link to="/shop" className="text-primary hover:text-accent font-medium flex items-center gap-2">
                    <ArrowLeft size={16} /> {t('cart.continue')}
                </Link>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 pb-2 border-b border-gray-100">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')}</span>
                  <span>{subtotal.toFixed(2)} RON</span>
                </div>
                
                {/* Discount Section */}
                {discountCode ? (
                  <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded">
                    <div className="flex items-center gap-1">
                      <Tag size={14} />
                      <span className="text-sm">Code: {discountCode}</span>
                      <button onClick={removeDiscount} className="ml-1 text-xs hover:underline text-red-500">(remove)</button>
                    </div>
                    <span>-{discountValue.toFixed(2)} RON</span>
                  </div>
                ) : (
                   <div className="pt-2">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder={t('cart.code_placeholder')}
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            disabled={isValidating}
                            className="flex-grow border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:bg-gray-100"
                          />
                          <button 
                            onClick={handleApplyDiscount}
                            disabled={isValidating || !promoInput}
                            className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isValidating ? <Loader2 size={14} className="animate-spin" /> : t('cart.apply')}
                          </button>
                      </div>
                      {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
                   </div>
                )}
                
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>VAT (19% included)</span>
                  <span>{((total * 19) / 119).toFixed(2)} RON</span>
                </div>
                
                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between font-bold text-xl text-slate-900">
                  <span>{t('cart.final_total')}</span>
                  <span>{total.toFixed(2)} RON</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-accent text-white py-4 rounded-lg font-bold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                {t('cart.checkout')} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
