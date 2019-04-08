const table = 'draft'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.specificType('collection', 'text ARRAY')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('collection')
  })
}
