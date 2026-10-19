# PROGRESS — Project Arena

Fichier de suivi partagé entre toutes les sessions Claude et le dev. Voir les règles dans `CLAUDE.md`.

## À faire (par priorité)
<!-- Format : - [ ] Description — critère de "fini" -->
Proposé par la session cloud après audit (le dev peut réordonner / compléter) :
- [ ] **UI admin : forfait, disqualification, sanctions** — les fonctions SQL existent (`admin_forfeit_match`, `disqualify_participant`, `apply_sanction`) mais aucun écran ne les appelle. Fini quand : depuis un match / un joueur, un admin peut déclarer un forfait, disqualifier, avertir/suspendre/bannir, avec confirmation et message d'erreur lisible.
- [ ] **Annulation de tournoi** — passer un tournoi en `CANCELLED` laisse ses matchs ouverts (joueurs toujours notifiés / peuvent déclarer). Fini quand : annuler passe les matchs non terminés en `CANCELLED` (fonction SQL dédiée, pas un simple update) et l'app n'affiche plus d'action sur ces matchs.
- [ ] **Clôture automatique des inscriptions** — le statut reste `REGISTRATION_OPEN` après `registration_end` (l'inscription est désormais refusée côté base, mais l'affichage ment). Fini quand : l'app affiche « Inscriptions closes » dès que la date est passée (ou cron `pg_cron` qui bascule le statut).
- [ ] **Preuves de match** — la policy storage `match_evidence_insert_own` vérifie seulement le dossier utilisateur, pas que l'utilisateur joue ce match. Fini quand : l'insert exige d'être joueur du match (`(storage.foldername(name))[2]`).
- [ ] **Sanctions** — un ADMIN peut sanctionner un SUPER_ADMIN ou lui-même. Fini quand : interdit côté SQL.

## En cours
<!-- - [ ] Tâche — session locale|cloud — date -->

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
- [x] Banc de test SQL `supabase/tests/run.sh` : rejoue toutes les migrations sur un Postgres local et vérifie 7 scénarios.

## Migrations à appliquer dans Supabase
<!-- Migrations créées mais pas encore lancées dans le SQL Editor. Le dev coche quand c'est fait. -->
- [ ] `20261019000000_bracket_byes.sql` — exemptions : un tournoi démarre avec 2 à max_players inscrits. Testée sur Postgres 16 (2 à 16 inscrits).
- [ ] `20261018000000_fix_advance_winner_and_hardening.sql` — **prioritaire** (sans elle, aucun match ne peut être confirmé). À coller entièrement dans le SQL Editor puis exécuter. Testée sur Postgres 16 avec toutes les migrations précédentes.
- [ ] `20261018010000_news.sql` — table `news` + 5 actus de départ (sans elle l'accueil affiche « Impossible de charger les actus »).
- [ ] `20261018020000_news_images.sql` — images des actus de départ (URLs non vérifiées depuis le cloud).
- [ ] `20261018030000_news_auto_sync.sql` — colonne `is_auto`, index unique sur `source_url`, dépublie l'actu Vitality périmée. À appliquer dans l'ordre, avant de déployer `sync-news`.
- _(Session locale : confirmer que les 11 migrations précédentes sont bien appliquées.)_

## Bloqué
<!-- Ce qui demande une action du dev : clé, décision, test sur appareil… -->
- L'environnement cloud n'a pas accès au registre npm : `npm run typecheck && npm test && npm run lint` **n'ont pas pu être lancés** sur les commits `a8a5545` et `a09d59f` (seule une vérification de syntaxe a été faite). **Session locale : les lancer avant de merger.**

## Journal
- 2026-10-19 — Session cloud : décision byes = les PREMIERS inscrits sont exemptés (récompense l'ancienneté, déterministe), le reste du tirage reste aléatoire. Bye en statut FORFEIT et non COMPLETED car la vue stats ne compte que COMPLETED. Constat : la base impose `entry_fee = 0` et `prize_pool = 0` (check constraints) : tournois gratuits uniquement tant que ces contraintes existent. Matchs d'exemple de l'accueil désactivés (`SHOW_DEMO_MATCHES = false`).
- 2026-10-19 — Session cloud : 6 matchs d'EXEMPLE dans « Today's Matches » (`src/features/matches/demoMatches.ts`, interrupteur `SHOW_DEMO_MATCHES`) pour remplir l'accueil. **À passer à false avant la mise en production.**
- 2026-10-18 — Session cloud : actus e-sport FR sur l'accueil (`NewsCard`, `features/news`, table `news`, image en moitié de carte avec visuel de secours). Mise à jour automatique : Edge Function `sync-news` (RSS Actu-Lan + Dexerto filtré e-sport, parseur pur dans `supabase/functions/_shared/rss.ts`, testé dans `src/utils/rss.test.ts` via un lanceur tsx car jest indisponible). Déploiement + pg_cron : voir `supabase/functions/sync-news/README.md` (action du dev, le secret `CRON_SECRET` n'est pas dans le repo). Les actus saisies à la main ne sont jamais écrasées ; les automatiques sont purgées après 45 jours. Typecheck/lint/jest non lancés (npm inaccessible) : session locale à vérifier.
- 2026-10-18 — Session cloud : mise en place de CLAUDE.md (règles communes) et PROGRESS.md.
- 2026-10-18 — Session cloud : audit complet (migrations, API, écrans). La liste « À faire » était vide, la session a donc corrigé les bugs trouvés et proposé la liste ci-dessus. Choix : correctifs SQL regroupés dans UNE nouvelle migration (aucune migration existante modifiée), fonctions recréées à l'identique hormis les contrôles ajoutés.
