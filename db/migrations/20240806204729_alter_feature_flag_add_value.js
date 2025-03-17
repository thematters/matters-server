const table = 'feature_flag'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.float('value').nullable()
  })
  await knex(table).insert({ name: 'spam_detection', flag: 'off', value: 0.5 })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('value')
  })
}
