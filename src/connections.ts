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
  keepAlive: 10000,
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

// Listen for Redis error events
cacheRedis.on('error', (error) => {
  console.error('Cache Redis connection error:', error)
})

const objectCacheRedis =
  environment.objectCachePort && environment.objectCacheHost
    ? new Redis(
        environment.objectCachePort,
        environment.objectCacheHost,
        redisConfig
      )
    : cacheRedis

// Listen for object cache Redis error events (only if it's a different instance)
if (objectCacheRedis !== cacheRedis) {
  objectCacheRedis.on('error', (error) => {
    console.error('Object cache Redis connection error:', error)
  })
}

const ensureConnected = async () => {
  try {
    await cacheRedis.ping()
  } catch (err: unknown) {
    console.log(err)
    await cacheRedis.connect()
  }
  if (objectCacheRedis !== cacheRedis) {
    try {
      await objectCacheRedis.ping()
    } catch (err: unknown) {
      console.log(err)
      await objectCacheRedis.connect()
    }
  }
}

export const connections = {
  knex: mainKnex,
  knexRO: readonlyKnex,
  knexSearch: searchKnexDB,
  redis: cacheRedis,
  objectCacheRedis,
  ensureConnected,
}
