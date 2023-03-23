const table = 'article'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('sticky').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('sticky')
  })
}
