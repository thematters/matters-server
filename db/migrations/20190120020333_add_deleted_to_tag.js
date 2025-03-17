const table = 'tag'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('deleted').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('deleted')
  })
}
