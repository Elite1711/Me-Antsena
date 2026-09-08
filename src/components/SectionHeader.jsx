import { Link } from "react-router-dom";
export default function SectionHeader({ title, subtitle, to }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="section-title">{title}</h2>{subtitle && <p className="mt-1 text-sm muted">{subtitle}</p>}</div>{to && <Link to={to} className="text-sm font-bold text-brand-600 hover:underline">Voir tout</Link>}</div>;
}
