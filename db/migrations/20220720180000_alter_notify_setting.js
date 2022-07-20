const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.boolean('circle_member_new_broadcast_reply').notNullable().defaultTo(true)
    t.renameColumn('circle_member_boradcast', 'circle_member_broadcast')
    t.renameColumn('in_circle_new_boradcast', 'in_circle_new_broadcast')
    t.renameColumn(
      'in_circle_new_boradcast_reply',
      'in_circle_new_broadcast_reply'
    )
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('circle_member_new_broadcast_reply')
    t.renameColumn('circle_member_broadcast', 'circle_member_boradcast')
    t.renameColumn('in_circle_new_broadcast', 'in_circle_new_boradcast')
    t.renameColumn(
      'in_circle_new_broadcast_reply',
      'in_circle_new_boradcast_reply'
    )
  })
}
