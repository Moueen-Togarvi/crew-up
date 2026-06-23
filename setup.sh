#!/bin/bash
echo "Setting up PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE crewup;"
echo "Pushing schema..."
npx prisma db push --accept-data-loss
echo "Done!"
