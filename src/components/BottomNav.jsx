import { Home, Search, ShoppingBag, User, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function BottomNav() {
  const { count } = useCart();
  const items = [
    ["/","Accueil",Home],["/products","Recherche",Search],["/recommendations","Pour vous",Sparkles],["/cart","Panier",ShoppingBag],["/profile","Profil",User]
  ];
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 px-2 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#17002d]/95 md:hidden">
    <div className="mx-auto flex max-w-lg justify-around">{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`relative flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold ${isActive?"text-brand-600":"text-slate-400"}`}><Icon size={19}/>{label}{to==="/cart"&&count>0?<span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-pink px-1 text-[9px] text-white">{count}</span>:null}</NavLink>)}</div>
  </nav>;
}
