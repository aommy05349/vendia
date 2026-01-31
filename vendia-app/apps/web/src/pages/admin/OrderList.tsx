import React, { useEffect, useState } from 'react';
import { api, User } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

interface BundleItemSnapshot {
  id: number;
  name: string;
  sku: string;
  quantity_per_bundle: number;
  total_quantity_deducted: number;
  price_at_sale: number;
}

interface OrderItem {
  id: number;
  product_id: number;
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  price: number;
  metadata?: {
    bundle_items?: BundleItemSnapshot[];
  };
}

interface Order {
  id: number;
  total: string;
  status: string;
  payment_method: string;
  created_at: string;
  user?: {
    name: string;
    id: number;
  };
  customer?: User;
  items: OrderItem[];
}

interface DailySales {
  date: string;
  total: number;
  count: number;
  breakdown: {
    cash: number;
    transfer: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const OrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, filterStatus]);

  useEffect(() => {
    fetchDailySales();
  }, []);

  const fetchDailySales = async () => {
    try {
      const response = await api.get('/orders/daily-sales');
      setDailySales(response.data);
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
    }
  };

  const fetchOrders = async (page: number) => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Order>>(`/orders?page=${page}&status=${filterStatus}`);
      setOrders(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchOrders(currentPage);
    fetchDailySales();
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handlePayClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    setSelectedOrder(order);
    setReceivedAmount('');
    setChange(null);
    setPaymentMethod('cash');
  };

  const handlePrint = (e: React.MouseEvent, orderId: number, type: 'receipt' | 'quotation' | 'billing_note') => {
    e.stopPropagation();
    window.open(`/print/order/${orderId}?type=${type}`, '_blank');
  };

  const handleConvertQuotation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    if (!confirm('Convert this quotation to an order? Stock will be deducted.')) return;
    try {
      await api.put(`/orders/${orderId}`, { status: 'pending' });
      fetchOrders(currentPage);
    } catch (err) {
        setAlertMessage({ type: 'danger', text: 'Failed to convert quotation' });
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.put(`/orders/${selectedOrder.id}`, {
        status: 'completed',
        payment_method: paymentMethod,
      });
      
      // Update local state
      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'completed', payment_method: paymentMethod } 
          : o
      ));
      
      handlePaymentSuccess();
      
      setSelectedOrder(null);
      setAlertMessage({ type: 'success', text: 'Payment successful!' });
    } catch (error) {
      console.error('Payment failed:', error);
      setAlertMessage({ type: 'danger', text: 'Payment failed. Please try again.' });
    }
  };

  useEffect(() => {
    if (selectedOrder && paymentMethod === 'cash' && receivedAmount) {
      const received = parseFloat(receivedAmount);
      const totalAmount = parseFloat(selectedOrder.total);
      setChange(received - totalAmount);
    } else {
      setChange(null);
    }
  }, [receivedAmount, paymentMethod, selectedOrder]);

  if (loading) return <div className="p-4 text-center">Loading orders...</div>;

  return (
    <div className="container-fluid p-4">
      {alertMessage && (
        <div className={`alert alert-${alertMessage.type} alert-dismissible fade show`} role="alert">
          {alertMessage.text}
          <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
        </div>
      )}
      {dailySales && (
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white h-100">
              <div className="card-body">
                <h5 className="card-title">Today's Sales</h5>
                <h2 className="display-6 fw-bold">฿{dailySales.total.toLocaleString()}</h2>
                <div className="mt-2 small">
                  <span className="me-3">Cash: ฿{dailySales.breakdown.cash.toLocaleString()}</span>
                  <span>Transfer: ฿{dailySales.breakdown.transfer.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white h-100">
              <div className="card-body">
                <h5 className="card-title">Today's Orders</h5>
                <h2 className="display-6 fw-bold">{dailySales.count}</h2>
                <p className="card-text small">Completed orders today</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Orders & Bills</h2>
        <button className="btn btn-primary" onClick={() => fetchOrders(1)}>Refresh</button>
      </div>

      <ul className="nav nav-tabs mb-3">
        {['all', 'completed', 'pending', 'quotation', 'cancelled'].map(status => (
            <li className="nav-item" key={status}>
                <button 
                    className={`nav-link ${filterStatus === status ? 'active' : ''} text-capitalize`}
                    onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                >
                    {status}
                </button>
            </li>
        ))}
      </ul>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr onClick={() => toggleExpand(order.id)} style={{ cursor: 'pointer' }}>
                      <td className="p-3">#{order.id}</td>
                      <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="fw-bold">{order.customer?.name || 'Walk-in'}</div>
                        <div className="small text-muted">Staff: {order.user?.name || 'Unknown'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`badge bg-${
                            order.status === 'completed' ? 'success' : 
                            order.status === 'pending' ? 'warning' : 
                            order.status === 'quotation' ? 'info' : 'danger'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 fw-bold">฿{parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3">{order.items.length} items</td>
                      <td className="p-3">
                        {order.status === 'quotation' && (
                            <>
                                <button 
                                    className="btn btn-info btn-sm me-2 text-white"
                                    onClick={(e) => handlePrint(e, order.id, 'quotation')}
                                >
                                    Print Quote
                                </button>
                                <button 
                                    className="btn btn-success btn-sm me-2"
                                    onClick={(e) => handleConvertQuotation(e, order.id)}
                                >
                                    To Order
                                </button>
                                <button 
                                    className="btn btn-warning btn-sm me-2"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/pos?order_id=${order.id}`);
                                    }}
                                >
                                    Edit
                                </button>
                            </>
                        )}
                        {order.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-success btn-sm me-2"
                              onClick={(e) => handlePayClick(order, e)}
                            >
                              Pay Now
                            </button>
                            <button 
                                className="btn btn-info btn-sm me-2 text-white"
                                onClick={(e) => handlePrint(e, order.id, 'billing_note')}
                            >
                                Billing Note
                            </button>
                            <button 
                                className="btn btn-secondary btn-sm me-2"
                                onClick={(e) => handlePrint(e, order.id, 'receipt')}
                            >
                                Receipt
                            </button>
                            <button 
                              className="btn btn-warning btn-sm me-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/pos?order_id=${order.id}`);
                              }}
                            >
                              Edit
                            </button>
                          </>
                        )}
                        {order.status === 'completed' && (
                            <button 
                                className="btn btn-secondary btn-sm me-2"
                                onClick={(e) => handlePrint(e, order.id, 'receipt')}
                            >
                                Print Receipt
                            </button>
                        )}
                        <button className="btn btn-sm btn-link text-decoration-none">
                          {expandedOrderId === order.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-light">
                        <td colSpan={7} className="p-4">
                          <div className="card border-0">
                            <div className="card-header bg-white fw-bold">Order Items Breakdown</div>
                            <div className="card-body p-0">
                              <table className="table table-sm table-bordered mb-0">
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Price</th>
                                    <th>Qty</th>
                                    <th>Subtotal</th>
                                    <th>Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item) => (
                                    <tr key={item.id}>
                                      <td>{item.product?.name || 'Unknown Product'}</td>
                                      <td>{item.product?.sku}</td>
                                      <td>฿{Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td>{item.quantity}</td>
                                      <td>฿{(Number(item.price) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td>
                                        {item.metadata?.bundle_items ? (
                                          <div className="small text-muted">
                                            <strong>Bundle Contents:</strong>
                                            <ul className="mb-0 ps-3">
                                              {item.metadata.bundle_items.map((bItem, idx) => (
                                                <li key={idx}>
                                                  {bItem.name} (Qty: {bItem.total_quantity_deducted}) 
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
            <button 
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => fetchOrders(currentPage - 1)}
            >
                &laquo; Previous
            </button>
            <span className="text-muted small">
                Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong>
            </span>
            <button 
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage === lastPage}
                onClick={() => fetchOrders(currentPage + 1)}
            >
                Next &raquo;
            </button>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pay for Order #{selectedOrder.id}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <form onSubmit={processPayment}>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <div className="text-muted mb-1">Total Amount</div>
                    <div className="display-4 fw-bold text-primary">฿{parseFloat(selectedOrder.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Payment Method</label>
                    <div className="btn-group w-100" role="group">
                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="paymentMethod" 
                        id="cash" 
                        autoComplete="off" 
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="cash">Cash (เงินสด)</label>

                      <input 
                        type="radio" 
                        className="btn-check" 
                        name="paymentMethod" 
                        id="transfer" 
                        autoComplete="off" 
                        checked={paymentMethod === 'transfer'}
                        onChange={() => setPaymentMethod('transfer')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="transfer">Transfer (โอนเงิน)</label>
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">Received Amount (รับเงินมา)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-lg"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        autoFocus
                        required
                        min={parseFloat(selectedOrder.total)}
                      />
                      {change !== null && (
                        <div className={`mt-3 p-3 rounded text-center ${change >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          <div className="small fw-bold text-uppercase">Change (เงินทอน)</div>
                          <div className="fs-2 fw-bold">฿{change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Cancel</button>
                  <button 
                    type="submit" 
                    className="btn btn-success btn-lg px-4"
                    disabled={paymentMethod === 'cash' && (!receivedAmount || parseFloat(receivedAmount) < parseFloat(selectedOrder.total))}
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};