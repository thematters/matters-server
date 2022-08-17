# Matters Server

![Deployment Status](https://github.com/thematters/matters-server/workflows/Deployment/badge.svg) ![Test Status](https://github.com/thematters/matters-server/workflows/Test/badge.svg) [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

## Development

### Local

- Install dependencies: `npm install --legacy-peer-deps`
- Start Postgres, Redis, ElasticSearch, and IPFS daemon
- Setup Environments: `cp .env.example .env`
- Run all migrations: `npm run db:migrate`
- Populate all seeds data if needed: `npm run db:seed`
- Run `npm run start:dev`, then go to `http://localhost:4000/playground` to GraphQL Playground.
- Run test cases: `npm run test`

### Docker

- `cp .env.example .env`
- `docker-compose -f docker/docker-compose.yml build`
- `docker-compose -f docker/docker-compose.yml run app npm run db:rollback`
- `docker-compose -f docker/docker-compose.yml run app npm run db:migrate`
- `docker-compose -f docker/docker-compose.yml run app npm run db:seed`
- `docker-compose -f docker/docker-compose.yml up`
- Run test cases: `docker-compose -f docker/docker-compose.yml run app npm run test`
- Init search indices: `docker-compose -f docker/docker-compose.yml run app npm run search:init`

## DB migrations and seeds

- Create a new migration: `npm run db:migration:make <migration-name>`
- Create a new seed file: `npm run db:seed:make <seeds-name>`, seed files are run sequential so please pre-fix with order
- Rollback a migration: `npm run db:rollback`

## Email Template

We use [MJML](https://mjml.io) to develop our SendGrid email template.

Please refer to the repo [matters-email](https://github.com/thematters/matters-email) for details.

## NOTE

AWS resources that we need to put in the same VPC

- Elastic Beanstalk
- RDS PostgreSQL
- ElastiCache Redis instances
  - Pub/Sub
  - Cache
  - Queue
- ElasticSearch EC2 instances
- IPFS cluster EC2 instances
