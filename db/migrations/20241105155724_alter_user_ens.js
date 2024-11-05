const table = 'user'
const ensNameColumn = 'ens_name'
const ensNameUpdatedAtColumn = 'ens_name_updated_at'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.string(ensNameColumn)
    t.timestamp(ensNameUpdatedAtColumn)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(ensNameColumn)
    t.dropColumn(ensNameUpdatedAtColumn)
  })
}
