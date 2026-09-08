import { ArrowRight, ChevronRight, ShieldCheck, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getRecommendations, getProducts } from "../api/service";
import ProductCard from "../components/ProductCard";
import SectionHeader from "../components/SectionHeader";

export default function Home() {
  const [data, setData] = useState({ products: [], recs: null, categories: [] });
  useEffect(() => {
    Promise.all([getProducts(), getRecommendations(), getCategories()]).then(([products,recs,categories]) => setData({ products,recs,categories }));
  }, []);
  return <div>
    <section className="container-app pt-5 sm:pt-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-6 py-10 text-white shadow-glow sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-pink/30 blur-3xl"/>
        <div className="absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-accent/30 blur-3xl"/>
        <div className="relative max-w-2xl"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur"><Sparkles size={14}/> E-commerce intelligent</span><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Achetez mieux,<br/><span className="text-orange-300">vivez mieux.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Des produits sélectionnés pour vous grâce à des recommandations personnalisées par Machine Learning.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/products" className="btn-primary bg-white text-brand-700 hover:bg-brand-50">Découvrir les produits <ArrowRight size={17}/></Link><Link to="/recommendations" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-semibold backdrop-blur hover:bg-white/20">Pour vous</Link></div></div>
      </div>
    </section>
    <section className="container-app py-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Feature icon={Zap} title="Recommandations" text="Personnalisées"/><Feature icon={Truck} title="Livraison" text="Simple & simulée"/><Feature icon={ShieldCheck} title="Sécurisé" text="JWT & données protégées"/><Feature icon={Sparkles} title="Intelligent" text="Hybride ML"/></div>
    </section>
    <section className="container-app py-5">
      <SectionHeader title="Catégories" to="/categories" />
      <div className="flex gap-3 overflow-x-auto pb-2">{data.categories.slice(0,8).map(c=><Link key={c.name} to={`/products?category=${encodeURIComponent(c.name)}`} className="min-w-28 rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#23003f]"><div className="text-2xl">{c.icon}</div><div className="mt-2 text-xs font-bold">{c.name}</div><div className="mt-1 text-[10px] text-slate-400">{c.count} produits</div></Link>)}</div>
    </section>
    <section className="container-app py-8"><SectionHeader title="Recommandé pour vous" subtitle="Basé sur les habitudes de la communauté" to="/recommendations"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs?.hybrid.map(p=><ProductCard key={p.id} product={p} reason="Recommandé pour vous"/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title="Basé sur vos consultations récentes" subtitle="Filtrage basé sur le contenu"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs?.content.map(p=><ProductCard key={p.id} product={p} reason="Vu récemment"/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title="Tendances du moment" subtitle="Popularité globale"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.products.slice(0,5).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
  </div>;
}
function Feature({icon:Icon,title,text}) { return <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-[#23003f]"><Icon size={20} className="text-brand-500"/><p className="mt-3 text-xs font-bold">{title}</p><p className="mt-1 text-[11px] muted">{text}</p></div>; }
