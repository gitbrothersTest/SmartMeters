import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Droplets, Flame, Thermometer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import ProductCard from '../components/ProductCard';
import { ProductCategory } from '../types';

const Home: React.FC = () => {
  const { t } = useLanguage();
  const { products } = useProducts();

  // Featured products (take first 3)
  const featuredProducts = products.slice(0, 3);

  const categories = [
    { id: ProductCategory.ELECTRIC, icon: <Zap size={32} />, color: 'bg-yellow-50 text-yellow-600' },
    { id: ProductCategory.WATER, icon: <Droplets size={32} />, color: 'bg-blue-50 text-blue-600' },
    { id: ProductCategory.GAS, icon: <Flame size={32} />, color: 'bg-orange-50 text-orange-600' },
    { id: ProductCategory.THERMAL, icon: <Thermometer size={32} />, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary text-white py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              {t('hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
              {t('hero.subtitle')}
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold py-3 px-8 rounded transition-all transform hover:translate-x-1"
            >
              {t('hero.cta')} <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                className="group p-8 border border-gray-100 rounded-xl hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col items-center text-center bg-gray-50 hover:bg-white"
              >
                <div className={`p-4 rounded-full mb-4 ${cat.color} group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <h3 className="font-bold text-lg text-slate-800">{cat.id}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{t('home.featured')}</h2>
              <div className="h-1 w-20 bg-accent mt-2 rounded"></div>
            </div>
            <Link to="/shop" className="text-accent hover:text-primary font-medium flex items-center gap-1">
              {t('home.see_all')} <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <h4 className="font-bold text-primary mb-2">{t('home.badge_b2b')}</h4>
            <p className="text-sm text-gray-500">{t('home.badge_b2b_desc')}</p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-2">{t('home.badge_support')}</h4>
            <p className="text-sm text-gray-500">{t('home.badge_support_desc')}</p>
          </div>
          <div>
            <h4 className="font-bold text-primary mb-2">{t('home.badge_shipping')}</h4>
            <p className="text-sm text-gray-500">{t('home.badge_shipping_desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
