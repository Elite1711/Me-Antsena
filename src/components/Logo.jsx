import { Link } from "react-router-dom";

export default function Logo({ compact = false, as = "link" }) {
  const cls = compact ? "h-10 w-auto object-contain" : "h-12 w-auto object-contain";
  const image = (
    <>
      <img src="/logo-light.png" alt="Me-Antsena" className={`${cls} dark:hidden`} />
      <img src="/logo-dark.png" alt="Me-Antsena" className={`${cls} hidden dark:block`} />
      {!compact && <span className="sr-only">Me-Antsena</span>}
    </>
  );

  if (as === "div") {
    return <div className="flex items-center gap-2" aria-label="Me-Antsena accueil">{image}</div>;
  }

  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Me-Antsena accueil">
      {image}
    </Link>
  );
}
