# PROGRESS — Project Arena

Fichier de suivi partagé entre toutes les sessions Claude et le dev. Voir les règles dans `CLAUDE.md`.

## À faire (par priorité)
<!-- Le dev ou la session locale remplit cette liste. Format : - [ ] Description — critère de "fini" -->
- [ ] _(à compléter par le dev / la session locale)_

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

## Migrations à appliquer dans Supabase
<!-- Migrations créées mais pas encore lancées dans le SQL Editor. Le dev coche quand c'est fait. -->
- Aucune pour l'instant. _(Session locale : confirmer que les 11 migrations existantes sont bien appliquées.)_

## Bloqué
<!-- Ce qui demande une action du dev : clé, décision, test sur appareil… -->

## Journal
- 2026-10-18 — Session cloud : mise en place de CLAUDE.md (règles communes) et PROGRESS.md.
  L'environnement cloud n'a pas accès au registre npm pour l'instant : typecheck/tests à lancer côté local.
