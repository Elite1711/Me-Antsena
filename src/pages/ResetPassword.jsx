import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export default function ResetPassword(){
 const nav=useNavigate(); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [loading,setLoading]=useState(false); const { t } = useTranslation();
 const submit=async e=>{e.preventDefault();if(password.length<8)return toast.error('Le mot de passe doit contenir au moins 8 caractères');if(password!==confirm)return toast.error('Les mots de passe ne correspondent pas');setLoading(true);try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;toast.success('Mot de passe modifié');nav('/login',{replace:true});}catch(err){toast.error(err.message)}finally{setLoading(false)}};
 return <div className="min-h-screen bg-[#FBF6EF] p-5 dark:bg-[#17110A] sm:p-10"><div className="mx-auto max-w-md"><div className="card p-7"><p className="eyebrow">Sécurité</p><h1 className="mt-2 text-2xl font-black">{t("auth.resetTitle")}</h1><p className="mt-2 text-sm muted">{t("auth.resetSubtitle")}</p><form onSubmit={submit} className="mt-6 space-y-4"><input className="input" type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("auth.newPassword")}/><input className="input" type="password" minLength="8" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder={t("auth.confirmNewPassword")}/><button disabled={loading} className="btn-primary w-full">{loading?t("auth.savePassword"):t("auth.changePassword")}</button></form></div></div></div>
}
