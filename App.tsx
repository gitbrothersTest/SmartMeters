import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ProductProvider } from './context/ProductContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';

function App() {
  return (
    <LanguageProvider>
      <ProductProvider>
        <CartProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="contact" element={<Contact />} />
                <Route path="about" element={<div className="p-10 text-center text-xl font-bold text-gray-500">About Us Content Placeholder</div>} />
              </Route>
            </Routes>
          </HashRouter>
        </CartProvider>
      </ProductProvider>
    </LanguageProvider>
  );
}

export default App;