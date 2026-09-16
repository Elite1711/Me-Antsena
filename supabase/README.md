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

//auto-test
cd /home/elite/meantsena
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZHhnZ3BtcGVldGtwa21qeWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MzQ4MCwiZXhwIjoyMTA0NDI5NDgwfQ.vWyEjPkKYY8X2-ddpl9jblU6wDY2x6HHTFKNJtza1uc"
./ml/run_sync_train.sh
