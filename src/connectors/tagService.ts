// external
import DataLoader from 'dataloader'
// internal
import { GQLSearchInput, ItemData } from 'definitions'
import { BaseService } from './baseService'
import { BATCH_SIZE } from 'common/enums'

export class TagService extends BaseService {
  constructor() {
    super('tag')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  create = async ({
    content
  }: {
    content: string
  }): Promise<{ id: string; content: string }> => {
    const [tag] = await this.findByContent(content)
    if (tag) {
      return tag
    }
    return await this.baseCreate({
      content
    })
  }

  find = async ({ where }: { where?: { [key: string]: any } }) => {
    let qs = this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')

    if (where) {
      qs = qs.where(where)
    }

    return await qs
  }

  findByContent = async (content: string) =>
    this.knex(this.table)
      .select()
      .where({ content })

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  search = async ({ key }: GQLSearchInput) =>
    await this.knex(this.table)
      .where('content', 'like', `%${key}%`)
      .limit(100)

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/
  recommendTags = async ({
    limit = BATCH_SIZE,
    offset = 0
  }: {
    limit?: number
    offset?: number
  }) =>
    await this.knex('tag_count_view')
      .select()
      .orderBy('tag_score', 'desc')
      .limit(limit)
      .offset(offset)

  findBoost = async (tagId: string) => {
    const tagBoost = await this.knex('tag_boost')
      .select()
      .where({ tagId })
      .first()

    if (!tagBoost) {
      return 1
    }

    return tagBoost.boost
  }

  setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate({
      where: { tagId: id },
      data: { tagId: id, boost },
      table: 'tag_boost'
    })

  findScore = async (tagId: string) => {
    const tag = await this.knex('tag_count_view')
      .select()
      .where({ id: tagId })
      .first()

    if (!tag) {
      return 1
    }

    return tag.tagScore
  }

  /*********************************
   *                               *
   *            Article            *
   *                               *
   *********************************/
  createArticleTags = async ({
    articleId,
    tagIds = []
  }: {
    [key: string]: any
  }) => {
    const items = tagIds.map((tagId: string) => ({ articleId, tagId }))
    return this.baseBatchCreate(items, 'article_tag')
  }

  /**
   * Count tags by a given tag text.
   */
  countArticles = async (id: string) => {
    const result = await this.knex('article_tag')
      .countDistinct('article_id')
      .where({ tagId: id })
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
      .limit(limit)
      .offset(offset)

    return result.map(({ articleId }: { articleId: string }) => articleId)
  }
}
