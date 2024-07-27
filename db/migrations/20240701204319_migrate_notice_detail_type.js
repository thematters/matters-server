const table = 'notice_detail'

exports.up = async (knex) => {
  await knex(table)
    .update({
      notice_type: 'article_comment_liked',
    })
    .where({
      notice_type: 'comment_liked',
    })
  await knex(table)
    .update({
      notice_type: 'article_comment_mentioned_you',
    })
    .where({
      notice_type: 'comment_mentioned_you',
    })
}

exports.down = async (knex) => {
  await knex(table)
    .update({
      notice_type: 'comment_liked',
    })
    .where({
      notice_type: 'article_comment_liked',
    })
  await knex(table)
    .update({
      notice_type: 'comment_mentioned_you',
    })
    .where({
      notice_type: 'article_comment_mentioned_you',
    })
}
