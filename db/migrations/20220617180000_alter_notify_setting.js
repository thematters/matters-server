const table = 'user_notify_setting'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    // add circle related settings for circle owners
    t.boolean('circle_new_subscriber').notNullable().defaultTo(true)
    // t.boolean('circle_new_follower').notNullable().defaultTo(true)
    t.boolean('circle_new_unsubscriber').notNullable().defaultTo(true)
    t.boolean('circle_member_boradcast').notNullable().defaultTo(true)
    t.boolean('circle_member_new_discussion').notNullable().defaultTo(true)
    t.boolean('circle_member_new_discussion_reply')
      .notNullable()
      .defaultTo(true)

    // add circle related settings for circle members
    t.boolean('in_circle_new_article').notNullable().defaultTo(true)
    t.boolean('in_circle_new_boradcast').notNullable().defaultTo(true)
    t.boolean('in_circle_new_boradcast_reply').notNullable().defaultTo(false)
    t.boolean('in_circle_new_discussion').notNullable().defaultTo(true)
    t.boolean('in_circle_new_discussion_reply').notNullable().defaultTo(false)
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    // drop circle related settings
    t.dropColumn('circle_new_subscriber')
    t.dropColumn('circle_new_unsubscriber')
    t.dropColumn('circle_member_boradcast')
    t.dropColumn('circle_member_new_discussion')
    t.dropColumn('circle_member_new_discussion_reply')

    // drop circle related settings for circle members
    t.dropColumn('in_circle_new_article')
    t.dropColumn('in_circle_new_boradcast')
    t.dropColumn('in_circle_new_boradcast_reply')
    t.dropColumn('in_circle_new_discussion')
    t.dropColumn('in_circle_new_discussion_reply')
  })
}
