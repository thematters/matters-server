import { BaseService } from './baseService'
import { BATCH_SIZE } from 'common/enums'
import DataLoader from 'dataloader'

export class TagService extends BaseService {
  constructor() {
    super('tag')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  create = ({ content }: { content: string }) =>
    this.baseCreate({
      content
    })

  recommendTags = async ({ offset = 0, limit = 5 }) =>
    await this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Count tags by a given tag text.
   */
  countArticles = async ({ id: tagId }: { id: string }): Promise<number> => {
    const result = await this.knex('article_tag')
      .countDistinct('article_id')
      .where({ tagId })
      .first()
    return parseInt(result.count, 10)
  }

  findArticleIds = async ({
    id: tagId,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    id: string
    offset?: number
    limit?: number
  }) => {
    const result = await this.knex
      .select('article_id')
      .from('article_tag')
      .where({ tagId })
      .offset(offset)
      .limit(limit)

    return result.map(({ articleId }: { articleId: string }) => articleId)
  }
}
