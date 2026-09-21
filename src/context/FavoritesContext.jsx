import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { addFavorite, getFavorites, logInteraction, removeFavorite } from "../api/service";
import { readStorage, writeStorage } from "../utils/storage";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);
const KEY = "me_antsena_favorites";

export function FavoritesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState(() => {
    const saved = readStorage(KEY, []); return Array.isArray(saved) ? saved : [];
  });

  // Connecté : la liste vient du backend (persistante par compte). Invité : on garde le localStorage.
  useEffect(() => {
    if (!isAuthenticated) return;
    getFavorites().then(setFavorites).catch(() => {});
  }, [isAuthenticated]);

  const persistLocal = useCallback((next) => { setFavorites(next); if (!isAuthenticated) writeStorage(KEY, next); }, [isAuthenticated]);
  const isFavorite = useCallback((id) => favorites.some(p => String(p.id) === String(id)), [favorites]);

  const toggleFavorite = useCallback(async (product) => {
    const already = isFavorite(product.id);
    persistLocal(already ? favorites.filter(p => String(p.id) !== String(product.id)) : [...favorites, product]);
    toast.success(already ? "Retiré des favoris" : "Ajouté aux favoris");
    if (!isAuthenticated) return;
    try {
      if (already) { await removeFavorite(product.id); }
      else { await addFavorite(product.id); logInteraction(product.id, "favorite"); }
    }
    catch { toast.error("Impossible de synchroniser vos favoris."); }
  }, [favorites, isAuthenticated, isFavorite, persistLocal]);

  const clearFavorites = useCallback(async () => {
    const previous = favorites;
    persistLocal([]);
    if (!isAuthenticated) return;
    try { await Promise.all(previous.map((p) => removeFavorite(p.id))); }
    catch { toast.error("Impossible de synchroniser la suppression des favoris."); }
  }, [favorites, isAuthenticated, persistLocal]);
  const value = useMemo(() => ({ favorites, count: favorites.length, isFavorite, toggleFavorite, clearFavorites }), [favorites, isFavorite, toggleFavorite, clearFavorites]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
export const useFavorites = () => useContext(FavoritesContext);
