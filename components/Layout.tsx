
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Globe, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

const Layout: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.shop'), path: '/shop' },
    { name: t('nav.about'), path: '/about' },
    { name: t('nav.contact'), path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Sticky Wrapper for Top Bar and Header - Added bg-white to prevent see-through */}
      <div className="sticky top-0 z-50 w-full bg-white shadow-md">
        {/* Top Bar - Very Corporate */}
        <div className="bg-primary text-gray-300 text-xs py-2 px-4 md:px-8 flex justify-between items-center">
          <div>
            <a href="mailto:adrian.geanta@smartmeter.ro" className="mr-4 hover:text-white transition-colors">
              adrian.geanta@smartmeter.ro
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/my-orders" className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
                <User size={12} />
                <span className="font-medium">{t('nav.my_orders')}</span>
            </Link>
            <div className="w-px h-3 bg-gray-600 mx-2"></div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-white" onClick={() => setLanguage(language === 'ro' ? 'en' : 'ro')}>
              <Globe size={12} />
              <span className="uppercase font-bold">{language}</span>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <header className="bg-white">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-accent font-bold text-xl">
                SM
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-primary tracking-tight">SmartMeter.ro</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest hidden sm:block">Industrial Metering</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-accent ${
                    location.pathname === link.path ? 'text-accent' : 'text-gray-600'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-accent transition-colors">
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                className="md:hidden p-2 text-gray-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100">
              <div className="flex flex-col p-4 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="text-gray-700 hover:text-accent font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <Link to="/my-orders" className="text-gray-700 hover:text-accent font-medium" onClick={() => setIsMenuOpen(false)}>
                    {t('nav.my_orders')}
                </Link>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">SmartMeter.ro</h3>
            <p className="text-sm leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-white">Shop</Link></li>
              <li><Link to="/about" className="hover:text-white">About</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="hover:text-white">{t('footer.privacy')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <p className="text-sm">București, Romania</p>
            <p className="text-sm">adrian.geanta@smartmeter.ro</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-xs">
          © {new Date().getFullYear()} SmartMeter.ro. {t('footer.rights')}
        </div>
      </footer>
    </div>
  );
};

export default Layout;
