const table = 'topic'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.integer('order').defaultTo(0)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('order')
  })
}
