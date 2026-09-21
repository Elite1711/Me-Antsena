import { PackageOpen } from "lucide-react";
export default function EmptyState({ title="Aucun résultat", text="Essayez une autre recherche." }) {
  return <div className="card grid min-h-64 place-items-center p-8 text-center"><div><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30"><PackageOpen/></div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-sm muted">{text}</p></div></div>;
}
