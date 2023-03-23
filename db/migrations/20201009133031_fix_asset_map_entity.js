const article_table = 'article'
const draft_table = 'draft'
const asset_map_table = 'asset_map'
const entity_type_table = 'entity_type'

export const up = async (knex) => {
  const { id: articleTypeId } = await knex(entity_type_table)
    .select('id')
    .where({ table: article_table })
    .first()
  const { id: draftTypeId } = await knex(entity_type_table)
    .select('id')
    .where({ table: draft_table })
    .first()

  if (!articleTypeId || !draftTypeId) {
    throw new Error('cannot find entity_type for article and draft tables.')
  }

  // link article assets back to the draft
  await knex.raw(`
    UPDATE
      ${asset_map_table}
    SET
      entity_id = asset_map_article_draft.draft_id,
      entity_type_id = '${draftTypeId}'
    FROM (
      SELECT
        asset_map.*,
        article.id AS article_id,
        draft.id AS draft_id
      FROM
        ${asset_map_table}
      LEFT JOIN ${article_table} ON article.id = entity_id
      LEFT JOIN ${draft_table} ON draft.id = article.draft_id
    WHERE
      entity_type_id = '${articleTypeId}'
      AND draft.id IS NOT NULL) AS asset_map_article_draft
    WHERE
      asset_map.id = asset_map_article_draft.id
  `)
}

export const down = async (knex) => {}
