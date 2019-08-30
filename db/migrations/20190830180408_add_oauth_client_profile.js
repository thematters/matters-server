const table = 'oauth_client'

exports.up = async knex => {
  await knex.schema.table(table, function (t) {
    t.string('name').notNullable()
      .unique()
    t.text('description')
    t.text('website_url')
    t.bigInteger('avatar')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('avatar')
    t.dropColumn('website_url')
    t.dropColumn('description')
    t.dropColumn('name')
  })
}
