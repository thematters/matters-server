const table = 'user_notify_setting'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    // rename
    t.renameColumn('follow', 'user_new_follower')
    t.renameColumn('comment', 'article_new_comment')
    t.renameColumn('appreciation', 'article_new_appreciation')
    t.renameColumn('article_subscription', 'article_new_subscription')
    t.renameColumn('comment_subscribed', 'article_subscribed_new_comment')
    t.renameColumn('comment_pinned', 'article_comment_pinned')

    // drop deprecated
    t.dropColumn('downstream')
    t.dropColumn('comment_voted')
    t.dropColumn('wallet_update')
    t.dropColumn('official_notice')

    // add circle related settings
    t.boolean('circle_new_follower').notNullable().defaultTo(true)
    t.boolean('circle_new_discussion').notNullable().defaultTo(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    // drop circle related settings
    t.dropColumn('circle_new_follower')
    t.dropColumn('circle_new_discussion')

    // add back dropped columns
    t.boolean('downstream').notNullable().defaultTo(true)
    t.boolean('comment_voted').notNullable().defaultTo(false)
    t.boolean('wallet_update').notNullable().defaultTo(false)
    t.boolean('official_notice').notNullable().defaultTo(true)

    // rollback renamed columns
    t.renameColumn('user_new_follower', 'follow')
    t.renameColumn('article_new_comment', 'comment')
    t.renameColumn('article_new_appreciation', 'appreciation')
    t.renameColumn('article_new_subscription', 'article_subscription')
    t.renameColumn('article_subscribed_new_comment', 'comment_subscribed')
    t.renameColumn('article_comment_pinned', 'comment_pinned')
  })
}
