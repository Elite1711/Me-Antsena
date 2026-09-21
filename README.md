# Me-Antsena — Supabase

Frontend React/Vite connecté directement à Supabase : authentification réelle, PostgreSQL, RLS, favoris, avis, commandes transactionnelles, stockage d'images et espace administrateur.

## Démarrage

```bash
npm install
cp .env.example .env.local
npm run dev
```

Renseignez dans `.env.local` :

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY

# Optionnel : URL du microservice de recommandation (voir ml-service/). Si absente,
# le frontend retombe automatiquement sur la table `recommendations` / un tri par note.
VITE_ML_SERVICE_URL=http://localhost:8000
```

Puis exécutez `supabase/schema.sql` dans Supabase SQL Editor.

### Administrateur

Créez d'abord un compte sur `/register`, puis exécutez :

```sql
update public.profiles set role = 'admin' where email = 'elitelalaina@gmail.com';
```

### Machine learning

Le moteur de recommandation hybride (filtrage collaboratif + basé contenu) vit dans
`ml-service/` : un microservice **Python/FastAPI**, séparé du frontend, conforme à
l'architecture 3 couches du cahier des charges.

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # renseignez SUPABASE_URL et SUPABASE_KEY (service_role)
uvicorn main:app --reload --port 8000
curl -X POST http://localhost:8000/train
```

Endpoints principaux : `GET /recommendations/{user_id}`, `GET /similar/{product_id}`,
`POST /train`, `GET /evaluate` (Precision@K, Recall@K, RMSE). Détails complets dans
`ml-service/README.md`, y compris le déploiement sur Render.

> L'ancien pipeline batch (`ml/run_sync_train.sh`) reste dans le dépôt à titre
> historique mais n'est plus utilisé : les recommandations sont désormais servies à
> la demande par `ml-service`, avec repli automatique côté frontend si le service
> est indisponible.

## Tests

### Frontend

```bash
npm install
npm run build   # vérifie que le build de production passe
npm run lint    # ESLint (config dans eslint.config.js)
```

### ml-service

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python tests/test_evaluation.py   # test de fumée sur données synthétiques, sans Supabase
```

Pour un test bout-en-bout avec de vraies données (entraînement, endpoints,
cold-start, repli si le service est coupé), voir la checklist dans
`ml-service/README.md`.

### Sécurité

- La clé `service_role` n'est jamais utilisée dans le navigateur — uniquement côté
  `ml-service`, via une variable d'environnement serveur (jamais commitée).
- RLS protège les données utilisateur.
- Le rôle admin est stocké dans `profiles`, pas dans le localStorage.
- La création de commande passe par une fonction PostgreSQL transactionnelle avec verrouillage du stock.
