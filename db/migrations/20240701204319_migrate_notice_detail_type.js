const table = 'notice_detail'

export const up = async (knex) => {
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

export const down = async (knex) => {
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
