"""Génère des comptes de test et des interactions réalistes dans Supabase, pour que
/train et /evaluate du ml-service aient assez de données pour être significatifs.

Usage :
    pip install requests
    python seed_test_data.py --url https://bsdxggpmpeetkpkmjyhv.supabase.co --anon-key sb_publishable_lCBHy6w4nSdBRj-gMO7LMQ_w7jtYZLA --users 8

Ce que fait le script, pour chaque utilisateur créé :
  1. Crée un compte (auth Supabase, email/mot de passe).
  2. Se connecte avec ce compte pour obtenir un jeton d'accès (access_token).
  3. Assigne l'utilisateur à un "groupe de goûts" parmi K groupes (pour que des
     utilisateurs différents partagent des préférences communes — c'est ce qui
     donne un vrai signal au filtrage collaboratif, contrairement à des
     préférences 100% aléatoires).
  4. Insère une dizaine d'interactions cohérentes avec ce groupe : plusieurs vues,
     quelques ajouts au panier, un ou deux favoris, et parfois un achat — dans les
     mêmes proportions que ce que produit réellement le frontend corrigé.

Le script utilise l'API REST de Supabase directement (comme les commandes curl
vues précédemment), pas la clé service_role : chaque interaction est bien créée
"en tant que" l'utilisateur concerné, exactement comme le ferait le vrai site.
"""

import argparse
import random
import sys
import time

import requests

# Poids réalistes : une vue est fréquente, un achat est rare (même distribution
# que ce qu'on observerait sur un vrai site e-commerce).
INTERACTION_PLAN = [
    ("view", 5),
    ("add_to_cart", 2),
    ("favorite", 2),
    ("purchase", 1),
]


def expand_plan():
    """Transforme le plan pondéré en liste plate à piocher aléatoirement."""
    flat = []
    for interaction_type, weight in INTERACTION_PLAN:
        flat.extend([interaction_type] * weight)
    return flat


def fetch_products(base_url: str, anon_key: str) -> list[int]:
    resp = requests.get(
        f"{base_url}/rest/v1/products",
        headers={"apikey": anon_key},
        params={"select": "id", "limit": "200"},
        timeout=15,
    )
    resp.raise_for_status()
    products = [row["id"] for row in resp.json()]
    if not products:
        raise RuntimeError(
            "Aucun produit trouvé dans la table `products`. Ajoute au moins quelques "
            "produits (via l'espace admin du site) avant de lancer ce script."
        )
    return products


def signup_and_login(base_url: str, anon_key: str, email: str, password: str) -> str | None:
    """Crée le compte puis récupère un access_token. Renvoie None si la
    confirmation par e-mail est activée (le script ne peut pas la contourner)."""
    signup_resp = requests.post(
        f"{base_url}/auth/v1/signup",
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=15,
    )
    if signup_resp.status_code not in (200, 201):
        print(f"  ! Échec de l'inscription pour {email}: {signup_resp.status_code} {signup_resp.text[:200]}")
        return None, None

    body = signup_resp.json()
    if body.get("access_token"):
        return body["user"]["id"], body["access_token"]

    # Confirmation e-mail activée : le token n'est pas renvoyé immédiatement.
    # On tente quand même une connexion classique (fonctionne si tu as
    # désactivé "Confirm email" dans Supabase, comme suggéré pour les tests).
    login_resp = requests.post(
        f"{base_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=15,
    )
    if login_resp.status_code == 200:
        login_body = login_resp.json()
        return login_body["user"]["id"], login_body["access_token"]

    print(
        f"  ! Compte {email} créé mais pas encore confirmé (email de confirmation requis). "
        "Désactive 'Confirm email' dans Supabase (Authentication > Providers > Email) "
        "pour que ce script fonctionne, ou confirme le compte manuellement puis relance."
    )
    return body.get("user", {}).get("id"), None


def log_interaction(base_url: str, anon_key: str, access_token: str, user_id: str, product_id: int, itype: str):
    value = random.randint(1, 3) if itype == "purchase" else None
    payload = {"user_id": user_id, "product_id": product_id, "type": itype}
    if value is not None:
        payload["value"] = value

    resp = requests.post(
        f"{base_url}/rest/v1/interactions",
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=payload,
        timeout=15,
    )
    if resp.status_code not in (200, 201, 204):
        print(f"    ! Interaction refusée ({itype} sur produit {product_id}): {resp.status_code} {resp.text[:150]}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", required=True, help="URL du projet Supabase (VITE_SUPABASE_URL)")
    parser.add_argument("--anon-key", required=True, help="Clé anon/public Supabase (VITE_SUPABASE_ANON_KEY)")
    parser.add_argument("--users", type=int, default=8, help="Nombre de comptes de test à créer (défaut: 8)")
    parser.add_argument("--groups", type=int, default=3, help="Nombre de groupes de goûts distincts (défaut: 3)")
    parser.add_argument("--password", default="TestPass123!", help="Mot de passe commun aux comptes de test")
    parser.add_argument("--email-prefix", default="ml-test-user", help="Préfixe des e-mails générés")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")

    print("Récupération du catalogue produits…")
    products = fetch_products(base_url, args.anon_key)
    print(f"  {len(products)} produits trouvés.\n")

    # Répartit les produits en groupes de goûts qui se chevauchent légèrement,
    # pour que le filtrage collaboratif ait un vrai signal à apprendre.
    random.shuffle(products)
    group_size = max(3, len(products) // args.groups)
    taste_groups = [products[i:i + group_size] for i in range(0, len(products), group_size)][: args.groups]
    if len(taste_groups) < args.groups:
        taste_groups = [products] * args.groups  # fallback si trop peu de produits

    plan = expand_plan()
    created = 0

    for i in range(1, args.users + 1):
        email = f"{args.email_prefix}{i}@example.com"
        print(f"[{i}/{args.users}] Création de {email}…")
        user_id, access_token = signup_and_login(base_url, args.anon_key, email, args.password)

        if not access_token:
            continue  # déjà expliqué dans signup_and_login()

        group = taste_groups[i % len(taste_groups)]
        n_interactions = random.randint(6, 11)
        chosen_products = random.choices(group, k=n_interactions)

        for product_id in chosen_products:
            itype = random.choice(plan)
            log_interaction(base_url, args.anon_key, access_token, user_id, product_id, itype)
            time.sleep(0.05)  # évite de bombarder l'API Supabase trop vite

        print(f"    -> {n_interactions} interactions créées (groupe de goûts #{i % len(taste_groups)})")
        created += 1

    print(f"\n{created}/{args.users} comptes de test créés avec des interactions.")
    print("\nProchaine étape : entraîne et évalue le modèle avec ces nouvelles données :")
    print("  curl -X POST http://localhost:8000/train")
    print("  curl \"http://localhost:8000/evaluate?k=10\"")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as exc:
        print(f"Erreur réseau: {exc}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as exc:
        print(f"Erreur: {exc}", file=sys.stderr)
        sys.exit(1)
