const table = 'draft'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.boolean('can_comment').notNullable().defaultTo(true)
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('can_comment')
  })
}
