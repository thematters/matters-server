const table_comment = 'comment'


exports.up = async knex => {
  // comment
  await knex.schema.table(table_comment, t => {
    t.index('author_id').index('state')
  })
}

exports.down = async knex => {
  // comment
  await knex.schema.table(table_comment, t => {
    t.dropIndex('author_id').dropIndex('state')
  })
}
