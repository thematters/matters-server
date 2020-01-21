const table = 'article_tag'

exports.up = async knex => {
  await knex.schema.table(table, t => {
    t.boolean('selected')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, t => {
    t.dropColumn('selected')
  })
}
