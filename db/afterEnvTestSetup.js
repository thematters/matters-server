const Knex = require('knex')

const knexConfig = require('../knexfile')

const knex = Knex(knexConfig.test)

beforeAll(async () => {
  // reset database between tests

  if (process.env.TEST_RESET_DB === 'true') {
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
  }
}, 10000)
