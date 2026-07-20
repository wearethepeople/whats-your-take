# Deploy — Fly.io + Litestream (Tigris)

Config lives in the repo (`fly.toml`, `Dockerfile`, `other/litestream.yml`,
`other/entrypoint.sh`). Provisioning is deliberate and manual — these steps
touch the Fly account and billing.

## One-time provisioning

```sh
fly launch --no-deploy          # accept the existing fly.toml
fly volumes create data --region dfw --size 1
fly storage create              # Tigris bucket; auto-sets BUCKET_NAME,
                                # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                                # AWS_ENDPOINT_URL_S3 as app secrets
                                # (Tigris naming convention — no AWS involved)
fly secrets set ADMIN_PASSWORD=$(openssl rand -hex 32) \
                SESSION_SECRET=$(openssl rand -hex 32)
                                # Host-console auth. Rotating SESSION_SECRET
                                # just logs the host out; rotating
                                # ADMIN_PASSWORD requires telling the host.
fly deploy --ha=false           # REQUIRED flag: prevents Fly's two-machine
                                # default. SQLite means exactly one machine.
fly scale count 1               # verify/enforce; must stay 1 forever
```

## Restore drill — REQUIRED before event one

Digital responses have no physical backup (cards do). Prove the replica
restores before trusting it:

```sh
fly ssh console -C "litestream restore -config /etc/litestream.yml -o /tmp/restore-test.db /data/sqlite.db"
fly ssh console -C "sqlite3 /tmp/restore-test.db 'select count(*) from responses;'"
```

Litestream is pinned to v0.5.14 in the Dockerfile (`LITESTREAM_VERSION`).
Never move it into the v0.5.6–v0.5.7 range (silent replication failure).

## Privacy posture (I1)

- The app layer logs no IPs and no request bodies. Keep it that way — do not
  add request-logging middleware.
- Fly's proxy keeps its own logs: set log retention to the minimum available
  and record what that retention is, so "we store no PII" survives
  inspection of infrastructure too.
- No analytics anywhere on the submission path (I7).

## Ongoing

- `fly deploy` after CI is green. Migrations run automatically at container
  start (entrypoint) before the server accepts traffic.
- Never scale beyond one machine; never add read replicas of the app. The
  public corpus can go behind edge caching post-close instead (spec, slice 5).
