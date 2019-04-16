const table = 'draft'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.specificType('mention', 'text ARRAY')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('mention')
  })
}
