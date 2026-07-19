# What's Your Take? — ingest site

Anonymous, presence-gated response collection for the What's Your Take
table, from We (ARE) the People.

- Design + schema source of truth: [docs/spec.md](docs/spec.md)
- Load-bearing rules: [INVARIANTS.md](INVARIANTS.md)
- Deployment: [docs/deploy.md](docs/deploy.md)

## Development

Node version is pinned in `.tool-versions` (asdf). Then:

```sh
npm install
npm run db:migrate   # creates ./data/sqlite.db and applies migrations
npm run dev
```

Checks (same as CI): `npm run lint`, `npm run format:check`,
`npm run typecheck`, `npm test`, and `npm run db:generate` must produce no
new migration files.
