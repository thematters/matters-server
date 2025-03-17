const table = 'asset'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('author_id').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, function (t) {
    t.bigInteger('author_id').notNullable().alter()
  })
}
