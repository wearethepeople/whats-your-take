#!/bin/sh
set -e

# Restore from the Tigris replica if the volume is empty (fresh machine or
# volume loss). -if-db-not-exists: no-op when the database already exists.
# -if-replica-exists: exit 0 (instead of failing) on first-ever boot when
# the bucket has no backup yet.
litestream restore -if-db-not-exists -if-replica-exists -config /etc/litestream.yml /data/sqlite.db

# Apply any pending migrations before serving.
node ./other/migrate.js

# Run the app under Litestream so replication is continuous; Litestream
# forwards signals and exits with the app.
exec litestream replicate -config /etc/litestream.yml -exec "npm start"
