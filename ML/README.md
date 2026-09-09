# Me-Antsena — moteur de recommandations ML

Ce dossier contient le moteur de recommandations utilisé pour le projet e-commerce Me-Antsena.

## Ce qui est inclus

- Content-based filtering : recommandations basées sur les caractéristiques du produit (nom, description, catégorie, tags, marque)
- Collaborative filtering : recommandations basées sur les interactions utilisateurs similaires
- Popularity-based : produits les plus populaires / les mieux notés
- Hybrid recommender : combinaison des approches pour un meilleur cold-start et meilleure précision
- Validation / tests : script de vérification d'authentification Supabase + génération de recommandations

## Prérequis

Python 3.10+

## Installation

```bash
cd /home/elite/meantsena
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r ML/requirements.txt
```

Si le projet est déjà configuré avec un fichier `.env.local`, le script chargera automatiquement les variables de connexion Supabase.

## Variables d'environnement du projet

Dans le dossier racine du projet (`/home/elite/meantsena/.env.local`), ajouter :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Le module Python essaie aussi de lire `SUPABASE_URL` et `SUPABASE_ANON_KEY` si ces variables existent.

## Utilisation

### Vérifier l'auth + le moteur ML

```bash
cd /home/elite/meantsena
source .venv/bin/activate
python ML/test_login_and_ml.py
```

### Lancer l'algorithme de recommandation

```bash
cd /home/elite/meantsena
source .venv/bin/activate
python ML/main.py --user-id USER_ID --top-n 5
```

### Exécuter les fichiers Python du module

```bash
cd /home/elite/meantsena
source .venv/bin/activate
python -m ML.Src.main --user-id USER_ID --top-n 5
```

## Remarques

- Les scripts sont adaptés au schéma du projet Me-Antsena : `products`, `orders`, `interactions`, `favorites`.
- Si la base est vide ou si les variables Supabase ne sont pas configurées, la commande ne doit pas planter : elle renvoie un message explicite et s'arrête proprement.
- Les modèles sont conçus pour fonctionner sur les produits et interactions réelles du projet, sans dépendre de jeux de données externes.
