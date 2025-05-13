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

const cacheRedis = new Redis(environment.cachePort, environment.cacheHost)

const objectCacheRedis =
  environment.objectCachePort && environment.objectCacheHost
    ? new Redis(environment.objectCachePort, environment.objectCacheHost)
    : cacheRedis

export const connections = {
  knex: mainKnex,
  knexRO: readonlyKnex,
  knexSearch: searchKnexDB,
  redis: cacheRedis,
  objectCacheRedis,
}
