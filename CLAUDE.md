@AGENTS.md

# Project Arena — règles communes à toutes les sessions Claude

Plusieurs sessions Claude travaillent sur ce repo : une **session locale** (IDE, sur le PC du dev,
avec accès au `.env` et à Supabase) et une **session cloud** (tourne même PC éteint, sans `.env`).
Elles ne partagent aucune mémoire : **ce repo est leur seule mémoire commune.**

## Au début de chaque session
1. `git pull` (ou `git fetch` + rebase sur la branche de travail).
2. Lire `PROGRESS.md` en entier avant de toucher au code.
3. Prendre la première tâche « À faire » non réservée, et la marquer « En cours (session X) ».

## Pendant le travail
- Une tâche = un ou plusieurs commits clairs, puis **push immédiat**. Rien ne doit rester non poussé.
- Branche de travail commune : `claude/finition`. Jamais de push direct sur `main`.
- Avant de commiter : `npm run typecheck && npm test && npm run lint` (si l'environnement le permet ;
  sinon le noter dans PROGRESS.md pour que la session locale vérifie).
- Ne jamais commiter `.env` ni aucune clé. Le cloud n'a pas les secrets : code contre `.env.example`.

## Migrations Supabase
- Nouvelle migration = nouveau fichier daté dans `supabase/migrations/`, jamais modifier une migration existante.
- Aucune session n'applique les migrations : le dev les lance dans le SQL Editor Supabase.
- Toute nouvelle migration va dans la section « Migrations à appliquer » de `PROGRESS.md`.

## En fin de session (ou avant d'être interrompu)
Mettre à jour `PROGRESS.md` : tâche terminée → « Fait », décisions prises → « Journal », blocages → « Bloqué ».
Commit + push.
