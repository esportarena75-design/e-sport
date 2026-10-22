# PROGRESS — Project Arena

Fichier de suivi partagé entre toutes les sessions Claude et le dev. Voir les règles dans `CLAUDE.md`.

## À faire (par priorité)
<!-- Format : - [ ] Description — critère de "fini" -->
Proposé par la session cloud après audit (le dev peut réordonner / compléter) :

## En cours
<!-- - [ ] Tâche — session locale|cloud — date -->
<!-- Rien en cours : la session cloud de la nuit du 2026-10-21 est terminée. -->

## Fait
État constaté au commit `f3b67a1` (« Project Arena MVP ») :
- [x] Auth : inscription, connexion, mot de passe oublié
- [x] Tournois : liste, détail, règles, participants, création (admin)
- [x] Bracket et matchs : rapport de score, confirmation, litiges
- [x] Classement, stats, profil joueur
- [x] Comptes de jeu, notifications push (Edge Function `send-push`)
- [x] Dashboard admin, gestion des litiges
- [x] Tests unitaires : schémas (auth, match, tournoi), bracket, dates

Session cloud, 2026-10-18 (branche `claude/finition`) :
- [x] **Bug bloquant corrigé : confirmer un résultat ou résoudre un litige échouait toujours** (`advance_winner(uuid, uuid) is not unique`, surcharge créée par la migration admin). Reproduit puis corrigé sur une base locale.
- [x] **Faille corrigée : n'importe quel utilisateur pouvait appeler `advance_winner` via l'API** et choisir le vainqueur de n'importe quel match.
- [x] Score nul refusé (formulaire + base), litige impossible sur un match gagné par forfait, litige résolu une seule fois avec vainqueur valide, inscription refusée hors fenêtre de dates, plus aucune RPC accessible sans être connecté.
- [x] Écrans admin : les erreurs s'affichent (avant : échec silencieux).
- [x] **Exemptions (byes)** : `generate_bracket` accepte 2 à max_players inscrits ; les premiers inscrits sont exemptés du tour 1 (match créé en `FORFEIT`, un seul joueur, pour ne pas fausser les stats), bracket affiche « Exempt ». Tests : `supabase/tests/byes.sql`, `isBye` dans `bracket.test.ts`.
- [x] Annulation de tournoi (matchs ouverts annulés par trigger, notifications), clôture des inscriptions (fonction SQL à planifier), preuves de match (insertion réservée aux joueurs du bon match, lecture réparée), sanctions (pas d'auto-sanction, hiérarchie USER < ADMIN < SUPER_ADMIN). Détail dans la migration `20261019010000`.
- [x] **UI admin** : écran `app/admin/tournament/[id]/manage.tsx` (bouton « Gérer » du dashboard) : forfait d'un joueur sur un match en cours, disqualification, avertissement / suspension / bannissement, motif obligatoire et confirmation, erreurs en français. Le bouton « Annuler » appelle désormais `cancel_tournament`. Les inscriptions affichent « fermées » dès que `registration_end` est passée (`displayStatus` dans `src/utils/time.ts`).
- [x] **Modification du profil** : écran `app/profile/edit.tsx` (photo depuis la galerie recadrée en carré, suppression de la photo, pseudo, bio), composant `Avatar` (photo ou initiale) sur le profil et la page joueur, une seule photo conservée par joueur.
- [x] **3 onglets en 1** : les onglets « Mes matchs » et « Classement » sont supprimés, ils vivent dans l'onglet Profil via un sélecteur Profil / Mes matchs / Classement (`app/(tabs)/profile.tsx`, `src/features/profile/sections/`). Mes matchs : « À venir » (date, heure, compte à rebours à la seconde) puis « Historique ». Classement : top 20 + ma position si je suis plus loin.
- [x] **Mot de passe oublié complet** : le mail contient un lien qui rouvre l'appli sur `app/reset-password.tsx` (nouveau mot de passe + confirmation). Parseur d'URL testé (`src/features/auth/redirect.ts`). ⚠ Réglage Supabase requis : Authentication > URL Configuration > Redirect URLs : ajouter `esportapp://reset-password` (build) et l'URL `exp://…/--/reset-password` affichée par Expo Go.
- [x] **ErrorBoundary global** (`app/_layout.tsx`) + **pages légales** CGU / confidentialité / règlement (`app/legal/[doc].tsx`, textes dans `src/constants/legal.ts`, liens « Lire le document » sous les cases d'inscription). ⚠ Textes = BROUILLONS à faire valider par un juriste (éditeur, contact RGPD, durées).
- [x] **Planification des matchs** (section « Planifier les matchs » de l'écran Gérer : date + heure, joueurs notifiés, le compte à rebours de « Mes matchs » l'utilise) et **suspensions à durée** (1 / 3 / 7 / 30 jours ou indéfinie, levée automatique par tâche planifiée).
- [x] Liste des tournois : recherche avec délai (plus de requête à chaque frappe), jokers `%` `_` neutralisés, tirer pour rafraîchir.
- [x] Banc de test SQL `supabase/tests/run.sh` : rejoue toutes les migrations sur un Postgres local et vérifie 7 scénarios.

## Migrations à appliquer dans Supabase
<!-- Migrations créées mais pas encore lancées dans le SQL Editor. Le dev coche quand c'est fait. -->
- [ ] `20261022010000_tournaments_won_forfeit_final.sql` — une finale gagnée par forfait compte comme titre dans `player_stats`. Testée.
- [ ] `20261022000000_match_scheduling_and_suspensions.sql` — `admin_schedule_match` (planifier un match, joueurs notifiés), `apply_sanction` refuse une date de fin passée, `lift_expired_suspensions()` à planifier : `select cron.schedule('lift-suspensions','*/10 * * * *','select public.lift_expired_suspensions()');`. Testée (`supabase/tests/schedule.sql`).
- [ ] `20261021010000_delete_own_account.sql` — vraie suppression de compte (anonymisation du profil, e-mail/mot de passe effacés, compte bloqué, forfait des matchs en cours). Testée (`supabase/tests/account.sql`). ⚠ écrit dans `auth.users` / `auth.identities` / `auth.sessions` : à tester une fois sur un compte jetable dans Supabase.
- [ ] `20261021000000_matches_public_tournament_info.sql` — ajoute `tournament_name` et `tournament_start_date` à la vue `matches_public` (date affichée dans « Mes matchs »). Testée sur Postgres 16.
- [ ] `20261020000000_profile_edit.sql` — bucket public `avatars` (2 Mo, jpeg/png/webp) + policies, bio ≤ 160, avatar https, pseudo modifiable tous les 14 jours, et **durcissement : le client ne peut plus modifier `birth_date` ni les dates de consentement** (revoke update + grant sur colonnes). Testée sur Postgres 16 (`supabase/tests/profile.sql`).
- [ ] `20261019010000_tournament_lifecycle_and_sanctions.sql` — annulation de tournoi (trigger + `cancel_tournament`), `close_expired_registrations()` (à planifier : `select cron.schedule('close-registrations','*/5 * * * *','select public.close_expired_registrations()');`), preuves de match (policies storage corrigées : l'ancienne policy de lecture ne voyait jamais aucun match à cause de la RLS), hiérarchie des sanctions. Testée sur Postgres 16 (`supabase/tests/lifecycle.sql`).
- [ ] `20261019000000_bracket_byes.sql` — exemptions : un tournoi démarre avec 2 à max_players inscrits. Testée sur Postgres 16 (2 à 16 inscrits).
- [ ] `20261018000000_fix_advance_winner_and_hardening.sql` — **prioritaire** (sans elle, aucun match ne peut être confirmé). À coller entièrement dans le SQL Editor puis exécuter. Testée sur Postgres 16 avec toutes les migrations précédentes.
- [ ] `20261018010000_news.sql` — table `news` + 5 actus de départ (sans elle l'accueil affiche « Impossible de charger les actus »).
- [ ] `20261018020000_news_images.sql` — images des actus de départ (URLs non vérifiées depuis le cloud).
- [ ] `20261018030000_news_auto_sync.sql` — colonne `is_auto`, index unique sur `source_url`, dépublie l'actu Vitality périmée. À appliquer dans l'ordre, avant de déployer `sync-news`.
- _(Session locale : confirmer que les 11 migrations précédentes sont bien appliquées.)_

## Bloqué
- **Photo de profil, à vérifier sur appareil** : `allowsEditing` / `aspect` d'expo-image-picker n'ont pas pu être vérifiés dans la doc Expo v57 (consultation refusée) ; ils existent dans les versions précédentes. Tester le choix + recadrage d'une photo sur iOS et Android. Les photos sont en lecture publique (bucket public), cohérent avec `public_profiles`.
- **Typage des routes** : la nouvelle route `/admin/tournament/[id]/manage` n'existe pas encore dans les types générés (`typedRoutes`). Lancer `npx expo start` une fois (ou `npx expo customize tsconfig.json`) pour les régénérer AVANT `npm run typecheck`, sinon une erreur sur `router.push` est normale.
- **Suspension** : penser à planifier `lift_expired_suspensions()` (voir migrations) ; une suspension « indéfinie » n'est jamais levée automatiquement.
<!-- Ce qui demande une action du dev : clé, décision, test sur appareil… -->
- _(La CI GitHub Actions lance typecheck, lint, jest et les scénarios SQL à chaque push : plus de blocage de ce côté.)_

## Journal
- 2026-10-21 — Session cloud (nuit, autonome) : CI GitHub Actions, suppression de compte réelle, mot de passe oublié complet, ErrorBoundary, pages légales (brouillons), planification des matchs, suspensions à durée, titres par forfait, `eas.json`, README. Décisions : le lien de réinitialisation passe par `Linking.createURL('reset-password')` (flux implicit, jetons dans le fragment) ; l'écran `reset-password` est hors des groupes protégés ; les textes légaux sont dans `src/constants/legal.ts` pour qu'un juriste les corrige au même endroit.
- 2026-10-21 — Session cloud : fusion Mes matchs + Classement dans Profil. Les matchs n'ont pas de date propre (`scheduled_at` n'est jamais renseigné à la génération du bracket) : le compte à rebours vise `scheduled_at`, sinon la date de début du tournoi pour le tour 1 ; les tours suivants affichent « Date à définir ». Piste : fixer `scheduled_at` à la génération, ou ajouter une UI admin pour planifier chaque match.
- 2026-10-20 — Session cloud : modification du profil (photo, pseudo, bio). Choix : bucket public (l'avatar est déjà exposé par la vue `public_profiles`), 2 Mo, formats jpeg/png/webp (HEIC refusé : message clair), pseudo limité à 1 changement / 14 jours contre l'usurpation. Le revoke update sur `profiles` ferme aussi une faille : un joueur pouvait changer sa date de naissance et ses consentements via l'API.
- 2026-10-19 — Session cloud : matchs d'exemple de l'accueil RÉACTIVÉS à la demande du dev (`SHOW_DEMO_MATCHES = true`). À repasser à false avant la mise en production.
- 2026-10-19 — Session cloud : décision byes = les PREMIERS inscrits sont exemptés (récompense l'ancienneté, déterministe), le reste du tirage reste aléatoire. Bye en statut FORFEIT et non COMPLETED car la vue stats ne compte que COMPLETED. Constat : la base impose `entry_fee = 0` et `prize_pool = 0` (check constraints) : tournois gratuits uniquement tant que ces contraintes existent. Matchs d'exemple de l'accueil désactivés (`SHOW_DEMO_MATCHES = false`).
- 2026-10-19 — Session cloud : 6 matchs d'EXEMPLE dans « Today's Matches » (`src/features/matches/demoMatches.ts`, interrupteur `SHOW_DEMO_MATCHES`) pour remplir l'accueil. **À passer à false avant la mise en production.**
- 2026-10-18 — Session cloud : actus e-sport FR sur l'accueil (`NewsCard`, `features/news`, table `news`, image en moitié de carte avec visuel de secours). Mise à jour automatique : Edge Function `sync-news` (RSS Actu-Lan + Dexerto filtré e-sport, parseur pur dans `supabase/functions/_shared/rss.ts`, testé dans `src/utils/rss.test.ts` via un lanceur tsx car jest indisponible). Déploiement + pg_cron : voir `supabase/functions/sync-news/README.md` (action du dev, le secret `CRON_SECRET` n'est pas dans le repo). Les actus saisies à la main ne sont jamais écrasées ; les automatiques sont purgées après 45 jours. Typecheck/lint/jest non lancés (npm inaccessible) : session locale à vérifier.
- 2026-10-18 — Session cloud : mise en place de CLAUDE.md (règles communes) et PROGRESS.md.
- 2026-10-18 — Session cloud : audit complet (migrations, API, écrans). La liste « À faire » était vide, la session a donc corrigé les bugs trouvés et proposé la liste ci-dessus. Choix : correctifs SQL regroupés dans UNE nouvelle migration (aucune migration existante modifiée), fonctions recréées à l'identique hormis les contrôles ajoutés.
