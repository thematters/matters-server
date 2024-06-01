import Redis from 'ioredis'
import { knex } from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment } from 'common/environment'

// @ts-ignore
import knexConfig from '../../knexfile'

// init connections
const mainKnex = knex({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
})

const readonlyKnex = knex({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
  ...{ connection: environment.pgReadonlyConnectionString },
})

const searchKnexDB = knex({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
  ...{ connection: environment.searchPgConnectionString },
})

const cacheRedis =
  environment.cacheClusterHost && environment.cacheClusterPort
    ? new Redis.Cluster([
        {
          port: environment.cacheClusterPort,
          host: environment.cacheClusterHost,
        },
      ])
    : new Redis(environment.cachePort, environment.cacheHost)

export const connections = {
  knex: mainKnex,
  knexRO: readonlyKnex,
  knexSearch: searchKnexDB,
  redis: cacheRedis,
}
