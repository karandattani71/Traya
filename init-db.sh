#!/bin/bash
set -e

# Create the database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'Database already exists' WHERE EXISTS (SELECT FROM pg_database WHERE datname = 'imdiyo_airline');
EOSQL

echo "Database initialization completed" 