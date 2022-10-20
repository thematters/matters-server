const table = 'blockchain_transaction'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('udpated_at', 'updated_at')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('updated_at', 'udpated_at')
  })
}
