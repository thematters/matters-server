const table = 'feature_flag'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('enabled')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('enabled').notNullable().defaultTo(false)
  })
}
