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

## Start dev with docker-compose

- `cp .env.example .env`
- `docker-compose -f docker/docker-compose.yml build`
- `docker-compose -f docker/docker-compose.yml run app npm run db:migrate`
- `docker-compose -f docker/docker-compose.yml run app npm run db:seed`
- `docker-compose -f docker/docker-compose.yml up`

## Deploy to beanstalk staging environment

- Make sure you have `python` and `pip` installed
- `pip install -U awscli awsebcli`
- `aws configure`, then input your access key and secret
- Login AWS ECR with `$(aws ecr get-login --no-include-email --region ap-southeast-1)`
- `docker-compose -f docker/docker-compose.yml build`
- `docker tag matters-server:latest 903380195283.dkr.ecr.ap-southeast-1.amazonaws.com/matters-server:staging`
- `docker push 903380195283.dkr.ecr.ap-southeast-1.amazonaws.com/matters-server:staging`
- `docker-compose -f docker/docker-compose.yml run app npm run build`
- `bin/eb-deploy.sh staging`