const table = 'draft'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.text('content').nullable().alter()
  })
}

export const down = async (knex) => {}
