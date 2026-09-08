import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export default function ForgotPassword(){
 const [email,setEmail]=useState(''); const [sent,setSent]=useState(false); const [loading,setLoading]=useState(false); const { t } = useTranslation();
 const submit=async e=>{e.preventDefault();setLoading(true);try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setSent(true);toast.success('Lien de réinitialisation envoyé');}catch(err){toast.error(err.message)}finally{setLoading(false)}};
 return <div className="min-h-screen bg-[#FFF1F1] p-5 dark:bg-[#17002d] sm:p-10"><div className="mx-auto max-w-md"><Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft size={16}/> {t("auth.back")}</Link><div className="card mt-6 p-7"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30"><Mail/></div><h1 className="mt-5 text-center text-2xl font-black">{t("auth.forgotTitle")}</h1><p className="mt-2 text-center text-sm muted">{t("auth.forgotSubtitle")}</p>{!sent?<form onSubmit={submit} className="mt-6"><input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="exemple@email.com"/><button disabled={loading} className="btn-primary mt-4 w-full">{loading?t("general.sendLoading"):t("general.sendLink")}</button></form>:<div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Si ce compte existe, un lien de réinitialisation a été envoyé à cette adresse.</div>}</div></div></div>
}
