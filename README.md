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

## Environment Varaibles

The _Matters_ server includes a set of environment variables that can be
customized for different environments. These variables are systematically
organized into groups based on their respective components.

### Translation

- **MATTERS_TRANSLATION_DEFAULT**: The default translation driver.
- **MATTERS_TRANSLATION_GOOGLE_PROJECT_ID**: The [Project ID](https://cloud.google.com/resource-manager/docs/creating-managing-projects) from Google Cloud.
- **MATTERS_TRANSLATION_GOOGLE_KEY_FILE**: The path to the Google Cloud [service account credentials](https://cloud.google.com/iam/docs/service-account-creds).

## Test Mode

To make the login flow testing easier, the login-related mutations have hardcoded input values with respective behaviors in the non-production environment.

see [test_mode.md](./test_mode.md) for detail

## NOTE

AWS resources that we need to put in the same VPC

- Elastic Beanstalk
- RDS PostgreSQL
- ElastiCache Redis instances
  - Pub/Sub
  - Cache
  - Queue
- IPFS cluster EC2 instances
