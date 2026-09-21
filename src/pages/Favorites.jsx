import { Trash2 } from "lucide-react";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import { useFavorites } from "../context/FavoritesContext";

export default function Favorites(){
  const {favorites,clearFavorites}=useFavorites();
  return <div className="container-app py-8">
    <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Sauvegardés</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Mes favoris</h1><p className="mt-2 text-sm muted">Retrouvez les produits que vous souhaitez garder sous la main.</p></div>{favorites.length>0&&<button onClick={clearFavorites} className="btn-secondary text-red-500"><Trash2 size={16}/> Tout supprimer</button>}</div>
    {favorites.length===0?<div className="mt-8"><EmptyState title="Aucun favori" text="Appuyez sur le cœur d'un produit pour l'ajouter ici."/></div>:<div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{favorites.map(p=><ProductCard key={p.id} product={p}/>)}</div>}
  </div>
}
