// external
import DataLoader from 'dataloader'
import _ from 'lodash'
// internal
import { GQLSearchInput } from 'definitions'
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
  }): Promise<{ id: string; content: string }> =>
    this.baseFindOrCreate({
      where: { content },
      data: { content }
    })

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
    offset = 0,
    oss = false
  }: {
    limit?: number
    offset?: number
    oss?: boolean
  }) => {
    const table = oss ? 'tag_count_view' : 'tag_count_materialized'
    return await this.knex(table)
      .select()
      .orderByRaw('tag_score DESC NULLS LAST')
      .limit(limit)
      .offset(offset)
  }

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
      data: { tagId: id, boost, updatedAt: new Date() },
      table: 'tag_boost'
    })

  findScore = async (tagId: string) => {
    const tag = await this.knex('tag_count_view')
      .select()
      .where({ id: tagId })
      .first()
    return tag.tagScore || 0
  }

  /*********************************
   *                               *
   *            Article            *
   *                               *
   *********************************/
  createArticleTags = async ({
    articleIds,
    tagIds
  }: {
    articleIds: string[]
    tagIds: string[]
  }) => {
    articleIds = _.uniq(articleIds)
    tagIds = _.uniq(tagIds)

    const items = _.flatten(
      articleIds.map(articleId => {
        return tagIds.map(tagId => ({ articleId, tagId }))
      })
    )
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

  /**
   * Find article ids by tag id with offset/limit
   */
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

  /**
   * Find article ids by tag ids
   */
  findArticleIdsByTagIds = async (tagIds: string[]) => {
    const result = await this.knex
      .select('article_id')
      .from('article_tag')
      .whereIn('tag_id', tagIds)
      .groupBy('article_id')
    return result.map(({ articleId }: { articleId: string }) => articleId)
  }

  /*********************************
   *                               *
   *              OSS              *
   *                               *
   *********************************/
  deleteTags = async (tagIds: string[]) => {
    // delete article tags
    await this.knex('article_tag')
      .whereIn('tag_id', tagIds)
      .del()

    // delete tags
    await this.baseBatchUpdate(tagIds, { deleted: true })
  }

  renameTag = async ({ tagId, content }: { tagId: string; content: string }) =>
    this.baseUpdate(tagId, { content, updatedAt: new Date() })

  mergeTags = async ({
    tagIds,
    content
  }: {
    tagIds: string[]
    content: string
  }) => {
    // create new tag
    const newTag = await this.create({ content })

    // move article tags to new tag
    const articleIds = await this.findArticleIdsByTagIds(tagIds)
    await this.createArticleTags({ articleIds, tagIds: [newTag.id] })

    // delete article tags
    await this.knex('article_tag')
      .whereIn('tag_id', tagIds)
      .del()

    // delete tags
    await this.baseBatchUpdate(tagIds, { deleted: true })

    return newTag
  }
}
