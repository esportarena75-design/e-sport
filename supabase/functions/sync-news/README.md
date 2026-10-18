# sync-news

Lit les flux RSS d'Actu-Lan et de Dexerto FR (filtré sur l'e-sport) et ajoute les nouveaux articles
à la table `news`. Les articles déjà présents ou modifiés à la main ne sont jamais écrasés ; les
actus automatiques de plus de 45 jours sont supprimées.

Prérequis : migration `20261018030000_news_auto_sync.sql` appliquée.

## Mise en place (une seule fois)

1. Choisir un secret aléatoire (ex. `openssl rand -hex 24`) et le déclarer :

   ```bash
   supabase secrets set CRON_SECRET=<ton_secret>
   supabase functions deploy sync-news --no-verify-jwt
   ```

   `--no-verify-jwt` : la fonction se protège elle-même avec l'en-tête `x-cron-secret`.

2. Dans le SQL Editor Supabase, planifier l'appel toutes les 30 minutes
   (extensions `pg_cron` et `pg_net` à activer dans Database > Extensions) :

   ```sql
   select cron.schedule(
     'sync-news',
     '*/30 * * * *',
     $$
     select net.http_post(
       url := 'https://<ton-projet>.supabase.co/functions/v1/sync-news',
       headers := '{"x-cron-secret": "<ton_secret>"}'::jsonb
     );
     $$
   );
   ```

3. Tester tout de suite :

   ```bash
   curl -X POST https://<ton-projet>.supabase.co/functions/v1/sync-news -H "x-cron-secret: <ton_secret>"
   ```

   Réponse attendue : `{"ok":true,"inserted":N,"report":{...}}`.

Ne jamais commiter le secret.

## Ajouter une source

Ajouter une entrée dans `FEEDS` (`index.ts`). Le parseur (`../_shared/rss.ts`) gère RSS 2.0 ;
il est testé dans `src/utils/rss.test.ts`.
