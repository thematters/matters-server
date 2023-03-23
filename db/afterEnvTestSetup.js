import Knex from 'knex'
import knexConfig from '../knexfile.js'
import Redis from 'ioredis'

const knex = Knex(knexConfig.test)

beforeAll(async () => {
  const getTables = async (knex) => {
    // reset database
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
  await knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
  await knex.seed.run()

  // reset queue
  const queueRedis = new Redis({
    host: process.env.MATTERS_QUEUE_HOST,
    port: process.env.MATTERS_QUEUE_PORT,
  })
  await queueRedis.flushall()
}, 10000)
