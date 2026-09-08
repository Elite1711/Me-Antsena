import { Link } from "react-router-dom";

export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Me-Antsena accueil">
      <img src="/logo.png" alt="Me-Antsena" className={compact ? "h-10 w-auto object-contain" : "h-12 w-auto object-contain"} />
      {!compact && <span className="sr-only">Me-Antsena</span>}
    </Link>
  );
}
