import { useRef, useState } from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const processFile = (file) => {
    if (!file) return;
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result); if (inputRef.current) inputRef.current.value = ""; };
    reader.onerror = () => { setError("Impossible de lire cette image."); if (inputRef.current) inputRef.current.value = ""; };
    reader.readAsDataURL(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="sm:col-span-2">
      <span className="mb-2 block text-xs font-bold">Image du produit</span>
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <img src={value} alt="Aperçu du produit" className="h-48 w-full object-contain bg-white dark:bg-[#17110A]" />
          <div className="absolute right-3 top-3 flex gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-brand-700 shadow dark:bg-[#241A10] dark:text-brand-200">
              Remplacer
            </button>
            <button type="button" onClick={() => onChange("")} className="grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-red-500 shadow dark:bg-[#241A10]" aria-label="Supprimer l'image">
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition ${dragging ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-500/50"}`}
          aria-label="Importer une image de produit"
        >
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
            {dragging ? <UploadCloud size={23} /> : <ImagePlus size={23} />}
          </span>
          <span className="mt-3 text-sm font-bold">Cliquez pour importer une image</span>
          <span className="mt-1 text-xs muted">ou glissez-déposez ici · JPG, PNG, WebP · 5 Mo max.</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => processFile(event.target.files?.[0])} />
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
