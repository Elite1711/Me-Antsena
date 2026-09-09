# Me-Antsena — Moteur de recommandation ML

Ce dossier contient le moteur de recommandation conforme au cahier des charges :
- filtrage collaboratif
- filtrage basé sur le contenu
- approche hybride
- gestion du cold-start
- API FastAPI pour exposition des recommandations

## Installation

```bash
cd /home/elite/meantsena
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r ML/requirements.txt
```

## Variables d'environnement

Créer un fichier `.env.local` à la racine du projet si nécessaire :

```env
SUPABASE_URL=https://<votre-projet>.supabase.co
SUPABASE_ANON_KEY=<cle-anon>
# ou, si vous utilisez la configuration frontend existante :
VITE_SUPABASE_URL=https://<votre-projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<cle-anon>
```

## Lancer le service

```bash
cd /home/elite/meantsena
. .venv/bin/activate
uvicorn ML.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /health` : vérifie que le service répond
- `GET /recommendations/{user_id}?limit=6` : recommandations complètes
- `GET /recommendations?user_id=...&limit=6` : variante query-string
- `GET /demo` : résultats de démonstration sans dépendance base de données
- `GET /eval?limit=5` : exécute une évaluation offline (leave-one-out) et renvoie Precision@K / Recall@K / MAP@K / NDCG@K pour k in [1,3,5,limit]

## Conteneurisation

Un Dockerfile est fourni pour exécuter le service localement dans un conteneur :

```bash
cd /home/elite/meantsena
docker build -t me-antsena-ml -f ML/Dockerfile .
docker run -p 8000:8000 --env-file .env.local me-antsena-ml
```

Note : fournissez vos variables Supabase dans `.env.local` si vous souhaitez que le service interroge la base Supabase réelle ; sinon le service utilisera le jeu de données de démonstration fourni.

## Exemple de réponse

```json
{
  "user_id": "u-1",
  "cold_start": false,
  "generated_at": "2026-09-10T00:00:00Z",
  "collaborative": [
    {"id": 3, "name": "Montre connectée Fit 3", "reason": "Les utilisateurs similaires ont aimé la sélection 3"}
  ],
  "content": [
    {"id": 2, "name": "Sac à dos tendance", "reason": "Recommandé car vous avez consulté 1"}
  ],
  "hybrid": [
    {"id": 3, "name": "Montre connectée Fit 3", "reason": "Score hybride optimisé entre contenu et similarité"}
  ]
}
```

## Métriques / validation

Le système est conçu pour évaluer automatiquement :
- précision / rappel / F1 pour les recommandations top-k
- similarité produit par contenu
- score hybride α × collaboratif + (1-α) × contenu
- cold-start fallback vers tendances / popularité
