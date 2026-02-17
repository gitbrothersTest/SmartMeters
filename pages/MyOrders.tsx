
import React, { useEffect, useState } from 'react';
import { Package, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  created_at: string;
  final_total: string;
  status: string;
  items: OrderItem[];
}

const MyOrders: React.FC = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('sm_client_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/my-orders?token=${token}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const toggleOrder = (id: number) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <Package className="text-accent" size={32} />
          {t('orders.title')}
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">{t('orders.no_orders')}</h3>
            <p className="text-gray-500">{t('orders.no_orders_sub')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleOrder(order.id)}
                >
                  <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-0">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('orders.number')}</span>
                      <span className="font-bold text-slate-900 text-lg">#{order.order_number}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('orders.date')}</span>
                      <div className="flex items-center gap-1 text-slate-700">
                        <Calendar size={14} />
                        <span>{new Date(order.created_at).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('cart.total')}</span>
                      <span className="font-bold text-accent">{Number(order.final_total).toFixed(2)} RON</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    {expandedOrder === order.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </div>

                {expandedOrder === order.id && (
                  <div className="bg-gray-50 p-6 border-t border-gray-100 animate-fade-in">
                    <h4 className="font-semibold text-slate-800 mb-4">{t('orders.items')}</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2">{t('cart.product')}</th>
                                    <th className="px-4 py-2">SKU</th>
                                    <th className="px-4 py-2 text-center">{t('cart.quantity')}</th>
                                    <th className="px-4 py-2 text-right">{t('cart.price')}</th>
                                    <th className="px-4 py-2 text-right">{t('cart.total')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-medium text-slate-700">{item.product_name}</td>
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{Number(item.unit_price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{Number(item.total_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
