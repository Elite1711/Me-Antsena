import { memo } from "react";
import { Heart, ShoppingCart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { logInteraction } from "../api/service";
import { formatPrice } from "../utils/format";
import StarRating from "./StarRating";

function ProductCard({ product, reason, recommendationSource }) {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const add = (e) => { e.preventDefault(); addToCart(product); };
  const fav = (e) => { e.preventDefault(); toggleFavorite(product); };
  const trackRecommendationClick = () => {
    if (recommendationSource) {
      void logInteraction(product.id, "recommendation_click", null, { recommendationSource });
    }
  };
  return <article className="group relative overflow-hidden rounded-2xl border border-brand-200/50 bg-white/90 shadow-soft backdrop-blur-md transition-all duration-500 transform hover:-translate-y-1 hover:scale-[1.02] hover:border-brand-300 hover:shadow-glow dark:border-white/10 dark:bg-night-surface">
    <div className="relative aspect-square overflow-hidden bg-brand-50 dark:bg-white/5">
      <Link to={`/products/${product.id}`} onClick={trackRecommendationClick} className="block h-full" aria-label={`Voir ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </Link>
      {product.oldPrice > product.price && <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm dark:border-gold-300/30 dark:bg-gold-300 dark:text-night-canvas">-{Math.round((1-product.price/product.oldPrice)*100)}%</span>}
      <button type="button" onClick={fav} className={`absolute right-3 top-3 rounded-full border border-brand-200/60 bg-white/90 p-2 shadow transition-all duration-300 hover:scale-110 hover:text-brand-500 dark:border-white/10 dark:bg-night-canvas/85 ${favorite?"text-brand-600 dark:text-brand-300":"text-slate-700 dark:text-white"}`} aria-label={favorite?"Retirer des favoris":"Ajouter aux favoris"}><Heart size={17} fill={favorite?"currentColor":"none"}/></button>
    </div>
    <div className="p-4">
      <Link to={`/products/${product.id}`} onClick={trackRecommendationClick} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400">
        {reason && <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-brand-200/70 bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300"><Sparkles size={11}/>{reason}</div>}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">{product.category}</p>
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3>
        <div className="mt-2 flex items-center gap-2"><StarRating value={product.rating}/><span className="text-[11px] text-slate-400">({product.reviews})</span></div>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-lg font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(product.price)}</p>{product.oldPrice > product.price && <del className="text-xs text-slate-400">{formatPrice(product.oldPrice)}</del>}</div><button type="button" onClick={add} className="rounded-xl border border-brand-400/60 bg-brand-500 p-2.5 text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:bg-brand-400 dark:border-[#43C6FF] dark:bg-[#168CFF] dark:text-white dark:hover:bg-[#22B8F0]" aria-label={`Ajouter ${product.name} au panier`}><ShoppingCart size={18}/></button></div>
    </div>
  </article>;
}
export default memo(ProductCard);
