import type { Connections } from 'definitions'

import { ARTICLE_STATE, JOURNAL_STATE, NODE_TYPES } from 'common/enums'
import { InvalidCursorError } from 'common/errors'

interface Writing {
  type: NODE_TYPES.Article | NODE_TYPES.Journal
  id: string
}

/**
 * This service provides functions to return mixed works of a user.
 * Works include articles, collections and journals, comments, etc.
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

  public findWritings = async (
    userId: string,
    { take, after }: { take: number; after?: { type: NODE_TYPES; id: string } }
  ): Promise<[Writing[], number, boolean]> => {
    const validTypes = [NODE_TYPES.Article, NODE_TYPES.Journal]
    if (after && !validTypes.includes(after.type)) {
      throw new InvalidCursorError('after is invalid cursor')
    }

    const { knexRO } = this.connections
    const subQuery = knexRO
      .select(
        knexRO.raw('count(1) OVER() AS total_count'),
        knexRO.raw('min(created_at) OVER() AS min_cursor'),
        '*'
      )
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
              .select(knexRO.raw("'Journal' AS type, id, created_at"))
              .from('journal')
              .where({
                authorId: userId,
                state: JOURNAL_STATE.active,
              })
          )
          .as('t1')
      )
      .as('t2')

    const query = knexRO
      .from(subQuery)
      .orderBy('created_at', 'desc')
      .limit(take)

    if (after) {
      const cursor = knexRO(after.type.toLowerCase())
        .select('created_at')
        .where({ id: after.id })
        .first()
      query.where('created_at', '<', cursor)
    }

    const records = await query
    if (records.length > 0) {
      const totalCount = +records[0].totalCount
      const hasNextPage =
        records[records.length - 1].createdAt > records[0].minCursor
      return [records, totalCount, hasNextPage]
    } else {
      const [{ count }] = await knexRO.from(subQuery).count()
      return [[], +count, false]
    }
  }
}
