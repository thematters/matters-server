const Knex = require('knex')
const Redis = require('ioredis')
const { RedisMemoryServer } = require('redis-memory-server')
const { sharedQueueOpts } = require('connectors/queue/utils')
const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

const redisServer = new RedisMemoryServer()

beforeAll(async () => {
  // reset database between tests

  const getTables = async (knex) => {
    const res = await knex.raw(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    )
    const tables = res.rows.map(({ table_name }) => table_name)
    const dataTables = tables.filter(
      (t) => !t.includes('knex') && t !== 'entity_type'
    )
    return dataTables.map((t) => 'public.' + t)
  }
  const tables = await getTables(knex)
  try {
    await knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
  } catch (e) {
    console.error(e)
    throw e
  }
  await knex.seed.run()

  // isolate redis server between tests

  redisPort = await redisServer.getPort()
  redisHost = await redisServer.getHost()
  jest.spyOn(sharedQueueOpts, 'createClient').mockImplementation(() => {
    return new Redis(redisPort, redisHost, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  })
}, 10000)
