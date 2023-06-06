const Redis = require('ioredis')
const Knex = require('knex')
const { RedisMemoryServer } = require('redis-memory-server')

const { sharedQueueOpts } = require('connectors/queue/utils')

const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

const redisServer = new RedisMemoryServer()

beforeAll(async () => {
  // reset database between tests

  const getTables = async (k) => {
    const res = await k.raw(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    )
    const tbls = res.rows.map(({ table_name }) => table_name)
    const dataTables = tbls.filter(
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

  const redisPort = await redisServer.getPort()
  const redisHost = await redisServer.getHost()
  jest.spyOn(sharedQueueOpts, 'createClient').mockImplementation(() => {
    return new Redis(redisPort, redisHost, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  })
}, 10000)
