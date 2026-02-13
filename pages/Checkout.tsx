import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { BillingDetails } from '../types';
import { CheckCircle } from 'lucide-react';

const Checkout: React.FC = () => {
  const { items, total, subtotal, discountCode, discountValue, clearCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [contactEmail, setContactEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  const [billing, setBilling] = useState<BillingDetails>({
    name: '', company: '', address1: '', address2: '', city: '', postcode: '', country: 'Romania', phone: '', email: ''
  });

  const [shippingSame, setShippingSame] = useState(true);
  
  const [shipping, setShipping] = useState<BillingDetails>({
    name: '', company: '', address1: '', address2: '', city: '', postcode: '', country: 'Romania', phone: '', email: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // --- CLIENT TRACKING LOGIC ---
  const getClientToken = () => {
    let token = localStorage.getItem('sm_client_token');
    if (!token) {
        // Generate a simple UUID-like string if not present
        token = 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
        localStorage.setItem('sm_client_token', token);
    }
    return token;
  };
  // -----------------------------

  useEffect(() => {
    if (items.length === 0 && !submitted) {
      navigate('/cart');
    }
  }, [items, navigate, submitted]);

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBilling(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShipping(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!contactEmail || !billing.name || !billing.city || !billing.phone || !billing.address1) return false;
    if (!shippingSame && (!shipping.name || !shipping.city || !shipping.address1)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    const finalShipping = shippingSame ? billing : shipping;
    const clientToken = getClientToken();

    // Payload cu date structurate
    const payload = {
        email: contactEmail,
        order_notes: orderNotes,
        billing: billing,
        shipping: finalShipping,
        items: items,
        totals: {
            subtotal: subtotal.toFixed(2),
            discount: discountValue.toFixed(2),
            discountCode: discountCode,
            total: total.toFixed(2)
        },
        clientToken: clientToken // Sending token for history tracking
    };

    try {
        // Updated endpoint to match server.js definition
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
             setSubmitted(true);
             clearCart();
        } else {
             throw new Error(data.error || 'Server returned error');
        }
    } catch (error: any) {
        console.error("Order submission failed", error);
        alert(`Eroare la trimitere: ${error.message || "Verificați conexiunea."}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('checkout.success_title')}</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {t('checkout.success_msg')}
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-primary text-white py-3 px-8 rounded-lg font-bold hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">{t('checkout.title')}</h1>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-8">
            {/* Contact Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">{t('checkout.contact')}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')} *</label>
                  <input 
                    type="email" 
                    required 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.notes')}</label>
                  <textarea 
                    rows={3}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Billing Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">{t('checkout.billing')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.company')}</label>
                   <input type="text" name="company" value={billing.company} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
                   <input type="text" name="name" required value={billing.name} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')} *</label>
                   <input type="tel" name="phone" required value={billing.phone} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')} 1 *</label>
                   <input type="text" name="address1" required value={billing.address1} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')} 2</label>
                   <input type="text" name="address2" value={billing.address2} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.city')} *</label>
                   <input type="text" name="city" required value={billing.city} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.postal')}</label>
                   <input type="text" name="postcode" value={billing.postcode} onChange={handleBillingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.country')}</label>
                   <input type="text" name="country" disabled value="Romania" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Shipping Toggle */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
               <label className="flex items-center space-x-3 cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={!shippingSame}
                   onChange={() => setShippingSame(!shippingSame)}
                   className="h-5 w-5 text-accent focus:ring-accent border-gray-300 rounded"
                 />
                 <span className="font-medium text-slate-800">Livrare diferită de facturare</span>
               </label>
            </div>

             {/* Shipping Section (Conditional) */}
             {!shippingSame && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">{t('checkout.shipping')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.company')}</label>
                     <input type="text" name="company" value={shipping.company} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
                     <input type="text" name="name" required value={shipping.name} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')} *</label>
                     <input type="tel" name="phone" required value={shipping.phone} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')} 1 *</label>
                     <input type="text" name="address1" required value={shipping.address1} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')} 2</label>
                     <input type="text" name="address2" value={shipping.address2} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.city')} *</label>
                     <input type="text" name="city" required value={shipping.city} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.postal')}</label>
                     <input type="text" name="postcode" value={shipping.postcode} onChange={handleShippingChange} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.country')}</label>
                     <input type="text" name="country" disabled value="Romania" className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                </div>
              </div>
             )}

          </div>

          {/* Order Review Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b">{t('cart.title')}</h3>
              
              <ul className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                {items.map(item => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <div className="text-gray-500 text-xs">Qty: {item.quantity}</div>
                    </div>
                    <span className="font-semibold">{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-100 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>{t('cart.subtotal')}</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Discount ({discountCode})</span>
                    <span>-{discountValue.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-slate-900 border-t pt-2">
                  <span>{t('cart.final_total')}</span>
                  <span>{total.toFixed(2)} RON</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-accent text-white py-4 rounded-lg font-bold transition-all hover:bg-accent-hover ${isSubmitting ? 'opacity-75 cursor-wait' : ''}`}
              >
                {isSubmitting ? t('checkout.sending') : t('checkout.send')}
              </button>
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                Prin plasarea comenzii, sunteți de acord cu Termenii și Condițiile noastre.
              </p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Checkout;