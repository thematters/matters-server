const table = 'blocklist'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text('note')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('note')
  })
}
