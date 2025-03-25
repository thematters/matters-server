const table = 'tag'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('owner').unsigned().nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('owner')
  })
}
