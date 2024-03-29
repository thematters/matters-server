const table = 'draft'

exports.up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('support_request', 'request_for_donation')
    t.renameColumn('support_reply', 'reply_to_donator')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.renameColumn('request_for_donation', 'support_request')
    t.renameColumn('reply_to_donator', 'support_reply')
  })
}
