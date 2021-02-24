const comment = 'comment'

exports.up = async (knex) => {
  await knex.schema.table(comment, function (t) {
    t.timestamp('pinned_at')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(comment, function (t) {
    t.dropColumn('pinned_at')
  })
}
