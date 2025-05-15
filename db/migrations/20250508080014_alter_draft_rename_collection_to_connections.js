const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('collection', 'connections')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('connections', 'collection')
  })
}
