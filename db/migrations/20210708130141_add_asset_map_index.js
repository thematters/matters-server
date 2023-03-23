const table = 'asset_map'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.index(['entity_type_id', 'entity_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropIndex(['entity_type_id', 'entity_id'])
  })
}
