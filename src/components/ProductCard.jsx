import { memo } from "react";
import { Heart, ShoppingCart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { formatPrice } from "../utils/format";
import StarRating from "./StarRating";

function ProductCard({ product, reason }) {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const add = (e) => { e.preventDefault(); addToCart(product); };
  const fav = (e) => { e.preventDefault(); toggleFavorite(product); };
  return <article className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow dark:border-white/10 dark:bg-[#241A10]">
    <div className="relative aspect-square overflow-hidden bg-brand-50 dark:bg-white/5">
      <Link to={`/products/${product.id}`} className="block h-full" aria-label={`Voir ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </Link>
      {product.oldPrice > product.price && <span className="absolute left-3 top-3 rounded-full bg-pink px-2.5 py-1 text-[11px] font-bold text-white">-{Math.round((1-product.price/product.oldPrice)*100)}%</span>}
      <button type="button" onClick={fav} className={`absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow dark:bg-black/50 ${favorite?"text-pink":"text-slate-700 dark:text-white"}`} aria-label={favorite?"Retirer des favoris":"Ajouter aux favoris"}><Heart size={17} fill={favorite?"currentColor":"none"}/></button>
    </div>
    <div className="p-4">
      <Link to={`/products/${product.id}`} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
        {reason && <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Sparkles size={11}/>{reason}</div>}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-500">{product.category}</p>
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3>
        <div className="mt-2 flex items-center gap-2"><StarRating value={product.rating}/><span className="text-[11px] text-slate-400">({product.reviews})</span></div>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-lg font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(product.price)}</p>{product.oldPrice > product.price && <del className="text-xs text-slate-400">{formatPrice(product.oldPrice)}</del>}</div><button type="button" onClick={add} className="rounded-xl bg-brand-500 p-2.5 text-white transition hover:bg-brand-600" aria-label={`Ajouter ${product.name} au panier`}><ShoppingCart size={18}/></button></div>
    </div>
  </article>;
}
export default memo(ProductCard);
