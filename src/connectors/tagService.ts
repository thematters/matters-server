import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import _ from 'lodash'

import { ARTICLE_STATE, BATCH_SIZE } from 'common/enums'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { BaseService } from 'connectors'
import { GQLSearchInput } from 'definitions'

export class TagService extends BaseService {
  constructor() {
    super('tag')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  /**
   * Find tags
   */
  find = async ({
    limit = BATCH_SIZE,
    offset = 0,
    sort
  }: {
    limit?: number
    offset?: number
    sort?: 'newest' | 'oldest' | 'hottest'
  }): Promise<any[]> => {
    let query = null

    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex
        .select()
        .from(this.table)
        .orderBy('created_at', by)

    if (sort == 'hottest') {
      query = this.knex
        .select('tag_id', 'tag.*')
        .from('article_tag')
        .count('tag_id')
        .join('tag', 'tag_id', 'tag.id')
        .groupBy('tag_id', 'tag.id')
        .orderBy('count', 'desc')
    } else if (sort === 'oldest') {
      query = sortCreatedAt('asc')
    } else if (sort === 'newest') {
      query = sortCreatedAt('desc')
    } else {
      query = sortCreatedAt('desc')
    }

    return query.limit(limit).offset(offset)
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

  search = async ({
    key,
    first = 20,
    offset,
    oss = false
  }: GQLSearchInput & { offset: number; oss?: boolean }) => {
    // for local dev
    // if (environment.env === 'development') {
    //   return this.knex(this.table)
    //     .where('content', 'ilike', `%${key}%`)
    //     .offset(offset)
    //     .limit(first)
    // }

    const body = bodybuilder()
      .query('match', 'content', key)
      .from(offset)
      .size(first)
      .build()

    try {
      const result = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })

      const { hits } = result

      const ids = hits.hits.map(({ _id }) => _id)
      const tags = await this.baseFindByIds(ids, this.table)

      return { nodes: tags, totalCount: hits.total }
    } catch (err) {
      logger.error(err)
      throw new ServerError('tag search failed')
    }
  }

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
      .orderBy('count', 'desc')
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
      .join('article', 'article_id', 'article.id')
      .countDistinct('article_id')
      .where({ tagId: id, state: ARTICLE_STATE.active })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
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
    filter?: { [key: string]: any }
  }) => {
    const result = await this.knex
      .select('article_id')
      .from('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({ tagId, state: ARTICLE_STATE.active })
      .limit(limit)
      .offset(offset)
      .orderBy('article_tag.id', 'desc')

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
