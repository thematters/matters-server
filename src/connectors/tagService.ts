import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { Knex } from 'knex'
// import _ from 'lodash'

import {
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
  // MATERIALIZED_VIEW,
  // MAX_TAG_CONTENT_LENGTH,
  // MAX_TAG_DESCRIPTION_LENGTH,
  TAG_ACTION,
  TAGS_RECOMMENDED_LIMIT,
  VIEW,
} from 'common/enums'
import { environment } from 'common/environment'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { BaseService } from 'connectors'
import { ItemData } from 'definitions'

export class TagService extends BaseService {
  constructor() {
    super('tag')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  /**
   * Find tags
   */
  find = async ({
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
  findByContent = async ({ content }: { content: string }) =>
    this.knex.select().from(this.table).where({ content })

  findByContentIn = async (contentIn: string[]) =>
    this.knex.select().from(this.table).whereIn('content', contentIn)

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

  findByArticleIds = async ({ articleIds }: { articleIds: string[] }) =>
    this.knex
      .select('tag_id', 'article_id')
      .from('article_tag')
      // .join(this.table, 'tag.id', 'article_tag.tag_id')
      .whereIn('article_id', articleIds)

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
      .where(this.knex.raw(`editors @> ARRAY[?]`, [userId]))
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
      .orWhere(this.knex.raw(`editors @> ARRAY[?]`, [userId]))
      .orderBy('id', 'desc')

  findTotalTagsByAuthorUsage = async (userId: string) =>
    // Math.min(100 // the authors_lasts table is only populating the top 100 tags for each author
    (
      await this.knex
        .select('num_tags')
        .from(this.knex.ref(VIEW.authors_lasts_view).as('al'))
        .where('al.id', userId)
        .first()
    )?.numTags ?? 0

  findByAuthorUsage = async ({
    userId,
    skip,
    take,
  }: {
    userId: string
    skip?: number
    take?: number
  }) =>
    this.knex
      .select(
        'x.*',
        this.knex.raw(
          `(age(last_use) <= '3 months' ::interval) AS recent_inuse`
        )
      )
      .from(this.knex.ref(VIEW.authors_lasts_view).as('al'))
      .joinRaw(
        `CROSS JOIN jsonb_to_recordset(top_tags) AS x(id INT, content TEXT, id_tag TEXT, last_use timestamptz, num_articles INT, sum_word_count INT)`
      )
      .where('al.id', userId)
      .andWhere((builder: Knex.QueryBuilder) => {
        builder.whereNotIn('x.id', [environment.mattyChoiceTagId])
      })
      .orderByRaw(`recent_inuse DESC NULLS LAST`)
      .orderByRaw(`num_articles DESC`)
      .orderByRaw(`last_use DESC NULLS LAST`)
      .orderByRaw(`x.id DESC`)
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  findPinnedTagsByUserId = async ({
    userId,
    skip,
    take,
  }: {
    userId: string
    skip?: number
    take?: number
  }) =>
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

  /**
   * findOrCreate:
   * find one existing tag, or create it if not existed before
   * this create may return null if skipCreate
   */
  create = async (
    {
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
    },
    {
      // options
      columns = ['*'],
      skipCreate = false,
    }: {
      columns?: string[]
      skipCreate?: boolean
    } = {}
  ) => {
    const tag = await this.baseFindOrCreate({
      where: { content },
      data: { content, cover, creator, description, editors, owner },
      table: this.table,
      columns,
      modifier: (builder: Knex.QueryBuilder) => {
        builder
          .onConflict(
            // ignore only on content conflict and NOT deleted.
            this.knex.raw('(content) WHERE NOT deleted')
          )
          .merge({ deleted: false })
      },
      skipCreate, // : content.length > MAX_TAG_CONTENT_LENGTH, // || (description && description.length > MAX_TAG_DESCRIPTION_LENGTH),
    })

    // add tag into search engine
    if (tag) {
      this.addToSearch({
        id: tag.id,
        content: tag.content,
        description: tag.description,
      })
    }

    return tag
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
    const subquery = this.knex.raw(
      `(
        SELECT
            at.*, article.author_id
        FROM
            article_tag AS at
        INNER JOIN
            article ON article.id = at.article_id
        WHERE
            at.tag_id = ?
    ) AS base`,
      [id]
    )

    const result = await this.knex
      .from(function (this: Knex.QueryBuilder) {
        this.select('author_id')
          .from(subquery)
          .groupBy('author_id')
          .as('source')

        if (exclude) {
          this.whereNotIn('author_id', exclude)
        }
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
    skip,
    take,
    exclude,
  }: {
    id: string
    skip?: number
    take?: number
    exclude?: string[]
  }) => {
    const subquery = this.knex.raw(
      `(
        SELECT
            at.*, article.author_id
        FROM
            article_tag AS at
        INNER JOIN
            article ON article.id = at.article_id
        WHERE
            at.tag_id = ?
        ORDER BY
            at.created_at
    ) AS base`,
      [id]
    )

    const query = this.knex
      .select('author_id')
      .from(subquery)
      .groupBy('author_id')

    if (exclude) {
      query.whereNotIn('author_id', exclude)
    }

    if (skip !== undefined && Number.isFinite(skip)) {
      query.offset(skip)
    }
    if (take !== undefined && Number.isFinite(take)) {
      query.limit(take)
    }

    return query
  }

  /*********************************
   *                               *
   *             Follow            *
   *                               *
   *********************************/
  // superceded / deprecated by isActionEnabled / setActionEnabled
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

  // superceded / deprecated by isActionEnabled / setActionEnabled
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
    skip,
    take,
  }: {
    targetId: string
    skip?: number
    take?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_tag')
      .where({ targetId, action: TAG_ACTION.follow })
      .orderBy('id', 'desc')

    if (skip) {
      query.andWhere('id', '<', skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  isActionEnabled = async ({
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

  setActionEnabled = async ({
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
    if (enabled) {
      return this.baseUpdateOrCreate({
        where: data,
        data,
        table: 'action_tag',
        updateUpdatedAt: true,
      })
    } else {
      return this.knex.from('action_tag').where(data).del()
    }
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
  initSearch = async () => {
    const tags = await this.knex
      .from(VIEW.tags_lasts_view)
      .select(
        'id',
        'content',
        'description',
        'num_articles',
        'num_authors',
        'created_at',
        'span_days',
        'earliest_use',
        'latest_use'
      )

    return this.es.indexManyItems({
      index: this.table,
      items: tags, // .map((tag) => ({...tag,})),
    })
  }

  addToSearch = async ({
    id,
    content,
    description,
  }: {
    [key: string]: any
  }) => {
    try {
      return await this.es.indexItems({
        index: this.table,
        items: [
          {
            id,
            content,
            description,
          },
        ],
      })
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

  // the searchV0: TBDeprecated in next release
  search = async ({
    key,
    take,
    skip,
    includeAuthorTags,
    viewerId,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    includeAuthorTags?: boolean
    viewerId?: string | null
  }) => {
    const body = bodybuilder()
      .query('match', 'content', key)
      .sort([
        { _score: 'desc' },
        { numArticles: 'desc' },
        { numAuthors: 'desc' },
        { createdAt: 'asc' }, // prefer earlier created one if same number of articles
      ])
      .from(skip)
      .size(take)
      .build()

    try {
      const ids = new Set<number>()
      let totalCount: number = 0
      if (includeAuthorTags && viewerId) {
        const [res, res2] = await Promise.all([
          this.knex
            .from(this.knex.ref(VIEW.authors_lasts_view).as('a'))
            .joinRaw(
              'CROSS JOIN jsonb_to_recordset(top_tags) AS x(id int, num_articles int, last_use timestamptz)'
            )
            .where('a.id', viewerId)
            .select('x.id'),
          // also get the tags use from last articles in recent days
          this.knex
            .from('article_tag AS at')
            .join('article AS a', 'at.article_id', 'a.id')
            .where('a.author_id', viewerId)
            .andWhere(
              'at.created_at',
              '>=',
              this.knex.raw(`CURRENT_DATE - '7 days' ::interval`)
            )
            .select(this.knex.raw('DISTINCT at.tag_id ::int')),
        ])
        res.forEach(({ id }) => ids.add(+id))
        res2.forEach(({ tagId }) => ids.add(+tagId))
      }

      if (key) {
        const result = await this.es.client.search({
          index: this.table,
          body,
        })

        const { hits } = result

        hits.hits.forEach((hit) => ids.add((hit._source as any)?.id))
        if (typeof hits.total === 'number') {
          totalCount = hits.total
        } else if (hits.total) {
          totalCount = hits.total.value
        }
      }

      const queryTags = this.knex
        .select(
          'id',
          'content',
          'description',
          'num_articles',
          'num_authors',
          'created_at'
        )
        .from(VIEW.tags_lasts_view)
        .whereIn('id', Array.from(ids))
        .andWhere((builder: Knex.QueryBuilder) => {
          builder.whereNotIn('id', [environment.mattyChoiceTagId])
        })
        .orderByRaw('content = ? DESC', [key]) // always show exact match at first
        .orderByRaw('content ~* ? DESC', [key]) // then show inclusive match, by regular expression, case insensitive
        .orderBy('num_authors', 'desc')
        .orderBy('num_articles', 'desc')
        .orderBy('created_at', 'asc')
        .modify((builder: Knex.QueryBuilder) => {
          if (skip !== undefined && Number.isFinite(skip)) {
            builder.offset(skip)
          }
          if (take !== undefined && Number.isFinite(take)) {
            builder.limit(take)
          }
        })

      const tags = await queryTags

      return {
        nodes: tags,
        totalCount, // : hits.total.value,
      }
    } catch (err) {
      logger.error(err)
      // console.error(new Date(), 'ERROR:', err)
      throw new ServerError('tag search failed')
    }
  }

  searchV1 = async ({
    key,
    take,
    skip,
    includeAuthorTags,
    viewerId,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    includeAuthorTags?: boolean
    viewerId?: string | null
  }) => {
    const _key =
      key.startsWith('#') || key.startsWith('＃') ? key.slice(1) : key

    if (!_key) {
      return { nodes: [], totalCount: 0 }
    }

    const mattyChoiceTagIds = environment.mattyChoiceTagId
      ? [environment.mattyChoiceTagId]
      : []

    // search from original tags but return duplicate free tags
    const queryIds = this.knex('search_index.tag')
      .select('id')
      .whereLike('content', `%${_key}%`)
    const queryTags = this.knex
      .select(
        this.knex.raw(
          'id, content, description, num_articles, num_authors, created_at, count(id) OVER() AS total_count'
        )
      )
      .from(VIEW.tags_lasts_view)
      .whereIn('id', queryIds)
      .andWhere((builder: Knex.QueryBuilder) => {
        builder.whereNotIn('id', mattyChoiceTagIds)
      })
      .orderByRaw('content = ? DESC', [_key]) // always show exact match at first
      .orderBy('num_articles', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    const nodes = await queryTags
    const totalCount = nodes.length === 0 ? 0 : +nodes[0].totalCount
    return { nodes, totalCount }
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/

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

  findTopTags = ({
    take = 50,
    skip,
    top = 'r3m',
    minAuthors,
  }: {
    take?: number
    skip?: number
    // recent 1 week, 1 month, or 3 months?
    top?: 'r1w' | 'r2w' | 'r1m' | 'r3m'
    minAuthors?: number
  }) =>
    this.knex
      .select('id')
      .from(VIEW.tags_lasts_view)
      .modify(function (this: Knex.QueryBuilder) {
        if (minAuthors) {
          this.where('num_authors', '>=', minAuthors)
        }
        switch (top) {
          case 'r1w':
            this.orderByRaw(
              'num_authors_r1w DESC NULLS LAST, num_articles_r1w DESC NULLS LAST'
            )
          // no break to fallthrough
          case 'r2w':
            this.orderByRaw(
              'num_authors_r2w DESC NULLS LAST, num_articles_r2w DESC NULLS LAST'
            )
          // no break to fallthrough
          case 'r1m':
            this.orderByRaw(
              'num_authors_r1m DESC NULLS LAST, num_articles_r1m DESC NULLS LAST'
            )
          // no break to fallthrough
          case 'r3m':
            // always use recent3months as fallback
            this.orderByRaw(
              'num_authors_r3m DESC NULLS LAST, num_articles_r3m DESC NULLS LAST'
            )
          /* this orderBy does not work as documented
            .orderBy([
               { column: 'num_authors_r3m', order: 'desc', nulls: 'last' },
               { column: 'num_articles_r3m', order: 'desc', nulls: 'last' },
               { column: 'span_days', order: 'desc', nulls: 'last' },
             ])
          */
        }
      })
      // last fallback
      .orderByRaw('num_authors DESC NULLS LAST, num_articles DESC NULLS LAST')
      .orderByRaw('span_days DESC NULLS LAST')
      .orderByRaw('created_at') // ascending from earliest to latest
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  /**
   *
   * query, add and remove tag recommendation
   */
  selected = async ({ take, skip }: { take?: number; skip?: number }) => {
    const query = this.knex('tag')
      .select('tag.*', 'c.updated_at as chose_at')
      .join('matters_choice_tag as c', 'c.tag_id', 'tag.id')
      .orderBy('chose_at', 'desc')

    if (skip !== undefined && Number.isFinite(skip)) {
      query.offset(skip)
    }
    if (take !== undefined && Number.isFinite(take)) {
      query.limit(take)
    }

    return query
  }

  countSelectedTags = async () => {
    const result = await this.knex('matters_choice_tag').count().first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  addTagRecommendation = (tagId: string) =>
    this.baseFindOrCreate({
      where: { tagId },
      data: { tagId },
      table: 'matters_choice_tag',
    })

  removeTagRecommendation = (tagId: string) =>
    this.knex('matters_choice_tag').where({ tagId }).del()

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
    articleIds = Array.from(new Set(articleIds))
    tagIds = Array.from(new Set(tagIds))

    const items = articleIds
      .map((articleId) => {
        return tagIds.map((tagId) => ({
          articleId,
          creator,
          tagId,
          ...(selected === true ? { selected } : {}),
        }))
      })
      .flat(1)
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
   * Count article authors by a given tag id.
   */
  countAuthors = async ({
    id: tagId,
    selected,
    withSynonyms = true,
  }: {
    id: string
    selected?: boolean
    withSynonyms?: boolean
  }) => {
    const knex = this.knex

    let result: any
    try {
      result = await this.knex(VIEW.tags_lasts_view)
        .select('id', 'content', 'id_slug', 'num_authors', 'num_articles')
        .where(function (this: Knex.QueryBuilder) {
          this.where('tag_id', tagId)
          if (withSynonyms) {
            this.orWhere(knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [tagId]))
          } // else { this.where('id', tagId) // exactly }
        })
        .first()
    } catch (err) {
      // empty; do nothing
    }

    if (result?.numAuthors) {
      return parseInt(result.numAuthors ?? '0', 10)
    }

    result = await this.knex('article_tag')
      .join('article', 'article_id', 'article.id')
      .countDistinct('author_id')
      .where({
        // 'article_tag.tag_id': tagId,
        tagId,
        state: ARTICLE_STATE.active,
      })
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count articles by a given tag id.
   */
  countArticles = async ({
    id: tagId,
    selected,
    withSynonyms = true,
  }: {
    id: string
    selected?: boolean
    withSynonyms?: boolean
  }) => {
    const knex = this.knex

    let result: any
    try {
      result = await this.knex(VIEW.tags_lasts_view)
        .select('id', 'content', 'id_slug', 'num_authors', 'num_articles')
        .where(function (this: Knex.QueryBuilder) {
          this.where('tag_id', tagId)
          if (withSynonyms) {
            this.orWhere(knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [tagId]))
          } // else { this.where('id', tagId) // exactly }
        })
        .first()
    } catch (err) {
      // empty; do nothing
    }

    if (result?.numArticles) {
      return parseInt(result.numArticles ?? '0', 10)
    }

    result = await this.knex('article_tag')
      .join('article', 'article_id', 'article.id')
      .countDistinct('article_id')
      .first()
      .where({
        // tagId: id,
        // 'article_tag.tag_id': tagId,
        tagId,
        state: ARTICLE_STATE.active,
        ...(selected === true ? { selected } : {}),
      })

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find article ids by tag id with offset/limit
   */
  findArticleIds = async ({
    id: tagId,
    selected,
    sortBy,
    withSynonyms,
    skip,
    take,
  }: {
    id: string
    // filter?: { [key: string]: any }
    selected?: boolean
    sortBy?: 'byHottestDesc' | 'byCreatedAtDesc'
    withSynonyms?: boolean
    skip?: number
    take?: number
  }) => {
    const results = await this.knex
      .select('article_id')
      .from('article_tag')
      .join('article', 'article_id', 'article.id')
      .where({
        // tagId,
        state: ARTICLE_STATE.active,
        ...(selected === true ? { selected } : {}),
      })
      .andWhere((builder: Knex.QueryBuilder) => {
        builder.where('tag_id', tagId)
        if (withSynonyms) {
          builder.orWhereIn(
            'tag_id',
            this.knex
              .from(VIEW.tags_lasts_view)
              // .joinRaw('CROSS JOIN unnest(dup_tag_ids) AS x(id)')
              .whereRaw('dup_tag_ids @> ARRAY[?] ::int[]', tagId)
              .select(this.knex.raw('UNNEST(dup_tag_ids)'))
          )
        }
      })
      .modify((builder: Knex.QueryBuilder) => {
        if (sortBy === 'byHottestDesc') {
          builder
            .join(
              // instead of leftJoin, only shows articles from materialized
              'article_hottest_materialized AS ah',
              'ah.id',
              'article.id'
            )
            .orderByRaw(`score DESC NULLS LAST`)
        }
        builder.orderBy('article.id', 'desc')

        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return results.map(({ articleId }: { articleId: string }) => articleId)
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
      .limit(DEFAULT_TAKE_PER_PAGE)
      .orderBy('article_tag.id', 'asc')

  /*********************************
   *                               *
   *              OSS              *
   *                               *
   *********************************/
  renameTag = async ({ tagId, content }: { tagId: string; content: string }) =>
    this.baseUpdate(tagId, { content, updatedAt: this.knex.fn.now() })

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
    this.addToSearch({
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

    return newTag
  }

  // follow tags by content
  followTags = async (userId: string, tags: string[]) => {
    const items = await this.findByContentIn(tags)

    await Promise.all(
      items
        .filter(Boolean)
        .map((tag) =>
          this.follow({ targetId: tag.id, userId }).catch((err) =>
            console.error(
              new Date(),
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
  findRelatedTags = async ({
    id,
    content: tagContent,
  }: // skip, take, exclude,
  {
    id: string
    content?: string
    // skip?: number
    // take?: number
    // exclude?: string[]
  }) => {
    const results = await this.knex
      .from(VIEW.tags_lasts_view)
      .joinRaw(
        'CROSS JOIN jsonb_to_recordset(top_rels) AS x(tag_rel_id int, count_rel int, count_common int, similarity float)'
      )
      .where(this.knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [id]))
      .select('x.tag_rel_id AS id')
      .orderByRaw('x.count_rel * x.similarity DESC NULLS LAST')

    if (results?.length < TAGS_RECOMMENDED_LIMIT && tagContent) {
      const body = bodybuilder()
        .query('match', 'content', tagContent)
        .size(TAGS_RECOMMENDED_LIMIT) // at most 100
        .build()

      const result = await this.es.client.search({
        index: this.table,
        body,
      })

      const { hits } = result
      if ((hits.hits?.[0]?._source as any)?.content === tagContent) {
        hits.hits.shift() // remove the exact match at first, if exists
      }

      // hits.hits.forEach((hit) => fromEsTags.add(hit._source))

      const existingIds = new Set(results.map((item) => item.id))
      for (const hit of hits.hits) {
        if (!existingIds.has((hit._source as any).id)) {
          results.push({ id: (hit._source as any).id })
          if (results?.length >= TAGS_RECOMMENDED_LIMIT) {
            break
          }
        }
      }
    }

    return results
  }
}
