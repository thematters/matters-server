import DataLoader from 'dataloader'

import { ARTICLE_ACCESS_TYPE, PUBLISH_STATE } from 'common/enums'
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
   * Count revisions by given article id.
   */
  countRevisions = async ({ articleId }: { articleId: string }) => {
    const drafts = await this.knex
      .from(this.table)
      .where({ articleId })
      .whereIn('publish_state', [
        PUBLISH_STATE.published,
        PUBLISH_STATE.pending,
      ])
      .orderBy('created_at', 'asc')

    if (!drafts || drafts.length <= 1) {
      return 0
    }

    const initDraft = drafts[0]
    const isInitPaywalled = initDraft?.access === ARTICLE_ACCESS_TYPE.paywall

    // count all drafts if the first draft is paywalled
    // since subsequent revisions won't change the access
    if (isInitPaywalled) {
      return drafts.length - 1
    }

    // otherwise, count all drafts except the paywalled one
    const hasPaywalled = drafts.some(
      (d) => d.access === ARTICLE_ACCESS_TYPE.paywall
    )
    return drafts.length - 1 - (hasPaywalled ? 1 : 0)
  }
}
