const Knex = require('knex')
const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

beforeAll(async () => {
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
  console.time('truncate')
  const tables = await getTables(knex)
  await Promise.all([
    knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`),
    knex
      .raw('select relation::regclass, * from pg_locks where not granted;')
      .then((res) => console.log(res.rows)),
  ])
  console.timeEnd('truncate')
  console.time('seed')
  await knex.seed.run()
  console.timeEnd('seed')
}, 10000)
