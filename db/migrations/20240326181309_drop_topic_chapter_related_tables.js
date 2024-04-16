exports.up = async (knex) => {
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
