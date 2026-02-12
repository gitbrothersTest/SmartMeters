import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Contact: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">{t('nav.contact')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="bg-blue-50 p-3 rounded-full text-primary">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Email</h3>
              <p className="text-gray-600">adrian.geanta@smartmeter.ro</p>
              <p className="text-gray-500 text-sm mt-2">Trimite-ne cererile tale de ofertă.</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="bg-blue-50 p-3 rounded-full text-primary">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Telefon</h3>
              <p className="text-gray-600">+40 722 000 000</p>
              <p className="text-gray-500 text-sm mt-2">Luni - Vineri, 09:00 - 17:00</p>
            </div>
          </div>

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

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold mb-6">Trimite un mesaj</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
              <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')}</label>
              <input type="email" className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
              <textarea rows={4} className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-accent focus:border-accent"></textarea>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3 rounded font-bold hover:bg-slate-800">
              Trimite
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
