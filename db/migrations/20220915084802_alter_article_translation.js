const table = 'article_translation'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('summary').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('summary').notNullable().alter()
  })
}
