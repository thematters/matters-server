exports.up = async (knex) => {
  // delete data

  const covers = await knex('topic').select('cover')
  const assetIds = covers.map(({ cover }) => cover)

  await knex('article_topic').del()
  await knex('article_chapter').del()
  await knex('chapter').del()
  await knex('topic').del()

  if (assetIds.length > 0) {
    await knex('asset_map').whereIn('asset_id', assetIds).del()
    await knex('asset').whereIn('id', assetIds).del()
  }

  // drop tables

  const deleteTable = async (table) => {
    await knex('entity_type')
      .where({
        table,
      })
      .del()
    await knex.schema.dropTable(table)
  }
  await deleteTable('article_topic')
  await deleteTable('article_chapter')
  await deleteTable('chapter')
  await deleteTable('topic')
}

exports.down = () => {
  // do nothing
}
