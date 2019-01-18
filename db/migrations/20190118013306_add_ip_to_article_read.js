const table = 'article_read'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.string('ip')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('ip')
  })
}
