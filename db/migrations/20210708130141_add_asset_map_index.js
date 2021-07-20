const table = 'asset_map'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['entity_type_id', 'entity_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['entity_type_id', 'entity_id'])
  })
}
