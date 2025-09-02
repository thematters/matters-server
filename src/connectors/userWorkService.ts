import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { ARTICLE_STATE, MOMENT_STATE, NODE_TYPES } from '#common/enums/index.js'

interface Writing {
  type: NODE_TYPES.Article | NODE_TYPES.Moment
  id: string
  created_at: Date
}

/**
 * This service provides functions to return mixed works of a user.
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
  ): Knex.QueryBuilder<Writing, Writing[]> => {
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
}
