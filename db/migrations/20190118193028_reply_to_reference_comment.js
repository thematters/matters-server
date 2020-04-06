const table = 'comment'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('reply_to')
  })

  await knex.schema.table(table, function (t) {
    t.bigInteger('reply_to').unsigned()
    t.foreign('reply_to').references('id').inTable('comment')
  })
}

exports.down = async (knex) => {}
