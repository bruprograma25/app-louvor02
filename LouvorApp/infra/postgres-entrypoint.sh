#!/bin/sh
set -eu

mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"

if [ ! -s "$PGDATA/server.crt" ] || [ ! -s "$PGDATA/server.key" ]; then
  openssl req -new -x509 -days 3650 -nodes \
    -text -subj "/CN=louvorapp-postgres" \
    -keyout "$PGDATA/server.key" \
    -out "$PGDATA/server.crt"
  chown postgres:postgres "$PGDATA/server.key" "$PGDATA/server.crt"
  chmod 600 "$PGDATA/server.key"
fi

exec /usr/local/bin/docker-entrypoint.sh postgres \
  -c ssl=on \
  -c ssl_cert_file="$PGDATA/server.crt" \
  -c ssl_key_file="$PGDATA/server.key" \
  -c max_connections=120 \
  -c shared_buffers=256MB \
  -c effective_cache_size=768MB \
  -c work_mem=4MB
