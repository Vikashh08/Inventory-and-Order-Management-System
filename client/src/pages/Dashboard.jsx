import React, { useState, useEffect } from 'react';
import { IndianRupee, ShoppingBag, ShieldAlert, Layers, Loader2, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatQuantity } from '../utils/format';

export default function Dashboard({ onViewChange, showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/dashboard/stats');
      setStats(data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex align-center justify-center" style={{ minHeight: '60vh' }}>
        <Loader2 size={40} className="spinner" />
      </div>
    );
  }

  if (!stats) return <p style={{ textAlign: 'center', marginTop: '40px' }}>No stats data available.</p>;

  // Find max revenue for scaling chart bars
  const maxRevenue = stats.salesTrend?.length > 0 
    ? Math.max(...stats.salesTrend.map(t => t.revenue), 100) 
    : 100;

  return (
    <div className="animate-fade container" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>Overview Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time stock levels, financial tracking, and order analysis.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        {/* Total Revenue */}
        <div className="glass-card flex align-center gap-16">
          <div className="flex justify-center align-center" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <IndianRupee size={22} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</p>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>{formatINR(stats.totalRevenue)}</h3>
          </div>
        </div>

        {/* Orders Completed */}
        <div className="glass-card flex align-center gap-16">
          <div className="flex justify-center align-center" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders Filled</p>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>{stats.orderStats.COMPLETED}</h3>
          </div>
        </div>

        {/* Active Quotations */}
        <div className="glass-card flex align-center gap-16">
          <div className="flex justify-center align-center" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(217, 119, 6, 0.15)', color: 'var(--secondary)' }}>
            <Layers size={22} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quotations</p>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginTop: '2px' }}>{stats.orderStats.QUOTATION}</h3>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card flex align-center gap-16" style={stats.lowStockCount > 0 ? { border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(30, 20, 10, 0.5)' } : {}}>
          <div className="flex justify-center align-center" style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: stats.lowStockCount > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
            color: stats.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-muted)' 
          }}>
            <ShieldAlert size={22} className={stats.lowStockCount > 0 ? 'pulse-anim' : ''} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Items</p>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginTop: '2px', color: stats.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
              {stats.lowStockCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Panels */}
      <div className="grid-2">
        {/* Left: Daily Revenue Chart & Recent Orders */}
        <div className="flex flex-column gap-24">
          {/* Sales Trend Chart */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Sales Trend (Completed Revenue)</h3>
            {stats.salesTrend?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No completed orders in the past week to display trends.</p>
            ) : (
              <div className="flex align-end justify-between" style={{ height: '200px', padding: '0 10px', borderBottom: '1px solid var(--border-color)', gap: '16px' }}>
                {stats.salesTrend.map((t, idx) => {
                  const percentHeight = (t.revenue / maxRevenue) * 160 + 10; // min 10px, max 170px
                  return (
                    <div key={idx} className="flex flex-column align-center" style={{ flex: '1', height: '100%', justifyContent: 'flex-end' }}>
                      <div 
                        style={{ 
                          width: '100%', 
                          maxHeight: '170px',
                          height: `${percentHeight}px`, 
                          background: 'linear-gradient(to top, var(--primary) 0%, var(--secondary) 100%)', 
                          borderRadius: '6px 6px 0 0',
                          position: 'relative',
                          transition: 'height 0.8s ease',
                          cursor: 'pointer'
                        }}
                        className="chart-bar"
                        title={formatINR(t.revenue)}
                      >
                        <div className="chart-tooltip">{formatINR(t.revenue)}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>
                        {t.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity Log */}
          <div className="glass-card">
            <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Recent Activity Feed</h3>
              <button onClick={() => onViewChange('orders')} className="glass-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>
                View All <ArrowRight size={12} />
              </button>
            </div>
            {stats.recentOrders?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No recent order activity.</p>
            ) : (
              <div className="flex flex-column gap-8">
                {stats.recentOrders.map((o) => (
                  <div key={o.id} className="flex justify-between align-center" style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div className="flex align-center gap-8">
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{o.order_number}</span>
                        <span className={`badge ${o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'warning'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {o.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Created by {o.creator_name} &bull; {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{formatINR(o.total_amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Low Stock Alert Details */}
        <div className="glass-card flex flex-column" style={{ height: 'fit-content' }}>
          <div className="flex justify-between align-center" style={{ marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Critical Stock Alerts</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Items requiring restocking or attention.</p>
            </div>
            <button onClick={() => onViewChange('inventory')} className="glass-btn" style={{ padding: '4px 10px', fontSize: '12px' }}>
              Restock <ArrowRight size={12} />
            </button>
          </div>

          {stats.lowStockProducts?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: '500', color: 'var(--success)' }}>All inventory stock levels are healthy!</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>No items are below minimum thresholds.</p>
            </div>
          ) : (
            <div className="flex flex-column gap-12">
              {stats.lowStockProducts.map((p) => {
                const stockVal = parseFloat(p.quantity);
                const minVal = parseFloat(p.min_stock_level);
                // Calculate percentage level
                const stockPercent = Math.min((stockVal / (minVal || 1)) * 100, 100);
                const isSevere = stockVal === 0 || stockPercent <= 25;
                const severityClass = isSevere ? 'severe' : 'warning';
                
                return (
                  <div key={p.id} className={`critical-stock-card ${severityClass}`}>
                    <div className="flex align-start gap-12" style={{ marginBottom: '12px' }}>
                      <div className={`alert-icon-wrapper ${severityClass}`}>
                        <ShieldAlert size={16} />
                      </div>
                      <div style={{ flex: '1' }}>
                        <div className="flex justify-between align-start">
                          <div>
                            <h4 className="stock-product-name">{p.name}</h4>
                            <span className="stock-product-sku">SKU: {p.sku}</span>
                          </div>
                          <div className="stock-status-badge">
                            {isSevere ? 'Critical' : 'Low Stock'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>Current: <strong style={{ color: isSevere ? 'var(--danger)' : 'var(--warning)' }}>{formatQuantity(p.quantity, p.unit)}</strong></span>
                        <span>Min: <strong>{formatQuantity(p.min_stock_level, p.unit)}</strong></span>
                      </div>
                      <div className="stock-progress-track">
                        <div 
                          className={`stock-progress-bar ${severityClass}`} 
                          style={{ width: `${Math.max(stockPercent, 4)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pulse-anim {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); filter: brightness(1.2); }
          100% { transform: scale(1); }
        }
        .chart-bar:hover .chart-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-10px);
        }
        .chart-tooltip {
          position: absolute;
          top: -36px;
          left: 50%;
          transform: translateX(-50%) translateY(0);
          background: var(--bg-darker);
          color: #fff;
          font-family: var(--font-heading);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: var(--transition-fast);
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .critical-stock-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 14px 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .critical-stock-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          border-radius: 3px 0 0 3px;
        }
        .critical-stock-card.severe::before {
          background: var(--danger);
        }
        .critical-stock-card.warning::before {
          background: var(--warning);
        }
        .critical-stock-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04);
        }
        .critical-stock-card.severe:hover {
          border-color: rgba(239, 68, 68, 0.3);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.08);
        }
        .critical-stock-card.warning:hover {
          border-color: rgba(245, 158, 11, 0.3);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.08);
        }
        .alert-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .alert-icon-wrapper.severe {
          background: rgba(239, 68, 68, 0.12);
          color: var(--danger);
          animation: icon-pulse-red 2.5s infinite;
        }
        .alert-icon-wrapper.warning {
          background: rgba(245, 158, 11, 0.12);
          color: var(--warning);
        }
        @keyframes icon-pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .stock-product-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .stock-product-sku {
          font-size: 11px;
          color: var(--text-muted);
          font-family: monospace;
        }
        .stock-status-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .severe .stock-status-badge {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .warning .stock-status-badge {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .stock-progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
          margin-top: 4px;
        }
        .stock-progress-bar {
          height: 100%;
          border-radius: 3px;
        }
        .stock-progress-bar.severe {
          background: linear-gradient(90deg, #f87171, var(--danger));
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.3);
        }
        .stock-progress-bar.warning {
          background: linear-gradient(90deg, #fbbf24, var(--warning));
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.3);
        }
      `}</style>
    </div>
  );
}
