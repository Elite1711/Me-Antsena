export default function StarRating({ value = 0, showValue = false, interactive = false, onChange }) {
  if (interactive) {
    return (
      <span className="inline-flex items-center gap-1" role="radiogroup" aria-label="Choisir une note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onClick={() => onChange?.(n)}
            className="p-0.5 text-2xl leading-none text-amber-400 transition-transform hover:scale-110"
          >
            {n <= value ? "★" : "☆"}
          </button>
        ))}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Note ${value} sur 5`}>
      <span className="tracking-tight text-amber-400">{"★".repeat(Math.round(value))}{"☆".repeat(5-Math.round(value))}</span>
      {showValue && <span className="text-xs font-semibold text-slate-500">{value.toFixed(1)}</span>}
    </span>
  );
}
