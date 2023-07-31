import type { Draft } from 'definitions'

import DataLoader from 'dataloader'

import { PUBLISH_STATE } from 'common/enums'
import { BaseService } from 'connectors'

export class DraftService extends BaseService {
  public constructor() {
    super('draft')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  public loadById = async (id: string): Promise<Draft> =>
    this.dataloader.load(id) as Promise<Draft>
  public loadByIds = async (ids: string[]): Promise<Draft[]> =>
    this.dataloader.loadMany(ids) as Promise<Draft[]>

  public countByAuthor = async (authorId: string) => {
    const result = await this.knex(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findByPublishState = async ({
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

  public findUnpublishedByAuthor = (authorId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .andWhereNot({ publishState: PUBLISH_STATE.published })
      .orderBy('updated_at', 'desc')

  public findByMediaHash = async (mediaHash: string) =>
    this.knex.select().from(this.table).where({ mediaHash }).first()
}
