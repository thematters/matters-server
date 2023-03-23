const table = 'tag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.bigInteger('cover').unsigned()
    t.text('description')
    t.specificType('editors', 'text ARRAY')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('cover')
    t.dropColumn('description')
    t.dropColumn('editors')
  })
}
