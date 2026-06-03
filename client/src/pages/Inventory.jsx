import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, RefreshCw, Search, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatQuantity } from '../utils/format';
import Modal from '../components/Modal';

export default function Inventory({ user, showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('unit');
  const [price, setPrice] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [filterLowStock]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const endpoint = filterLowStock ? '/api/products?lowStock=true' : '/api/products';
      const data = await api.get(endpoint);
      setProducts(data);
    } catch (err) {
      showToast(err.message || 'Failed to fetch inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setCurrentProduct(null);
    setName('');
    setDescription('');
    setSku('');
    setQuantity('0');
    setUnit('unit');
    setPrice('0');
    setMinStock('0');
    setIsProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setCurrentProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setSku(product.sku);
    setQuantity(product.quantity);
    setUnit(product.unit);
    setPrice(product.price);
    setMinStock(product.min_stock_level);
    setIsProductModalOpen(true);
  };

  const openRefillModal = (product) => {
    setCurrentProduct(product);
    setQuantity(product.quantity); // Start with existing stock level
    setIsRefillModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!name || !sku || !unit || price === '' || quantity === '') {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setFormLoading(true);
    const payload = {
      name,
      description,
      sku,
      quantity: quantity.toString(),
      unit,
      price: price.toString(),
      min_stock_level: minStock.toString()
    };

    try {
      if (currentProduct) {
        // Edit existing
        const updated = await api.put(`/api/products/${currentProduct.id}`, payload);
        showToast(`Product "${updated.name}" updated successfully!`, 'success');
      } else {
        // Create new
        const created = await api.post('/api/products', payload);
        showToast(`Product "${created.name}" created successfully!`, 'success');
      }
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRefillSubmit = async (e) => {
    e.preventDefault();
    if (quantity === '') return;

    setFormLoading(true);
    try {
      const updated = await api.put(`/api/products/${currentProduct.id}`, {
        quantity: quantity.toString()
      });
      showToast(`Stock for "${updated.name}" adjusted to ${formatQuantity(updated.quantity, updated.unit)}.`, 'success');
      setIsRefillModalOpen(false);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, prodName) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/products/${id}`);
      showToast(`Product "${prodName}" deleted.`, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  // Search filter
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade container" style={{ paddingBottom: '40px' }}>
      <div className="flex justify-between align-center responsive" style={{ marginBottom: '32px', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>Inventory Catalogue</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Configure catalog items, track quantities, and adjust pricing.</p>
        </div>
        
        {isAdmin && (
          <button onClick={openAddModal} className="glass-btn primary">
            <Plus size={18} /> Add New Product
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card flex align-center justify-between responsive gap-16" style={{ padding: '16px 24px', marginBottom: '24px' }}>
        <div className="flex align-center gap-12" style={{ flex: '1', maxWidth: '450px', position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px' }} />
          <input 
            type="text" 
            className="glass-input" 
            style={{ paddingLeft: '48px' }}
            placeholder="Search catalog by name or SKU..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex align-center gap-24 responsive">
          <label className="flex align-center gap-8" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
            />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Show Low Stock Only</span>
          </label>

          <button onClick={fetchProducts} className="glass-btn icon-only" title="Refresh Inventory" style={{ width: '40px', height: '40px', border: 'none', background: 'rgba(255,255,255,0.03)' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex align-center justify-center" style={{ minHeight: '40vh' }}>
          <Loader2 size={40} className="spinner" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>No products found matching filters.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search terms or unchecking 'Show Low Stock Only'.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product Details</th>
                <th>SKU</th>
                <th>Price (INR)</th>
                <th>Current Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const stockVal = parseFloat(p.quantity);
                const minVal = parseFloat(p.min_stock_level);
                const isOutOfStock = stockVal <= 0;
                const isLowStock = stockVal <= minVal && !isOutOfStock;

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description || 'No description provided.'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{p.sku}</td>
                    <td style={{ fontWeight: '600' }}>{formatINR(p.price)}</td>
                    <td style={{ fontWeight: '600' }}>{formatQuantity(p.quantity, p.unit)}</td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge danger">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="badge warning">Low Stock</span>
                      ) : (
                        <span className="badge success">Healthy</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-8 justify-end">
                        <button 
                          onClick={() => openRefillModal(p)}
                          className="glass-btn" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Stock Adjust
                        </button>
                        
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => openEditModal(p)}
                              className="glass-btn icon-only" 
                              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id, p.name)}
                              className="glass-btn danger icon-only" 
                              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        title={currentProduct ? 'Edit Product Catalog' : 'Add New Product to Catalog'}
      >
        <form onSubmit={handleProductSubmit}>
          <div className="grid-2" style={{ gap: '16px' }}>
            <div className="form-group">
              <label>Product Name *</label>
              <input 
                type="text" 
                className="glass-input" 
                required 
                placeholder="e.g. Basmati Rice"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input 
                type="text" 
                className="glass-input" 
                required 
                placeholder="e.g. RICE-BAS-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              className="glass-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              placeholder="Provide a brief description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid-3" style={{ gap: '12px', marginBottom: '8px' }}>
            <div className="form-group">
              <label>Base Stock Qty *</label>
              <input 
                type="number" 
                step="any"
                min="0"
                className="glass-input" 
                required 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Quantity Unit *</label>
              <select 
                className="glass-input"
                style={{ background: '#181b2c', color: '#fff' }}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="unit">unit (item count)</option>
                <option value="kg">kg (kilograms)</option>
                <option value="g">g (grams)</option>
                <option value="L">L (liters)</option>
                <option value="mL">mL (milliliters)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Min stock alert *</label>
              <input 
                type="number" 
                step="any"
                min="0"
                className="glass-input" 
                required 
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Price (INR per unit) *</label>
            <input 
              type="number" 
              step="any"
              min="0"
              className="glass-input" 
              required 
              placeholder="₹ 0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-12" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="button" onClick={() => setIsProductModalOpen(false)} className="glass-btn">
              Cancel
            </button>
            <button type="submit" className="glass-btn primary" disabled={formLoading}>
              {formLoading ? <Loader2 size={18} className="spinner" /> : currentProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Refill / Adjust Modal */}
      <Modal 
        isOpen={isRefillModalOpen} 
        onClose={() => setIsRefillModalOpen(false)} 
        title={`Adjust Stock: ${currentProduct?.name}`}
      >
        <form onSubmit={handleRefillSubmit}>
          <div className="glass-card flex align-center gap-12" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', marginBottom: '20px' }}>
            <AlertTriangle size={20} color="var(--warning)" />
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Current Stock Level:</div>
              <div style={{ fontWeight: '700', fontSize: '16px', marginTop: '2px' }}>
                {currentProduct && formatQuantity(currentProduct.quantity, currentProduct.unit)}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>New Total Stock Quantity ({currentProduct?.unit}) *</label>
            <input 
              type="number" 
              step="any"
              min="0"
              required
              className="glass-input" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.0000"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Updating this setting commits the new count directly to the inventory database for audits and inventory counts.
            </p>
          </div>

          <div className="flex justify-end gap-12" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="button" onClick={() => setIsRefillModalOpen(false)} className="glass-btn">
              Cancel
            </button>
            <button type="submit" className="glass-btn primary" disabled={formLoading}>
              {formLoading ? <Loader2 size={18} className="spinner" /> : 'Confirm Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
