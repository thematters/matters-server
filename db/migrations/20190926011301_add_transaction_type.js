const table = 'transaction'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.enu('type', ['LIKE', 'MAT']).notNullable().defaultTo('MAT')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('type')
  })
}
