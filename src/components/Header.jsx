import { Bell, Heart, Menu, Moon, Search, ShoppingBag, Sun, User, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import Logo from "./Logo";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { count } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const submit = (e) => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(q.trim())}`); setOpen(false); };
  const handleSearchChange = (value) => {
    setQ(value);
    const next = value.trim();
    if (next) {
      navigate(`/products?q=${encodeURIComponent(next)}`);
      return;
    }
    navigate('/products');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#17110A]/90">
      <div className="container-app flex h-20 items-center gap-4">
        <button className="rounded-xl p-2 lg:hidden" onClick={() => setOpen(v=>!v)} aria-label="Ouvrir le menu">{open ? <X/> : <Menu/>}</button>
        <Logo compact />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
          {[t("nav.home"), t("nav.products"), t("nav.categories")].map((label) => {
            const to = label === t("nav.home") ? "/" : label === t("nav.products") ? "/products" : "/categories";
            return <NavLink key={label} to={to} className={({isActive}) => `text-sm font-semibold transition ${isActive ? "text-brand-600" : "text-slate-500 hover:text-brand-500 dark:text-slate-300"}`}>{label}</NavLink>
          })}
        </nav>
        <form onSubmit={submit} className="hidden min-w-0 flex-1 md:block">
          <div className="relative mx-auto max-w-xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={q} onChange={e=>handleSearchChange(e.target.value)} className="input pl-11" placeholder={t("nav.search")} aria-label={t("nav.search")}/></div>
        </form>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={toggleTheme} className="rounded-xl p-2.5 text-slate-500 hover:bg-brand-50 hover:text-brand-500 dark:text-slate-300" aria-label={t("profile.theme")}>{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
          <Link to="/notifications" className="relative hidden rounded-xl p-2.5 text-slate-500 hover:bg-brand-50 md:block" aria-label={t("nav.notifications")}><Bell size={19}/><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-pink"/></Link>
          <Link to="/favorites" className="relative hidden rounded-xl p-2.5 text-slate-500 hover:bg-brand-50 md:block" aria-label={t("nav.favorites")}><Heart size={19}/>{favoritesCount>0&&<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[9px] font-bold text-white">{favoritesCount}</span>}</Link>
          <Link to="/cart" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-brand-50 hover:text-brand-500" aria-label={t("nav.cart")}><ShoppingBag size={20}/>{count>0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">{count}</span>}</Link>
          <Link to={isAuthenticated ? "/profile" : "/login"} className="hidden items-center gap-2 rounded-xl p-2 md:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300"><User size={17}/></span><span className="hidden max-w-24 truncate text-xs font-bold xl:block">{user?.name || t("nav.account")}</span></Link>
        </div>
      </div>
      {open && <div className="border-t border-black/5 px-4 pb-4 pt-3 dark:border-white/10 lg:hidden">
        <form onSubmit={submit} className="mb-3"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input autoFocus value={q} onChange={e=>handleSearchChange(e.target.value)} className="input pl-11" placeholder={t("nav.searchShort")} /></div></form>
        <div className="grid grid-cols-2 gap-2">{["/","/products","/categories"].map((to,i)=><Link key={to} onClick={()=>setOpen(false)} to={to} className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">{[t("nav.home"), t("nav.products"), t("nav.categories")][i]}</Link>)}</div>
      </div>}
    </header>
  );
}
