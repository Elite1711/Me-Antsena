import { BarChart3, Boxes, LogOut, Menu, Moon, Package, ShieldCheck, Sun, Users, X, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

const items = [
  ["/admin", "Tableau de bord", BarChart3],
  ["/admin/produits", "Produits", Boxes],
  ["/admin/commandes", "Commandes", Package],
  ["/admin/utilisateurs", "Utilisateurs", Users],
  ["/admin/recommandations", "Recommandations", Sparkles],
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return <div className="min-h-screen bg-[#FFF1F1] dark:bg-[#17002d]">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-black/5 bg-white p-5 transition-transform dark:border-white/10 dark:bg-[#3B0270] ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex items-center justify-between"><Logo compact/><button className="rounded-xl p-2 lg:hidden" onClick={()=>setOpen(false)} aria-label="Fermer le menu"><X size={20}/></button></div>
      <div className="mt-8 rounded-2xl bg-brand-50 p-4 dark:bg-brand-900/25"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white"><ShieldCheck size={19}/></span><div><p className="text-xs font-bold text-brand-600 dark:text-brand-300">Espace sécurisé</p><p className="text-sm font-black">Administrateur</p></div></div></div>
      <nav className="mt-7 space-y-1" aria-label="Administration">{items.map(([to,label,Icon],i)=><NavLink end={i===0} key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive?"bg-brand-500 text-white shadow-glow":"text-slate-500 hover:bg-brand-50 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-white/5"}`}><Icon size={19}/>{label}</NavLink>)}</nav>
      <div className="absolute bottom-5 left-5 right-5 space-y-2"><button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>} {theme === "dark" ? "Mode clair" : "Mode sombre"}</button><button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><LogOut size={19}/> Déconnexion</button></div>
    </aside>
    {open && <button className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={()=>setOpen(false)} aria-label="Fermer le menu"/>}
    <div className="lg:pl-72"><header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#17002d]/90"><div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8"><button className="rounded-xl p-2 lg:hidden" onClick={()=>setOpen(true)} aria-label="Ouvrir le menu"><Menu/></button><div className="hidden lg:block"><p className="eyebrow">Administration</p><p className="text-sm font-black">Gestion de Me-Antsena</p></div><div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs muted">Connecté en tant que</p><p className="text-sm font-bold">{user?.name || "Administrateur"}</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-black text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">A</div></div></div></header><main className="p-4 sm:p-6 lg:p-8"><Outlet/></main></div>
  </div>;
}
