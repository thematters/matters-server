exports.up = async (knex) => {
  const draftEntityTypeId = (
    await knex('entity_type').select('id').where({ table: 'draft' }).first()
  ).id
  const articleEntityTypeId = (
    await knex('entity_type').select('id').where({ table: 'article' }).first()
  ).id

  // copy published draft asset_map to related article
  await knex.raw(`
    INSERT INTO
      asset_map (entity_type_id, entity_id, asset_id)
    SELECT
      ${articleEntityTypeId}, draft.article_id, asset_id
        FROM asset_map
          JOIN draft ON draft.id = asset_map.entity_id
            AND entity_type_id=${draftEntityTypeId}
            AND entity_id IN (SELECT id FROM draft WHERE publish_state='published')
    ON CONFLICT DO NOTHING;
`)
}

exports.down = async () => {
  // do nothing
}
