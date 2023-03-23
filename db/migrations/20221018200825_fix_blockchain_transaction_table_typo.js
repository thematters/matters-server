const table = 'blockchain_transaction'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('udpated_at', 'updated_at')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('updated_at', 'udpated_at')
  })
}
