import DataLoader from 'dataloader'

import { PUBLISH_STATE } from 'common/enums'
import { BaseService } from 'connectors'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /*********************************
   *                               *
   *             Draft             *
   *                               *
   *********************************/
  archive = async (id: string) =>
    this.baseUpdate(id, { archived: true, updatedAt: new Date() })

  /**
   * Count user's drafts by a given author id (user).
   */
  countByAuthor = async (authorId: string) => {
    const result = await this.knex(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find drafts by publish state
   */
  findByPublishState = async ({
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

  /**
   * Find unpublished drafts by a given author id (user).
   */
  findUnpublishedByAuthor = (authorId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .andWhereNot({ publishState: PUBLISH_STATE.published })
      .orderBy('updated_at', 'desc')

  /**
   * Find draft by media hash.
   */
  findByMediaHash = async (mediaHash: string) =>
    this.knex.select().from(this.table).where({ mediaHash }).first()

  /**
   * Count pending and published drafts by given article id.
   */
  countValidByArticleId = async ({ articleId }: { articleId: string }) => {
    const result = await this.knex
      .from(this.table)
      .where({ articleId })
      .andWhere(
        this.knex.raw(`(
          (archived = true and publish_state = '${PUBLISH_STATE.published}')
          OR
          (archived = false and publish_state = '${PUBLISH_STATE.pending}')
        )`)
      )
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find pending and published drafts by given article id.
   */
  findValidByArticleId = async ({ articleId }: { articleId: string }) =>
    this.knex
      .from(this.table)
      .where({ articleId })
      .andWhere(
        this.knex.raw(`(
          (archived = true and publish_state = '${PUBLISH_STATE.published}')
          OR
          (archived = false and publish_state = '${PUBLISH_STATE.pending}')
        )`)
      )
      .orderBy('created_at', 'desc')
}
