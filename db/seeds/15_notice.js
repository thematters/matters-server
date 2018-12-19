const table = {
  notice: 'notice',
  notice_detail: 'notice_detail',
  notice_actor: 'notice_actor',
  notice_entity: 'notice_entity'
}

exports.seed = async knex => {
  // notice detail
  await knex(table.notice_detail)
    .del()
    .then(async function() {
      return knex(table.notice_detail).insert([
        {
          notice_type: 'user_new_follower'
        },
        {
          notice_type: 'article_published'
        },
        {
          notice_type: 'article_new_downstream'
        },
        {
          notice_type: 'comment_pinned'
        },
        {
          notice_type: 'official_announcement',
          message: 'Version 1.0 is released!'
        }
      ])
    })

  // notice
  await knex(table.notice)
    .del()
    .then(function() {
      return knex(table.notice).insert([
        // user_new_follower
        {
          uuid: '00000000-0000-0000-0000-000000000000',
          notice_detail_id: 1,
          recipient_id: 1
        },
        // article_published
        {
          uuid: '00000000-0000-0000-0000-000000000001',
          notice_detail_id: 2,
          recipient_id: 1
        },
        // article_new_downstream
        {
          uuid: '00000000-0000-0000-0000-000000000002',
          notice_detail_id: 3,
          recipient_id: 1
        },
        // comment_pinned
        {
          uuid: '00000000-0000-0000-0000-000000000003',
          notice_detail_id: 4,
          recipient_id: 2
        },
        // official_announcement
        {
          uuid: '00000000-0000-0000-0000-000000000004',
          notice_detail_id: 5,
          recipient_id: 1
        },
        {
          uuid: '00000000-0000-0000-0000-000000000005',
          notice_detail_id: 5,
          recipient_id: 2
        },
        {
          uuid: '00000000-0000-0000-0000-000000000006',
          notice_detail_id: 5,
          recipient_id: 3
        }
      ])
    })

  // notice actor
  await knex(table.notice_actor)
    .del()
    .then(function() {
      return knex(table.notice_actor).insert([
        // user_new_follower
        {
          notice_id: 1,
          actor_id: 2
        },
        {
          notice_id: 1,
          actor_id: 3
        },
        // article_published
        {
          notice_id: 2,
          actor_id: 2
        },
        // article_new_downstream
        {
          notice_id: 3,
          actor_id: 2
        },
        // comment_pinned
        {
          notice_id: 4,
          actor_id: 1
        }
      ])
    })

  // notice entity
  await knex(table.notice_entity)
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

      return knex(table.notice_entity).insert([
        // article_published
        {
          type: 'target',
          entity_type_id: articleEntityTypeId,
          entity_id: 1,
          notice_id: 2
        },
        // article_new_downstrea,
        {
          type: 'target',
          entity_type_id: articleEntityTypeId,
          entity_id: 2,
          notice_id: 3
        },
        {
          type: 'recipient_article',
          entity_type_id: articleEntityTypeId,
          entity_id: 1,
          notice_id: 3
        },
        // comment_pinned
        {
          type: 'target',
          entity_type_id: commentEntityTypeId,
          entity_id: 1,
          notice_id: 4
        }
      ])
    })
}
