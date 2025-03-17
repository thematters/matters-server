const table = 'matters_today'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('cover')
    t.string('title')
    t.string('summary')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('cover')
    t.dropColumn('title')
    t.dropColumn('summary')
  })
}
