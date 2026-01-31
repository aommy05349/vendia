import React, { useEffect, useState } from 'react';
import { api } from '@vendia/shared';

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
  };
  items: OrderItem[];
}

export const OrderList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (loading) return <div className="p-4 text-center">Loading orders...</div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Sales Report & Orders</h2>
        <button className="btn btn-primary" onClick={fetchOrders}>Refresh</button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer/Staff</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Items</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr onClick={() => toggleExpand(order.id)} style={{ cursor: 'pointer' }}>
                      <td className="p-3">#{order.id}</td>
                      <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="p-3">{order.user?.name || 'Guest'}</td>
                      <td className="p-3">
                        <span className={`badge bg-${order.status === 'completed' ? 'success' : 'warning'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 fw-bold">฿{parseFloat(order.total).toFixed(2)}</td>
                      <td className="p-3">{order.items.length} items</td>
                      <td className="p-3 text-end">
                        <button className="btn btn-sm btn-link text-decoration-none">
                          {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
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
                                    <th>Details (Bundle Snapshot)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item) => (
                                    <tr key={item.id}>
                                      <td>{item.product?.name || 'Unknown Product'}</td>
                                      <td>{item.product?.sku}</td>
                                      <td>฿{parseFloat(item.price.toString()).toFixed(2)}</td>
                                      <td>{item.quantity}</td>
                                      <td>฿{(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}</td>
                                      <td>
                                        {item.metadata?.bundle_items ? (
                                          <div className="small text-muted">
                                            <strong>Bundle Contents (Snapshot):</strong>
                                            <ul className="mb-0 ps-3">
                                              {item.metadata.bundle_items.map((bItem, idx) => (
                                                <li key={idx}>
                                                  {bItem.name} (Qty: {bItem.total_quantity_deducted}) 
                                                  - Cost: ${bItem.price_at_sale}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ) : (
                                          <span className="text-muted">-</span>
                                        )}
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
      </div>
    </div>
  );
};
