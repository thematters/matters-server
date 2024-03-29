const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('support_request')
    t.string('support_reply')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('support_request')
    t.dropColumn('support_reply')
  })
}
