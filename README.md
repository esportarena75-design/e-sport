# Project Arena

Application mobile de tournois e-sport multi-jeux : inscription aux tournois, bracket en élimination
directe, saisie et confirmation des scores, litiges, classement, notifications et actus e-sport.

**Stack** : Expo 57 · React Native · expo-router · NativeWind · TanStack Query · Zustand · Zod 4 ·
Supabase (Postgres + RLS, Auth, Storage, Edge Functions).

## Démarrer

```bash
npm install
cp .env.example .env      # puis renseigner l'URL et la clé publique Supabase
npx expo start -c
```

Seules les variables `EXPO_PUBLIC_*` vont dans `.env` (elles sont publiques). Ne jamais y mettre la
service role key.

## Scripts

| Commande            | Rôle                                  |
| ------------------- | ------------------------------------- |
| `npm run typecheck` | Vérification TypeScript               |
| `npm run lint`      | ESLint                                |
| `npm test`          | Tests unitaires (Jest)                |
| `npm run format`    | Prettier                              |

La CI GitHub (`.github/workflows/ci.yml`) lance typecheck, lint, tests **et** les scénarios SQL
(`supabase/tests/run.sh`, sur un Postgres 16 jetable) à chaque push sur `claude/finition` et à
chaque pull request vers `main`.

## Base de données (Supabase)

Les migrations sont dans `supabase/migrations/`, datées, à appliquer **dans l'ordre** dans le
SQL Editor Supabase. On ne modifie jamais une migration existante : un changement = un nouveau fichier.
La liste de ce qui reste à appliquer est dans `PROGRESS.md`.

Tests SQL en local (Postgres 14+ joignable sans mot de passe) :

```bash
PGHOST=localhost PGUSER=postgres ./supabase/tests/run.sh
```

## Tâches planifiées (pg_cron)

```sql
select cron.schedule('close-registrations', '*/5 * * * *',  'select public.close_expired_registrations()');
select cron.schedule('lift-suspensions',    '*/10 * * * *', 'select public.lift_expired_suspensions()');
```

## Edge Functions

| Fonction    | Rôle                                                   | Secret      |
| ----------- | ------------------------------------------------------ | ----------- |
| `send-push` | Envoie les notifications push                          | `CRON_SECRET` |
| `sync-news` | Importe les actus e-sport FR (RSS) toutes les 30 min    | `CRON_SECRET` |

```bash
npx supabase functions deploy sync-news --no-verify-jwt
npx supabase secrets set CRON_SECRET=...
```

## Authentification

Le lien « mot de passe oublié » rouvre l'appli sur l'écran `reset-password`. Ajouter dans Supabase
(Authentication → URL Configuration → Redirect URLs) : `esportapp://reset-password` et, pour Expo Go,
l'URL `exp://…/--/reset-password` affichée au lancement.

## Build et publication (EAS)

`eas.json` définit trois profils : `development`, `preview` (APK interne) et `production`.

```bash
npx eas build --profile preview --platform android
```

## Avant la mise en production

- `SHOW_DEMO_MATCHES = false` dans `src/features/matches/demoMatches.ts`.
- Faire valider par un juriste les textes de `src/constants/legal.ts` (CGU, confidentialité, règlement).
- Appliquer toutes les migrations et planifier les tâches pg_cron ci-dessus.

## Travail à plusieurs sessions Claude

Voir `CLAUDE.md` et `PROGRESS.md` : le dépôt est la seule mémoire commune.
