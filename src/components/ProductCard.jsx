import { memo, useState, useRef } from "react";
import { Check, Heart, ShoppingCart, Sparkles } from "lucide-react";
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
  const [justAdded, setJustAdded] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [transformStyle, setTransformStyle] = useState("");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0 });
  const cardRef = useRef(null);

  const add = (e) => {
    e.preventDefault();
    addToCart(product, 1, e.currentTarget);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const fav = (e) => {
    e.preventDefault();
    toggleFavorite(product);
    setJustLiked(true);
    setTimeout(() => setJustLiked(false), 450);
  };

  const trackRecommendationClick = () => {
    if (recommendationSource) {
      void logInteraction(product.id, "recommendation_click", null, { recommendationSource });
    }
  };

  // Gestion du Tilt 3D et du reflet (Glare)
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7;
    const rotateY = ((x - centerX) / centerX) * 7;

    setTransformStyle(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlareStyle({
      opacity: 0.2,
      background: `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%, rgba(255,255,255,0.7), transparent 60%)`
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle("perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlareStyle({ opacity: 0 });
  };

  const isAiRecommended = Boolean(reason || recommendationSource);

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle, transformStyle: "preserve-3d" }}
      className={`group relative overflow-hidden rounded-2xl border bg-white/90 shadow-soft backdrop-blur-md transition-all duration-300 dark:bg-night-surface ${
        isAiRecommended
          ? "border-beam-card border-brand-400/60 shadow-glow dark:border-brand-400/50"
          : "border-brand-200/50 hover:border-brand-300 hover:shadow-glow dark:border-white/10"
      }`}
    >
      {/* Glare effect overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
        style={glareStyle}
      />

      <div className="relative aspect-square overflow-hidden bg-brand-50 dark:bg-white/5">
        <Link to={`/products/${product.id}`} onClick={trackRecommendationClick} className="block h-full" aria-label={`Voir ${product.name}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-108"
          />
        </Link>
        {product.oldPrice > product.price && (
          <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm dark:border-gold-300/30 dark:bg-gold-300 dark:text-night-canvas">
            -{Math.round((1 - product.price / product.oldPrice) * 100)}%
          </span>
        )}
        <button
          type="button"
          onClick={fav}
          className={`absolute right-3 top-3 z-20 rounded-full border border-brand-200/60 bg-white/90 p-2 shadow transition-all duration-300 hover:scale-115 hover:text-brand-500 dark:border-white/10 dark:bg-night-canvas/85 ${
            favorite ? "text-brand-600 dark:text-brand-300" : "text-slate-700 dark:text-white"
          } ${justLiked ? "animate-heart-pop" : ""}`}
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        <Link to={`/products/${product.id}`} onClick={trackRecommendationClick} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400">
          {reason && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-300/80 bg-brand-50/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700 shadow-sm dark:border-brand-400/30 dark:bg-brand-900/30 dark:text-brand-300">
              <Sparkles size={11} className="animate-pulse text-brand-500 dark:text-brand-300" />
              {reason}
            </div>
          )}
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-brand-600 dark:text-brand-300">{product.category}</p>
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">{product.name}</h3>
          <div className="mt-2 flex items-center gap-2">
            <StarRating value={product.rating} />
            <span className="text-[11px] text-slate-400">({product.reviews})</span>
          </div>
        </Link>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(product.price)}</p>
            {product.oldPrice > product.price && <del className="text-xs text-slate-400">{formatPrice(product.oldPrice)}</del>}
          </div>
          <button
            type="button"
            onClick={add}
            className={`relative rounded-xl border p-2.5 text-white shadow-glow transition-all duration-300 active:scale-95 ${
              justAdded
                ? "border-emerald-400 bg-emerald-500 scale-105"
                : "border-brand-400/60 bg-brand-500 hover:-translate-y-0.5 hover:scale-108 hover:bg-brand-400 dark:border-[#43C6FF] dark:bg-[#168CFF] dark:hover:bg-[#22B8F0]"
            }`}
            aria-label={`Ajouter ${product.name} au panier`}
          >
            {justAdded ? <Check size={18} className="animate-scale" /> : <ShoppingCart size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
export default memo(ProductCard);
