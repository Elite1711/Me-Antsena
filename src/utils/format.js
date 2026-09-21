export const formatPrice = (value) => new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " Ar";
export const formatDate = (date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(date));
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
