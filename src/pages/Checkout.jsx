import { Check, MapPin, Smartphone, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { formatPrice } from "../utils/format";

export default function Checkout() {
  const {items,total,shipping,clearCart}=useCart(); const {addOrder}=useOrders(); const {user}=useAuth(); const navigate=useNavigate();
  const [payment,setPayment]=useState("Mobile Money"); const [address,setAddress]=useState(user?.address || "Lot II A, Antananarivo"); const [delivery,setDelivery]=useState("Standard"); const [confirming,setConfirming]=useState(false);
  if(!items.length) return <div className="container-app py-12 text-center"><p className="text-lg font-bold">Votre panier est vide.</p><Link to="/products" className="btn-primary mt-4">Continuer mes achats</Link></div>;
  const confirm=()=>{ if(confirming) return; if(!address.trim()) { toast.error("Veuillez renseigner une adresse."); return; } setConfirming(true); try { const order=addOrder({items,total,shipping,address:address.trim(),payment,delivery}); clearCart(); toast.success(`Commande ${order.id} confirmée !`); navigate("/profile?tab=orders", {replace:true}); } catch { setConfirming(false); toast.error("Impossible de confirmer la commande."); } };
  return <div className="container-app py-7"><p className="eyebrow">Dernière étape</p><h1 className="mt-1 text-3xl font-black">Passer la commande</h1><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_380px]"><div className="space-y-5">
    <Card title="Adresse de livraison" icon={MapPin}><input className="input" value={address} onChange={e=>setAddress(e.target.value)} /><p className="mt-2 text-xs muted">Vous pourrez gérer plusieurs adresses depuis votre profil.</p></Card>
    <Card title="Mode de livraison" icon={Truck}><div className="grid gap-3 sm:grid-cols-2">{["Standard","Express"].map(x=><label key={x} className={`cursor-pointer rounded-2xl border p-4 ${delivery===x?"border-brand-400 bg-brand-50 dark:bg-brand-900/20":"border-slate-200 dark:border-white/10"}`}><input type="radio" name="delivery" checked={delivery===x} onChange={()=>setDelivery(x)} className="mr-2"/><b>{x}</b><span className="ml-2 text-xs muted">{x==="Standard"?"2–4 jours":"24–48 h"}</span></label>)}</div></Card>
    <Card title="Paiement (simulation)" icon={Smartphone}><div className="grid gap-3 sm:grid-cols-2">{["Mobile Money","Paiement à la livraison"].map(x=><label key={x} className={`cursor-pointer rounded-2xl border p-4 ${payment===x?"border-brand-400 bg-brand-50 dark:bg-brand-900/20":"border-slate-200 dark:border-white/10"}`}><input type="radio" name="payment" checked={payment===x} onChange={()=>setPayment(x)} className="mr-2"/><b>{x}</b></label>)}</div></Card>
  </div><aside className="card h-fit p-5"><h2 className="text-lg font-black">Récapitulatif</h2><div className="mt-4 space-y-3">{items.map(i=><div key={i.id} className="flex justify-between gap-3 text-sm"><span className="line-clamp-1">{i.quantity}× {i.name}</span><b>{formatPrice(i.price*i.quantity)}</b></div>)}</div><div className="my-4 border-t border-slate-100 dark:border-white/10"/><div className="flex justify-between text-sm"><span className="muted">Livraison</span><b>{shipping?formatPrice(shipping):"Gratuite"}</b></div><div className="mt-3 flex justify-between"><span className="font-bold">Total</span><b className="text-xl text-brand-600">{formatPrice(total)}</b></div><button disabled={confirming} className="btn-primary mt-6 w-full" onClick={confirm}><Check size={17}/> {confirming?"Confirmation...":"Confirmer la commande"}</button><p className="mt-3 text-center text-[11px] muted">Paiement réel exclu : simulation conformément au cahier des charges.</p></aside></div></div>;
}
function Card({title,icon:Icon,children}){return <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Icon size={18} className="text-brand-500"/><h2 className="font-black">{title}</h2></div>{children}</section>}
