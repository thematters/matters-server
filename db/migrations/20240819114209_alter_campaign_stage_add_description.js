const table = 'campaign_stage'
const column = 'description'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.text(column).notNullable()
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
}
