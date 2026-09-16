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
```

Puis exécutez `supabase/schema.sql` dans Supabase SQL Editor.

### Administrateur

Créez d'abord un compte sur `/register`, puis exécutez :

```sql
update public.profiles set role = 'admin' where email = 'elitelalaina@gmail.com';
```

### Machine learning

Le dossier `ml/` contient un pipeline de recommandation basé sur un modèle TF-IDF (content-based) et un filtrage collaboratif. Pour le lancer en local, utilisez une clé backend `service_role` dans une variable d'environnement shell, pas dans le frontend :

```bash
cd /home/elite/meantsena
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_KEY="SERVICE_ROLE_KEY"
./ml/run_sync_train.sh
```

### Sécurité

- La clé `service_role` n'est jamais utilisée dans le navigateur.
- RLS protège les données utilisateur.
- Le rôle admin est stocké dans `profiles`, pas dans le localStorage.
- La création de commande passe par une fonction PostgreSQL transactionnelle avec verrouillage du stock.
