const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('summary_customized').defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('summary_customized')
  })
}
