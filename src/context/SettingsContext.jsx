import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readStorage, writeStorage } from "../utils/storage";
const SettingsContext = createContext(null);
const KEY = "me_antsena_settings";
const defaults = { notifications:true, marketing:true, language:"Français", currency:"MGA", compact:false };
const languageMap = { "Français": "fr", Malagasy: "mg", English: "en" };

export function SettingsProvider({children}) {
  const [settings,setSettings] = useState(()=>{ const saved=readStorage(KEY,{}); return {...defaults,...(saved&&typeof saved==="object"?saved:{})}; });

  useEffect(()=>{
    const lang = languageMap[settings.language] || "fr";
    document.documentElement.lang = lang;
    document.documentElement.setAttribute("data-locale", lang);
    document.body.classList.toggle("app-compact", Boolean(settings.compact));
  }, [settings.language, settings.compact]);

  const update = (key,value) => setSettings(s=>{const next={...s,[key]:value};writeStorage(KEY,next);return next});
  const reset = ()=>{const fresh={...defaults}; writeStorage(KEY,fresh); setSettings(fresh);};

  const clearLocalData = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("me_antsena_") || key.startsWith("me-antsena-"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    const fresh = { ...defaults };
    writeStorage(KEY, fresh);
    setSettings(fresh);
  };

  const value=useMemo(()=>({settings,update,reset,clearLocalData}),[settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export const useSettings=()=>useContext(SettingsContext);
