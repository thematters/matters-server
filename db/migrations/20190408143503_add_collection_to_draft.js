const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.specificType('collection', 'text ARRAY')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('collection')
  })
}
