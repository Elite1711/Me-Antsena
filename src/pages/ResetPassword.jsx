import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ResetPassword(){
 const nav=useNavigate(); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [loading,setLoading]=useState(false);
 const submit=async e=>{e.preventDefault();if(password.length<8)return toast.error('Le mot de passe doit contenir au moins 8 caractères');if(password!==confirm)return toast.error('Les mots de passe ne correspondent pas');setLoading(true);try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success('Mot de passe modifié');nav('/login',{replace:true});}catch(err){toast.error(err.message)}finally{setLoading(false)}};
 return <div className="min-h-screen bg-[#FFF1F1] p-5 dark:bg-[#17002d] sm:p-10"><div className="mx-auto max-w-md"><div className="card p-7"><p className="eyebrow">Sécurité</p><h1 className="mt-2 text-2xl font-black">Nouveau mot de passe</h1><p className="mt-2 text-sm muted">Choisissez un nouveau mot de passe pour votre compte.</p><form onSubmit={submit} className="mt-6 space-y-4"><input className="input" type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe"/><input className="input" type="password" minLength="8" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirmer le mot de passe"/><button disabled={loading} className="btn-primary w-full">{loading?'Enregistrement...':'Modifier le mot de passe'}</button></form></div></div></div>
}
