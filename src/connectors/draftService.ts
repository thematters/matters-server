import type { Draft, Connections } from '#definitions/index.js'

import { PUBLISH_STATE } from '#common/enums/index.js'
import { BaseService } from '#connectors/index.js'

export class DraftService extends BaseService<Draft> {
  public constructor(connections: Connections) {
    super('draft', connections)
  }

  public countByAuthor = async (authorId: string) => {
    const result = await this.knexRO(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findByPublishState = ({
    articleIdIsNull,
    publishState,
  }: {
    articleIdIsNull: boolean
    publishState: string
  }) => {
    const query = this.knex.select().from(this.table).where({ publishState })

    if (articleIdIsNull === false) {
      query.whereNotNull('article_id')
    }
    if (articleIdIsNull === true) {
      query.whereNull('article_id')
    }
    return query
  }

  public findUnpublishedByPublishAt = (date: Date) =>
    this.knexRO
      .select()
      .from(this.table)
      .where({ publishState: PUBLISH_STATE.unpublished })
      .where('publish_at', '<=', date)

  public findUnpublishedByAuthor = (authorId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .andWhereNot({ publishState: PUBLISH_STATE.published })
      .orderBy('updated_at', 'desc')
}
