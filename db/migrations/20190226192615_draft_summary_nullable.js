const table = 'draft'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('summary').nullable().alter()
  })
}

export const down = async (knex) => {}
