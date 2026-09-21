#!/usr/bin/env bash
set -eu

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [ -z "${SUPABASE_URL:-}" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  export SUPABASE_URL="$VITE_SUPABASE_URL"
fi

if [ -z "${SUPABASE_KEY:-}" ] && [ -n "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  echo "Warning: no SUPABASE_KEY service role found. Falling back to VITE_SUPABASE_ANON_KEY; recommendation writes may fail because of RLS." >&2
  export SUPABASE_KEY="$VITE_SUPABASE_ANON_KEY"
fi

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
  echo "Erreur: configure SUPABASE_URL et SUPABASE_KEY (service_role recommandé) avant d'exécuter le script ML." >&2
  echo "Exemple:" >&2
  echo "  export SUPABASE_URL='https://....supabase.co'" >&2
  echo "  export SUPABASE_KEY='service-role-key'" >&2
  exit 1
fi

./ml/.venv/bin/python ml/sync_train.py
