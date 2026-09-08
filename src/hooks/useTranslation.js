import { useSettings } from "../context/SettingsContext";
import { translations } from "../i18n";

export function useTranslation() {
  const { settings } = useSettings() || { settings: { language: "Français" } };

  const t = (key, fallback = key) => {
    const path = key.split(".");
    let current = translations;
    for (const segment of path) {
      if (!current || typeof current !== "object") return fallback;
      current = current[segment];
    }
    if (!current || typeof current !== "object") return fallback;
    return current[settings?.language] || current["Français"] || fallback;
  };

  return { t, locale: settings?.language || "Français" };
}
