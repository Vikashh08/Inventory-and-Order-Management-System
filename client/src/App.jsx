import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';
import api from './utils/api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(api.getUser());
  const [unauthView, setUnauthView] = useState('login');
  const [view, setView] = useState('dashboard');
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchLowStockCount = async () => {
    try {
      if (api.getToken() && api.getUser()) {
        const data = await api.get('/api/products?lowStock=true');
        setLowStockProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch low stock count for navbar:', err);
    }
  };

  useEffect(() => {
    fetchLowStockCount();
    // Refresh stock status every 30 seconds
    const interval = setInterval(fetchLowStockCount, 30000);
    return () => clearInterval(interval);
  }, [user, view]);

  // Global toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    api.clearToken();
    api.clearUser();
    setUser(null);
    setView('dashboard');
    showToast('Logged out successfully.', 'success');
  };

  // Render view depending on authentication
  if (!user) {
    return (
      <>
        {unauthView === 'login' ? (
          <Login onViewChange={setUnauthView} onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        ) : (
          <Register onViewChange={setUnauthView} onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        )}
        {toast && (
          <div className={`alert-toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-shell flex flex-column" style={{ minHeight: '100vh' }}>
      <Navbar 
        activeView={view} 
        onViewChange={setView} 
        user={user} 
        onLogout={handleLogout} 
        lowStockProducts={lowStockProducts}
      />

      <main style={{ flex: '1', padding: '0 8px' }}>
        {view === 'dashboard' && <Dashboard onViewChange={setView} showToast={showToast} />}
        {view === 'inventory' && <Inventory user={user} showToast={showToast} />}
        {view === 'orders' && <Orders user={user} showToast={showToast} />}
      </main>

      {/* Global alert toast notifications */}
      {toast && (
        <div className={`alert-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
