const Knex = require('knex')
const knexConfig = require('../knexfile')
const knex = Knex(knexConfig[process.env['MATTERS_ENV']])

global.knex = knex

module.exports = async () => {
  const rollbackAllMigrations = async () => {
    const migration = await knex.migrate.currentVersion()
    if (migration !== 'none') {
      await knex.migrate.rollback()
      await rollbackAllMigrations()
    } else {
      return
    }
  }
  await rollbackAllMigrations()
  await knex.migrate.latest()
  await knex.seed.run()
}
