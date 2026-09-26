import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { passwordScore, validateRegister } from "../utils/validation";
import Logo from "../components/Logo";
import { useTranslation } from "../hooks/useTranslation";

export default function Register(){
 const {register,loading,isAuthenticated,isAdmin}=useAuth(); const nav=useNavigate(); const [data,setData]=useState({firstName:"",lastName:"",email:"",phone:"",password:"",confirmPassword:"",accepted:false}); const [errors,setErrors]=useState({}); const [show,setShow]=useState(false); const { t } = useTranslation();
 if (isAuthenticated) return <Navigate to={isAdmin ? "/admin" : "/"} replace/>;
 const update=(k,v)=>setData(d=>({...d,[k]:v}));
 const submit=async e=>{e.preventDefault();const er=validateRegister(data);setErrors(er);if(Object.keys(er).length)return;try{await register(data);toast.success("Compte créé avec succès");nav("/");}catch(err){toast.error(err.message)}};
 return <div className="min-h-screen bg-[#FBF6EF] p-5 dark:bg-[#17110A] sm:p-10"><div className="mx-auto max-w-2xl"><Link to="/" className="inline-block"><Logo as="div"/></Link><div className="card mt-8 p-6 sm:p-9"><p className="eyebrow">{t("auth.createAccount")}</p><h1 className="mt-2 text-3xl font-black">{t("auth.join")}</h1><p className="mt-2 text-sm muted">Commencez à recevoir des recommandations adaptées à vos besoins.</p><form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
 <Field label={t("auth.firstName")} value={data.firstName} onChange={v=>update("firstName",v)} error={errors.firstName}/><Field label={t("auth.lastName")} value={data.lastName} onChange={v=>update("lastName",v)} error={errors.lastName}/><Field label={t("auth.email")} type="email" value={data.email} onChange={v=>update("email",v)} error={errors.email}/><Field label={t("auth.phone")} value={data.phone} onChange={v=>update("phone",v)} error={errors.phone}/>
 <div className="sm:col-span-2"><label className="mb-2 block text-xs font-bold">{t("auth.password")}</label><div className="relative"><input className="input pr-12" type={show?"text":"password"} value={data.password} onChange={e=>update("password",e.target.value)} placeholder={t("auth.minPassword")}/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={()=>setShow(v=>!v)} aria-label={t("auth.showPassword")}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div><div className="mt-2 flex gap-1">{[1,2,3,4].map(i=><span key={i} className={`h-1.5 flex-1 rounded-full ${passwordScore(data.password)>=i?"bg-brand-500":"bg-slate-200 dark:bg-white/10"}`}/>)}</div>{errors.password&&<p className="mt-1 text-xs text-red-500">{errors.password}</p>}</div>
 <Field label={t("auth.confirmPassword")} type="password" value={data.confirmPassword} onChange={v=>update("confirmPassword",v)} error={errors.confirmPassword}/>
 <div className="flex items-start gap-2 sm:col-span-2"><input type="checkbox" checked={data.accepted} onChange={e=>update("accepted",e.target.checked)} className="mt-1"/><span className="text-xs text-slate-500">{t("auth.acceptTerms")}</span></div>{errors.accepted&&<p className="-mt-3 text-xs text-red-500">{errors.accepted}</p>}
 <button disabled={loading} className="btn-primary sm:col-span-2">{loading?t("auth.createLoading"):t("auth.signUp")}</button>
 </form><p className="mt-5 text-center text-sm muted">{t("auth.alreadyAccount")} <Link to="/login" className="font-bold text-brand-600">{t("auth.login")}</Link></p></div></div></div>
}
function Field({label,value,onChange,error,type="text"}){return <div><label className="mb-2 block text-xs font-bold">{label}</label><input type={type} className="input" value={value} onChange={e=>onChange(e.target.value)}/>{error&&<p className="mt-1 text-xs text-red-500">{error}</p>}</div>}
