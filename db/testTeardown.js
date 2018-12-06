const Knex = require('knex')
const knexConfig = require('../knexfile')
const knex = Knex(knexConfig[process.env['MATTERS_ENV']])

module.exports = async () => {
  await global.knex.destroy()
}
