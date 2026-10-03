import { Home, Search, ShoppingBag, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function BottomNav() {
  const { count } = useCart();
  const items = [
    ["/","Accueil",Home],["/products","Recherche",Search],["/cart","Panier",ShoppingBag],["/profile","Profil",User]
  ];
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-900/10 bg-[#F2F9FF]/95 px-2 py-2 shadow-[0_-8px_30px_rgba(8,74,145,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-night-canvas/95 md:hidden">
    <div className="mx-auto flex max-w-lg justify-around">{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`relative flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${isActive?"text-brand-600 dark:text-brand-300":"text-slate-400 dark:text-slate-300"}`}><Icon size={19}/>{label}{to==="/cart"&&count>0?<span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] text-white dark:bg-brand-300 dark:text-night-canvas">{count}</span>:null}</NavLink>)}</div>
  </nav>;
}
