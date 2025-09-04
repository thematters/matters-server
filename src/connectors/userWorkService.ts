import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { ARTICLE_STATE, MOMENT_STATE, NODE_TYPES, CHANNEL_ANTIFLOOD_WINDOW, CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW } from '#common/enums/index.js'

interface UserWriting {
  type: NODE_TYPES.Article | NODE_TYPES.Moment
  id: string
  created_at: Date
}

interface TagWriting {
  type: NODE_TYPES.Article | NODE_TYPES.Moment
  id: string
  pinned: boolean
  created_at: Date
}

/**
 * This service provides functions to return mixed works from users.
 * Works include articles, collections and moments, comments, etc.
 *
 * Functions return only single type of work should be put in their own service.
 */
export class UserWorkService {
  private connections: Connections

  public constructor(connections: Connections) {
    this.connections = connections
  }

  public totalPinnedWorks = async (userId: string): Promise<number> => {
    const { knex } = this.connections
    const res1 = await knex('article')
      .count()
      .where({ authorId: userId, pinned: true, state: ARTICLE_STATE.active })
      .first()
    const res2 = await knex('collection')
      .count()
      .where({ authorId: userId, pinned: true })
      .first()
    return (Number(res1?.count) || 0) + (Number(res2?.count) || 0)
  }

  public findWritingsByUser = (
    userId: string
  ): Knex.QueryBuilder<UserWriting, UserWriting[]> => {
    const { knexRO } = this.connections
    return knexRO
      .select('*')
      .from(
        knexRO
          .select(knexRO.raw("'Article' AS type, id, created_at"))
          .from('article')
          .where({
            authorId: userId,
            state: ARTICLE_STATE.active,
          })
          .union(
            knexRO
              .select(knexRO.raw("'Moment' AS type, id, created_at"))
              .from('moment')
              .where({
                authorId: userId,
                state: MOMENT_STATE.active,
              })
          )
          .as('t1')
      )
      .as('t2') as any
  }

  public findWritingsByTag = (
    tagId: string,
    options?: { flood?: boolean }
  ): Knex.QueryBuilder<TagWriting, TagWriting[]> => {
    const { knexRO } = this.connections
    const pinnedArticles = knexRO('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({ tagId, state: ARTICLE_STATE.active })
      .andWhere('article_tag.pinned', true)
      // use `article_tag.pinned_at + interval '100 year'` to ensure pinned articles precede others
      .select(
        knexRO.raw(
          "'Article' AS type, article.id AS id, true AS pinned, article_tag.pinned_at + interval '100 year' AS created_at, article.created_at AS orig_created_at, article.author_id AS author_id"
        )
      )

    const articles = knexRO('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({ tagId, state: ARTICLE_STATE.active })
      .andWhere('article_tag.pinned', false)
      .select(
        knexRO.raw(
          "'Article' AS type, article.id AS id, false AS pinned, article.created_at AS created_at, article.created_at AS orig_created_at, article.author_id AS author_id"
        )
      )

    const moments = knexRO('moment_tag')
      .join('moment', 'moment_id', 'moment.id')
      .where({ tagId, state: MOMENT_STATE.active })
      .select(
        knexRO.raw(
          "'Moment' AS type, moment.id AS id, false AS pinned, moment.created_at AS created_at, moment.created_at AS orig_created_at, moment.author_id AS author_id"
        )
      )

    const base = knexRO.union([pinnedArticles, articles, moments]);
    const baseQuery = knexRO.from(base.as('t')).select('*') as any;

    const { flood } = options || {};
    if (flood !== undefined) {
      const floodBaseQuery = knexRO
        .with('base', baseQuery)
        .with(
          'time_grouped',
          knexRO.raw(
            `SELECT *,
              ((extract(epoch FROM orig_created_at - first_value(orig_created_at) OVER (PARTITION BY author_id ORDER BY orig_created_at))/3600)::integer)/${CHANNEL_ANTIFLOOD_WINDOW} AS time_group
            FROM base`
          )
        )
        .with(
          'ranked',
          knexRO.raw(
            `SELECT *,
              row_number() OVER (PARTITION BY author_id, time_group ORDER BY orig_created_at ASC) as rank
            FROM time_grouped`
          )
        )
        .select('type', 'id', 'pinned', 'created_at')
        .from('ranked');
      if (flood === true) {
        return floodBaseQuery.where('rank', '>', CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW) as any;
      } else {
        return floodBaseQuery.where('rank', '<=', CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW) as any;
      }
    }

    return baseQuery.select('type', 'id', 'pinned', 'created_at') as any
  }
}
