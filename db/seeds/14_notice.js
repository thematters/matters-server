const { v4 } = require('uuid')

const table = {
  notice: 'notice',
  notice_detail: 'notice_detail',
  notice_actor: 'notice_actor',
  notice_entity: 'notice_entity',
}

exports.seed = async (knex) => {
  /**
   * prepare seeds
   */
  const { id: articleTypeId } = await knex
    .select('id')
    .from('entity_type')
    .where({
      table: 'article',
    })
    .first()
  const { id: commentTypeId } = await knex
    .select('id')
    .from('entity_type')
    .where({
      table: 'comment',
    })
    .first()
  const notices = [
    // actors (2, 3) follow recipient_id (1)
    {
      notice_type: 'user_new_follower',
      actors: ['2', '3'],
      recipient_id: '1',
    },
    // recipient_id (1) 's article (1) was published
    {
      notice_type: 'article_published',
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1)'s article (1) has a new downstream article (2) by actor (2)
    {
      notice_type: 'article_new_downstream',
      actors: ['2'],
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
        {
          type: 'downstream',
          entity_type_id: articleTypeId,
          entity_id: '2',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1)'s article (1) has new appreciations by actors (2, 3)
    {
      notice_type: 'article_new_appreciation',
      actors: ['2', '3'],
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1)'s article (1) has new subscribebrs (2, 3)
    {
      notice_type: 'article_new_subscriber',
      actors: ['2', '3'],
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1)'s article (1) has a new comment by actor (3)
    {
      notice_type: 'article_new_comment',
      actors: ['3'],
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
        {
          type: 'comment',
          entity_type_id: commentTypeId,
          entity_id: '1',
        },
      ],
      recipient_id: '1',
    },
    // upstream (2) of article (4) was archived
    {
      notice_type: 'upstream_article_archived',
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '4',
        },
        {
          type: 'upstream',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
      ],
      recipient_id: '1',
    },
    // downstream (2) of article (1) was archived
    {
      notice_type: 'downstream_article_archived',
      entities: [
        {
          type: 'target',
          entity_type_id: articleTypeId,
          entity_id: '1',
        },
        {
          type: 'downstream',
          entity_type_id: articleTypeId,
          entity_id: '2',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1)'s comment (4) was pinned
    {
      notice_type: 'comment_pinned',
      entities: [
        {
          type: 'target',
          entity_type_id: commentTypeId,
          entity_id: '4',
        },
      ],
      actors: ['3'],
      recipient_id: '1',
    },
    // recipient_id (1)'s comment (4) has a new reply by actor (2)
    {
      notice_type: 'comment_new_reply',
      actors: ['2'],
      entities: [
        {
          type: 'target',
          entity_type_id: commentTypeId,
          entity_id: '1',
        },
        {
          type: 'reply',
          entity_type_id: commentTypeId,
          entity_id: '4',
        },
      ],
      recipient_id: '1',
    },
    // recipient_id (1) was mentioned by actir (2)'s comment (2)
    {
      notice_type: 'comment_mentioned_you',
      actors: ['2'],
      entities: [
        {
          type: 'target',
          entity_type_id: commentTypeId,
          entity_id: '2',
        },
      ],
      recipient_id: '1',
    },
    // Official Announcement
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      message: 'Click to update the latest version of Matters!',
      data: {
        link: 'https://matters.news/download/',
      },
    },
    // Official Announcement - User Banned
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      message:
        '因為違反社區規則，Matters 決定將您禁言 7 天，期間無法發佈作品、評論和讚賞',
    },
    // Official Announcement - User Frozen
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      message:
        '因為違反社區規則，Matters 決定將您的賬戶凍結，無法在站上進行互動',
    },
    // Official Announcement - Article Violation
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      data: {
        link: 'https://matters.news/@test1/slug-some-ipfs-media-hash-1',
      },
      message:
        '因為違反社區規則，Matters 決定將您的作品《改革開放四十週年大會看點》隱藏',
    },
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      data: {
        link: 'https://matters.news/@test1/slug-some-ipfs-media-hash-1',
      },
      message:
        '因為未違反社區規則， Matters 對您的作品《改革開放四十週年大會看點》將不做任何處理',
    },
    // Official Announcement - Article Report Feedback
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      data: {
        link: 'https://matters.news/@test1/slug-some-ipfs-media-hash-1',
      },
      message:
        '你舉報的作品《改革開放四十週年大會看點》已被刪除！感謝你對 Matters 的支持！',
    },
    {
      notice_type: 'official_announcement',
      recipient_id: '1',
      data: {
        link: 'https://matters.news/@test1/slug-some-ipfs-media-hash-1',
      },
      message:
        '您舉報的作品《改革開放四十週年大會看點》經查並未違反社區規則，將不做處理',
    },
  ]

  /**
   * start seeding
   */
  for (const [index, notice] of notices.entries()) {
    const id = index + 1
    // create notice detail
    await knex(table.notice_detail).insert({
      notice_type: notice.notice_type,
      message: notice.message,
      data: notice.data,
    })
    // create notice
    const { id: notice_id } = (
      await knex(table.notice)
        .insert({
          uuid: v4(),
          notice_detail_id: id,
          recipient_id: notice.recipient_id,
        })
        .returning('*')
    )[0]
    // create notice actor
    await Promise.all(
      (notice.actors || []).map(async (actor_id) => {
        await knex(table.notice_actor).insert({
          notice_id,
          actor_id,
        })
      })
    )
    // craete notice entities
    await Promise.all(
      (notice.entities || []).map(
        async ({ type, entity_type_id, entity_id }) => {
          await knex(table.notice_entity).insert({
            type,
            entity_type_id,
            entity_id,
            notice_id,
          })
        }
      )
    )
  }
}
