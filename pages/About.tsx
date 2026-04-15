import React from 'react';
import { Target, Users, BarChart, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const About: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{t('about.title')}</h1>
          <p className="text-lg text-gray-600 mb-12">{t('about.subtitle')}</p>
        </div>

        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-200 max-w-5xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-4">{t('about.mission_title')}</h2>
              <p className="text-gray-700 leading-relaxed">
                {t('about.mission_content')}
              </p>
            </div>
            <div className="text-center text-accent">
              <Target size={80} className="mx-auto" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t('about.why_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <Users size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">{t('about.choice1_title')}</h3>
              <p className="text-sm text-gray-600">{t('about.choice1_content')}</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <Zap size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">{t('about.choice2_title')}</h3>
              <p className="text-sm text-gray-600">{t('about.choice2_content')}</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <BarChart size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">{t('about.choice3_title')}</h3>
              <p className="text-sm text-gray-600">{t('about.choice3_content')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default About;