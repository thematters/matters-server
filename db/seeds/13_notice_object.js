const table = 'notice_object'

exports.seed = function(knex, Promise) {
  return knex(table)
    .del()
    .then(async function() {
      const { id: articleEntityTypeId } = await knex
        .select('id')
        .from('entity_type')
        .where({ table: 'article' })
        .first()
      const { id: commentEntityTypeId } = await knex
        .select('id')
        .from('entity_type')
        .where({ table: 'comment' })
        .first()

      return knex(table).insert([
        {
          notice_type: 'user_new_follower'
        },
        {
          notice_type: 'article_published',
          entity_type_id: articleEntityTypeId,
          entity_id: 1
        },
        {
          notice_type: 'article_new_comment',
          entity_type_id: articleEntityTypeId,
          entity_id: 2
        },
        {
          notice_type: 'comment_pinned',
          entity_type_id: commentEntityTypeId,
          entity_id: 1
        },
        {
          notice_type: 'official_announcement',
          message: 'Version 1.0 is released!'
        }
      ])
    })
}
