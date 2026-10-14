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

  const triggerFlyToCart = (sourceElement, product) => {
    if (!sourceElement || typeof window === "undefined") return;
    const targetElement = document.getElementById("header-cart-icon") || document.querySelector("[data-cart-icon]");
    if (!targetElement) return;

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Création de l'orbe / pastille volante
    const flyer = document.createElement("div");
    flyer.className = "pointer-events-none fixed z-[9999] flex items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-glow backdrop-blur-md";
    flyer.style.width = "48px";
    flyer.style.height = "48px";
    flyer.style.left = `${startX - 24}px`;
    flyer.style.top = `${startY - 24}px`;
    flyer.style.backgroundColor = "#087FF5";

    if (product?.image) {
      const img = document.createElement("img");
      img.src = product.image;
      img.alt = "";
      img.className = "h-full w-full object-cover rounded-full";
      flyer.appendChild(img);
    } else {
      flyer.innerHTML = `<span style="color:white;font-size:18px;">🛒</span>`;
    }

    document.body.appendChild(flyer);

    // Animation via Web Animations API pour fluidité 60fps
    const animation = flyer.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.3 - 40}px) scale(0.85)`, opacity: 0.95, offset: 0.5 },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.2)`, opacity: 0 }
      ],
      {
        duration: 650,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards"
      }
    );

    animation.onfinish = () => {
      flyer.remove();
      // Déclencher le rebond d'impact sur le panier
      targetElement.classList.remove("animate-cart-impact");
      void targetElement.offsetWidth; // force reflow
      targetElement.classList.add("animate-cart-impact");
      setTimeout(() => {
        targetElement.classList.remove("animate-cart-impact");
      }, 650);
    };
  };

  const addToCart = useCallback((product, quantity = 1, sourceElement = null) => {
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

    if (sourceElement) {
      triggerFlyToCart(sourceElement, product);
    }

    toast.success(existing && existing.quantity >= stock ? "Stock maximum déjà atteint" : "Produit ajouté au panier", {
      icon: "✨",
      style: {
        borderRadius: "14px",
        background: "#06204A",
        color: "#fff",
        border: "1px solid rgba(67, 198, 255, 0.3)"
      }
    });
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
