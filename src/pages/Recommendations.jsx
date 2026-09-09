import { RefreshCw, Sparkles, ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getRecommendations } from "../api/service";
import ProductCard from "../components/ProductCard";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "../hooks/useTranslation";

export default function Recommendations(){
  const {settings}=useSettings();
  const { t } = useTranslation();
  const [data,setData]=useState(null);
  const [type,setType]=useState("hybrid");
  const load=()=>getRecommendations().then(setData);
  useEffect(load,[]);
  const labels={hybrid:"Hybride",collaborative:"Collaboratif",content:"Basé contenu"};

  if (!settings.marketing) {
    return <div className="container-app py-8"><div className="card p-8 text-center"><Sparkles className="mx-auto text-slate-300" size={36}/><h1 className="mt-4 text-3xl font-black">{t("general.recommendationsDisabled")}</h1><p className="mt-2 text-sm muted">Les recommandations ciblées sont actuellement inactives. Réactivez-les dans les paramètres pour retrouver des suggestions adaptées.</p></div></div>;
  }

  return <div className="container-app py-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Cœur scientifique</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">{t("nav.recommendations")}</h1><p className="mt-2 max-w-2xl text-sm muted">Comparaison des trois approches de recommandation prévues dans le mémoire.</p></div><button className="btn-secondary" onClick={load}><RefreshCw size={17}/> Actualiser</button></div><div className="mt-7 flex flex-wrap gap-2">{Object.keys(labels).map(k=><button key={k} onClick={()=>setType(k)} className={`rounded-full px-4 py-2 text-xs font-bold ${type===k?"bg-brand-500 text-white":"bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"}`}>{labels[k]}</button>)}<button onClick={()=>toast("Votre feedback sera utilisé pour affiner les recommandations.")} className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300"><ThumbsDown size={14}/> Ce n'est pas pertinent</button></div><div className="mt-7 rounded-3xl bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white"><div className="flex items-start gap-3"><Sparkles className="mt-1 text-orange-300"/><div><h2 className="font-black">Explication contextuelle</h2><p className="mt-1 text-sm text-white/75">{type==="collaborative"?"Recommandé car des utilisateurs similaires ont aimé ces produits.":type==="content"?"Recommandé grâce aux caractéristiques de produits que vous avez consultés.":"Score hybride : α × collaboratif + (1−α) × contenu, avec bascule tendances/contenu pour le cold-start."}</p></div></div></div><div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data?.[type]?.map(p=><ProductCard key={p.id} product={p} reason={labels[type]}/>)}</div></div>
}
