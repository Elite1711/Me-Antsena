/**
 * Déclenche une animation "Fly to Cart" (effet de vol fluide vers l'icône du panier dans le Header)
 * @param {HTMLElement} startElement - L'élément source (bouton ou carte produit)
 * @param {string} [imageSrc] - L'URL de l'image du produit (optionnel)
 */
export function flyToCart(startElement, imageSrc) {
  if (typeof window === "undefined" || !startElement) return;

  const target = document.getElementById("header-cart-btn");
  if (!target) return;

  const startRect = startElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  // Création du projectile volant
  const flyer = document.createElement("div");
  const size = 44;

  const startX = startRect.left + startRect.width / 2 - size / 2;
  const startY = startRect.top + startRect.height / 2 - size / 2;
  const targetX = targetRect.left + targetRect.width / 2 - size / 2;
  const targetY = targetRect.top + targetRect.height / 2 - size / 2;

  flyer.style.position = "fixed";
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.width = `${size}px`;
  flyer.style.height = `${size}px`;
  flyer.style.borderRadius = "9999px";
  flyer.style.zIndex = "99999";
  flyer.style.pointerEvents = "none";
  flyer.style.overflow = "hidden";
  flyer.style.boxShadow = "0 8px 25px rgba(22, 140, 255, 0.6), 0 0 15px rgba(34, 184, 240, 0.8)";
  flyer.style.border = "2px solid #C5E4FF";
  flyer.style.background = "#087FF5";

  if (imageSrc) {
    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    flyer.appendChild(img);
  } else {
    flyer.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin: auto; display: block; margin-top: 10px;"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
  }

  document.body.appendChild(flyer);

  // Trajectoire en arc parabolique
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  const animation = flyer.animate(
    [
      {
        transform: "translate(0, 0) scale(1) rotate(0deg)",
        opacity: 1,
      },
      {
        transform: `translate(${deltaX * 0.45}px, ${deltaY * 0.45 - 80}px) scale(0.9) rotate(90deg)`,
        opacity: 0.95,
        offset: 0.5,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.25) rotate(180deg)`,
        opacity: 0.2,
      },
    ],
    {
      duration: 650,
      easing: "cubic-bezier(0.2, 0.8, 0.25, 1)",
      fill: "forwards",
    }
  );

  animation.onfinish = () => {
    flyer.remove();

    // Effet de secousse/rebond d'absorption sur l'icône du panier
    target.classList.remove("animate-cart-jiggle");
    // Force reflow
    void target.offsetWidth;
    target.classList.add("animate-cart-jiggle");
    setTimeout(() => {
      target.classList.remove("animate-cart-jiggle");
    }, 700);
  };
}
