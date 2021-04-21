const table = 'circle_invoice'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('coupon_id').nullable()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('coupon_id')
  })
}
