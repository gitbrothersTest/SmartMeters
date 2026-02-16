import React, { useState } from 'react';
import { Mail, MapPin, CheckCircle, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// STRICTLY retrieved from env
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL || '0', 10);

const Contact: React.FC = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus('submitting');
    if (DEBUG_LEVEL > 0) console.log('[Contact] Submitting form', { email: formData.email });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        if (DEBUG_LEVEL > 0) console.log('[Contact] Submission successful');
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        if (DEBUG_LEVEL > 0) console.warn('[Contact] Submission failed', response.status);
        setStatus('error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      if (DEBUG_LEVEL > 0) console.error('[Contact] Exception', error);
      setStatus('error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">{t('nav.contact')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <div className="space-y-8">
          
          {/* Email Info */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="bg-blue-50 p-3 rounded-full text-primary">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Email</h3>
              <p className="text-gray-600">adrian.geanta@smartmeter.ro</p>
              <p className="text-gray-600">office.git.brothers@gmail.com</p>
              <p className="text-gray-500 text-sm mt-2">Trimite-ne cererile tale de ofertă.</p>
            </div>
          </div>

          {/* Address Info */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="bg-blue-50 p-3 rounded-full text-primary">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Sediu</h3>
              <p className="text-gray-600">București, Romania</p>
              <p className="text-gray-500 text-sm mt-2">Depozit central și birouri.</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold mb-6">Trimite un mesaj</h2>
          
          {status === 'success' ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full text-green-600 mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mesaj Trimis!</h3>
              <p className="text-gray-600">Îți mulțumim. Te vom contacta în curând.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-accent hover:underline text-sm font-medium"
              >
                Trimite alt mesaj
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
                <input 
                  type="text" 
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-shadow" 
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')}</label>
                <input 
                  type="email" 
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-shadow" 
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                <textarea 
                  name="message"
                  id="message"
                  rows={4} 
                  required
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-shadow"
                ></textarea>
              </div>
              
              {status === 'error' && (
                <p className="text-red-500 text-sm">A apărut o eroare. Te rugăm să încerci din nou.</p>
              )}

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full bg-primary text-white py-3 rounded font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {status === 'submitting' ? 'Se trimite...' : (
                  <>
                    Trimite <Send size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;