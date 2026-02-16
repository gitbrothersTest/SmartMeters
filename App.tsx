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
import MyOrders from './pages/MyOrders';
import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

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
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="about" element={<About />} />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
              </Route>
            </Routes>
          </HashRouter>
        </CartProvider>
      </ProductProvider>
    </LanguageProvider>
  );
}

export default App;