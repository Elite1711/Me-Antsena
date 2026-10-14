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
      {/* --- Bento Grid Hero Section --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Grand bloc principal (8 colonnes sur desktop) */}
        <div className="aurora-mesh relative col-span-1 lg:col-span-8 overflow-hidden rounded-[2rem] p-6 text-white shadow-glow sm:p-10 lg:p-12">
          {/* Orbe lumineux décoratif */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
          <div className="relative z-10 flex flex-col justify-between gap-6 sm:gap-8 h-full">
            <div className="max-w-xl motion-enter">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-cyan-200 backdrop-blur-md shadow-sm">
                <Sparkles size={14} className="animate-pulse text-cyan-300" />
                {t("home.heroBadge")}
              </span>
              <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl lg:text-5xl leading-tight">
                {t("home.heroTitle")}
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
                  {t("home.heroTitleAccent")}
                </span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                {t("home.heroText")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/products"
                className="group btn-primary animate-blue-breath bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-400 hover:to-cyan-400 text-white font-bold px-6 py-3.5 rounded-xl shadow-glow transition-all"
              >
                {t("home.discover")}
                <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
              <a
                href="#recommendations-section"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:-translate-y-0.5"
              >
                <Sparkles size={16} className="text-cyan-300" />
                {t("home.recommendations")}
              </a>
            </div>
          </div>

          <img
            src="/mascot-hero.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 right-4 hidden h-48 w-auto shrink-0 animate-float drop-shadow-2xl sm:block lg:h-56"
          />
        </div>

        {/* Colonne latérale Bento (4 colonnes sur desktop) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
          {/* Bento Card 1 : IA & Moteur Hybride */}
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-200/60 bg-gradient-to-br from-white via-brand-50/50 to-white p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-glow hover:border-brand-300 dark:border-white/10 dark:from-night-surface dark:via-night-raised dark:to-night-surface flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Moteur ML Actif
                </span>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-300">FastAPI • v1.0</span>
              </div>
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-brand-900 dark:text-white">
                Intelligence Hybride
              </h2>
              <p className="mt-1 text-xs text-brand-700/80 dark:text-slate-300">
                Fusion en temps réel du filtrage collaboratif matriciel et de l'analyse sémantique TF-IDF.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-brand-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex -space-x-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow">AI</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-500 text-[10px] font-bold text-white shadow">ML</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-700 text-[10px] font-bold text-white shadow">CF</span>
              </div>
              <span className="text-[11px] font-bold text-brand-600 dark:text-cyan-300">Suggestions adaptatives</span>
            </div>
          </div>

          {/* Bento Card 2 : Engagements & Confiance */}
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-200/60 bg-gradient-to-br from-white via-blue-50/40 to-white p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-glow hover:border-brand-300 dark:border-white/10 dark:from-night-surface dark:via-night-raised dark:to-night-surface">
            <h2 className="text-xs font-bold uppercase tracking-[.15em] text-brand-500 dark:text-cyan-300">
              Garanties Me-Antsena
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-brand-800 dark:text-slate-200">
              <div className="flex items-center gap-2 rounded-xl bg-brand-50/80 p-2 dark:bg-white/5">
                <Truck size={15} className="text-brand-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{t("home.featureDelivery")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-brand-50/80 p-2 dark:bg-white/5">
                <ShieldCheck size={15} className="text-brand-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{t("home.featureSecure")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-brand-50/80 p-2 dark:bg-white/5">
                <Zap size={15} className="text-brand-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{t("home.featureRecommendations")}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-brand-50/80 p-2 dark:bg-white/5">
                <Sparkles size={15} className="text-brand-500 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{t("home.featureSmart")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Section de réassurance rapide */}
    <section className="container-app py-5">
      <div className="motion-enter flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-brand-200/60 bg-white/80 px-6 py-3.5 text-center text-xs font-semibold text-brand-800 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-night-surface/80 dark:text-white sm:justify-between sm:text-left">
        <TrustItem icon={Zap} text={t("home.featureRecommendations")} />
        <TrustItem icon={Truck} text={t("home.featureDelivery")} />
        <TrustItem icon={ShieldCheck} text={t("home.featureSecure")} />
        <TrustItem icon={Sparkles} text={t("home.featureSmart")} />
      </div>
    </section>
    <section className="container-app py-5">
      <SectionHeader title={t("home.categories")} to="/categories" />
      <div className="motion-stagger flex gap-3 overflow-x-auto pb-2">{data.categories.slice(0,8).map(c=><Link key={c.name} to={`/products?category=${encodeURIComponent(c.name)}`} className="min-w-28 rounded-2xl border border-brand-200/60 bg-white/85 p-4 text-center text-brand-800 shadow-sm backdrop-blur-md transition-all duration-500 transform hover:-translate-y-1 hover:scale-[1.02] hover:border-brand-300 hover:shadow-glow dark:border-white/10 dark:bg-night-surface/85 dark:text-white"><div className="text-2xl">{c.icon}</div><div className="mt-2 text-xs font-bold">{c.name}</div><div className="mt-1 text-[10px] text-slate-400">{c.count} {t("home.productsCount")}</div></Link>)}</div>
    </section>
    <section id="recommendations-section" className="container-app py-8"><SectionHeader title={t("home.recommendedForYou")} subtitle={t("home.basedOnCommunity")}/><div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs?.hybrid.slice(0, 4).map(p=><ProductCard key={p.id} product={p} reason={t("home.recommendedForYou")} recommendationSource="home_hybrid"/>)}</div></section>
    <section className="container-app py-8"><SectionHeader title={t("home.recentConsults")} subtitle={t("home.contentFiltering")}/>{data.recs?.contentSource === "unavailable" ? <p className="text-sm muted">{t("home.contentRecommendationsUnavailable")}</p> : data.recs?.content.length ? <div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.recs.content.map(product=><ProductCard key={product.id} product={product} reason={t(product.isRecentlyViewed ? "home.recentlyViewed" : "home.contentFiltering")} recommendationSource={product.isRecentlyViewed ? undefined : "home_content"}/>)}</div> : <p className="text-sm muted">{t("home.noContentRecommendations")}</p>}</section>
    <section className="container-app py-8"><SectionHeader title={t(data.trending.source === "interaction_popularity" ? "home.mostPopular" : "home.newestFallback")} subtitle={t(data.trending.source === "interaction_popularity" ? "home.interactionPopularity" : "home.newestFallbackDescription")}/><div className="motion-stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{data.trending.products.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
  </div>;
}
function TrustItem({icon:Icon,text}) { return <div className="flex items-center gap-2"><Icon size={16} className="text-sage-600 dark:text-sage-300"/><span>{text}</span></div>; }
