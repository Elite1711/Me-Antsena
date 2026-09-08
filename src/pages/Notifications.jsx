import { Bell, Check, Package, Sparkles, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const initial = [
  {id:1,icon:Sparkles,title:"Nouvelle recommandation",text:"Nous avons trouvé des produits qui pourraient vous plaire.",time:"Il y a 10 min"},
  {id:2,icon:Package,title:"Commande mise à jour",text:"Votre commande CMD-01245 est en cours de préparation.",time:"Il y a 2 h"},
  {id:3,icon:Tag,title:"Bonne affaire",text:"Une réduction vient d'être appliquée à un produit que vous aimez.",time:"Hier"}
];

export default function Notifications(){
  const {user}=useAuth();
  const key=useMemo(()=>`me_antsena_notifications_read_${user?.email||"guest"}`,[user?.email]);
  const [list,setList]=useState(()=>{
    try { return localStorage.getItem(key)==="1" ? [] : initial; } catch { return initial; }
  });
  const markAll=()=>{setList([]);try{localStorage.setItem(key,"1")}catch{}};
  return <div className="container-app py-8"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Centre d'activité</p><h1 className="mt-1 text-3xl font-black">Notifications</h1></div>{list.length>0&&<button type="button" onClick={markAll} className="btn-secondary"><Check size={16}/> Tout marquer comme lu</button>}</div><div className="card mt-7 divide-y divide-slate-100 dark:divide-white/10">{list.length?list.map(n=>{const I=n.icon;return <div key={n.id} className="flex gap-4 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30"><I size={19}/></span><div><p className="font-black">{n.title}</p><p className="mt-1 text-sm muted">{n.text}</p><p className="mt-2 text-[11px] text-slate-400">{n.time}</p></div></div>}):<div className="p-12 text-center"><Bell className="mx-auto text-slate-300" size={34}/><p className="mt-3 font-bold">Vous êtes à jour</p><p className="mt-1 text-sm muted">Aucune nouvelle notification.</p></div>}</div></div>
}
