import { Filter, Grid2X2, List, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/service";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [minRating, setMinRating] = useState("");
  const [sort, setSort] = useState("");

  useEffect(() => { getCategories().then(setCategories); }, []);
  useEffect(() => {
    setLoading(true);
    getProducts({q:params.get("q")||"", category:params.get("category")||"", minRating, sort}).then(setProducts).finally(()=>setLoading(false));
  }, [params, minRating, sort]);

  const submit = e => { e.preventDefault(); const next = new URLSearchParams(params); q ? next.set("q",q) : next.delete("q"); category ? next.set("category",category) : next.delete("category"); setParams(next); };
  const clear = () => { setQ(""); setCategory(""); setMinRating(""); setSort(""); setParams({}); };

  return <div className="container-app py-7">
    <div className="mb-7"><p className="eyebrow">Catalogue</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Tous les produits</h1><p className="mt-2 text-sm muted">Recherche, filtres et tri pour trouver rapidement ce qu'il vous faut.</p></div>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row">
      <form onSubmit={submit} className="flex-1"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={q} onChange={e=>setQ(e.target.value)} className="input pl-11" placeholder="Rechercher..." /></div></form>
      <button className="btn-secondary lg:hidden" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal size={18}/> Filtres</button>
      <div className={`${filtersOpen?"block":"hidden"} rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-[#23003f] lg:flex lg:items-center lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent`}>
        <select className="input w-full lg:w-48" value={category} onChange={e=>{const v=e.target.value;setCategory(v);const next=new URLSearchParams(params);v?next.set("category",v):next.delete("category");setParams(next);}}><option value="">Toutes catégories</option>{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
        <select className="input w-full lg:w-44" value={minRating} onChange={e=>setMinRating(e.target.value)}><option value="">Note minimale</option><option value="4">4★ et +</option><option value="4.5">4.5★ et +</option></select>
        <select className="input w-full lg:w-48" value={sort} onChange={e=>setSort(e.target.value)}><option value="">Pertinence</option><option value="priceAsc">Prix croissant</option><option value="priceDesc">Prix décroissant</option><option value="rating">Popularité</option><option value="newest">Nouveautés</option></select>
        <button onClick={clear} className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-500 lg:mt-0"><X size={14}/> Réinitialiser</button>
      </div>
    </div>
    <div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{loading ? "Chargement..." : `${products.length} produit(s)`}</p><div className="hidden rounded-xl border border-black/5 bg-white p-1 dark:border-white/10 dark:bg-[#23003f] sm:flex"><button className={`rounded-lg p-2 ${view==="grid"?"bg-brand-50 text-brand-600":"text-slate-400"}`} onClick={()=>setView("grid")} aria-label="Vue grille"><Grid2X2 size={17}/></button><button className={`rounded-lg p-2 ${view==="list"?"bg-brand-50 text-brand-600":"text-slate-400"}`} onClick={()=>setView("list")} aria-label="Vue liste"><List size={17}/></button></div></div>
    {products.length===0 && !loading ? <EmptyState title="Aucun produit trouvé" text="Modifiez vos mots-clés ou vos filtres."/> :
      <div className={view==="grid"?"grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4":"grid gap-4"}>{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>}
  </div>;
}
