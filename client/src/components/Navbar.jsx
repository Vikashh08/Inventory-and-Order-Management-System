import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ShoppingCart, LogOut, ShieldAlert, Bell } from 'lucide-react';
import api from '../utils/api';
import { formatQuantity } from '../utils/format';

export default function Navbar({ activeView, onViewChange, user, onLogout, lowStockProducts }) {
  const isAdmin = user?.role === 'ADMIN';
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const lowStockCount = lowStockProducts?.length || 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-card flex align-center justify-between" style={{ borderRadius: '0 0 14px 14px', borderTop: 'none', padding: '16px 32px', marginBottom: '24px' }}>
      <div className="flex align-center gap-16">
        <div className="flex align-center gap-8" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', padding: '10px', borderRadius: '10px' }}>
          <Package size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', background: 'linear-gradient(90deg, #fff 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ApexInventory
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order Management</p>
        </div>
      </div>

      <nav className="flex gap-8">
        <button 
          onClick={() => onViewChange('dashboard')}
          className={`glass-btn ${activeView === 'dashboard' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <button 
          onClick={() => onViewChange('inventory')}
          className={`glass-btn ${activeView === 'inventory' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          <Package size={16} />
          Inventory
        </button>
        <button 
          onClick={() => onViewChange('orders')}
          className={`glass-btn ${activeView === 'orders' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          <ShoppingCart size={16} />
          Orders
        </button>
      </nav>

      <div className="flex align-center gap-16">
        {user && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ 
                position: 'relative', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '8px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.03)',
                marginRight: '8px',
                transition: 'var(--transition-fast)'
              }}
              className="navbar-bell"
              title={lowStockCount > 0 ? `${lowStockCount} low stock alerts` : 'Stock levels healthy'}
            >
              <Bell size={18} color={lowStockCount > 0 ? 'var(--warning)' : 'var(--text-secondary)'} />
              {lowStockCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: '700',
                  borderRadius: '50%',
                  width: '15px',
                  height: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--bg-darker)'
                }}>
                  {lowStockCount}
                </span>
              )}
            </div>

            {showDropdown && (
              <div 
                className="glass-card" 
                style={{ 
                  position: 'absolute', 
                  top: '48px', 
                  right: '8px', 
                  width: '280px', 
                  zIndex: '1500', 
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
                }}
              >
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Low Stock Alerts</h4>
                </div>
                {lowStockCount === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--success)', textAlign: 'center', padding: '12px 0' }}>
                    All stock levels are healthy ✓
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {lowStockProducts.map(p => (
                      <div 
                        key={p.id} 
                        style={{ fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px', cursor: 'pointer' }}
                        onClick={() => {
                          onViewChange('inventory');
                          setShowDropdown(false);
                        }}
                      >
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                          <span>SKU: {p.sku}</span>
                          <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                            {formatQuantity(p.quantity, p.unit)} left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '12px', textAlign: 'center' }}>
                  <button 
                    onClick={() => {
                      onViewChange('inventory');
                      setShowDropdown(false);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Manage Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>{user?.name || 'User'}</div>
          <span className={`badge ${isAdmin ? 'admin' : 'seller'}`}>
            {isAdmin ? 'Admin' : 'Seller'}
          </span>
        </div>
        <button 
          onClick={onLogout}
          className="glass-btn danger icon-only" 
          title="Logout"
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
