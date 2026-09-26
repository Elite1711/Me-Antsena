"""Recolore le logo Me-Antsena aux teintes café :
- icône (sac + fourmi) : dégradé orange/rose/violet -> dégradé café (caramel clair -> torréfié foncé)
- texte (wordmark + tagline) : navy fixe -> variante sombre pour fond clair, variante crème pour fond sombre

Produit deux fichiers finaux : logo-light.png (pour mode clair) et logo-dark.png (pour mode sombre).
"""

import numpy as np
from PIL import Image
import matplotlib.colors as mcolors

SRC = "public/logo.png"
ICON_BOX = (0, 0, 640, 1024)     # icône (sac + fourmi)
TEXT_BOX = (640, 0, 1536, 1024)  # wordmark + tagline

TEXT_LIGHT = (0x2A, 0x1B, 0x12)   # café foncé, pour fond clair (café au lait)
TEXT_DARK = (0xF0, 0xE4, 0xD4)    # crème, pour fond sombre (café noir)


def recolor_icon(icon_rgba: np.ndarray, brighten_shadows: bool = False) -> np.ndarray:
    """Remappe la teinte orange->rose->violet du sac/fourmi vers une gamme café,
    en conservant la Value (donc le modelé/ombres/reflets d'origine)."""
    rgb = icon_rgba[:, :, :3].astype(np.float64) / 255.0
    alpha = icon_rgba[:, :, 3]

    hsv = mcolors.rgb_to_hsv(rgb)
    H = hsv[:, :, 0] * 360
    S = hsv[:, :, 1]
    V = hsv[:, :, 2]

    H_new = H.copy()
    # orange/rouge (haut du sac) -> caramel
    mask1 = (H >= 345) | (H <= 50)
    H_new[mask1] = 26
    # rose/magenta (milieu du sac) -> ambre profond
    mask2 = (H > 300) & (H < 345)
    H_new[mask2] = 20
    # violet (bas du sac + corps de la fourmi) -> café torréfié, dégradé conservé
    mask3 = (H >= 220) & (H <= 300)
    H_new[mask3] = 15 + (H[mask3] - 220) / (300 - 220) * 15

    S_new = np.clip(S * 0.55, 0, 1)  # moins saturé, plus "matière" que "néon"
    V_new = V
    if brighten_shadows:
        # évite que les zones sombres de l'icône se fondent dans un fond quasi noir
        V_new = np.clip(V * 0.72 + 0.28, 0, 1)

    hsv_new = np.stack([H_new / 360, S_new, V_new], axis=-1)
    rgb_new = mcolors.hsv_to_rgb(hsv_new)
    out = np.concatenate([rgb_new * 255, alpha[:, :, None]], axis=-1)
    return out.astype(np.uint8)


def recolor_text(text_rgba: np.ndarray, target_rgb: tuple) -> np.ndarray:
    """Remplace la couleur du texte par une teinte plate, en gardant l'alpha
    d'origine (donc l'anti-aliasing des lettres reste intact)."""
    out = text_rgba.copy()
    alpha = out[:, :, 3]
    mask = alpha > 0
    out[mask, 0] = target_rgb[0]
    out[mask, 1] = target_rgb[1]
    out[mask, 2] = target_rgb[2]
    return out


def build_variant(icon_coffee: np.ndarray, text_rgba: np.ndarray, canvas_size) -> Image.Image:
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.paste(Image.fromarray(icon_coffee, "RGBA"), (ICON_BOX[0], ICON_BOX[1]), Image.fromarray(icon_coffee, "RGBA"))
    canvas.paste(Image.fromarray(text_rgba, "RGBA"), (TEXT_BOX[0], TEXT_BOX[1]), Image.fromarray(text_rgba, "RGBA"))
    return canvas


def main():
    src = Image.open(SRC).convert("RGBA")
    full_size = src.size

    icon = np.array(src.crop(ICON_BOX))
    text = np.array(src.crop(TEXT_BOX))

    icon_for_light = recolor_icon(icon, brighten_shadows=False)
    icon_for_dark = recolor_icon(icon, brighten_shadows=True)

    text_for_light = recolor_text(text, TEXT_LIGHT)
    text_for_dark = recolor_text(text, TEXT_DARK)

    logo_light = build_variant(icon_for_light, text_for_light, full_size)
    logo_dark = build_variant(icon_for_dark, text_for_dark, full_size)

    logo_light.save("public/logo-light.png")
    logo_dark.save("public/logo-dark.png")
    print("OK — public/logo-light.png et public/logo-dark.png générés")


if __name__ == "__main__":
    main()
