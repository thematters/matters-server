## Start local dev

- `npm i`
- Start local postgres (for Mac: https://postgresapp.com/)
- Export variables `MATTERS_PG_HOST`, `MATTERS_PG_USER`, `MATTERS_PG_PASSWORD`, `MATTERS_PG_DATABASE`
- Run all migrations: `npm run db:migrate`
- Populate all seeds data if needed: `npm run db:seed`
- Run `npm run start:dev`, then go to `http://localhost:4000/` to graphql playground.

## DB migrations and seeds

- Create a new migration: `npm run db:migration:make <migration-name>`
- Create a new seed file: `npm run db:seed:make <seeds-name>`, seed files are run sequential so please pre-fix with order
- Rollback a migration: `npm run db:rollback`

## Run test cases on local dev

- `npm run test`

## Start dev with docker-compose

- `cp .env.example .env`
- `docker-compose -f docker/docker-compose.yml build`
- `docker-compose -f docker/docker-compose.yml run app npm run db:rollback`
- `docker-compose -f docker/docker-compose.yml run app npm run db:migrate`
- `docker-compose -f docker/docker-compose.yml run app npm run db:seed`
- `docker-compose -f docker/docker-compose.yml up`

## Run test cases with docker-compose

- `docker-compose -f docker/docker-compose.yml run app npm run test`

## Deploy to beanstalk staging environment

- Make sure you have `python` and `pip` installed
- `pip install -U awscli awsebcli`
- `aws configure`, then input your access key and secret
- Login AWS ECR with `$(aws ecr get-login --no-include-email --region ap-southeast-1)`
- `docker-compose -f docker/docker-compose.yml build`
- `docker tag matters-server:latest 903380195283.dkr.ecr.ap-southeast-1.amazonaws.com/matters-server:develop`
- `docker push 903380195283.dkr.ecr.ap-southeast-1.amazonaws.com/matters-server:develop`
- `docker-compose -f docker/docker-compose.yml run app npm run build`
- `bin/eb-deploy.sh develop`

## Develop Email Template

We use [MJML](https://mjml.io) to develop our SendGrid email template.

Please refer to the repo [matters-email](https://github.com/thematters/matters-email) for details.

## NOTE: AWS resources that we need to put in the same VPC

- Elastic Beanstalk
- RDS PostgreSQL
- ElastiCache Redis instances
  - Pub/Sub
  - Cache
  - Queue
- ElasticSearch EC2 instances
- IPFS cluster EC2 instances

## Release a new version

1. Update `CHANGELOG.md`
2. Update `version` field of `package.json`
3. Create a new release and tag in [GitHub Releases](https://github.com/thematters/matters-web/releases)
