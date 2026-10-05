import { ArrowRight, ShieldCheck, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getRecommendations, getTrendingProducts } from "../api/service";
import ProductCard from "../components/ProductCard";
import SectionHeader from "../components/SectionHeader";
import { useTranslation } from "../hooks/useTranslation";

export default function Home() {
  const [data, setData] = useState({
    trending: { products: [], source: "newest_fallback" },
    recs: null,
    categories: [],
  });
  const { t } = useTranslation();
  useEffect(() => {
    Promise.all([getTrendingProducts(), getRecommendations(), getCategories()])
      .then(([trending, recs, categories]) => setData({ trending, recs, categories }));
  }, []);
  return <div>
    <section className="container-app pt-5 sm:pt-8">
      <div className="hero-animated rounded-[2rem] px-6 py-10 text-white shadow-glow sm:px-10 lg:px-14 lg:py-14">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl motion-enter"><span className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-300/30 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-gold-200 backdrop-blur-md"><Sparkles size={14} className="animate-pulse text-gold-300"/> {t("home.heroBadge")}</span><h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">{t("home.heroTitle")}<br/><span className="text-gold-300">{t("home.heroTitleAccent")}</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{t("home.heroText")}</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/products" className="group btn-primary animate-blue-breath">{t("home.discover")} <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1"/></Link></div></div>
          <img src="/mascot-hero.png" alt="" aria-hidden="true" className="hidden h-48 w-auto shrink-0 animate-float drop-shadow-2xl motion-enter-delay-2 sm:h-56 lg:block lg:h-64"/>
        </div>
      </div>
    </section>
    <section className="container-app py-6">
      <div className="motion-enter flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-brand-200/60 bg-white/80 px-6 py-4 text-center text-xs font-semibold text-brand-800 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-night-surface/80 dark:text-white sm:justify-between sm:text-left">
        <TrustItem icon={Zap} text={t("home.featureRecommendations")}/>
        <TrustItem icon={Truck} text={t("home.featureDelivery")}/>
        <TrustItem icon={ShieldCheck} text={t("home.featureSecure")}/>
        <TrustItem icon={Sparkles} text={t("home.featureSmart")}/>
      </div>
    </section>
    <section className="container-app py-5">
      <SectionHeader title={t("home.categories")} to="/categories" />
      <div className="motion-stagger flex gap-3 overflow-x-auto pb-2">{data.categories.slice(0,8).map(c=><Link key={c.name} to={`/products?category=${encodeURIComponent(c.name)}`} className="min-w-28 rounded-2xl border border-brand-200/60 bg-white/85 p-4 text-center text-brand-800 shadow-sm backdrop-blur-md transition-all duration-500 transform hover:-translate-y-1 hover:scale-[1.02] hover:border-brand-300 hover:shadow-glow dark:border-white/10 dark:bg-night-surface/85 dark:text-white"><div className="text-2xl">{c.icon}</div><div className="mt-2 text-xs font-bold">{c.name}</div><div className="mt-1 text-[10px] text-slate-400">{c.count} {t("home.productsCount")}</div></Link>)}</div>
    </section>
    <section className="container-app py-8"><SectionHeader title={t("home.recommendedForYou")} subtitle={t("home.basedOnCommunity")}/><div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs?.hybrid.slice(0, 4).map(p=><ProductCard key={p.id} product={p} reason={t("home.recommendedForYou")} recommendationSource="home_hybrid"/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title={t("home.recentConsults")} subtitle={t("home.contentFiltering")}/><div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs?.content.slice(0, 4).map(p=><ProductCard key={p.id} product={p} reason={t("home.recentlyViewed")} recommendationSource="home_content"/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title={t(data.trending.source === "interaction_popularity" ? "home.mostPopular" : "home.newestFallback")} subtitle={t(data.trending.source === "interaction_popularity" ? "home.interactionPopularity" : "home.newestFallbackDescription")}/><div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.trending.products.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
  </div>;
}
function TrustItem({icon:Icon,text}) { return <div className="flex items-center gap-2"><Icon size={16} className="text-sage-600 dark:text-sage-300"/><span>{text}</span></div>; }
