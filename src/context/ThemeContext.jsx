import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readStorage, writeStorage } from "../utils/storage";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStorage("me_antsena_theme", "light"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    writeStorage("me_antsena_theme", theme);
  }, [theme]);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme: () => setTheme(t => t === "dark" ? "light" : "dark") }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
