const table = 'comment'

exports.up = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('quote')
    t.integer('quotation_start')
    t.integer('quotation_end')
    t.text('quotation_content')
    t.bigInteger('reply_to').unsigned()

    t.foreign('reply_to')
      .references('id')
      .inTable('user')
  })
}

exports.down = async knex => {
  await knex.schema.table(table, function(t) {
    t.dropColumn('quotation_start')
    t.dropColumn('quotation_end')
    t.dropColumn('quotation_content')
    t.dropColumn('reply_to')
  })
}
