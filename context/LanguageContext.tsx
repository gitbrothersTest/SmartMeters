import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    // Strict check: if saved is not exactly 'ro' or 'en', default to 'ro'
    if (saved === 'ro' || saved === 'en') {
      return saved;
    }
    return 'ro';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string): string => {
    // Safety check: ensure language exists in TRANSLATIONS
    const langSet = TRANSLATIONS[language] || TRANSLATIONS['ro'];
    
    if (!langSet) {
        console.warn(`Missing translations completely.`);
        return key;
    }
    
    return langSet[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};