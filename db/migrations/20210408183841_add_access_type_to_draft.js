const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.enu('access', ['public', 'paywall']).notNullable().defaultTo('public')
  })

  await knex.raw(`
    UPDATE
      draft
    SET
      access = 'paywall'
    WHERE
      circle_id IS NOT NULL
  `)
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('access')
  })
}
