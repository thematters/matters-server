const { baseDown } = require('../utils')

exports.up = async knex => {
  // copy transaction table
  await knex.raw(/*sql*/ `
  create table appreciation as
  table "transaction";
  `)
}

exports.down = baseDown(table)
