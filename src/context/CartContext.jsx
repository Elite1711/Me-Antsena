import { createContext, useContext, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { readStorage, writeStorage } from "../utils/storage";
import { logInteraction } from "../api/service";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const saved = readStorage("me_antsena_cart", []);
    return Array.isArray(saved) ? saved.filter(i => i && i.id != null && Number(i.quantity) > 0) : [];
  });

  const persist = useCallback((next) => {
    setItems(next);
    writeStorage("me_antsena_cart", next);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const stock = Math.max(0, Number(product.stock) || 0);
    if (stock <= 0) { toast.error("Ce produit est en rupture de stock."); return; }
    const requested = Math.max(1, Number(quantity) || 1);
    const existing = items.find(i => String(i.id) === String(product.id));
    const next = existing
      ? items.map(i => String(i.id) === String(product.id)
        ? { ...i, ...product, quantity: Math.min((Number(i.quantity) || 0) + requested, stock) }
        : i)
      : [...items, { ...product, quantity: Math.min(requested, stock) }];
    persist(next);
    logInteraction(product.id, "add_to_cart", requested);
    toast.success(existing && existing.quantity >= stock ? "Stock maximum déjà atteint" : "Produit ajouté au panier");
  }, [items, persist]);

  const removeFromCart = useCallback((id) => persist(items.filter(i => String(i.id) !== String(id))), [items, persist]);
  const updateQuantity = useCallback((id, quantity) => {
    const next = items.map(i => {
      if (String(i.id) !== String(id)) return i;
      const stock = Math.max(0, Number(i.stock) || 0);
      if (stock <= 0) return null;
      return { ...i, quantity: Math.max(1, Math.min(Number(quantity) || 1, stock)) };
    }).filter(Boolean);
    persist(next);
  }, [items, persist]);
  const clearCart = useCallback(() => persist([]), [persist]);
  const count = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const shipping = items.length ? (subtotal >= 300000 ? 0 : 10000) : 0;
  const total = subtotal + shipping;

  const value = useMemo(() => ({ items, count, subtotal, shipping, total, addToCart, removeFromCart, updateQuantity, clearCart }), [items, count, subtotal, shipping, total, addToCart, removeFromCart, updateQuantity, clearCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
