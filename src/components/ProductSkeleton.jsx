import { memo } from "react";

function ProductSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-brand-200/40 bg-white/70 p-0 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-night-surface/70">
      {/* Zone image skeleton */}
      <div className="skeleton-shimmer aspect-square w-full" />
      
      {/* Zone contenu */}
      <div className="p-4 space-y-3">
        {/* Catégorie */}
        <div className="skeleton-shimmer h-3 w-1/3 rounded-full" />
        
        {/* Titre (2 lignes) */}
        <div className="skeleton-shimmer h-4 w-4/5 rounded-md" />
        <div className="skeleton-shimmer h-4 w-3/5 rounded-md" />
        
        {/* Rating */}
        <div className="skeleton-shimmer h-3 w-1/2 rounded-full" />
        
        {/* Prix et bouton */}
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton-shimmer h-6 w-24 rounded-lg" />
          <div className="skeleton-shimmer h-10 w-10 rounded-xl" />
        </div>
      </div>
    </article>
  );
}

export default memo(ProductSkeleton);
