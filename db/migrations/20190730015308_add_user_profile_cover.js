const table = 'user'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('profile_cover')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('profile_cover')
  })
}
