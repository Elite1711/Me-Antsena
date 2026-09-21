# Configuration Supabase — Me-Antsena

1. Créez un projet sur Supabase.
2. Dans **SQL Editor**, exécutez `schema.sql` en entier.
3. Dans **Authentication > Providers > Email**, activez Email/Password.
   - Pour un démarrage immédiat sans validation email, désactivez temporairement **Confirm email**.
   - En production, il est recommandé de laisser la confirmation email activée.
4. Copiez `.env.example` vers `.env.local` et renseignez l'URL du projet et la clé **anon/publishable**. Ne mettez jamais la `service_role` key dans le frontend.
5. Créez votre compte administrateur via `/register`.
6. Dans SQL Editor, rendez ce compte administrateur :

```sql
update public.profiles
set role = 'admin'
where email = 'votre-email@example.com';
```

7. Relancez le frontend. L'espace `/admin` sera accessible à ce compte.

Le trigger `handle_new_user` crée automatiquement une ligne `profiles` pour chaque nouveau compte Auth : l'admin voit donc tous les utilisateurs dans **Administration > Utilisateurs**.

Le bucket public `product-images` est créé par `schema.sql`. Seuls les administrateurs authentifiés peuvent envoyer, modifier ou supprimer les images.

## Clé service_role (pour ml-service)

Le microservice `ml-service/` a besoin de la clé `service_role` pour lire toutes les
interactions/utilisateurs (elle contourne RLS). Trouvez-la dans **Project Settings >
API > service_role**, et placez-la uniquement dans `ml-service/.env` (jamais commitée,
jamais dans le frontend) :

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_KEY="YOUR_SERVICE_ROLE_KEY"
```

> ⚠️ Une ancienne version de ce fichier contenait une vraie clé `service_role` en
> clair. Si ce dépôt (ou son historique Git) a été rendu public ou partagé, **révoquez
> et régénérez cette clé immédiatement** dans Project Settings > API, puis mettez à
> jour `ml-service/.env` avec la nouvelle valeur.
