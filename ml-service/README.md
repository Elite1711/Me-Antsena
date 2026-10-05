# Me-Antsena ML Service

Microservice **Python/FastAPI** exposant le moteur de recommandation hybride
(filtrage collaboratif + filtrage basé contenu) en API REST, conformément à
l'architecture 3 couches du cahier des charges.

Ce service remplace la lecture directe, côté frontend, de la table Supabase
`recommendations` pré-calculée par un script batch : les recommandations sont
désormais calculées à la demande (ou servies depuis les artefacts entraînés)
via une vraie API.

## Installation locale

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate   # ou .venv\Scripts\activate sous Windows
pip install -r requirements.txt
cp .env.example .env
# Renseignez SUPABASE_URL et SUPABASE_KEY (clé service_role) dans .env
```

## Entraîner les modèles

Au premier lancement, aucun artefact n'existe dans `artifacts/`. Démarrez le
service puis déclenchez un entraînement :

```bash
uvicorn main:app --reload --port 8000
curl -X POST http://localhost:8000/train
```

Cela récupère les produits et interactions depuis Supabase, entraîne le
modèle collaboratif (factorisation matricielle) et le modèle content-based
(TF-IDF), sauvegarde les artefacts (`artifacts/*.pkl`) et calcule le
classement de popularité utilisé en repli pour le démarrage à froid.

## Endpoints

| Méthode | Route                          | Description                                              |
|---------|---------------------------------|------------------------------------------------------------|
| GET     | `/health`                      | État du service et des modèles chargés                     |
| GET     | `/recommendations/{user_id}?top_k=10` | Recommandations hybrides pour un utilisateur (repli popularité si utilisateur inconnu) |
| GET     | `/similar/{product_id}?top_k=10`      | Produits similaires (content-based)                   |
| GET     | `/trending?top_k=5`             | Produits en stock classés par volume pondéré d'interactions observées au dernier entraînement |
| POST    | `/train`                       | Relance l'entraînement complet et recharge les modèles     |
| GET     | `/evaluate?k=10&test_ratio=0.2`| Split train/test, entraîne un modèle temporaire et calcule Precision@K, Recall@K, RMSE |

Le champ `source` de `/recommendations` indique quelle stratégie a répondu :
`"hybrid"` (utilisateur connu), `"content_cold_start"` (utilisateur inconnu du
modèle mais avec des interactions live récentes) ou `"popularity_fallback"`
(aucune interaction connue). Voir la section Cold-start plus bas.

La documentation interactive est disponible sur `http://localhost:8000/docs`
une fois le service lancé.

## Déploiement sur Render (conforme Section D du cahier des charges)

1. Créer un nouveau **Web Service** sur Render, connecté au dépôt GitHub, dossier racine `ml-service/`.
2. Build command : `pip install -r requirements.txt`
3. Start command : `uvicorn main:app --host 0.0.0.0 --port $PORT` (ou laisser Render lire le `Procfile`)
4. Variables d'environnement à renseigner dans Render : `SUPABASE_URL`, `SUPABASE_KEY` (service_role), `ALLOWED_ORIGINS`.
5. Une fois déployé, appeler `POST /train` une première fois (puis idéalement sur un cron, ex. quotidien) pour peupler `artifacts/`.

## Intégration frontend

Le frontend appelle le service lorsque `VITE_ML_SERVICE_URL` est configurée.
Il hydrate les identifiants recommandés avec le catalogue Supabase et conserve
un repli sur la table `recommendations`, puis sur les produits disponibles si
le service ne répond pas.

La section « Les plus populaires » de l'accueil utilise `/trending`, qui classe
les produits en stock d'après la somme pondérée des interactions du dernier
entraînement. Ce classement n'est donc pas temps réel : il est actualisé lors
de `POST /train`. Si le service ML ne répond pas ou ne renvoie aucun produit,
l'interface affiche une sélection de nouveautés et l'indique explicitement.

## Évaluation quantitative (Precision@K, Recall@K, RMSE)

```bash
curl "http://localhost:8000/evaluate?k=10&test_ratio=0.2"
```

Ce endpoint :
1. Récupère toutes les interactions depuis Supabase.
2. Sépare aléatoirement 80 % train / 20 % test (par interaction).
3. Entraîne un modèle collaboratif **temporaire** sur le train set (n'écrase pas `artifacts/collaborative.pkl` utilisé en production).
4. Calcule :
   - **Precision@K** / **Recall@K** : une interaction du test set compte comme "pertinente" si c'est un favori, un ajout au panier ou un achat (une simple vue est jugée trop faible signal). Seuls les utilisateurs déjà présents dans le train set sont évalués — un utilisateur inconnu relève du cold-start, traité comme une limite distincte au Chapitre 4, pas comme un échec du modèle.
   - **RMSE** : écart entre le score prédit (produit scalaire des embeddings) et le poids réel de l'interaction (vue=1, favori=2, panier=2.5, achat=5).
5. Archive chaque appel avec horodatage dans `artifacts/evaluation_history.json`, pour pouvoir citer l'évolution des métriques dans le mémoire sans relancer les calculs.

Pour suivre l'évolution chaque semaine, planifiez un appel à l'endpoint avec le
cron de votre hébergeur ou un ordonnanceur externe. Exemple de commande à
exécuter le lundi à 05:00 UTC :

```bash
curl --fail --silent --show-error \
  "https://<votre-service-ml>/evaluate?k=10&test_ratio=0.2"
```

Chaque appel produit une nouvelle entrée horodatée dans l'historique du service.
Après application de la migration Supabase, relancez aussi `POST /train` pour
reconstruire les artefacts avec les marques, les prix et les tags normalisés.

Un test de fumée sur données synthétiques (sans Supabase) permet de vérifier que le module fonctionne :

```bash
python tests/test_evaluation.py
```

## Limites actuelles / travaux restants

- Le split train/test est aléatoire par interaction, pas temporel : pour un
  protocole plus rigoureux (et plus réaliste), un split par date serait
  préférable si le volume de données le permet.

## Gestion du démarrage à froid (cold-start)

Gérée directement dans les modèles (pas seulement au niveau de l'API) :

- **Utilisateur cold-start** — `CollaborativeFilteringModel.predict()` détecte un
  utilisateur inconnu du train set et applique automatiquement un repli par
  popularité (calculée en interne, à partir de la même matrice d'entraînement —
  pas de fichier externe à maintenir). `GET /recommendations/{user_id}` va plus
  loin : si l'utilisateur a déjà quelques interactions live non encore prises en
  compte par le dernier `/train` (ex. vient de mettre 2 favoris), il tente
  d'abord une vraie recommandation **content-based** à partir de ces
  interactions (`source: "content_cold_start"`) avant de retomber sur la pure
  popularité (`source: "popularity_fallback"`) en dernier recours.
- **Produit cold-start** — `ContentBasedModel.add_product()` indexe un produit
  créé après le dernier entraînement à la volée, en réutilisant le vocabulaire
  TF-IDF déjà appris (`vectorizer.transform`, pas de ré-entraînement complet).
  `GET /similar/{product_id}` l'appelle automatiquement si le produit demandé
  est absent du modèle chargé.
- **Évaluation non biaisée** — `precision_recall_at_k()` appelle `predict(...,
  cold_start_fallback=False)` : les métriques du Chapitre 4 restent honnêtes
  sur ce que le modèle collaboratif sait vraiment prédire, sans être gonflées
  par le repli.
- Les recherches sont enregistrées à part et ne deviennent pas des pseudo-vues
  dans la matrice utilisateur-produit. Les clics sur recommandations enrichissent
  la matrice ; les achats restent le signal de conversion fort, avec leur source
  de recommandation quand elle est disponible.
- Pour les utilisateurs connus, la liste content-based est désormais amorcée
  avec leurs interactions produit récentes, et non avec les produits prévus par
  le collaboratif.
- Le TF-IDF exploite les marques, les tags normalisés et une tranche de prix
  relative au catalogue. La marque doit être renseignée dans l'administration
  pour contribuer au profil du produit.

Ce comportement est directement exploitable comme réponse à la limite "démarrage
à froid" identifiée au Chapitre 4 du mémoire — avec, en prime, un `source` explicite
dans chaque réponse pour illustrer concrètement quelle stratégie a été utilisée.
