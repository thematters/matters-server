# Matters Server

![Deployment Status](https://github.com/thematters/matters-server/workflows/Deployment/badge.svg) ![Test Status](https://github.com/thematters/matters-server/workflows/Test/badge.svg) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

## Development

### Local

- Install dependencies: `npm install`
- Start Postgres, Redis, stripe-mock, and IPFS daemon
- Setup Environments: `cp .env.example .env`
- Run all migrations: `npm run db:migrate`
- Populate all seeds data if needed: `npm run db:seed`
- Run `npm run start:dev`, then go to `http://localhost:4000/playground` to GraphQL Playground.
- Run test cases: `npm run test`

- Run db rollup process; use the same psql command line parameters if modified in .env; (hint `-d database` and `-U username`, and `-w` to read saved password of psqlrc)

      (cd ./db; PSQL='psql -h localhost ... -w' bash -xe bin/refresh-lasts.sh )

### Docker

- `cp .env.example .env`
- `docker compose build`
- `docker compose run app npm run db:rollback`
- `docker compose run app npm run db:migrate`
- `docker compose run app npm run db:seed`
- `docker compose up`
- Run test cases: `docker compose run app npm run test`
- Init search indices: `docker compose run app npm run search:init`

## DB migrations and seeds

- Create a new migration: `npm run db:migration:make <migration-name>`
- Create a new seed file: `npm run db:seed:make <seeds-name>`, seed files are run sequential so please pre-fix with order
- Rollback a migration: `npm run db:rollback`

## Documentation

- [Project Structure](docs/Project-Structure.md) - Overview of the codebase organization, directory layout, key components, and development workflow
- [API Design and Implementation](docs/API-Design-and-Implement.md) - Guidelines for designing and implementing GraphQL APIs, including resolver implementation steps and best practices
- [Database Modification](docs/Database-Modification.md) - Step-by-step guide for adding new tables, including migration creation, type definitions, and testing requirements
- [Audit Logging](docs/Audit-Logging.md) - Documentation for implementing audit logging, including purpose, usage patterns, and integration with analytics
- [Unit Testing Guidelines](docs/Unittest.md) - Comprehensive guide for writing unit tests, including test structure, patterns, and best practices
- [Test Mode](docs/Test-Mode.md) - Information about test mode configurations, E2E testing patterns, and hardcoded test values
- [Notification System](docs/Notification-System.md) - Comprehensive documentation of the notification system, including architecture, implementation details, and usage examples

## NOTE

AWS resources that we need to put in the same VPC

- Elastic Beanstalk
- RDS PostgreSQL
- ElastiCache Redis instances
  - Pub/Sub
  - Cache
  - Queue
- IPFS cluster EC2 instances
- Lambda