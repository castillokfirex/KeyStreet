#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_pw="$APP_DB_PASSWORD" -v rag_pw="$RAG_DB_PASSWORD" <<'EOSQL'
SELECT format('CREATE ROLE keystreet_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', :'app_pw') \gexec
SELECT format('CREATE ROLE keystreet_rag LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', :'rag_pw') \gexec
EOSQL
