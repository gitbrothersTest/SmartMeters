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
    // Attempt to recover language from localStorage, default to 'ro'
    const saved = localStorage.getItem('app_language');
    return (saved === 'ro' || saved === 'en') ? saved : 'ro';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string): string => {
    if (!TRANSLATIONS[language]) {
        console.warn(`Missing translation set for language: ${language}`);
        return key;
    }
    return TRANSLATIONS[language][key] || key;
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