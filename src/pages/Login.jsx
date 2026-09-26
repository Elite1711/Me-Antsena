import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { useTranslation } from "../hooks/useTranslation";

export default function Login(){
 const {login,loading,isAuthenticated,isAdmin}=useAuth(); const nav=useNavigate(); const loc=useLocation(); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [show,setShow]=useState(false); const { t } = useTranslation();
 if (isAuthenticated) return <Navigate to={isAdmin ? "/admin" : "/"} replace/>;
 const submit=async e=>{e.preventDefault();try{const loggedUser = await login({email,password});toast.success(loggedUser?.role === "admin" ? t("auth.adminWelcome") : "Bienvenue sur Me-Antsena");nav(loggedUser?.role === "admin" ? "/admin" : (loc.state?.from||"/"), { replace: true });}catch(err){toast.error(err.message)}};
 return <AuthShell title={t("auth.welcome")} subtitle={t("auth.connectAccount")}><form onSubmit={submit} className="space-y-4">
 <Field icon={Mail} label={t("auth.email")} value={email} onChange={setEmail} type="email" placeholder="exemple@email.com"/>
 <div><label className="mb-2 block text-xs font-bold">{t("auth.password")}</label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="input pl-11 pr-12" type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={()=>setShow(v=>!v)} aria-label={t("auth.showPassword")}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
 <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2"><input type="checkbox"/> {t("auth.remember")}</label><Link to="/forgot-password" className="font-bold text-brand-600">{t("auth.forgotPassword")}</Link></div>
 <button disabled={loading} className="btn-primary w-full">{loading?t("auth.loginLoading"):t("auth.login")}</button>

 <div className="border-t border-slate-100 pt-4 text-center text-sm dark:border-white/10">{t("auth.noAccount")} <Link className="font-bold text-brand-600" to="/register">{t("auth.signUp")}</Link></div>
 </form></AuthShell>
}
function Field({icon:Icon,label,value,onChange,...props}){return <div><label className="mb-2 block text-xs font-bold">{label}</label><div className="relative"><Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input {...props} className="input pl-11" value={value} onChange={e=>onChange(e.target.value)}/></div></div>}
function AuthShell({title,subtitle,children}){return <div className="grid min-h-screen lg:grid-cols-2"><div className="hidden items-center justify-center bg-brand-800 p-10 lg:flex"><div className="max-w-md text-white"><img src="/logo-dark.png" alt="Me-Antsena" className="h-12 w-auto object-contain"/><img src="/mascot-hero.png" alt="" aria-hidden="true" className="mt-10 h-40 w-auto drop-shadow-2xl"/><h1 className="mt-6 text-5xl font-black">Achetez mieux,<br/>vivez mieux.</h1><p className="mt-4 text-white/75">Une expérience e-commerce pensée pour Madagascar avec des recommandations intelligentes.</p></div></div><div className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><Link to="/" className="mb-10 inline-block lg:hidden"><Logo as="div"/></Link><div className="mb-7"><p className="eyebrow">Me-Antsena</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 text-sm muted">{subtitle}</p></div>{children}</div></div></div>}
