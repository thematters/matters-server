import type { Connections } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'

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
}
