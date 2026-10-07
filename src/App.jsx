import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import InstallBanner from './components/InstallBanner.jsx';
import Feed from './pages/Feed.jsx';

// Only the feed loads up front; the rest load when opened (kinder on mobile data).
const Restaurant = lazy(() => import('./pages/Restaurant.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Paid = lazy(() => import('./pages/Paid.jsx'));
const Order = lazy(() => import('./pages/Order.jsx'));
const Book = lazy(() => import('./pages/Book.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Me = lazy(() => import('./pages/Me.jsx'));

const NotFound = () => <div className="page center"><span className="big">🍽️</span><h2>That page isn't on the menu</h2><Link className="btn primary" to="/">Back to the feed</Link></div>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="page center"><div className="spinner dark" /></div>}>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/r/:id" element={<Restaurant />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/paid" element={<Paid />} />
            <Route path="/o/:id" element={<Order />} />
            <Route path="/book/:id" element={<Book />} />
            <Route path="/search" element={<Search />} />
            <Route path="/me" element={<Me />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <InstallBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
