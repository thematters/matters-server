const table = 'transaction'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.enu('type', ['LIKE', 'MAT']).notNullable().defaultTo('MAT')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('type')
  })
}
