"""Script pour synchroniser les données depuis Supabase, entraîner les modèles de recommandation
et sauvegarder les artefacts.

Usage:
  export SUPABASE_URL=https://<project>.supabase.co
  export SUPABASE_KEY=<service_role_or_anon_key>
  python sync_train.py

Le script est résilient : il gère les erreurs réseau et affiche des messages détaillés pour
faciliter le debugging.
"""

import os
import sys
import pickle
from typing import List, Tuple

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from supabase import create_client
except Exception as e:
    print("Erreur d'importation: supabase non installé. Installer 'supabase' (supabase-py).", file=sys.stderr)
    raise

try:
    import numpy as np
except Exception as e:
    print("Erreur d'importation: numpy non installé.", file=sys.stderr)
    raise

# Importer les modèles locaux
from ml.models.collaborative_filtering import CollaborativeFilteringModel
from ml.models.content_based import ContentBasedModel


def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "Variables d'environnement SUPABASE_URL et SUPABASE_KEY requises."
        )
    return create_client(url, key)


def fetch_products(supabase_client):
    # Récupère les champs réellement présents dans la base et complète avec le nom de catégorie
    resp = supabase_client.table("products").select(
        "id, name, description, category_id, tags, category:categories(id,name)"
    ).execute()
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase fetching products: {getattr(error, 'message', error)}")
    products = getattr(resp, "data", None) or []
    for product in products:
        if isinstance(product.get("category"), dict):
            product["category_name"] = product["category"].get("name")
        else:
            product["category_name"] = None
        product["category_raw"] = product.get("category_name") or ""
        product["brand"] = ""
    return products


def fetch_interactions(supabase_client):
    # interactions: user_id, product_id, type
    resp = supabase_client.table("interactions").select("user_id, product_id, type").execute()
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase fetching interactions: {getattr(error, 'message', error)}")
    return getattr(resp, "data", None) or []


def build_interaction_matrix(interactions: List[dict]):
    # Map user and product ids.
    # Users may be UUID strings in Supabase, so convert them to stable string keys.
    user_ids = sorted({str(i["user_id"]) for i in interactions if i.get("user_id") is not None})
    item_ids = sorted({int(i["product_id"]) for i in interactions if i.get("product_id") is not None})

    user_index = {u: idx for idx, u in enumerate(user_ids)}
    item_index = {p: idx for idx, p in enumerate(item_ids)}

    if not user_ids or not item_ids:
        return np.zeros((0, 0)), user_ids, item_ids

    mat = np.zeros((len(user_ids), len(item_ids)), dtype=float)

    # Assign weights based on interaction type
    weight_map = {"view": 1.0, "favorite": 2.0, "add_to_cart": 2.5, "purchase": 5.0}

    for it in interactions:
        try:
            u = str(it.get("user_id"))
            p = int(it.get("product_id"))
        except Exception:
            continue
        if u not in user_index or p not in item_index:
            continue
        t = (it.get("type") or "view").lower()
        w = weight_map.get(t, 1.0)
        mat[user_index[u], item_index[p]] += w

    return mat, user_ids, item_ids


def save_model(obj, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump(obj, f)


def main():
    print("Démarrage du script de synchronisation et d'entraînement...")
    try:
        supabase = get_supabase_client()
    except Exception as e:
        print(f"Erreur de configuration Supabase: {e}", file=sys.stderr)
        return

    try:
        products = fetch_products(supabase)
        print(f"Produits récupérés: {len(products)}")
    except Exception as e:
        print(f"Erreur lors de la récupération des produits: {e}", file=sys.stderr)
        return

    try:
        interactions = fetch_interactions(supabase)
        print(f"Interactions récupérées: {len(interactions)}")
    except Exception as e:
        print(f"Erreur lors de la récupération des interactions: {e}", file=sys.stderr)
        return

    cb = None
    cf = None
    user_ids = []

    # Entraîner le modèle content-based
    try:
        cb = ContentBasedModel()
        if products:
            cb.fit(products)
            save_model(cb, os.path.join(os.path.dirname(__file__), "artifacts", "content_based.pkl"))
            print("Modèle content-based entraîné et sauvegardé.")
        else:
            print("Aucun produit pour entraîner le modèle content-based.")
    except Exception as e:
        print(f"Erreur content-based: {e}", file=sys.stderr)

    # Entraîner collaborative filtering
    try:
        mat, user_ids, item_ids = build_interaction_matrix(interactions)
        cf = CollaborativeFilteringModel()
        if mat.size != 0:
            cf.fit(mat, user_ids, item_ids, epochs=10)
            save_model(cf, os.path.join(os.path.dirname(__file__), "artifacts", "collaborative.pkl"))
            print("Modèle collaborative entraîné et sauvegardé.")
        else:
            print("Matrice d'interaction vide : aucun entraînement collaborative possible.")
    except Exception as e:
        print(f"Erreur collaborative: {e}", file=sys.stderr)

    # Test rapide: générer quelques recommandations pour le premier user trouvé
    try:
        if user_ids and cf is not None and cf.user_embeddings is not None:
            user = user_ids[0]
            recs = cf.predict(user, top_k=5)
            print(f"Exemple de recommandations CF pour l'utilisateur {user}: {recs}")
        if products and cb is not None and cb.product_features is not None:
            pid = int(products[0]["id"])
            sim = cb.get_similar_products(pid, top_k=5)
            print(f"Produits similaires au produit {pid}: {sim}")
    except Exception as e:
        print(f"Erreur lors du test des prédictions: {e}", file=sys.stderr)

    # Écrire des recommandations globales dans Supabase pour consommation par le frontend
    try:
        # compute simple popularity score from interactions
        popularity = {}
        for it in interactions:
            pid = it.get('product_id')
            if pid is None:
                continue
            popularity[pid] = popularity.get(pid, 0) + 1

        # content scores: average similarity to all products
        content_scores = {}
        if cb.product_features is not None and cb.product_features.shape[0] > 0:
            from sklearn.metrics.pairwise import cosine_similarity
            sims = cosine_similarity(cb.product_features, cb.product_features).mean(axis=0)
            for idx, pid in enumerate(cb.product_ids):
                content_scores[pid] = float(sims[idx])

        # build hybrid: normalize and combine
        max_pop = max(popularity.values()) if popularity else 1.0
        max_content = max(content_scores.values()) if content_scores else 1.0

        hybrid_scores = {}
        all_pids = set(list(popularity.keys()) + list(content_scores.keys()))
        for pid in all_pids:
            p_score = popularity.get(pid, 0) / max_pop
            c_score = content_scores.get(pid, 0) / max_content
            hybrid_scores[pid] = 0.55 * p_score + 0.45 * c_score

        # prepare rows for upsert: keep top N per type
        TOP_N = 20
        def top_items(scores_dict, n=TOP_N):
            return sorted(scores_dict.items(), key=lambda x: x[1], reverse=True)[:n]

        rows = []
        for pid, score in top_items(popularity):
            rows.append({ 'type':'collaborative', 'product_id': int(pid), 'score': float(score) })
        for pid, score in top_items(content_scores):
            rows.append({ 'type':'content', 'product_id': int(pid), 'score': float(score) })
        for pid, score in top_items(hybrid_scores):
            rows.append({ 'type':'hybrid', 'product_id': int(pid), 'score': float(score) })

        if rows:
            # attempt to upsert into recommendations table
            try:
                resp = supabase.table('recommendations').upsert(rows, on_conflict='type,product_id').execute()
                if getattr(resp, 'error', None):
                    print('Warning: failed to write recommendations table:', resp.error)
                else:
                    print(f'Wrote {len(rows)} recommendation rows to Supabase (table: recommendations).')
            except Exception as e:
                print('Erreur écriture recommendations:', e)
        else:
            print('Aucune ligne de recommandation à écrire.')
    except Exception as e:
        print('Erreur lors de la génération/écriture des recommendations:', e)

    print('Terminé.')


if __name__ == "__main__":
    main()
