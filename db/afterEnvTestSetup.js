const Knex = require('knex')
const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

beforeAll(async () => {
  console.time('seed database')
  const { count } = await knex('public.user').count().first()
  if (count === '0') {
    await knex.seed.run()
  }
  console.timeEnd('seed database')
})

afterAll(async () => {
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
  console.time('truncate database')
  const tables = await getTables(knex)
  await knex.raw(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
  console.timeEnd('truncate database')
})
