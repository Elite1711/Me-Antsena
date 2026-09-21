import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { adminGetOrders, adminUpdateOrderStatus, createOrder, getMyOrders, logInteraction } from "../api/service";
import { useAuth } from "./AuthContext";

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) { setOrders([]); return; }
    (isAdmin ? adminGetOrders() : getMyOrders()).then(setOrders).catch(() => setOrders([]));
  }, [isAuthenticated, isAdmin, user?.id]);

  const addOrder = useCallback(async ({ items, total, address, payment, delivery }) => {
    const order = await createOrder({ items, address, paymentMethod: payment, deliveryMethod: delivery });
    const full = { id: order.id, rawId: order.rawId, customer: user?.name || "Client", email: user?.email || "", total, status: "En cours", date: new Date().toLocaleDateString("fr-FR"), items };
    setOrders(prev => [full, ...prev]);
    items.forEach(item => logInteraction(item.id, "purchase", item.quantity));
    return full;
  }, [user?.email, user?.name]);

  const updateOrderStatus = useCallback(async (id, statusLabel) => {
    const target = orders.find(o => o.id === id);
    if (!target) return;
    if (target.status === "Livrée") {
      throw new Error("La commande livrée ne peut plus être modifiée.");
    }

    const previousStatus = target.status;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: statusLabel } : o));
    try {
      await adminUpdateOrderStatus(target.rawId ?? id.replace("CMD-", ""), statusLabel);
    } catch (error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: previousStatus } : o));
      throw error;
    }
  }, [orders]);

  const value = useMemo(() => ({ orders, userOrders: orders, addOrder, updateOrderStatus }), [orders, addOrder, updateOrderStatus]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}
export const useOrders = () => useContext(OrdersContext);
