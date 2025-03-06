import { Redis } from 'ioredis'
import { knex } from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment } from 'common/environment.js'

import knexConfig from '../../knexfile.js'

// init connections
const mainKnex = knex({
  ...knexConfig[environment.env as keyof typeof knexConfig],
  ...knexSnakeCaseMappers(),
})

const readonlyKnex = knex({
  ...knexConfig[environment.env as keyof typeof knexConfig],
  ...knexSnakeCaseMappers(),
  ...{ connection: environment.pgReadonlyConnectionString },
})

const searchKnexDB = knex({
  ...knexConfig[environment.env as keyof typeof knexConfig],
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
