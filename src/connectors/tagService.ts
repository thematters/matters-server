import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { Knex } from 'knex'
import _ from 'lodash'

import {
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
  MATERIALIZED_VIEW,
  TAG_ACTION,
  TAGS_RECOMMENDED_LIMIT,
  VIEW,
} from 'common/enums'
import { isProd } from 'common/environment'
import { ServerError } from 'common/errors'
import logger from 'common/logger'
import { tagSlugify } from 'common/utils'
import { BaseService } from 'connectors'
import { ItemData } from 'definitions'

const TAGS_VIEW = 'mat_views.tags_lasts'
const AUTHORS_VIEW = 'mat_views.authors_lasts'

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

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
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

  /**
   * Create a tag, but return one if it's existing.
   *
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
    columns: string[] = ['*']
  ) => {
    let item

    try {
      item = await this.knex
        .from(TAGS_VIEW)
        .select(columns)
        .where('slug', tagSlugify(content))
        .first()
    } catch (err) {
      logger.error(err)
    }

    // create
    if (!item) {
      const tag = await this.baseCreate(
        { content, cover, creator, description, editors, owner },
        this.table,
        columns,
        (builder: Knex.QueryBuilder) => {
          builder.onConflict('content').merge({ deleted: false })
        }
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

    if (take || take === 0) {
      query.limit(take)
    }
    if (skip) {
      query.offset(skip)
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
  initSearch = async () => {
    const tags = await this.knex
      .from(TAGS_VIEW)
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

    // console.log(new Date(), `selected: ${tags.length} tags:`, tags.slice(0, 5))
    // logger.info(`selected: ${tags.length} tags:`)

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
      const ids = new Set<string>()
      let totalCount: number = 0
      if (includeAuthorTags && viewerId) {
        const [res, res2] = await Promise.all([
          this.knex
            .from(this.knex.ref(AUTHORS_VIEW).as('a'))
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
        res.forEach(({ id }) => ids.add(id))
        res2.forEach(({ tagId }) => ids.add(tagId))
        // console.log(new Date(), 'author tags:', res, res2, 'merged:', ids)
      }

      if (key) {
        const result = await this.es.client.search({
          index: this.table,
          body,
        })

        const { hits } = result.body

        hits.hits.forEach(
          ({ _id, _source }: { _id: string; _source?: Record<string, any> }) =>
            ids.add(_source?.id)
        )

        totalCount = hits.total.value
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
        .from(TAGS_VIEW)
        .whereIn('id', Array.from(ids))
        .orderByRaw('content = ? DESC', [key]) // always show exact match at first
        .orderByRaw('content ~* ? DESC', [key]) // then show inclusive match, by regular expression, case insensitive
        .orderBy('num_authors', 'desc')
        .orderBy('num_articles', 'desc')
        .orderBy('created_at', 'asc')

      if (skip) {
        queryTags.offset(skip)
      }
      if (take) {
        queryTags.limit(take)
      }

      const tags = await queryTags
      if (!isProd) {
        console.log('found:', ids, 'search from lasts:', tags)
      }

      return {
        // /** tslint:disable-next-line:prefer-object-spread */
        nodes: tags.map((t) => Object.assign(t, { __type: 'TagSearchResult' })), // tslint:disable-line
        totalCount, // : hits.total.value,
      }
    } catch (err) {
      logger.error(err)
      // console.error(new Date(), 'ERROR:', err)
      throw new ServerError('tag search failed')
    }
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

  /**
   * Find curation-like tags.
   *
   */
  findCurationTags = ({
    mattyId,
    fields = ['*'],
    take,
  }: {
    mattyId: string
    fields?: any[]
    take?: number
  }) => {
    const query = this.knex
      .select(fields)
      .from(MATERIALIZED_VIEW.curation_tag_materialized)
      .orderBy('uuid')

    if (take || take === 0) {
      query.limit(take)
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
    const query = this.knex
      .select(fields)
      .from(function (this: Knex.QueryBuilder) {
        this.select()
          .from(
            oss ? VIEW.tag_count_view : MATERIALIZED_VIEW.tag_count_materialized
          )
          .whereNotIn('id', curation)
          .orderByRaw('tag_score DESC NULLS LAST')
          .orderBy('count', 'desc')
          .as('source')
      })
    return query
  }

  /**
   * Find curation-like and non-curation-like tags in specific order.
   *
   */
  findArrangedTags = async ({
    mattyId,
    take,
    skip,
    oss = false,
  }: {
    mattyId: string
    take?: number
    skip?: number
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

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /**
   *
   * query, add and remove tag recommendation
   */
  selected = async ({ take, skip }: { take?: number; skip?: number }) => {
    const query = this.knex('tag')
      .select('tag.*', 'c.updated_at as chose_at')
      .join('matters_choice_tag as c', 'c.tag_id', 'tag.id')
      .orderBy('chose_at', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
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
    id: tagId,
    selected,
    withSynonyms,
  }: {
    id: string
    selected?: boolean
    withSynonyms?: boolean
  }) => {
    const query = this.knex('article_tag')
      .join('article', 'article_id', 'article.id')
      .countDistinct('article_id')
      .first()

    const knex = this.knex
    query.where(function (this: Knex.QueryBuilder) {
      this.where('tag_id', tagId)
      if (withSynonyms) {
        this.orWhereIn(
          'tag_id',
          knex
            .from(knex.ref(TAGS_VIEW).as('t'))
            .joinRaw('CROSS JOIN unnest(dup_tag_ids) AS x(id)')
            .where('t.id', tagId)
            .select('x.id')
        )
      }
    })

    query.andWhere({
      // tagId: id,
      state: ARTICLE_STATE.active,
      ...(selected === true ? { selected } : {}),
    })

    // console.log('countArticles:', { sql: query.toString(), tagId })

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find article ids by tag id with offset/limit
   */
  findArticleIds = async ({
    id: tagId,
    skip,
    take,
    selected,
    sortBy,
    withSynonyms,
  }: {
    id: string
    skip?: number
    take?: number
    filter?: { [key: string]: any }
    selected?: boolean
    sortBy?: 'byHottestDesc' | 'byCreatedAtDesc'
    withSynonyms?: boolean
  }) => {
    const query = this.knex
      .select('article_id')
      .from('article_tag')
      .join('article', 'article_id', 'article.id')

    const knex = this.knex
    query.where(function (this: Knex.QueryBuilder) {
      this.where('tag_id', tagId)
      if (withSynonyms) {
        this.orWhereIn(
          'tag_id',
          knex
            .from(knex.ref(TAGS_VIEW).as('t'))
            .joinRaw('CROSS JOIN unnest(dup_tag_ids) AS x(id)')
            .where('t.id', tagId)
            .select('x.id')
        )
      }
    })

    query.andWhere({
      // tagId,
      state: ARTICLE_STATE.active,
      ...(selected === true ? { selected } : {}),
    })
    if (sortBy === 'byHottestDesc') {
      query
        .leftJoin('article_hottest_materialized AS ah', 'ah.id', 'article.id')
        .orderByRaw(`score DESC NULLS LAST`)
    }
    query.orderBy('article_tag.id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    // console.log('findArticleIds:', { sql: query.toString(), tagId })

    const result = await query

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
    skip,
    take,
    exclude,
  }: {
    id: string
    content?: string
    skip?: number
    take?: number
    exclude?: string[]
  }) => {
    const countRels = await this.knex
      .from(TAGS_VIEW)
      .select('content', this.knex.raw('jsonb_array_length(top_rels) AS count'))
      .where(this.knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [id]))
      .first()
    console.log('findRelatedTags:: countRels:', { countRels, tagContent })

    const countRelsCount = countRels?.count || 0

    const ids = new Set<string>()

    // append some results from elasticsearch
    if (countRelsCount < TAGS_RECOMMENDED_LIMIT && tagContent) {
      const body = bodybuilder()
        .query('match', 'content', tagContent)
        .size(TAGS_RECOMMENDED_LIMIT)
        .build()

      const result = await this.es.client.search({
        index: this.table,
        body,
      })

      const { hits } = result.body

      hits.hits.forEach(
        ({ _id, _source }: { _id: string; _source?: Record<string, any> }) =>
          ids.add(_source?.id)
      )
    }

    const subquery = this.knex
      .from(TAGS_VIEW)
      .joinRaw(
        'CROSS JOIN jsonb_to_recordset(top_rels) AS x(tag_rel_id int, count_rel int, count_common int, similarity float)'
      )
      .select('x.*')
      .where(this.knex.raw(`dup_tag_ids @> ARRAY[?] ::int[]`, [id]))

    if (countRelsCount < TAGS_RECOMMENDED_LIMIT) {
      subquery.unionAll(
        this.knex
          .from(TAGS_VIEW)
          .select(
            'id AS tag_rel_id',
            'num_articles AS count_rel',
            this.knex.raw('NULL AS count_common'), // unknown
            this.knex.raw('0.0 AS similarity')
          )
          .whereIn('id', Array.from(ids))
      )
    }

    const query = this.knex
      .from(subquery.as('x').limit(TAGS_RECOMMENDED_LIMIT))
      .join(this.knex.ref(TAGS_VIEW).as('t'), 'x.tag_rel_id', 't.id')
      // .whereIn('id', subquery)
      .select(
        'x.*',
        'id',
        'content',
        'num_articles',
        'num_authors',
        'created_at',
        'cover',
        'description'
      )
      .orderByRaw('x.similarity DESC NULLS LAST')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }
}
