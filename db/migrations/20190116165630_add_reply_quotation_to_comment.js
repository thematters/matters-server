const table = 'comment'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('quote')
    t.integer('quotation_start')
    t.integer('quotation_end')
    t.text('quotation_content')
    t.bigInteger('reply_to').unsigned()

    t.foreign('reply_to').references('id').inTable('user')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.boolean('quote')
    t.dropColumn('quotation_start')
    t.dropColumn('quotation_end')
    t.dropColumn('quotation_content')
    t.dropColumn('reply_to')
  })
}
