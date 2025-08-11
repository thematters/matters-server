import { environment } from '#common/environment.js'
import { Redis } from 'ioredis'
import knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'

// @ts-expect-error #explicit-any
import knexConfig from '../knexfile.js'

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

const redisConfig = {
  keepAlive: 1000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
}

const cacheRedis = new Redis(
  environment.cachePort,
  environment.cacheHost,
  redisConfig
)

const objectCacheRedis =
  environment.objectCachePort && environment.objectCacheHost
    ? new Redis(
        environment.objectCachePort,
        environment.objectCacheHost,
        redisConfig
      )
    : cacheRedis

export const connections = {
  knex: mainKnex,
  knexRO: readonlyKnex,
  knexSearch: searchKnexDB,
  redis: cacheRedis,
  objectCacheRedis,
}
