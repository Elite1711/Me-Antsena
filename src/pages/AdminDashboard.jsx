import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, CheckCircle2, Edit3, Package, Plus, Search, ShoppingCart, Sparkles, Trash2, TrendingUp, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminDeleteProduct, adminGetProducts, adminGetUsers, adminSaveProduct, adminSetUserStatus, getCategories, getDashboardStats, getMLEval } from "../api/service";
import { formatPrice } from "../utils/format";
import { useOrders } from "../context/OrdersContext";
import ImageUploader from "../components/ImageUploader";
import { supabase } from "../lib/supabase";

export default function AdminDashboard(){
  const location = useLocation();
  const navigate = useNavigate();
  const pathTab = location.pathname.split("/")[2];
  const initialTab = pathTab === "produits" ? "products" : pathTab === "commandes" ? "orders" : pathTab === "utilisateurs" ? "users" : "dashboard";
  const [tab,setTab]=useState(initialTab);
  const [data,setData]=useState(null);
  const [products,setProducts]=useState([]);
  const [categories,setCategories]=useState([]);
  const [days,setDays]=useState(30);
  const { orders, updateOrderStatus } = useOrders();
  const [users,setUsers]=useState([]);
  const [query,setQuery]=useState("");
  const [appliedQuery,setAppliedQuery]=useState("");
  const [modal,setModal]=useState(null);
  const goTab = (id) => { setTab(id); navigate(id === "dashboard" ? "/admin" : `/admin/${id === "products" ? "produits" : id === "orders" ? "commandes" : "utilisateurs"}`); };
  const refreshDashboard = useCallback(async () => {
    try {
      const stats = await getDashboardStats({ days });
      setData(stats);
    } catch {
      toast.error("Impossible de charger les statistiques");
    }
  }, [days]);

  useEffect(()=>{setTab(initialTab);},[initialTab]);
  useEffect(()=>{
    refreshDashboard();
    adminGetProducts().then(setProducts).catch(()=>toast.error("Impossible de charger les produits"));
    adminGetUsers().then(setUsers).catch(()=>toast.error("Impossible de charger les utilisateurs"));
    getCategories().then(setCategories);

    const refreshTimer = window.setInterval(refreshDashboard, 10000);

    const channel = supabase.channel("admin-dashboard-live");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refreshDashboard);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "products" }, refreshDashboard);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refreshDashboard);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "interactions" }, refreshDashboard);
    channel.subscribe();

    return () => {
      window.clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [refreshDashboard]);
  const filteredProducts=useMemo(()=>{
    const value = appliedQuery.trim().toLowerCase();
    if (!value) return products;
    return products.filter(p => p.name.toLowerCase().includes(value));
  },[products,appliedQuery]);
  const submitSearch = (event) => {
    event.preventDefault();
    setAppliedQuery(query);
  };
  if(!data) return <div className="py-16 text-center font-semibold">Chargement du tableau de bord...</div>;
  const deleteProduct=async id=>{const product=products.find(p=>p.id===id);if(!product)return;if(!window.confirm(`Supprimer « ${product.name} » ?`))return;try{await adminDeleteProduct(id);setProducts(v=>v.filter(p=>p.id!==id));toast.success("Produit supprimé")}catch(err){toast.error(err.message)}};
  const changeOrder=async(id,status)=>{try{await updateOrderStatus(id,status);toast.success("Statut de commande mis à jour");}catch(err){toast.error(err.message || "Impossible de modifier la commande");}};
  const toggleUser=async id=>{const target=users.find(u=>u.id===id);if(!target)return;const nextStatus=target.status==="Actif"?"Suspendu":"Actif";try{await adminSetUserStatus(id,nextStatus);setUsers(v=>v.map(u=>u.id===id?{...u,status:nextStatus}:u));toast.success("Statut utilisateur mis à jour")}catch(err){toast.error(err.message)}};
  return <>
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="eyebrow">Administration</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Tableau de bord</h1><p className="mt-2 text-sm muted">Gérez les produits, utilisateurs, commandes et recommandations depuis un seul espace.</p></div><div className="flex flex-wrap gap-2"><button onClick={async ()=>{
            toast.promise(getMLEval(5).then(r=>{ if(!r)throw new Error('Aucune réponse'); const m=r.metrics||r; toast.success(Object.entries(m).slice(0,4).map(([k,v])=>`${k}:${v==null?'n/a':(typeof v==='number'?v.toFixed(3):v)}`).join(' | ')); }), {loading:'Exécution de l\u2019évaluation ML...', success:'Évaluation terminée', error:'Échec de l\u2019évaluation'} )} } className="btn-ghost"><Sparkles size={16}/> Évaluer ML</button><button onClick={()=>setModal({type:"product"})} className="btn-primary"><Plus size={17}/> Ajouter un produit</button></div></div>
    <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-[#3B0270]">{[["dashboard","Tableau de bord",BarChart3],["products","Produits",Package],["orders","Commandes",ShoppingCart],["users","Utilisateurs",Users]].map(([id,label,Icon])=><button key={id} onClick={()=>goTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${tab===id?"bg-brand-500 text-white":"text-slate-500 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-white/5"}`}><Icon size={16}/>{label}</button>)}</div>
    {tab==="dashboard" && <Dashboard data={data} products={products} goTab={goTab} days={days} setDays={setDays}/>} 
    {tab==="products" && <Products products={filteredProducts} query={query} setQuery={setQuery} onSubmit={submitSearch} onDelete={deleteProduct} onEdit={p=>setModal({type:"product",product:p})} onAdd={()=>setModal({type:"product"})}/>} 
    {tab==="orders" && <Orders orders={orders} onChange={changeOrder}/>} 
    {tab==="users" && <UsersPanel users={users} onToggle={toggleUser}/>} 
    {modal?.type==="product" && <ProductModal product={modal.product} categories={categories} onClose={()=>setModal(null)} onSave={async form=>{
      try{
        const saved=await adminSaveProduct({...form,__existing:!!modal.product});
        setProducts(v=>modal.product?v.map(x=>x.id===saved.id?{...saved}:x):[{...saved},...v]);
        setModal(null);
        toast.success(modal.product?"Produit modifié":"Produit ajouté");
      }catch(err){toast.error(err.message)}
    }}/>}
  </>;
}

function Dashboard({data,products,goTab,days,setDays}){return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={TrendingUp} label="Ventes totales" value={formatPrice(data.sales)} trend="+6,2%"/><Stat icon={Users} label="Utilisateurs" value={data.users.toLocaleString("fr-FR")} trend="+8,1%"/><Stat icon={ShoppingCart} label="Commandes" value={data.orders} trend="+5,7%"/><Stat icon={Sparkles} label="Conversion" value={`${data.conversion}%`} trend="+1,4%"/></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><div className="card p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">Ventes des {data.chart.length} derniers jours</h2><p className="text-xs muted">Suivi global des ventes</p></div><BarChart3 className="text-brand-500"/></div><div className="mt-7"><div className="flex items-center justify-between">
          <div className="text-sm muted">Période&nbsp;:</div>
          <div className="flex items-center gap-2">
            <select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-md border p-1 text-sm">
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
        {/* SVG bar chart for clearer visualization */}
        <svg viewBox="0 0 1200 240" className="w-full h-auto">
          {(() => {
            const max = Math.max(...data.chart, 1);
            const now = new Date();
            const paddingLeft = 40;
            const paddingRight = 40;
            const paddingBottom = 40;
            const chartW = 1200 - paddingLeft - paddingRight;
            const chartH = 160;
            const barWidth = chartW / data.chart.length;
            return (
              <g>
                {/* bars */}
                {data.chart.map((v, i) => {
                  const x = paddingLeft + i * barWidth + barWidth * 0.1;
                  const w = barWidth * 0.8;
                  const h = (v / max) * chartH;
                  const y = (paddingBottom + (chartH - h));
                  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (data.chart.length - 1 - i));
                  const label = d.toLocaleString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={w} height={h} rx={6} fill="url(#grad)" />
                      <text x={x + w / 2} y={paddingBottom + chartH + 16} fontSize={12} fill="#94a3b8" textAnchor="middle">{label}</text>
                      <text x={x + w / 2} y={y - 8} fontSize={12} fontWeight={700} fill="#0f172a" textAnchor="middle">{v > 0 ? formatPrice(v) : '-'}</text>
                    </g>
                  );
                })}
                {/* axes line */}
                <line x1={paddingLeft} x2={1200 - paddingRight} y1={paddingBottom + chartH} y2={paddingBottom + chartH} stroke="#e6edf3" strokeWidth={1} />
              </g>
            );
          })()}
          <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
      </div></div></div><div className="card p-6"><h2 className="font-black">Performance des recommandations</h2><p className="mt-1 text-xs muted">Indicateurs issus du système de recommandation</p><div className="mt-5 space-y-4"><Metric name="CTR" value={`${data.ctr}%`} width={`${Math.min(data.ctr,100)}%`}/><Metric name="Conversion" value={`${data.conversion}%`} width={`${Math.min(data.conversion,100)}%`}/><Metric name="Précision hybride" value="94,2%" width="92%"/></div></div></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card p-6"><div className="flex items-center gap-2"><AlertTriangle className="text-orange-500"/><h2 className="font-black">Stock faible</h2></div><p className="mt-1 text-sm muted">Produits à surveiller.</p><div className="mt-4 space-y-3">{products.filter(p=>p.stock<15).map(p=><div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/5"><span className="text-sm font-semibold">{p.name}</span><b className="text-xs text-orange-600">{p.stock} restant(s)</b></div>)}</div></div><div className="card p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">Produits</h2><p className="text-xs muted">Aperçu de la gestion catalogue</p></div><button onClick={()=>goTab("products")} className="text-xs font-bold text-brand-600">Tout voir</button></div><div className="mt-4 space-y-3">{products.slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-white/10"><div><p className="text-sm font-bold">{p.name}</p><p className="text-xs muted">{formatPrice(p.price)} · Stock {p.stock}</p></div><button onClick={()=>goTab("products")} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50"><Edit3 size={16}/></button></div>)}</div></div></div></>}

function Products({products,query,setQuery,onSubmit,onDelete,onEdit,onAdd}){return <div className="card p-5 sm:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black">Gestion des produits</h2><p className="text-sm muted">Ajouter, modifier et supprimer les produits du catalogue.</p></div><button onClick={onAdd} className="btn-primary"><Plus size={17}/> Ajouter</button></div><form onSubmit={onSubmit} className="relative mt-5 max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="input pl-11" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un produit..."/><button type="submit" className="sr-only">Rechercher</button></form><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="pb-3">Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Note</th><th className="text-right">Actions</th></tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-t border-slate-100 dark:border-white/10"><td className="py-4"><div className="flex items-center gap-3"><img src={p.image} alt="" className="h-11 w-11 rounded-xl object-cover bg-slate-100 dark:bg-white/5" /><span className="font-bold">{p.name}</span></div></td><td>{p.category}</td><td>{formatPrice(p.price)}</td><td><span className={p.stock<15?"font-bold text-orange-600":""}>{p.stock}</span></td><td>{p.rating} ★</td><td><div className="flex justify-end gap-1"><button onClick={()=>onEdit(p)} className="rounded-xl p-2 text-brand-600 hover:bg-brand-50" aria-label={`Modifier ${p.name}`}><Edit3 size={16}/></button><button onClick={()=>onDelete(p.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50" aria-label={`Supprimer ${p.name}`}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div></div>}

function Orders({orders,onChange}){return <div className="card p-5 sm:p-6"><h2 className="text-xl font-black">Gestion des commandes</h2><p className="mt-1 text-sm muted">Suivre et mettre à jour l'état des commandes clients.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="pb-3">Commande</th><th>Client</th><th>Date</th><th>Total</th><th>Statut</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-t border-slate-100 dark:border-white/10"><td className="py-4 font-bold">{o.id}</td><td>{o.customer}</td><td>{o.date}</td><td>{formatPrice(o.total)}</td><td><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70" value={o.status} disabled={o.status === "Livrée"} onChange={e=>onChange(o.id,e.target.value)}><option>En cours</option><option>Livrée</option><option>Annulée</option></select></td></tr>)}</tbody></table></div></div>}

function UsersPanel({users,onToggle}){return <div className="card p-5 sm:p-6"><h2 className="text-xl font-black">Gestion des utilisateurs</h2><p className="mt-1 text-sm muted">Consulter les comptes et activer/suspendre un utilisateur.</p><div className="mt-5 space-y-3">{users.map(u=><div key={u.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-600 dark:bg-brand-900/40">{u.name[0]}</div><div><p className="font-bold">{u.name}</p><p className="text-xs muted">{u.email}</p></div></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${u.status==="Actif"?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-600"}`}>{u.status}</span><button onClick={()=>onToggle(u.id)} className="btn-secondary px-3 py-2 text-xs">{u.status==="Actif"?"Suspendre":"Activer"}</button></div></div>)}</div></div>}


function Stat({icon:Icon,label,value,trend}){return <div className="card p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30"><Icon size={19}/></span><span className="text-[11px] font-bold text-emerald-600">{trend}</span></div><p className="mt-4 text-xs muted">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>}
function Metric({name,value,width}){return <div><div className="flex justify-between text-xs"><span className="font-bold">{name}</span><b className="text-brand-600">{value}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{width}}/></div></div>}
function MetricCard({label,value,trend}){return <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><p className="text-xs muted">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-emerald-600">{trend} ce mois</p></div>}

function ProductModal({product,categories,onClose,onSave}){
  const [form,setForm]=useState(product||{
    name:"",
    category:categories?.[0]?.name||"",
    price:0,
    stock:0,
    image:"",
    description:"",
    tags:[]
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    if(!form.name.trim()) return;
    onSave({...form,name:form.name.trim(),image:form.image||""});
  };
  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 p-4">
    <div className="mx-auto my-6 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#23003f]">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">Catalogue</p><h2 className="mt-1 text-xl font-black">{product?"Modifier le produit":"Ajouter un produit"}</h2></div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Fermer"><X/></button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ImageUploader value={form.image} onChange={(value)=>set("image",value)} />
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Nom</span><input className="input" value={form.name} onChange={e=>set("name",e.target.value)} required placeholder="Ex. Casque Bluetooth SoundPro X1" /></label>
        <label><span className="mb-2 block text-xs font-bold">Catégorie</span><select className="input" value={form.category} onChange={e=>set("category",e.target.value)}>{(categories||[]).map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></label>
        <label><span className="mb-2 block text-xs font-bold">Prix (Ar)</span><input type="number" min="0" className="input" value={form.price} onChange={e=>set("price",Number(e.target.value))}/></label>
        <label><span className="mb-2 block text-xs font-bold">Stock</span><input type="number" min="0" className="input" value={form.stock} onChange={e=>set("stock",Number(e.target.value))}/></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description</span><textarea className="input min-h-24" value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Décrivez le produit..."/></label>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button disabled={!form.name.trim()} onClick={submit} className="btn-primary"><CheckCircle2 size={17}/> {product?"Enregistrer les modifications":"Ajouter le produit"}</button>
      </div>
    </div>
  </div>
}
