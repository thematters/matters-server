const table = 'user'
const column = 'agree_on'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.timestamp(column)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn(column)
  })
}
