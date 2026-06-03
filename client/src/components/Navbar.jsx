import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, LogOut, ShieldAlert, Bell } from 'lucide-react';
import api from '../utils/api';

export default function Navbar({ activeView, onViewChange, user, onLogout, lowStockCount }) {
  const isAdmin = user?.role === 'ADMIN';

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
          <div 
            onClick={() => onViewChange('inventory')}
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
