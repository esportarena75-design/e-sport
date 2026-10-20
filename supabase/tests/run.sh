#!/bin/bash
# Rejoue toutes les migrations sur une base Postgres locale qui imite Supabase,
# puis exécute le scénario de test (inscriptions, bracket, résultats, litiges, forfaits).
#
# Prérequis : un Postgres local (14+) joignable sans mot de passe.
#   PGHOST / PGPORT / PGUSER peuvent être passés en variables d'environnement.
# Usage : ./supabase/tests/run.sh
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS="$DIR/../migrations"
P="psql -v ON_ERROR_STOP=1 -q"

$P -d postgres -c "drop database if exists arena_test" && $P -d postgres -c "create database arena_test" || exit 1
$P -d arena_test -f "$DIR/supabase_stub.sql" || exit 1
for f in "$MIGRATIONS"/*.sql; do
  # pg_net n'existe pas hors Supabase : la fonction net.http_post est simulée dans le stub.
  sed 's/^create extension if not exists pg_net.*$/-- pg_net simulé/' "$f" | $P -d arena_test -f - >/dev/null \
    || { echo "ÉCHEC migration : $(basename "$f")"; exit 1; }
  echo "ok $(basename "$f")"
done

echo "=== Scénario (les lignes 'doit echouer' doivent afficher une ERROR explicite)"
psql -d arena_test -f "$DIR/scenario.sql" 2>&1 | grep -E "TEST|doit|correcte|ERROR|COMPLETED|FORFEIT|DISPUTED|READY|SCHEDULED| t$| f$"
echo "=== Exemptions (byes)"
psql -d arena_test -f "$DIR/byes.sql" 2>&1 | grep -E "n=|doit|ERROR|Not enough"
echo "=== Cycle de vie, preuves, sanctions"
psql -d arena_test -f "$DIR/lifecycle.sql" 2>&1 | grep -v "^$" | sed "s#psql:[^ ]*lifecycle.sql:[0-9]*: ##"
echo "=== Profil"
psql -d arena_test -f "$DIR/profile.sql" 2>&1 | grep -v "^$" | grep -v "as_user\|^---------\|^(1 row)\|^SET\|^RESET\|^GRANT\|set_config\|service_role\|^ *|" | sed "s#psql:[^ ]*profile.sql:[0-9]*: ##"
echo "=== Suppression de compte"
psql -d arena_test -f "$DIR/account.sql" 2>&1 | grep -v "^$" | grep -v "as_user\|^---------\|^(1 row)\|^SET\|^RESET\|^GRANT\|set_config\|service_role\|^ *|$" | sed "s#psql:[^ ]*account.sql:[0-9]*: ##"
echo "=== Planification et suspensions"
psql -d arena_test -f "$DIR/schedule.sql" 2>&1 | grep -E "^---|^ ok|^ ECHEC|ERROR|SUSPENSION|WARNING" | sed "s#psql:[^ ]*schedule.sql:[0-9]*: ##"
