const table = 'tag'

exports.up = async knex => {
  await knex.schema.table(table, t => {
    t.bigInteger('cover').unsigned()
    t.text('description')
    t.specificType('editors', 'text ARRAY')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, t => {
    t.dropColumn('cover')
    t.dropColumn('description')
    t.dropColumn('editors')
  })
}
