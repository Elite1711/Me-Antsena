import { ArrowLeft, Heart, Minus, Plus, Share2, ShoppingCart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getProduct, getProductReviews, getProducts, getRecommendations, logInteraction, submitReview } from "../api/service";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { formatPrice } from "../utils/format";
import StarRating from "../components/StarRating";
import ProductCard from "../components/ProductCard";
import SectionHeader from "../components/SectionHeader";

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user, isAuthenticated } = useAuth();
  const [product,setProduct]=useState(null), [qty,setQty]=useState(1), [similar,setSimilar]=useState([]), [recs,setRecs]=useState([]), [loading,setLoading]=useState(true);
  const [reviews,setReviews]=useState([]), [reviewRating,setReviewRating]=useState(0), [reviewComment,setReviewComment]=useState(""), [submittingReview,setSubmittingReview]=useState(false);
  useEffect(()=>{
    let active=true;
    setLoading(true); setProduct(null); setQty(1); setReviews([]); setReviewRating(0); setReviewComment("");
    Promise.all([getProduct(id),getProducts(),getRecommendations(),getProductReviews(id)]).then(([p,all,r,rv])=>{
      if(!active) return;
      setProduct(p);
      if (p) logInteraction(p.id, "view");
      setSimilar(p ? all.filter(x=>x.category===p.category&&String(x.id)!==String(p.id)).slice(0,4) : []);
      setRecs(p ? r.collaborative.filter(x=>String(x.id)!==String(p.id)) : []);
      setReviews(rv);
      setLoading(false);
    }).catch(()=>{ if(active){setProduct(null);setSimilar([]);setRecs([]);setLoading(false);} });
    window.scrollTo({top:0,behavior:"smooth"});
    return ()=>{active=false};
  },[id]);
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) { toast.error("Choisissez une note avant d'envoyer."); return; }
    setSubmittingReview(true);
    try {
      const saved = await submitReview(id, { rating: reviewRating, comment: reviewComment });
      const mine = { id: saved.id, rating: saved.rating, comment: saved.comment, author: user?.name || "Vous", date: new Date(saved.created_at).toLocaleDateString("fr-FR") };
      setReviews(prev => [mine, ...prev.filter(r => r.author !== (user?.name || "Vous"))]);
      setReviewComment("");
      toast.success("Merci pour votre avis !");
      getProduct(id).then(p => { if (p) setProduct(p); });
    } catch {
      toast.error("Impossible d'enregistrer votre avis pour le moment.");
    } finally {
      setSubmittingReview(false);
    }
  };
  if (loading) return <div className="container-app py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" aria-label="Chargement"/><p className="mt-4 text-sm muted">Chargement du produit...</p></div>;
  if (!product) return <div className="container-app py-16 text-center"><p className="font-bold">Produit introuvable.</p><Link to="/products" className="btn-primary mt-4 inline-flex">Retour au catalogue</Link></div>;
  return <div className="container-app py-7">
    <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600"><ArrowLeft size={16}/> Retour au catalogue</Link>
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card overflow-hidden"><img src={product.image} alt={product.name} className="aspect-square w-full object-cover"/></div>
      <div className="py-2"><span className="eyebrow">{product.category}</span><h1 className="mt-2 text-3xl font-black sm:text-4xl">{product.name}</h1><div className="mt-3 flex items-center gap-3"><StarRating value={product.rating} showValue/><span className="text-sm muted">{product.reviews} avis</span></div><div className="mt-6 flex items-end gap-3"><span className="text-3xl font-black text-brand-600 dark:text-brand-300">{formatPrice(product.price)}</span>{product.oldPrice>product.price&&<del className="text-sm text-slate-400">{formatPrice(product.oldPrice)}</del>}</div><p className="mt-5 leading-7 muted">{product.description}</p>
      <div className="mt-5 flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.stock<15?"bg-orange-100 text-orange-700":"bg-emerald-100 text-emerald-700"}`}>{product.stock<15?`Plus que ${product.stock} en stock`:"En stock"}</span></div>
      <div className="mt-7 flex flex-wrap items-center gap-3"><div className="flex items-center rounded-2xl border border-slate-200 dark:border-white/10"><button className="p-3" onClick={()=>setQty(Math.max(1,qty-1))} aria-label="Diminuer"><Minus size={16}/></button><span className="w-10 text-center text-sm font-bold">{qty}</span><button className="p-3" onClick={()=>setQty(Math.min(product.stock,qty+1))} aria-label="Augmenter"><Plus size={16}/></button></div><button className="btn-primary flex-1 sm:flex-none" onClick={()=>addToCart(product,qty)}><ShoppingCart size={18}/> Ajouter au panier</button><button className={`btn-secondary p-3 ${isFavorite(product.id)?"text-pink border-pink-200":""}`} onClick={()=>toggleFavorite(product)} aria-label={isFavorite(product.id)?"Retirer des favoris":"Ajouter aux favoris"}><Heart size={19} fill={isFavorite(product.id)?"currentColor":"none"}/></button><button className="btn-secondary p-3" onClick={async()=>{
  try {
    if (navigator.share) { await navigator.share({title:product.name,url:window.location.href}); }
    else { await navigator.clipboard?.writeText(window.location.href); toast.success("Lien copié"); }
  } catch { toast("Partage annulé"); }
}} aria-label="Partager"><Share2 size={19}/></button></div>
      </div>
    </div>
    <section className="py-12"><SectionHeader title="Produits similaires" subtitle="Filtrage basé sur le contenu"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{similar.map(p=><ProductCard key={p.id} product={p} reason="Caractéristiques similaires"/>)}</div></section>
    <section className="py-8"><SectionHeader title="Les clients ont aussi acheté" subtitle="Filtrage collaboratif"/><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{recs.map(p=><ProductCard key={p.id} product={p} reason="Clients similaires"/>)}</div></section>
    <section className="card mt-8 p-6">
      <h2 className="text-xl font-extrabold">Avis clients</h2>
      {isAuthenticated ? (
        <form onSubmit={handleSubmitReview} className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
          <p className="text-sm font-bold">Laisser un avis</p>
          <div className="mt-2"><StarRating value={reviewRating} interactive onChange={setReviewRating}/></div>
          <textarea
            value={reviewComment}
            onChange={(e)=>setReviewComment(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Votre commentaire (facultatif)"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm outline-none focus:border-brand-400 dark:border-white/10"
          />
          <button type="submit" disabled={submittingReview} className="btn-primary mt-3 disabled:opacity-60">
            {submittingReview ? "Envoi..." : "Envoyer mon avis"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm muted"><Link to="/login" className="font-bold text-brand-600">Connectez-vous</Link> pour laisser un avis sur ce produit.</p>
      )}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 && <p className="text-sm muted">Aucun avis pour le moment. Soyez le premier à donner votre avis.</p>}
        {reviews.map(r => (
          <div key={r.id} className="border-t border-slate-100 pt-4 first:border-none first:pt-0 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><span className="text-sm font-bold">{r.author}</span><StarRating value={r.rating}/></div>
              <span className="text-xs muted">{r.date}</span>
            </div>
            {r.comment && <p className="mt-1.5 text-sm leading-6 muted">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
    <section className="card mt-8 p-6"><div className="flex items-center gap-2 text-brand-600"><Sparkles size={18}/><h2 className="font-extrabold">Pourquoi ce produit ?</h2></div><p className="mt-2 text-sm leading-6 muted">La plateforme enregistre les consultations et interactions pour alimenter le moteur de recommandation hybride, conformément au parcours prévu par le cahier des charges.</p></section>
  </div>;
}
