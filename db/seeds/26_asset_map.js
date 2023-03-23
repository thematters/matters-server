import { v4 } from 'uuid'

const table = 'asset_map'

export const seed = async (knex) => {
  /**
   * prepare seeds
   */
  const { id: userTypeId } = await knex
    .select('id')
    .from('entity_type')
    .where({ table: 'user' })
    .first()
  const { id: articleTypeId } = await knex
    .select('id')
    .from('entity_type')
    .where({ table: 'article' })
    .first()

  await knex(table).del()
  await knex(table).insert([
    {
      asset_id: '1',
      entity_type_id: userTypeId,
      entity_id: '1',
    },
    {
      asset_id: '2',
      entity_type_id: userTypeId,
      entity_id: '2',
    },
    {
      asset_id: '3',
      entity_type_id: userTypeId,
      entity_id: '3',
    },
    {
      asset_id: '4',
      entity_type_id: articleTypeId,
      entity_id: '1',
    },
    {
      asset_id: '5',
      entity_type_id: articleTypeId,
      entity_id: '2',
    },
    {
      asset_id: '6',
      entity_type_id: articleTypeId,
      entity_id: '3',
    },
  ])
}
