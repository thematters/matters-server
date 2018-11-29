## Start local dev

- `npm i`
- Start local postgres (for Mac: https://postgresapp.com/)
- Export variables `MATTERS_PG_HOST`, `MATTERS_PG_USER`, `MATTERS_PG_PASSWORD`, `MATTERS_PG_DATABASE`
- Run all migrations: `npm run db:migrate`
- Populate all seeds data if needed: `npm run db:seed`
- Run `npm run start:dev`, then go to `http://localhost:4000/` to graphql playground.

## DB migrations and seeds

- Create a new migration: `npx knex migrate:make <migration-name>`
- Create a new seed file: `npx knex seed:make <seeds-name>`, seed files are run sequential so please pre-fix with order
- Rollback a migration: `npm run db:rollback`
