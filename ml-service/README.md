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
| GET     | `/evaluate?k=10&test_ratio=0.2&seed=42&dataset=real`| Compare popularité, collaboratif, contenu et hybride sur des interactions réelles |

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
La liste `content` de `/recommendations/{user_id}` peut inclure le produit le
plus récemment consulté, marqué `is_recently_viewed: true`, puis les produits
similaires calculés par le modèle content-based. L'accueil affiche uniquement
la liste issue de ce endpoint pour cette section ; si le service ML est
indisponible, il indique cette indisponibilité au lieu de présenter des
recommandations Supabase comme si elles venaient du modèle.

La section « Les plus populaires » de l'accueil utilise `/trending`, qui classe
les produits en stock d'après la somme pondérée des interactions du dernier
entraînement. Ce classement n'est donc pas temps réel : il est actualisé lors
de `POST /train`. Si le service ML ne répond pas ou ne renvoie aucun produit,
l'interface affiche une sélection de nouveautés et l'indique explicitement.

## Évaluation des recommandations

```bash
curl "http://localhost:8000/evaluate?k=5&test_ratio=0.2&seed=42"
```

L'évaluation récupère le catalogue et les interactions (avec `created_at`), puis
crée trois périodes chronologiques par utilisateur en groupant par **jour UTC** :
jours anciens pour l'entraînement, jours suivants pour la validation et derniers
jours pour le test final. Plusieurs événements du même jour ne peuvent donc pas
artificiellement compter comme des retours séparés. Le réglage est choisi sur la validation selon le NDCG@K
hybride; le test final n'est utilisé qu'après ce choix. Les modèles sont
temporaires et leur initialisation est reproductible avec `seed`; les artefacts
de production ne sont pas remplacés. Les utilisateurs ayant moins de trois jours
d'activité contribuent à l'entraînement, mais pas au réglage ni au test.

Le endpoint compare **popularité**, **filtrage collaboratif**, **TF-IDF basé
contenu** et **hybride** dans le catalogue courant. Les produits déjà vus par
l'utilisateur sont exclus. Le collaboratif et la popularité ne peuvent classer
que les produits présents dans les interactions d'entraînement; le contenu peut
aussi classer les autres produits du catalogue. Les utilisateurs sans interaction
d'entraînement et les événements pertinents portant sur un produit déjà vu ou
absent du catalogue sont exclus et comptabilisés.
L'hybride combine les rangs des deux listes (fusion réciproque des rangs,
pondérée), plutôt que de comparer directement les scores CF et TF-IDF dont les
échelles ne sont pas équivalentes. L'évaluation essaie cinq combinaisons de poids
(contenu de 0 à 100 %, par pas de 25 %) et retourne les poids qui maximisent le
NDCG@K sur la validation, ainsi que les scores correspondants sur le test final.
Pour éviter de présenter une sélection aléatoire comme un réglage fiable, le
service ne déclare un gagnant que si au moins cinq utilisateurs sont évaluables
en validation et si un candidat obtient un NDCG@K positif. Sinon `tuning.status`
explique le manque de signal (`no_validation_relevant_users`,
`insufficient_validation_users` ou `no_validation_hits`), aucun poids n'est
déclaré gagnant et le test rapporte le réglage par défaut
(0.55 collaboratif / 0.45 contenu).

Pour chaque méthode, la réponse fournit **Precision@K**, **Recall@K** et
**NDCG@K**. Une interaction est pertinente si elle correspond à un favori, un
ajout au panier ou un achat. Le **RMSE** collaboratif est conservé comme mesure
complémentaire, uniquement sur les paires utilisateur-produit absentes du train.
Les champs de métriques à la racine (`precision_at_k`, `recall_at_k`,
`ndcg_at_k`) restent ceux du collaboratif pour compatibilité; l'objet `methods`
contient les résultats des quatre méthodes.

Les appels sont archivés dans `artifacts/evaluation_history.json` avec leur
protocole, les coupures validation/test, les métriques et les effectifs.
`tuning.selected_cf_weight` et `tuning.selected_cb_weight` sont des réglages
proposés à partir de la validation; ils ne sont pas appliqués automatiquement au
service de production. Les entrées archivées avant
`per_user_train_validation_test_v3` viennent d'anciens protocoles et ne sont pas
directement comparables.

### Jeu synthétique isolé (test du pipeline uniquement)

Si les utilisateurs réels ne donnent pas encore assez de données, le SQL
[`scripts/seed_synthetic_evaluation.sql`](./scripts/seed_synthetic_evaluation.sql)
peut créer un jeu marqué pour vérifier le protocole. Il utilise les profils de
test existants `ml-seed-user<number>@example.com` (au moins 10 requis), ne crée
pas de comptes Auth et ne touche pas aux autres profils. **Il supprime les
interactions préexistantes de ces profils de test**, puis crée leur historique
synthétique sur 28 jours. Vérifie le projet et les profils ciblés avant de
l’exécuter; le SQL ne doit être lancé qu'une fois le code ML qui exclut le
marqueur synthétique déployé et redémarré.

Les lignes synthétiques portent
`recommendation_source = 'synthetic_eval_v1'`. Le pipeline normal
(`/train`, tendances et interactions live des utilisateurs) les exclut.
Pour évaluer explicitement la fixture, appeler :

```bash
curl "http://localhost:8000/evaluate?k=5&test_ratio=0.2&seed=42&dataset=synthetic"
```

La réponse indique `dataset_mode: "synthetic"`. Ces résultats valident seulement
que le code et le protocole fonctionnent sur un signal contrôlé ; ne les
présente pas comme la performance du modèle sur les clients réels. L'option par
défaut `dataset=real` exclut automatiquement ces événements marqués.

Pour suivre l'évolution chaque semaine, planifiez un appel à l'endpoint avec le
cron de votre hébergeur ou un ordonnanceur externe. Exemple de commande à
exécuter le lundi à 05:00 UTC :

```bash
curl --fail --silent --show-error \
  "https://<votre-service-ml>/evaluate?k=5&test_ratio=0.2&seed=42"
```

Chaque appel produit une nouvelle entrée horodatée dans l'historique du service.
Après application de la migration Supabase, relancez aussi `POST /train` pour
reconstruire les artefacts avec les marques, les prix et les tags normalisés.

Les tests synthétiques (sans Supabase) vérifient le split chronologique, les
métriques et les quatre stratégies :

```bash
python -m unittest discover -s tests -p 'test*.py' -v
```

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
