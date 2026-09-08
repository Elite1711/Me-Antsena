import { createContext, useContext, useMemo, useState } from "react";
import { readStorage, writeStorage } from "../utils/storage";
const SettingsContext = createContext(null);
const KEY = "me_antsena_settings";
const defaults = { notifications:true, marketing:true, language:"Français", currency:"MGA", compact:false };
export function SettingsProvider({children}) {
  const [settings,setSettings] = useState(()=>{ const saved=readStorage(KEY,{}); return {...defaults,...(saved&&typeof saved==="object"?saved:{})}; });
  const update = (key,value) => setSettings(s=>{const next={...s,[key]:value};writeStorage(KEY,next);return next});
  const reset = ()=>{writeStorage(KEY,defaults);setSettings(defaults)};
  const value=useMemo(()=>({settings,update,reset}),[settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export const useSettings=()=>useContext(SettingsContext);
