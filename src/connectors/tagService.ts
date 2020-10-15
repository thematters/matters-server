import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import _ from 'lodash'

import {
  ARTICLE_STATE,
  BATCH_SIZE,
  MATERIALIZED_VIEW,
  TAG_ACTION,
} from 'common/enums'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { BaseService } from 'connectors'
import { GQLSearchInput, ItemData } from 'definitions'

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
    sort,
  }: {
    limit?: number
    offset?: number
    sort?: 'newest' | 'oldest' | 'hottest'
  }) => {
    let query = null

    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex.select().from(this.table).orderBy('created_at', by)

    if (sort === 'hottest') {
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

  /**
   * Find tags by a given content.
   *
   */
  findByContent = async ({ content }: { content: string }) =>
    this.knex.select().from(this.table).where({ content })

  /**
   * Find tags by a given article id.
   *
   */
  findByArticleId = async ({ articleId }: { articleId: string }) =>
    this.knex
      .select('tag.*')
      .from('article_tag')
      .join(this.table, 'tag.id', 'article_tag.tag_id')
      .where({ articleId })

  /**
   *  Find tags by a given creator id (user).
   */
  findByCreator = async (userId: string) => {
    const query = this.knex
      .select()
      .from(this.table)
      .where({ creator: userId })
      .orderBy('id', 'desc')

    return query
  }

  /**
   *  Find tags by a given editor id (user).
   */
  findByEditor = async (userId: string) => {
    const query = this.knex
      .select()
      .from(this.table)
      .where(this.knex.raw(`editors @> ARRAY['${userId}']`))
      .orderBy('id', 'desc')

    return query
  }

  /**
   * Find tags by a given owner id (user).
   */
  findByOwner = async (userId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ owner: userId })
      .orderBy('id', 'desc')

  /**
   * Find tags by a given maintainer id (user).
   *
   */
  findByMaintainer = async (userId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ owner: userId })
      .orWhere(this.knex.raw(`editors @> ARRAY['${userId}']`))
      .orderBy('id', 'desc')

  /**
   * Create a tag, but return one if it's existing.
   *
   */
  create = async ({
    content,
    cover,
    creator,
    description,
    editors,
    owner,
  }: {
    content: string
    cover?: string
    creator: string
    description?: string
    editors: string[]
    owner: string
  }) => {
    const item = await this.knex(this.table).select().where({ content }).first()

    // create
    if (!item) {
      const tag = await this.baseCreate(
        { content, cover, creator, description, editors, owner },
        this.table
      )

      // add tag into search engine
      await this.addToSearch({
        id: tag.id,
        content: tag.content,
        description: tag.description,
      })

      return tag
    }

    return item
  }

  /**
   * Count of a tag's participants.
   *
   */
  countParticipants = async ({
    id,
    exclude,
  }: {
    id: string
    exclude?: string[]
  }) => {
    const subquery = this.knex.raw(`(
        SELECT
            at.*, article.author_id
        FROM
            article_tag AS at
        INNER JOIN
            article ON article.id = at.article_id
        WHERE
            at.tag_id = ${id}
    ) AS base`)

    const result = await this.knex
      .from((knex: any) => {
        const source = knex
          .select('author_id')
          .from(subquery)
          .groupBy('author_id')

        if (exclude) {
          source.whereNotIn('author_id', exclude)
        }

        source.as('source')
      })
      .count()
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find a tag's participants.
   *
   */
  findParticipants = async ({
    id,
    offset = 0,
    limit = BATCH_SIZE,
    exclude,
  }: {
    id: string
    offset?: number
    limit?: number
    exclude?: string[]
  }) => {
    const subquery = this.knex.raw(`(
        SELECT
            at.*, article.author_id
        FROM
            article_tag AS at
        INNER JOIN
            article ON article.id = at.article_id
        WHERE
            at.tag_id = ${id}
        ORDER BY
            at.created_at
    ) AS base`)

    const query = this.knex
      .select('author_id')
      .from(subquery)
      .groupBy('author_id')

    if (exclude) {
      query.whereNotIn('author_id', exclude)
    }

    if (limit) {
      query.limit(limit)
    }

    if (offset) {
      query.offset(offset)
    }

    return query
  }

  /*********************************
   *                               *
   *             Follow            *
   *                               *
   *********************************/
  follow = async ({
    targetId,
    userId,
  }: {
    targetId: string
    userId: string
  }) => {
    const data = {
      userId,
      targetId,
      action: TAG_ACTION.follow,
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_tag',
    })
  }

  unfollow = async ({
    targetId,
    userId,
  }: {
    targetId: string
    userId: string
  }) =>
    this.knex
      .from('action_tag')
      .where({
        targetId,
        userId,
        action: TAG_ACTION.follow,
      })
      .del()
  /**
   * Find followers of a tag using id as pagination index.
   *
   */
  findFollowers = async ({
    targetId,
    limit = BATCH_SIZE,
    after,
  }: {
    targetId: string
    limit?: number
    after?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_tag')
      .where({ targetId, action: TAG_ACTION.follow })
      .orderBy('id', 'desc')
      .limit(limit)

    if (after) {
      query.andWhere('id', '<', after)
    }
    return query
  }

  /**
   * Determine if an user followed a tag or not by a given id.
   *
   */
  isFollower = async ({
    userId,
    targetId,
  }: {
    userId: string
    targetId: string
  }) => {
    const result = await this.knex
      .select()
      .from('action_tag')
      .where({ userId, targetId, action: TAG_ACTION.follow })
      .first()
    return !!result
  }

  countFollowers = async (targetId: string) => {
    const result = await this.knex('action_tag')
      .where({ targetId, action: TAG_ACTION.follow })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  addToSearch = async ({
    id,
    content,
    description,
  }: {
    [key: string]: any
  }) => {
    try {
      const result = await this.es.indexItems({
        index: this.table,
        items: [
          {
            id,
            content,
            description,
          },
        ],
      })
      return result
    } catch (error) {
      logger.error(error)
    }
  }

  updateSearch = async ({
    id,
    content,
    description,
  }: {
    [key: string]: any
  }) => {
    try {
      const result = await this.es.client.update({
        index: this.table,
        id,
        body: {
          doc: { content, description },
        },
      })
      return result
    } catch (error) {
      logger.error(error)
    }
  }

  deleteSearch = async ({ id }: { [key: string]: any }) => {
    try {
      const result = await this.es.client.delete({
        index: this.table,
        id,
      })
      return result
    } catch (error) {
      logger.error(error)
    }
  }

  search = async ({
    key,
    first = 20,
    offset,
    oss = false,
  }: GQLSearchInput & { offset: number; oss?: boolean }) => {
    const body = bodybuilder()
      .query('match', 'content', key)
      .from(offset)
      .size(first)
      .build()

    try {
      const result = await this.es.client.search({
        index: this.table,
        body,
      })

      const { hits } = result.body

      const ids = hits.hits.map(({ _id }: { _id: any }) => _id)
      const tags = await this.baseFindByIds(ids, this.table)

      return { nodes: tags, totalCount: hits.total.value }
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

  /**
   * Find all tags in score-based order.
   *
   */
  recommendTags = async ({
    limit = BATCH_SIZE,
    offset = 0,
    oss = false,
  }: {
    limit?: number
    offset?: number
    oss?: boolean
  }) => {
    const table = oss
      ? 'tag_count_view'
      : MATERIALIZED_VIEW.tagCountMaterialized
    return this.knex(table)
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
      table: 'tag_boost',
    })

  findScore = async (tagId: string) => {
    const tag = await this.knex('tag_count_view')
      .select()
      .where({ id: tagId })
      .first()
    return tag.tagScore || 0
  }

  /**
   * Find curation-like tags.
   *
   */
  findCurationTags = ({
    mattyId,
    fields = ['*'],
    limit,
  }: {
    mattyId: string
    fields?: any[]
    limit?: number
  }) => {
    const query = this.knex
      .select(fields)
      .from(MATERIALIZED_VIEW.curationTagMaterialized)
      .orderBy('uuid')

    if (limit) {
      query.limit(limit)
    }
    return query
  }

  /**
   * Find non-curation-like tags based on score order.
   *
   */
  findNonCurationTags = ({
    mattyId,
    fields = ['*'],
    oss = false,
  }: {
    mattyId: string
    fields?: any[]
    oss?: boolean
  }) => {
    const curation = this.findCurationTags({ mattyId, fields: ['id'] })
    const query = this.knex.select(fields).from((knex: any) => {
      const source = knex
        .select()
        .from(oss ? 'tag_count_view' : MATERIALIZED_VIEW.tagCountMaterialized)
        .whereNotIn('id', curation)
        .orderByRaw('tag_score DESC NULLS LAST')
        .orderBy('count', 'desc')
      source.as('source')
    })
    return query
  }

  /**
   * Find curation-like and non-curation-like tags in specific order.
   *
   */
  findArrangedTags = async ({
    mattyId,
    limit = BATCH_SIZE,
    offset = 0,
    oss = false,
  }: {
    mattyId: string
    limit?: number
    offset?: number
    oss?: boolean
  }) => {
    const curation = this.findCurationTags({
      mattyId,
      fields: ['id', this.knex.raw('1 as type')],
    })
    const nonCuration = this.findNonCurationTags({
      mattyId,
      fields: ['id', this.knex.raw('2 as type')],
      oss,
    })
    const query = this.knex
      .select(['id', 'type'])
      .from(curation.as('curation'))
      .unionAll([nonCuration])
      .orderBy('type')
      .limit(limit)
      .offset(offset)
    return query
  }

  /*********************************
   *                               *
   *            Article            *
   *                               *
   *********************************/
  createArticleTags = async ({
    articleIds,
    creator,
    tagIds,
    selected,
  }: {
    articleIds: string[]
    creator: string
    tagIds: string[]
    selected?: boolean
  }) => {
    articleIds = _.uniq(articleIds)
    tagIds = _.uniq(tagIds)

    const items = _.flatten(
      articleIds.map((articleId) => {
        return tagIds.map((tagId) => ({
          articleId,
          creator,
          tagId,
          ...(selected === true ? { selected } : {}),
        }))
      })
    )
    return this.baseBatchCreate(items, 'article_tag')
  }

  /**
   * Update article tag.
   */
  putArticleTag = async ({
    articleId,
    tagId,
    data,
  }: {
    articleId: string
    tagId: string
    data: ItemData
  }) =>
    this.knex('article_tag')
      .where({ articleId, tagId })
      .update(data)
      .returning('*')

  /**
   * Count tags by a given tag text.
   */
  countArticles = async ({
    id,
    selected,
  }: {
    id: string
    selected?: boolean
  }) => {
    const result = await this.knex('article_tag')
      .join('article', 'article_id', 'article.id')
      .countDistinct('article_id')
      .where({
        tagId: id,
        state: ARTICLE_STATE.active,
        ...(selected === true ? { selected } : {}),
      })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find article ids by tag id with offset/limit
   */
  findArticleIds = async ({
    id: tagId,
    offset = 0,
    limit = BATCH_SIZE,
    selected,
  }: {
    id: string
    offset?: number
    limit?: number
    filter?: { [key: string]: any }
    selected?: boolean
  }) => {
    const result = await this.knex
      .select('article_id')
      .from('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({
        tagId,
        state: ARTICLE_STATE.active,
        ...(selected === true ? { selected } : {}),
      })
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

  deleteArticleTagsByArticleIds = async ({
    articleIds,
    tagId,
  }: {
    articleIds: string[]
    tagId: string
  }) =>
    this.knex('article_tag')
      .whereIn('article_id', articleIds)
      .andWhere({ tagId })
      .del()

  deleteArticleTagsByTagIds = async ({
    articleId,
    tagIds,
  }: {
    articleId: string
    tagIds: string[]
  }) =>
    this.knex('article_tag')
      .whereIn('tag_id', tagIds)
      .andWhere({ articleId })
      .del()

  isArticleSelected = async ({
    articleId,
    tagId,
  }: {
    articleId: string
    tagId: string
  }) => {
    const result = await this.knex('article_tag').where({
      articleId,
      tagId,
      selected: true,
    })
    return result.length > 0
  }

  /**
   * Find article covers by tag id.
   */
  findArticleCovers = async ({ id }: { id: string }) =>
    this.knex
      .select('article.cover')
      .from('article_tag')
      .join('article', 'article_id', 'article.id')
      .whereNotNull('cover')
      .andWhere({
        tagId: id,
        state: ARTICLE_STATE.active,
      })
      .limit(BATCH_SIZE)
      .orderBy('article_tag.id', 'asc')

  /*********************************
   *                               *
   *              OSS              *
   *                               *
   *********************************/
  deleteTags = async (tagIds: string[]) => {
    // delete article tags
    await this.knex('article_tag').whereIn('tag_id', tagIds).del()

    // delete action tag
    await this.knex('action_tag')
      .whereIn('target_id', tagIds)
      .andWhere('action', 'follow')
      .del()

    // delete tags
    await this.baseBatchDelete(tagIds)
  }

  renameTag = async ({ tagId, content }: { tagId: string; content: string }) =>
    this.baseUpdate(tagId, { content, updatedAt: new Date() })

  mergeTags = async ({
    tagIds,
    content,
    creator,
    editors,
    owner,
  }: {
    tagIds: string[]
    content: string
    creator: string
    editors: string[]
    owner: string
  }) => {
    // create new tag
    const newTag = await this.create({ content, creator, editors, owner })

    // add tag into search engine
    await this.addToSearch({
      id: newTag.id,
      content: newTag.content,
      description: newTag.description,
    })

    // move article tags to new tag
    const articleIds = await this.findArticleIdsByTagIds(tagIds)
    await this.createArticleTags({ articleIds, creator, tagIds: [newTag.id] })

    // delete article tags
    await this.knex('article_tag').whereIn('tag_id', tagIds).del()

    // update existing action tag
    await this.knex.raw(`
      INSERT INTO action_tag (user_id, action, target_id)
      SELECT
        user_id, 'follow', ${newTag.id}
      FROM action_tag
      WHERE target_id in (${tagIds.join(',')})
      GROUP BY user_id
    `)
    await this.knex('action_tag')
      .whereIn('target_id', tagIds)
      .andWhere('action', 'follow')
      .del()

    // delete tags
    await this.baseBatchDelete(tagIds)

    await Promise.all(tagIds.map((id: string) => this.deleteSearch({ id })))

    return newTag
  }
}
