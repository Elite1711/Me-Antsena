import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminGetOrders, adminUpdateOrderStatus, createOrder, getMyOrders } from "../api/service";
import { useAuth } from "./AuthContext";

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) { setOrders([]); return; }
    (isAdmin ? adminGetOrders() : getMyOrders()).then(setOrders).catch(() => setOrders([]));
  }, [isAuthenticated, isAdmin, user?.id]);

  const addOrder = async ({ items, total, address, payment, delivery }) => {
    const order = await createOrder({ items, address, paymentMethod: payment, deliveryMethod: delivery });
    const full = { id: order.id, rawId: order.rawId, customer: user?.name || "Client", email: user?.email || "", total, status: "En cours", date: new Date().toLocaleDateString("fr-FR"), items };
    setOrders(prev => [full, ...prev]);
    return full;
  };

  const updateOrderStatus = async (id, statusLabel) => {
    const target = orders.find(o => o.id === id);
    if (!target) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: statusLabel } : o));
    try { await adminUpdateOrderStatus(target.rawId ?? id.replace("CMD-", ""), statusLabel); } catch { /* rollback silencieux non critique */ }
  };

  const userOrders = orders;
  const value = useMemo(() => ({ orders, userOrders, addOrder, updateOrderStatus }), [orders]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
export const useOrders = () => useContext(OrdersContext);
