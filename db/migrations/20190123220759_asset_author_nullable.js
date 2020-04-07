const table = 'asset'

exports.up = async knex => {
  await knex.schema.alterTable(table, t => {
    t.bigInteger('author_id')
      .nullable()
      .alter()
  })
}

exports.down = async knex => {
  await knex.schema.alterTable(table, function(t) {
    t.bigInteger('author_id')
      .notNullable()
      .alter()
  })
}
