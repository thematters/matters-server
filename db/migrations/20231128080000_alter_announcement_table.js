const table = 'announcement'

const newColumn = 'expired_at'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(newColumn)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
  })
}
