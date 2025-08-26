const table = 'topic_channel'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('description')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.string('description').nullable()
  })
}
