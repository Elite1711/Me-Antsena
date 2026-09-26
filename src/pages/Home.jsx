import { ArrowRight, ShieldCheck, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getRecommendations, getProducts } from "../api/service";
import ProductCard from "../components/ProductCard";
import SectionHeader from "../components/SectionHeader";
import { useTranslation } from "../hooks/useTranslation";

export default function Home() {
  const [data, setData] = useState({ products: [], recs: null, categories: [] });
  const { t } = useTranslation();
  useEffect(() => {
    Promise.all([getProducts(), getRecommendations(), getCategories()]).then(([products,recs,categories]) => setData({ products,recs,categories }));
  }, []);
  return <div>
    <section className="container-app pt-5 sm:pt-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand-800 px-6 py-10 text-white shadow-glow sm:px-10 lg:px-14 lg:py-14">
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur"><Sparkles size={14}/> {t("home.heroBadge")}</span><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("home.heroTitle")}<br/><span className="text-brand-200">{t("home.heroTitleAccent")}</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{t("home.heroText")}</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/products" className="btn-primary bg-white text-brand-700 hover:bg-brand-50">{t("home.discover")} <ArrowRight size={17}/></Link></div></div>
          <img src="/mascot-hero.png" alt="" aria-hidden="true" className="hidden h-48 w-auto shrink-0 drop-shadow-2xl sm:h-56 lg:block lg:h-64"/>
        </div>
      </div>
    </section>
    <section className="container-app py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-brand-200/60 bg-white px-6 py-4 text-center text-xs font-semibold text-brand-700 dark:border-white/10 dark:bg-[#241A10] dark:text-brand-200 sm:justify-between sm:text-left">
        <TrustItem icon={Zap} text={t("home.featureRecommendations")}/>
        <TrustItem icon={Truck} text={t("home.featureDelivery")}/>
        <TrustItem icon={ShieldCheck} text={t("home.featureSecure")}/>
        <TrustItem icon={Sparkles} text={t("home.featureSmart")}/>
      </div>
    </section>
    <section className="container-app py-5">
      <SectionHeader title={t("home.categories")} to="/categories" />
      <div className="flex gap-3 overflow-x-auto pb-2">{data.categories.slice(0,8).map(c=><Link key={c.name} to={`/products?category=${encodeURIComponent(c.name)}`} className="min-w-28 rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-[#241A10]"><div className="text-2xl">{c.icon}</div><div className="mt-2 text-xs font-bold">{c.name}</div><div className="mt-1 text-[10px] text-slate-400">{c.count} {t("home.productsCount")}</div></Link>)}</div>
    </section>
    <section className="container-app py-8"><SectionHeader title={t("home.recommendedForYou")} subtitle={t("home.forYouSubtitle")}/><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{[...(data.recs?.hybrid||[]).slice(0,4), ...(data.recs?.content||[]).slice(0,4)].slice(0,8).map(p=><ProductCard key={p.id} product={p} reason={t("home.recommendedForYou")}/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title={t("home.trends")} subtitle={t("home.globalPopularity")}/><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.products.slice(0,5).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
  </div>;
}
function TrustItem({icon:Icon,text}) { return <div className="flex items-center gap-2"><Icon size={16} className="text-brand-500"/><span>{text}</span></div>; }
