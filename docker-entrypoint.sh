#!/bin/bash
set -e

echo "🚀 Starting Imdiyo Airline Flight Management System..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Start the application
echo "🎯 Starting the application..."
exec "$@" 