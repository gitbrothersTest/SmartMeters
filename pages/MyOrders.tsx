
import React, { useEffect, useState } from 'react';
import { Package, Calendar, ChevronDown, ChevronUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Summary of an order stored in localStorage
interface CachedOrder {
  orderNumber: string;
  date: string;
  total: number;
}

// Full order details fetched from API
interface FullOrder {
  id: number;
  order_number: string;
  created_at: string;
  final_total: string;
  status: string;
  items: any[];
}

// Combined state for the component
interface DisplayOrder extends CachedOrder {
  details?: FullOrder;
  isLoadingDetails?: boolean;
}

// Read cooldown from environment variables. The build process (vite.config.ts) provides the fallback.
const COOLDOWN_MINUTES = parseInt(process.env.ORDER_REFRESH_COOLDOWN_MINUTES, 10);
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL, 10);

const MyOrders: React.FC = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Effect to update current time every second to re-evaluate cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Effect to sync cooldown state with localStorage changes from other tabs/dev tools
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sm_refresh_cooldowns') {
        const newCooldowns = event.newValue ? JSON.parse(event.newValue) : {};
        setCooldowns(newCooldowns);
        if (DEBUG_LEVEL > 0) {
          console.log('[DEBUG] Cooldowns synced from localStorage change.');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getClientToken = () => localStorage.getItem('sm_client_token');

  // Load initial summaries from server, merge with cached details
  useEffect(() => {
    if (DEBUG_LEVEL > 0) {
      console.log(`[MyOrders] Cooldown is set to ${COOLDOWN_MINUTES} minutes (${COOLDOWN_MS}ms). If this value is incorrect, ensure VITE_ORDER_REFRESH_COOLDOWN_MINUTES is set in .env and restart the dev server.`);
    }

    const loadOrderHistory = async () => {
      setLoading(true);
      try {
        const token = getClientToken();
        const response = await fetch(`/api/order-history?token=${token || ''}`);
        if (!response.ok) throw new Error('API fetch failed for order history');

        const summaries: CachedOrder[] = await response.json();

        // Preserve details from old cache to merge with fresh summaries
        const oldCacheRaw = localStorage.getItem('sm_order_history_cache');
        const oldCache: DisplayOrder[] = oldCacheRaw ? JSON.parse(oldCacheRaw) : [];
        const detailsMap = new Map<string, FullOrder | undefined>();
        oldCache.forEach(o => {
          if (o.details) {
            detailsMap.set(o.orderNumber, o.details);
          }
        });

        const newOrdersState: DisplayOrder[] = summaries.map(summary => ({
          ...summary,
          details: detailsMap.get(summary.orderNumber)
        }));

        setOrders(newOrdersState);
        localStorage.setItem('sm_order_history_cache', JSON.stringify(newOrdersState));

      } catch (error) {
        console.error("Failed to load order history from server, falling back to cache.", error);
        const cached = localStorage.getItem('sm_order_history_cache');
        if (cached) {
          setOrders(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    loadOrderHistory();

    const storedCooldowns = localStorage.getItem('sm_refresh_cooldowns');
    if (storedCooldowns) {
      setCooldowns(JSON.parse(storedCooldowns));
    }
  }, []);

  const fetchOrderDetails = async (orderNumber: string) => {
    setOrders(prev => prev.map(o => o.orderNumber === orderNumber ? { ...o, isLoadingDetails: true } : o));

    try {
      const token = getClientToken();
      const response = await fetch(`/api/order-details/${orderNumber}?token=${token || ''}`);
      if (!response.ok) throw new Error('Failed to fetch details');

      const details: FullOrder = await response.json();

      setOrders(currentOrders => {
        const updatedOrders = currentOrders.map(o =>
          o.orderNumber === orderNumber ? { ...o, details, isLoadingDetails: false } : o
        );

        try {
          localStorage.setItem('sm_order_history_cache', JSON.stringify(updatedOrders));
          if (DEBUG_LEVEL > 0) {
            console.log(`[DEBUG] Cache updated for order ${orderNumber}.`);
          }
        } catch (e) { console.error("Failed to write details to cache", e) }

        return updatedOrders;
      });

    } catch (error) {
      console.error(`Failed to fetch details for order ${orderNumber}`, error);
      setOrders(prev => prev.map(o => o.orderNumber === orderNumber ? { ...o, isLoadingDetails: false } : o));
    }
  };

  const triggerRefresh = (orderNumber: string) => {
    if (DEBUG_LEVEL > 0) console.log(`[DEBUG] Refreshing order ${orderNumber} from DB...`);

    fetchOrderDetails(orderNumber).then(() => {
      const now = Date.now();
      const newCooldowns = { ...cooldowns, [orderNumber]: now };
      setCooldowns(newCooldowns);
      try {
        localStorage.setItem('sm_refresh_cooldowns', JSON.stringify(newCooldowns));
      } catch (e) {
        console.error("Failed to save cooldowns to cache", e);
      }
      if (DEBUG_LEVEL > 0) console.log(`[DEBUG] Order ${orderNumber} refreshed. Cooldown started for ${COOLDOWN_MINUTES} min.`);
    });
  };

  const handleRefreshClick = (orderNumber: string) => {
    const lastRefresh = cooldowns[orderNumber];
    const now = Date.now();

    if (lastRefresh && (now - lastRefresh < COOLDOWN_MS)) {
      if (DEBUG_LEVEL > 0) {
        const timeLeft = Math.round((COOLDOWN_MS - (now - lastRefresh)) / 1000);
        console.log(`[DEBUG] Refresh button for order ${orderNumber} is on cooldown. Try again in ${timeLeft}s.`);
      }
      return;
    }

    triggerRefresh(orderNumber);
  };

  const toggleOrder = (orderNumber: string) => {
    if (expandedOrder === orderNumber) {
      setExpandedOrder(null);
      return;
    }

    setExpandedOrder(orderNumber);

    const orderInState = orders.find(o => o.orderNumber === orderNumber);
    const lastRefresh = cooldowns[orderNumber];
    const now = Date.now();
    const isOnCooldown = lastRefresh && (now - lastRefresh < COOLDOWN_MS);

    if (isOnCooldown) {
      if (DEBUG_LEVEL > 0) {
        console.log(`[DEBUG][Details Click] Cooldown active for ${orderNumber}. Using cached data.`);
      }
      if (orderInState && !orderInState.details) {
        if (DEBUG_LEVEL > 0) console.log(`[DEBUG] Details for ${orderNumber} not in cache. Fetching once.`);
        fetchOrderDetails(orderNumber);
      }
    } else {
      if (DEBUG_LEVEL > 0) {
        console.log(`[DEBUG][Details Click] Cooldown INACTIVE for ${orderNumber}. Fetching from DB and starting cooldown.`);
      }
      triggerRefresh(orderNumber);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'in_delivery': return 'bg-purple-100 text-purple-800';
      case 'complete': return 'bg-green-100 text-green-800';
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
            {orders.map((order) => {
              const now = currentTime; // Use state for real-time updates
              const lastRefresh = cooldowns[order.orderNumber];
              const isOnCooldown = lastRefresh && (now - lastRefresh < COOLDOWN_MS);

              const buttonClasses = `flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all group ${isOnCooldown
                  ? 'bg-slate-100 text-slate-500 cursor-pointer'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`;

              return (
                <div key={order.orderNumber} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleOrder(order.orderNumber)}
                  >
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-0">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('orders.number')}</span>
                        <span className="font-bold text-slate-900 text-lg">{order.orderNumber}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('orders.date')}</span>
                        <div className="flex items-center gap-1 text-slate-700">
                          <Calendar size={14} />
                          <span>{new Date(order.date).toLocaleDateString('ro-RO')}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('cart.total')}</span>
                        <span className="font-bold text-accent">{Number(order.total).toFixed(2)} RON</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {expandedOrder === order.orderNumber ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                    </div>
                  </div>

                  {expandedOrder === order.orderNumber && (
                    <div className="bg-gray-50 p-6 border-t border-gray-100 animate-fade-in">
                      {order.isLoadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="animate-spin text-accent" />
                        </div>
                      ) : order.details ? (
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{t('orders.status')}</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.details.status)}`}>
                                {t(`status.${order.details.status}`)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRefreshClick(order.details!.order_number)}
                              title={"Actualizează statusul comenzii"}
                              className={buttonClasses}
                            >
                              <RefreshCw size={14} className={`${!isOnCooldown ? "group-hover:rotate-90 transition-transform" : "opacity-50"}`} />
                              Actualizează
                            </button>
                          </div>
                          <h4 className="font-semibold text-slate-800 mb-4">{t('orders.items')}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2">{t('cart.product')}</th>
                                  <th className="px-4 py-2 text-center">{t('cart.quantity')}</th>
                                  <th className="px-4 py-2 text-right">{t('cart.price')}</th>
                                  <th className="px-4 py-2 text-right">{t('cart.total')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {order.details.items.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="px-4 py-3 font-medium text-slate-700">{item.product_name}</td>
                                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right">{Number(item.unit_price).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-bold">{Number(item.total_price).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : <p>Could not load order details.</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
