import React, { useState, useEffect } from 'react';
import { Plus, Eye, Check, XSquare, ArrowLeft, Trash2, Calendar, User, Mail, DollarSign, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { formatINR, formatQuantity } from '../utils/format';
import Modal from '../components/Modal';

// Unit conversion configuration matching backend
const CONVERSIONS = {
  'g-kg': 0.001,
  'kg-g': 1000,
  'mL-L': 0.001,
  'L-mL': 1000
};

const getConversionFactor = (orderedUnit, baseUnit) => {
  if (orderedUnit === baseUnit) return 1.0;
  const key = `${orderedUnit}-${baseUnit}`;
  return CONVERSIONS[key] !== undefined ? CONVERSIONS[key] : null;
};

const getCompatibleUnits = (baseUnit) => {
  if (baseUnit === 'kg' || baseUnit === 'g') return ['kg', 'g'];
  if (baseUnit === 'L' || baseUnit === 'mL') return ['L', 'mL'];
  return ['unit'];
};

export default function Orders({ user, showToast }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderStatus, setOrderStatus] = useState('COMPLETED'); // 'COMPLETED' or 'QUOTATION'
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: '1', unit: 'unit', unitPrice: 0, subtotal: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrdersAndProducts();
  }, []);

  const fetchOrdersAndProducts = async () => {
    try {
      setLoading(true);
      const ordersData = await api.get('/api/orders');
      const productsData = await api.get('/api/products');
      setOrders(ordersData);
      setProducts(productsData);
    } catch (err) {
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const orderDetails = await api.get(`/api/orders/${orderId}`);
      setSelectedOrder(orderDetails);
      setIsDetailModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Failed to fetch order details', 'error');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const actionText = newStatus === 'COMPLETED' ? 'finalize this quotation' : 'cancel this order';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    try {
      const updated = await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${updated.status}.`, 'success');
      fetchOrdersAndProducts();
      if (selectedOrder?.id === orderId) {
        setIsDetailModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update order status', 'error');
    }
  };

  const handleDownloadReceipt = (order) => {
    if (!order) return;

    const separator = '==================================================';
    const thinSeparator = '--------------------------------------------------';
    
    let text = `${separator}\n`;
    text += `               APEXINVENTORY RECEIPT\n`;
    text += `            ${order.status} SUMMARY\n`;
    text += `${separator}\n\n`;
    text += `Order Code   : ${order.order_number}\n`;
    text += `Date         : ${new Date(order.created_at).toLocaleString()}\n`;
    text += `Customer     : ${order.customer_name}\n`;
    if (order.customer_email) {
      text += `Email        : ${order.customer_email}\n`;
    }
    text += `Processed By : ${order.creator_name || 'System'}\n\n`;
    text += `${thinSeparator}\n`;
    text += `ITEMS SUMMARY:\n`;
    text += `${thinSeparator}\n`;

    order.items?.forEach((item, idx) => {
      const formattedQty = formatQuantity(item.quantity, item.unit);
      text += `${idx + 1}. ${item.product_name || 'Deleted Product'} (SKU: ${item.product_sku || 'N/A'})\n`;
      text += `   Qty: ${formattedQty}  @ ₹${parseFloat(item.price_per_unit).toFixed(2)} per unit\n`;
      text += `   Subtotal: ₹${parseFloat(item.subtotal).toFixed(2)}\n\n`;
    });

    text += `${thinSeparator}\n`;
    text += `GRAND TOTAL AMOUNT : ₹${parseFloat(order.total_amount).toFixed(2)}\n`;
    text += `${separator}\n\n`;
    text += `Thank you for your business!\n`;
    text += `ApexInventory Order Management System\n`;

    // Create file and download
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-${order.order_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Receipt downloaded successfully!', 'success');
  };

  // Form row manipulation
  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: '1', unit: 'unit', unitPrice: 0, subtotal: 0 }]);
  };

  const handleRemoveItemRow = (idx) => {
    const list = [...orderItems];
    list.splice(idx, 1);
    setOrderItems(list.length === 0 ? [{ product_id: '', quantity: '1', unit: 'unit', unitPrice: 0, subtotal: 0 }] : list);
  };

  const handleRowChange = (idx, field, value) => {
    const list = [...orderItems];
    const item = { ...list[idx] };

    if (field === 'product_id') {
      item.product_id = value;
      const product = products.find(p => p.id === value);
      if (product) {
        item.unit = product.unit; // Default to base unit
        item.unitPrice = parseFloat(product.price);
        item.subtotal = parseFloat(item.quantity || 0) * item.unitPrice;
      } else {
        item.unitPrice = 0;
        item.subtotal = 0;
      }
    } else if (field === 'unit') {
      item.unit = value;
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const factor = getConversionFactor(value, product.unit);
        item.unitPrice = parseFloat(product.price) * (factor || 1.0);
        item.subtotal = parseFloat(item.quantity || 0) * item.unitPrice;
      }
    } else if (field === 'quantity') {
      item.quantity = value;
      item.subtotal = parseFloat(value || 0) * item.unitPrice;
    }

    list[idx] = item;
    setOrderItems(list);
  };

  const calculateTotalOrderAmount = () => {
    return orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerName || orderItems.some(i => !i.product_id || !i.quantity)) {
      showToast('Please fill in customer details and select products with quantities.', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      customer_name: customerName,
      customer_email: customerEmail || null,
      status: orderStatus,
      items: orderItems.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity.toString(),
        unit: i.unit
      }))
    };

    try {
      await api.post('/api/orders', payload);
      showToast(`Order successfully submitted!`, 'success');
      setShowCreateForm(false);
      
      // Reset form
      setCustomerName('');
      setCustomerEmail('');
      setOrderStatus('COMPLETED');
      setOrderItems([{ product_id: '', quantity: '1', unit: 'unit', unitPrice: 0, subtotal: 0 }]);
      
      fetchOrdersAndProducts();
    } catch (err) {
      showToast(err.message || 'Failed to submit order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade container" style={{ paddingBottom: '40px' }}>
      {showCreateForm ? (
        // Create Order/Quotation Form View
        <div className="glass-card">
          <div className="flex align-center gap-16" style={{ marginBottom: '24px' }}>
            <button onClick={() => setShowCreateForm(false)} className="glass-btn icon-only" style={{ background: 'rgba(255,255,255,0.03)', border: 'none', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '700' }}>Create New Quotation / Order</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add customer info, select products, and calculate subtotals.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitOrder}>
            {/* Customer Details & Order Type */}
            <div className="grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  required 
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Customer Email</label>
                <input 
                  type="email" 
                  className="glass-input" 
                  placeholder="e.g. john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Order Type / Status *</label>
                <select 
                  className="glass-input"
                  style={{ background: '#181b2c', color: '#fff' }}
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                >
                  <option value="COMPLETED">Invoice Order (Deducts Stock)</option>
                  <option value="QUOTATION">Quotation Estimate (Saves without deducting)</option>
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Line Items
              </h3>
              
              <div className="flex flex-column gap-12">
                {orderItems.map((item, idx) => {
                  const selectedProd = products.find(p => p.id === item.product_id);
                  const compatibleUnits = selectedProd ? getCompatibleUnits(selectedProd.unit) : ['unit'];

                  return (
                    <div key={idx} className="flex align-center gap-12 responsive" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                      
                      {/* Product Selector */}
                      <div className="form-group" style={{ flex: '2', margin: '0' }}>
                        <select 
                          className="glass-input"
                          style={{ background: '#181b2c', color: '#fff' }}
                          value={item.product_id}
                          required
                          onChange={(e) => handleRowChange(idx, 'product_id', e.target.value)}
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) - {formatINR(p.price)}/{p.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="form-group" style={{ flex: '1', margin: '0' }}>
                        <input 
                          type="number" 
                          step="any"
                          min="0.0001"
                          required
                          placeholder="Qty"
                          className="glass-input"
                          value={item.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                        />
                      </div>

                      {/* Unit Selector */}
                      <div className="form-group" style={{ flex: '1', margin: '0' }}>
                        <select 
                          className="glass-input"
                          style={{ background: '#181b2c', color: '#fff' }}
                          value={item.unit}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          disabled={!item.product_id}
                        >
                          {compatibleUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subtotal Display */}
                      <div style={{ flex: '1.2', textAlign: 'right', paddingRight: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          @ {formatINR(item.unitPrice)}
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '14px', marginTop: '2px' }}>
                          {formatINR(item.subtotal)}
                        </div>
                      </div>

                      {/* Delete Row button */}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItemRow(idx)}
                        className="glass-btn danger icon-only"
                        style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '36px', height: '36px' }}
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>
                  );
                })}
              </div>

              <button 
                type="button" 
                onClick={handleAddItemRow} 
                className="glass-btn" 
                style={{ marginTop: '16px', padding: '8px 16px', fontSize: '13px' }}
              >
                + Add Item Line
              </button>
            </div>

            {/* Form Footer / Summary */}
            <div className="flex justify-between align-center responsive" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', gap: '24px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Quotation Grand Total:</span>
                <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                  {formatINR(calculateTotalOrderAmount())}
                </h3>
              </div>

              <div className="flex gap-12">
                <button type="button" onClick={() => setShowCreateForm(false)} className="glass-btn">
                  Cancel
                </button>
                <button type="submit" className="glass-btn primary" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="spinner" /> : orderStatus === 'QUOTATION' ? 'Save Quotation' : 'Finalize Invoice'}
                </button>
              </div>
            </div>

          </form>
        </div>
      ) : (
        // Orders List View
        <>
          <div className="flex justify-between align-center responsive" style={{ marginBottom: '32px', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>Invoices & Quotations</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Review sales records, update quotation statuses, and view invoice summaries.</p>
            </div>
            
            <button onClick={() => setShowCreateForm(true)} className="glass-btn primary">
              <Plus size={18} /> Create Order / Quotation
            </button>
          </div>

          {loading ? (
            <div className="flex align-center justify-center" style={{ minHeight: '40vh' }}>
              <Loader2 size={40} className="spinner" />
            </div>
          ) : orders.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>No invoice or quotation records found.</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Get started by creating a new order estimate or customer quotation.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order Code</th>
                    <th>Customer Name</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{o.order_number}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{o.customer_name}</div>
                        {o.customer_email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.customer_email}</div>}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--success)' }}>{formatINR(o.total_amount)}</td>
                      <td>
                        <span className={`badge ${o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'warning'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>{o.creator_name || 'System'}</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-8 justify-end">
                          <button 
                            onClick={() => handleViewDetails(o.id)}
                            className="glass-btn" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            <Eye size={12} /> View Details
                          </button>
                          {o.status === 'QUOTATION' && (
                            <button 
                              onClick={() => handleUpdateStatus(o.id, 'COMPLETED')}
                              className="glass-btn success icon-only" 
                              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Convert Quotation to Invoice (Deducts Stock)"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {o.status === 'COMPLETED' && (
                            <button 
                              onClick={() => handleUpdateStatus(o.id, 'CANCELLED')}
                              className="glass-btn danger icon-only" 
                              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Cancel Order (Restores Stock)"
                            >
                              <XSquare size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={`Order Details: ${selectedOrder?.order_number}`}
      >
        {selectedOrder && (
          <div>
            {/* Customer Details grid */}
            <div className="grid-2" style={{ gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
              <div>
                <div className="flex align-center gap-8" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <User size={13} /> Customer:
                </div>
                <div style={{ fontWeight: '600' }}>{selectedOrder.customer_name}</div>
                {selectedOrder.customer_email && (
                  <div className="flex align-center gap-8" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <Mail size={11} /> {selectedOrder.customer_email}
                  </div>
                )}
              </div>

              <div>
                <div className="flex align-center gap-8" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <Calendar size={13} /> Details:
                </div>
                <div style={{ fontSize: '13px' }}>
                  Date: {new Date(selectedOrder.created_at).toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  Created by: {selectedOrder.creator_name} ({selectedOrder.creator_email})
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px' }}>Items Summary</h3>
            <div className="table-wrapper" style={{ marginBottom: '24px' }}>
              <table style={{ minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th>Product Catalog Item</th>
                    <th>SKU</th>
                    <th>Ordered Quantity</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500' }}>{item.product_name || 'Deleted Product'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.product_sku || 'N/A'}</td>
                      <td>{formatQuantity(item.quantity, item.unit)}</td>
                      <td>{formatINR(item.price_per_unit)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatINR(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="flex justify-between align-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Status:</span>
                <span className={`badge ${selectedOrder.status === 'COMPLETED' ? 'success' : selectedOrder.status === 'CANCELLED' ? 'danger' : 'warning'}`} style={{ marginLeft: '8px' }}>
                  {selectedOrder.status}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Grand Total Amount:</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                  {formatINR(selectedOrder.total_amount)}
                </h3>
              </div>
            </div>

            {/* Action buttons inside details modal if status can be updated */}
            <div className="flex justify-end gap-12" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button 
                onClick={() => handleDownloadReceipt(selectedOrder)} 
                className="glass-btn secondary"
              >
                Download Receipt
              </button>
              {selectedOrder.status === 'QUOTATION' && (
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')} 
                  className="glass-btn primary"
                >
                  <Check size={16} /> Finalize Invoice
                </button>
              )}
              {selectedOrder.status === 'COMPLETED' && (
                <button 
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')} 
                  className="glass-btn danger"
                >
                  <XSquare size={16} /> Cancel Order
                </button>
              )}
              <button onClick={() => setIsDetailModalOpen(false)} className="glass-btn">
                Close Details
              </button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
