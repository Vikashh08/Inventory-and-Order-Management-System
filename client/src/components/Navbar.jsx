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
                className="glass-card navbar-dropdown-panel" 
                style={{ 
                  position: 'absolute', 
                  top: '48px', 
                  right: '0', 
                  marginTop: '8px',
                  width: '300px', 
                  zIndex: '1500', 
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
                }}
              >
                <div className="flex align-center gap-8" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px', color: 'var(--warning)' }}>
                  <ShieldAlert size={16} />
                  <h4 style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>Critical Alerts</h4>
                  {lowStockCount > 0 && (
                    <span className="badge danger" style={{ fontSize: '9px', padding: '2px 6px', marginLeft: 'auto' }}>
                      {lowStockCount}
                    </span>
                  )}
                </div>
                {lowStockCount === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--success)', textAlign: 'center', padding: '12px 0' }}>
                    All stock levels are healthy ✓
                  </p>
                ) : (
                  <div className="dropdown-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {lowStockProducts.map(p => (
                      <div 
                        key={p.id} 
                        className="dropdown-alert-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          onViewChange('inventory');
                          setShowDropdown(false);
                        }}
                      >
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }} className="alert-item-name">{p.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'monospace' }}>{p.sku}</span>
                          <span style={{ color: 'var(--danger)', fontWeight: '700', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {formatQuantity(p.quantity, p.unit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '12px', textAlign: 'center' }}>
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
