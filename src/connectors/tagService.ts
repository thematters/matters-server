import type {
  Connections,
  ItemData,
  Tag,
  TagBoost,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_STATE,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  TAG_ACTION,
  MATERIALIZED_VIEW,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  TooManyTagsForArticleError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  normalizeTagInput,
  excludeSpam as excludeSpamModifier,
} from '#common/utils/index.js'
import _ from 'lodash'

import { BaseService } from './baseService.js'
import { SearchService } from './searchService.js'
import { SystemService } from './systemService.js'

const logger = getLogger('service-tag')

export class TagService extends BaseService<Tag> {
  private searchService: SearchService
  public constructor(connections: Connections) {
    super('tag', connections)
    this.searchService = new SearchService(connections)
  }

  public validate = async (
    content: string,
    {
      viewerId,
    }: {
      viewerId: string
    }
  ) => {
    if (normalizeTagInput(content) !== content) {
      throw new UserInputError('bad tag format')
    }
    // Validate Matty tag
    const isMatty = viewerId === environment.mattyId
    const mattyTagId = environment.mattyChoiceTagId
    if (mattyTagId && !isMatty) {
      const mattyTag = await this.models.tagIdLoader.load(mattyTagId)
      if (mattyTag && content === mattyTag.content) {
        throw new ForbiddenError('not allow to add official tag')
      }
    }
    return content
  }

  /**
   * Find tags
   */
  public find = async ({
    skip,
    take,
    sort,
  }: {
    skip?: number
    take?: number
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

    if (skip !== undefined && Number.isFinite(skip)) {
      query.offset(skip)
    }
    if (take !== undefined && Number.isFinite(take)) {
      query.limit(take)
    }

    return query
  }

  /**
   * Find tags by a given content.
   *
   */
  public findByContent = async ({ content }: { content: string }) =>
    this.knex.select().from(this.table).where({ content })

  public findByContentIn = async (contentIn: string[]) =>
    this.knex.select().from(this.table).whereIn('content', contentIn)

  /**
   * Find tags by a given article id.
   *
   */
  public findByArticleId = async ({ articleId }: { articleId: string }) =>
    this.knex
      .select('tag.*')
      .from('article_tag')
      .join(this.table, 'tag.id', 'article_tag.tag_id')
      .where({ articleId })

  public findByArticleIds = async ({ articleIds }: { articleIds: string[] }) =>
    this.knex
      .select('tag_id', 'article_id')
      .from('article_tag')
      // .join(this.table, 'tag.id', 'article_tag.tag_id')
      .whereIn('article_id', articleIds)

  public findByAuthorUsage = async ({
    userId,
    skip,
    take,
  }: {
    userId: string
    skip?: number
    take?: number
  }) => {
    const baseQuery = this.knexRO.raw(
      `
        (SELECT
            tag.*,
            count(1) AS num_articles,
            MAX(article.created_at) AS last_use
        FROM article
        JOIN article_tag ON article.id = article_tag.article_id
        JOIN tag ON article_tag.tag_id = tag.id
        WHERE article.author_id=? GROUP BY tag.id) AS base
    `,
      userId
    )

    const tags = await this.knexRO
      .select(
        '*',
        this.knexRO.raw('count(1) OVER() AS total_count'),
        this.knexRO.raw(
          `(age(last_use) <= '3 months' ::interval) AS recent_inuse`
        )
      )
      .from(baseQuery)
      .orderByRaw(`recent_inuse DESC NULLS LAST`)
      .orderByRaw(`num_articles DESC`)
      .orderByRaw(`last_use DESC NULLS LAST`)
      .orderByRaw(`id DESC`)
      .modify((builder: Knex.QueryBuilder) => {
        if (environment.mattyChoiceTagId) {
          builder.whereNotIn('id', [environment.mattyChoiceTagId])
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })
    return [tags, +(tags[0]?.totalCount ?? 0)]
  }

  public findPinnedTagsByUserId = async ({
    userId,
    skip,
    take,
  }: {
    userId: string
    skip?: number
    take?: number
  }): Promise<Array<{ id: string }>> =>
    this.knex
      .select('target_id AS id')
      .from('action_tag')
      .where({ userId, action: TAG_ACTION.pin })
      .orderBy('updated_at', 'desc') // update updated_at to re-order
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  public upsert = async ({
    content,
    creator,
  }: {
    content: string
    creator: string
  }) => {
    const [tag] = await this.models.upsertOnConflict({
      table: 'tag',
      create: { content: normalizeTagInput(content), creator },
      update: { deleted: false },
      onConflict: this.knex.raw('(content) WHERE NOT deleted'),
    })

    this.searchService.triggerIndexingTag(tag.id)

    return tag
  }

  /*********************************
   *                               *
   *             Follow            *
   *                               *
   *********************************/
  // superceded / deprecated by isActionEnabled / setActionEnabled
  public follow = async ({
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
      data: data,
      table: 'action_tag',
    })
  }

  // superceded / deprecated by isActionEnabled / setActionEnabled
  public unfollow = async ({
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

  public isActionEnabled = async ({
    userId,
    action,
    targetId,
  }: {
    userId: string
    action: TAG_ACTION
    targetId: string
  }) => {
    const result = await this.knex
      .select('id')
      .from('action_tag')
      .where({ userId, action, targetId })
      .first()
    return !!result
  }

  public setActionEnabled = async ({
    userId,
    action,
    targetId,
    enabled,
  }: {
    userId: string
    action: TAG_ACTION
    targetId: string
    enabled: boolean
  }) => {
    const data = {
      userId,
      action,
      targetId,
    }
    return enabled
      ? this.baseUpdateOrCreate({
          where: data,
          data,
          table: 'action_tag',
        })
      : this.knex.from('action_tag').where(data).del()
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/

  public findBoost = async (tagId: string) => {
    const tagBoost = await this.knexRO('tag_boost')
      .select()
      .where({ tagId })
      .first()

    if (!tagBoost) {
      return 1
    }

    return tagBoost.boost
  }

  public setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate<TagBoost>({
      where: { tagId: id },
      data: { tagId: id, boost },
      table: 'tag_boost',
    })

  public findScore = async (tagId: string) => {
    const tag = await this.knexRO('tag_count_view')
      .select()
      .where({ id: tagId })
      .first()
    return tag.tagScore || 0
  }

  public countTopTags = async () => {
    const result = await this.knexRO(MATERIALIZED_VIEW.tag_stats_materialized)
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findTopTags = ({
    take = 50,
    skip,
    minAuthors,
  }: {
    take?: number
    skip?: number
    minAuthors?: number
  }): Promise<Array<{ id: string }>> =>
    this.knexRO
      .select('tag_id as id')
      .from(MATERIALIZED_VIEW.tag_stats_materialized)
      .modify((builder: Knex.QueryBuilder) => {
        if (minAuthors) {
          builder.where('all_users', '>=', minAuthors)
        }
      })
      .orderBy('all_users', 'desc')
      .orderBy('all_articles', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  /*********************************
   *                               *
   *            Article            *
   *                               *
   *********************************/
  public createArticleTags = async ({
    articleIds,
    tagIds,
    creator,
  }: {
    articleIds: string[]
    tagIds: string[]
    creator: string
  }) => {
    articleIds = Array.from(new Set(articleIds))
    tagIds = Array.from(new Set(tagIds))

    const items = articleIds
      .map((articleId) =>
        tagIds.map((tagId) => ({ articleId, creator, tagId }))
      )
      .flat(1)

    return this.baseBatchCreate(items, 'article_tag')
  }

  /**
   * Update article tag.
   */
  public putArticleTag = async ({
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
   * Count article authors by a given tag id.
   */
  public countAuthors = async ({ id: tagId }: { id: string }) => {
    const result = await this.knexRO('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({ tagId, state: ARTICLE_STATE.active })
      .countDistinct('author_id')
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count articles by a given tag id.
   */
  public countArticles = async ({ id: tagId }: { id: string }) => {
    const result = await this.knexRO('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({ tagId, state: ARTICLE_STATE.active })
      .countDistinct('article_id')
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  private getHottestArticlesBaseQuery = (tagId: string) => {
    return this.knexRO
      .with('tagged_articles', (builder) =>
        builder
          .select(
            'article.id',
            'avn.created_at',
            this.knexRO.raw('COALESCE(article_stats.reads, 0) as reads')
            // this.knexRO.raw('COALESCE(article_stats.claps, 0) as claps')
          )
          .from('article_tag')
          .innerJoin('article', 'article.id', 'article_tag.article_id')
          .innerJoin(
            'article_version_newest as avn',
            'avn.article_id',
            'article_tag.article_id'
          )
          .leftJoin(
            'article_stats_materialized as article_stats',
            'article_stats.article_id',
            'article_tag.article_id'
          )
          .where({
            'article_tag.tag_id': tagId,
            'article.state': ARTICLE_STATE.active,
          })
      )
      .with('scored_articles', (builder) =>
        builder
          .select('*')
          .from('tagged_articles')
          .select(
            this.knexRO.raw(
              "ROW_NUMBER() OVER (ORDER BY reads ASC) - (2 * DATE_PART('day', CURRENT_DATE - created_at)) AS score"
            )
          )
      )
  }

  public findHottestArticleIds = async ({
    id: tagId,
    skip,
    take,
  }: {
    id: string
    skip?: number
    take?: number
  }) => {
    const hasHottest = await this.knexRO(
      MATERIALIZED_VIEW.tag_hottest_materialized
    )
      .where({ tagId })
      .first()

    if (!hasHottest) {
      return []
    }

    const results = await this.getHottestArticlesBaseQuery(tagId)
      .select('id as article_id')
      .from('scored_articles')
      .orderBy('score', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return results.map(({ articleId }: { articleId: string }) => articleId)
  }

  public countHottestArticles = async ({ id: tagId }: { id: string }) => {
    const hasHottest = await this.knexRO(
      MATERIALIZED_VIEW.tag_hottest_materialized
    )
      .where({ tagId })
      .first()

    if (!hasHottest) {
      return 0
    }

    const result = await this.getHottestArticlesBaseQuery(tagId)
      .from('scored_articles')
      .count()
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find related authors by tag id
   */
  public findRelatedAuthors = async ({
    id: tagId,
    skip,
    take,
  }: {
    id: string
    skip?: number
    take?: number
  }) => {
    const result = await this.knexRO
      .select('author_id as id')
      .from(MATERIALIZED_VIEW.tag_related_authors_materialized)
      .where({ tagId })
      .orderBy('score', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return result.map(({ id }: { id: string }) => id)
  }

  public countRelatedAuthors = async ({ id: tagId }: { id: string }) => {
    const result = await this.knexRO
      .count()
      .from(MATERIALIZED_VIEW.tag_related_authors_materialized)
      .where({ tagId })
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find article ids by tag id with offset/limit
   */
  public findArticleIds = async ({
    id: tagId,
    excludeRestricted,
    excludeSpam,
    skip,
    take,
  }: {
    id: string
    excludeRestricted?: boolean
    excludeSpam?: boolean
    skip?: number
    take?: number
  }) => {
    const systemService = new SystemService(this.connections)
    const spamThreshold = await systemService.getSpamThreshold()
    const query = this.knexRO
      .select('article.id as articleId')
      .from('article')
      .leftJoin('article_tag', 'article_tag.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .andWhere((builder: Knex.QueryBuilder) => {
        builder.where('article_tag.tag_id', tagId)
      })
      .modify((builder: Knex.QueryBuilder) => {
        if (excludeRestricted) {
          builder.whereNotIn(
            'article.authorId',
            this.knexRO.select('userId').from('user_restriction')
          )
        }
        if (excludeSpam) {
          builder.modify(excludeSpamModifier, spamThreshold, 'article')
        }

        builder.orderBy('article.id', 'desc')

        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return (await query).map(
      ({ articleId }: { articleId: string }) => articleId
    )
  }

  /**
   * Find article ids by tag ids
   */
  public findArticleIdsByTagIds = async (tagIds: string[]) => {
    const result = await this.knex
      .select('article_id')
      .from('article_tag')
      .whereIn('tag_id', tagIds)
      .groupBy('article_id')
    return result.map(({ articleId }: { articleId: string }) => articleId)
  }

  public deleteArticleTagsByTagIds = async ({
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

  /*********************************
   *                               *
   *              OSS              *
   *                               *
   *********************************/
  public renameTag = async ({
    tagId,
    content,
  }: {
    tagId: string
    content: string
  }) => {
    const tag = await this.models.update({
      table: 'tag',
      where: { id: tagId },
      data: { content },
    })
    this.searchService.triggerIndexingTag(tagId)
    return tag
  }

  public mergeTags = async ({
    tagIds,
    content,
    creator,
  }: {
    tagIds: string[]
    content: string
    creator: string
  }) => {
    // create new tag
    const newTag = await this.upsert({ content, creator })

    // move article tags to new tag
    const articleIds = await this.findArticleIdsByTagIds(tagIds)
    await this.createArticleTags({
      articleIds,
      tagIds: [newTag.id],
      creator,
    })

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

    return newTag
  }

  // follow tags by content
  public followTags = async (userId: string, tags: string[]) => {
    const items = await this.findByContentIn(tags)

    await Promise.all(
      items
        .filter(Boolean)
        .map((tag) =>
          this.follow({ targetId: tag.id, userId }).catch((err) =>
            logger.error(
              `ERROR: follow "${tag.id}-${tag.content}" failed:`,
              err,
              tag
            )
          )
        )
    )
  }

  /**
   * Find Tags recommended based on relations to current tag.
   * top100 at most
   *
   */
  public findRelatedTags = async ({ id }: { id: string; content?: string }) =>
    this.knex
      .from(MATERIALIZED_VIEW.tags_lasts_view_materialized)
      .joinRaw(
        'CROSS JOIN jsonb_to_recordset(top_rels) AS x(tag_rel_id int, count_rel int, count_common int, similarity float)'
      )
      .where(this.knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [id]))
      .select('x.tag_rel_id AS id')
      .orderByRaw('x.count_rel * x.similarity DESC NULLS LAST')

  public updateArticleTags = async ({
    articleId,
    tags,
  }: {
    articleId: string
    tags: string[]
  }) => {
    const article = await this.models.articleIdLoader.load(articleId)
    // validate
    const oldIds = (await this.findByArticleId({ articleId: article.id })).map(
      ({ id: tagId }: { id: string }) => tagId
    )

    if (
      tags &&
      tags.length > MAX_TAGS_PER_ARTICLE_LIMIT &&
      tags.length > oldIds.length
    ) {
      throw new TooManyTagsForArticleError(
        `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
      )
    }

    // create tag records
    const dbTags = await Promise.all(
      tags
        .filter(Boolean)
        .map(async (content: string) =>
          this.upsert({ content, creator: article.authorId })
        )
    )

    const newIds = dbTags.map(({ id: tagId }) => tagId)

    const addIds = _.difference(newIds, oldIds)

    // add
    await this.createArticleTags({
      articleIds: [article.id],
      tagIds: addIds,
      creator: article.authorId,
    })

    // delete unwanted
    await this.deleteArticleTagsByTagIds({
      articleId: article.id,
      tagIds: _.difference(oldIds, newIds),
    })
  }
}
