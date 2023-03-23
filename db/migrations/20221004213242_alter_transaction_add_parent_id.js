const table = 'transaction'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('parent_id').unsigned().nullable()

    // Setup self referring foreign key
    t.foreign('parent_id').references('id').inTable(table)
    t.index('parent_id')
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropIndex('parent_id')
    t.dropColumn('parent_id')
  })
}
