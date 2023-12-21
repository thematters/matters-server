const table = {
  report: 'report',
  report_asset: 'report_asset',
}

exports.up = async (knex) => {
  await knex.schema.dropTable(table.report_asset)
  await knex.table(table.report).delete()
  await knex.schema.table(table.report, function (t) {
    t.enu('reason', [
      'tort',
      'illegal_advertising',
      'discrimination_insult_hatred',
      'pornography_involving_minors',
      'other',
    ]).notNullable()
    t.dropColumn('category')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table.report, function (t) {
    t.string('category').notNullable()
    t.dropColumn('reason')
  })
}
