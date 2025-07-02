import type { Connections, Article, Item } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_STATE,
  USER_ACTION,
  TAG_ACTION,
  USER_STATE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SEARCH_EXCLUDE,
  QUEUE_URL,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { normalizeSearchKey } from '#common/utils/index.js'
import * as cheerio from 'cheerio'
import { simplecc } from 'simplecc-wasm'

import { AtomService } from './atomService.js'
import { aws } from './aws/index.js'

const logger = getLogger('service-search')

const SEARCH_TITLE_RANK_THRESHOLD = 0.001
const SEARCH_DEFAULT_TEXT_RANK_THRESHOLD = 0.0001

export class SearchService {
  private connections: Connections
  private models: AtomService
  private knex: Knex
  private knexRO: Knex
  private knexSearch: Knex
  private aws: typeof aws

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
    this.knex = this.connections.knex
    this.knexRO = this.connections.knexRO
    this.knexSearch = this.connections.knexSearch
    this.aws = aws
  }

  public searchArticles = async ({
    key: keyOriginal,
    take = 10,
    skip = 0,
    filter,
    exclude,
    viewerId,
    coefficients,
    quicksearch,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    filter?: {
      authorId?: string
    }
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
    if (quicksearch) {
      return this.quicksearchArticles({ key: keyOriginal, take, skip, filter })
    }
    const key = await normalizeSearchKey(keyOriginal)
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      logger.error(err)
    }

    const c0 = +(
      coeffs?.[0] ||
      environment.searchPgArticleCoefficients?.[0] ||
      1
    )
    const c1 = +(
      coeffs?.[1] ||
      environment.searchPgArticleCoefficients?.[1] ||
      1
    )
    const c2 = +(
      coeffs?.[2] ||
      environment.searchPgArticleCoefficients?.[2] ||
      1
    )
    const c3 = +(
      coeffs?.[3] ||
      environment.searchPgArticleCoefficients?.[3] ||
      1
    )

    // gather users that blocked viewer
    const excludeBlocked = exclude === 'blocked' && viewerId
    let blockedIds: string[] = []
    if (excludeBlocked) {
      blockedIds = (
        await this.knexRO('action_user')
          .select('user_id')
          .where({ action: USER_ACTION.block, targetId: viewerId })
      ).map(({ userId }) => userId)
    }
    // gather articles blocked by admin
    const articleIds = (
      await this.knexRO('article_recommend_setting')
        .where({ inSearch: false })
        .select('articleId')
    ).map(({ articleId }) => articleId)

    const baseQuery = this.knexSearch
      .from(
        this.knexSearch
          .select(
            '*',
            this.knexSearch.raw(
              '(_text_cd_rank/(_text_cd_rank + 1)) AS text_cd_rank'
            )
          )
          .from(
            this.knexSearch
              .select(
                'id',
                'num_views',
                'title_orig', // 'title',
                'created_at',
                'last_read_at', // -- title, slug,
                this.knexSearch.raw(
                  'percent_rank() OVER (ORDER BY num_views NULLS FIRST) AS views_rank'
                ),
                this.knexSearch.raw(
                  'ts_rank(title_jieba_ts, query) AS title_ts_rank'
                ),
                this.knexSearch.raw(
                  'COALESCE(ts_rank(summary_jieba_ts, query, 1), 0) ::float AS summary_ts_rank'
                ),
                this.knexSearch.raw(
                  'ts_rank_cd(text_jieba_ts, query, 4) AS _text_cd_rank'
                )
              )
              .from('search_index.article')
              .crossJoin(
                this.knexSearch.raw("plainto_tsquery('jiebacfg', ?) query", key)
              )
              .whereNotIn('id', articleIds)
              .whereIn('state', [ARTICLE_STATE.active])
              .andWhere('author_state', 'NOT IN', [
                // USER_STATE.active
                USER_STATE.archived,
                USER_STATE.banned,
              ])
              .andWhere('author_id', 'NOT IN', blockedIds)
              .andWhereRaw(
                `(query @@ title_jieba_ts OR query @@ summary_jieba_ts OR query @@ text_jieba_ts)`
              )
              .as('t0')
          )
          .as('t1')
      )
      .where('title_ts_rank', '>=', SEARCH_TITLE_RANK_THRESHOLD)
      .orWhere('text_cd_rank', '>=', SEARCH_DEFAULT_TEXT_RANK_THRESHOLD)

    const records = await this.knexSearch
      .select(
        '*',
        this.knexSearch.raw(
          '(? * views_rank + ? * title_ts_rank + ? * summary_ts_rank + ? * text_cd_rank) AS score',
          [c0, c1, c2, c3]
        ),
        this.knexSearch.raw('COUNT(id) OVER() ::int AS total_count')
      )
      .from(baseQuery.as('base'))
      .orderByRaw('score DESC NULLS LAST')
      .orderByRaw('num_views DESC NULLS LAST')
      .orderByRaw('id DESC')
      .modify((builder: Knex.QueryBuilder) => {
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })

    const nodes = await this.models.articleIdLoader.loadMany(
      records.map((item: { id: string }) => item.id).filter(Boolean)
    )

    const totalCount = records.length === 0 ? 0 : +records[0].totalCount

    logger.debug(
      `articleService::searchV2 knexSearch instance got ${nodes.length} nodes from: ${totalCount} total:`,
      { key, keyOriginal, baseQuery: baseQuery.toString() },
      { sample: records?.slice(0, 3) }
    )

    return { nodes, totalCount }
  }

  public quicksearchArticles = async ({
    key,
    take,
    skip,
    filter,
  }: {
    key: string
    take?: number
    skip?: number
    filter?: {
      authorId?: string
    }
  }): Promise<{ nodes: Article[]; totalCount: number }> => {
    const keySimplified = simplecc(key, 't2s')
    const keyTraditional = simplecc(key, 's2t')
    const q = this.knexRO('article')
      .select('*', this.knexRO.raw('COUNT(1) OVER() ::int AS total_count'))
      .whereIn(
        'id',
        this.knexRO
          .select('article_id')
          .whereNotIn(
            'article_id',
            this.knexRO('article_recommend_setting')
              .where({ inSearch: false })
              .select('articleId')
          )
          .where(function () {
            if (filter && filter.authorId) {
              this.where({ authorId: filter.authorId })
            }
            this.whereILike('title', `%${key}%`)
              .orWhereILike('title', `%${keyTraditional}%`)
              .orWhereILike('title', `%${keySimplified}%`)
          })
          .from('article_version_newest')
      )
      .where({ state: ARTICLE_STATE.active })
      // .modify(excludeSpam, spamThreshold)
      .orderBy('id', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (filter && filter.authorId) {
          builder.where({ authorId: filter.authorId })
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })
    const records = await q

    const totalCount = +(records?.[0]?.totalCount ?? 0)
    return { nodes: records as Article[], totalCount }
  }

  public searchTags = async ({
    key: keyOriginal,
    take,
    skip,
    coefficients,
    quicksearch,
  }: {
    key: string
    take: number
    skip: number
    coefficients?: string
    quicksearch?: boolean
  }) => {
    const key = await normalizeSearchKey(keyOriginal)
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      logger.error(err)
    }

    const a = +(coeffs?.[0] || environment.searchPgTagCoefficients?.[0] || 1)
    const b = +(coeffs?.[1] || environment.searchPgTagCoefficients?.[1] || 1)
    const c = +(coeffs?.[2] || environment.searchPgTagCoefficients?.[2] || 1)
    const d = +(coeffs?.[3] || environment.searchPgTagCoefficients?.[3] || 1)

    const strip0 = key.startsWith('#') || key.startsWith('＃')
    const _key = strip0 ? key.slice(1) : key

    if (!_key) {
      return { nodes: [], totalCount: 0 }
    }

    const mattyChoiceTagIds = environment.mattyChoiceTagId
      ? [environment.mattyChoiceTagId]
      : []

    const baseQuery = this.knexSearch
      .select(
        'id',
        'content_orig AS content',
        'description',
        'createdAt',
        // 'num_articles', // 'num_followers',
        this.knexSearch.raw(
          'percent_rank() OVER (ORDER by num_followers NULLS FIRST) AS followers_rank'
        ),
        this.knexSearch.raw(
          '(CASE WHEN content LIKE ? THEN 1 ELSE 0 END) ::float AS content_like_rank',
          [`%${_key}%`]
        ),
        this.knexSearch.raw('ts_rank(content_jieba_ts, query) AS content_rank'),
        this.knexSearch.raw(
          'ts_rank(description_jieba_ts, query) AS description_rank'
        ),
        this.knexSearch.raw('COALESCE(num_articles, 0) AS num_articles'),
        this.knexSearch.raw('COALESCE(num_authors, 0) AS num_authors')
      )
      .from('search_index.tag')
      .crossJoin(
        this.knexSearch.raw(`plainto_tsquery('jiebacfg', ?) query`, key)
      )
      .whereNotIn('id', mattyChoiceTagIds)
      .andWhere((builder: Knex.QueryBuilder) => {
        builder.whereLike('content', `%${_key}%`)

        if (!quicksearch) {
          builder
            .orWhereRaw('content_jieba_ts @@ query')
            .orWhereRaw('description_jieba_ts @@ query')
        }
      })

    const queryTags = this.knexSearch
      .select(
        '*',
        this.knexSearch.raw(
          '(? * followers_rank + ? * content_like_rank + ? * content_rank + ? * description_rank) AS score',
          [a, b, c, d]
        ),
        this.knexSearch.raw('COUNT(id) OVER() ::int AS total_count')
      )
      .from(baseQuery.as('base'))
      .modify((builder: Knex.QueryBuilder) => {
        if (quicksearch) {
          builder.orderByRaw('content = ? DESC', [_key]) // always show exact match at first
        } else {
          builder.orderByRaw('score DESC NULLS LAST')
        }
      })
      .orderByRaw('num_articles DESC NULLS LAST')
      .orderByRaw('id') // fallback to earlier first
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

    logger.debug(
      `tagService::searchV2 knexSearch instance got ${nodes.length} nodes from: ${totalCount} total:`,
      { key, keyOriginal, queryTags: queryTags.toString() },
      { sample: nodes?.slice(0, 3) }
    )

    return { nodes, totalCount }
  }

  public searchUsers = async ({
    key: keyOriginal,
    take,
    skip,
    exclude,
    viewerId,
    coefficients,
    quicksearch,
  }: {
    key: string
    author?: string
    take?: number
    skip?: number
    viewerId?: string | null
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
    const key = await normalizeSearchKey(keyOriginal)
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      logger.error(err)
    }

    const c0 = +(coeffs?.[0] || environment.searchPgUserCoefficients?.[0] || 1)
    const c1 = +(coeffs?.[1] || environment.searchPgUserCoefficients?.[1] || 1)
    const c2 = +(coeffs?.[2] || environment.searchPgUserCoefficients?.[2] || 1)
    const c3 = +(coeffs?.[3] || environment.searchPgUserCoefficients?.[3] || 1)
    const c4 = +(coeffs?.[4] || environment.searchPgUserCoefficients?.[4] || 1)
    const c5 = +(coeffs?.[5] || environment.searchPgUserCoefficients?.[5] || 1)
    const c6 = +(coeffs?.[6] || environment.searchPgUserCoefficients?.[6] || 1)

    const searchUserName = key.startsWith('@') || key.startsWith('＠')
    const strippedName = key.replaceAll(/^[@＠]+/g, '').trim()

    if (!strippedName) {
      return { nodes: [], totalCount: 0 }
    }

    // gather users that blocked viewer
    const excludeBlocked = exclude === SEARCH_EXCLUDE.blocked && viewerId
    let blockedIds: string[] = []
    if (excludeBlocked) {
      blockedIds = (
        await this.knex('action_user')
          .select('user_id')
          .where({ action: USER_ACTION.block, targetId: viewerId })
      ).map(({ userId }) => userId)
    }

    const baseQuery = this.knexSearch
      .select(
        '*',

        this.knexSearch.raw(
          'percent_rank() OVER (ORDER BY num_followers NULLS FIRST) AS followers_rank'
        ),
        this.knexSearch.raw(
          '(CASE WHEN user_name = ? THEN 1 ELSE 0 END) ::float AS user_name_equal_rank',
          [strippedName]
        ),
        this.knexSearch.raw(
          '(CASE WHEN display_name = ? THEN 1 ELSE 0 END) ::float AS display_name_equal_rank',
          [strippedName]
        ),
        this.knexSearch.raw(
          '(CASE WHEN user_name LIKE ? THEN 1 ELSE 0 END) ::float AS user_name_like_rank',
          [`%${strippedName}%`]
        ),
        this.knexSearch.raw(
          '(CASE WHEN display_name LIKE ? THEN 1 ELSE 0 END) ::float AS display_name_like_rank',
          [`%${strippedName}%`]
        ),
        this.knexSearch.raw(
          'ts_rank(display_name_jieba_ts, query) AS display_name_ts_rank'
        ),
        this.knexSearch.raw(
          'ts_rank(description_jieba_ts, query) AS description_ts_rank'
        )
      )
      .from('search_index.user')
      .crossJoin(
        this.knexSearch.raw(`plainto_tsquery('jiebacfg', ?) query`, key)
      )
      .where('state', 'NOT IN', [
        // USER_STATE.active,
        USER_STATE.archived,
        USER_STATE.banned,
      ])
      .andWhere('id', 'NOT IN', blockedIds)
      .andWhere((builder: Knex.QueryBuilder) => {
        builder
          .whereLike('user_name', `%${strippedName}%`)
          .orWhereLike('display_name', `%${strippedName}%`)

        if (!quicksearch) {
          builder
            .orWhereRaw('display_name_jieba_ts @@ query')
            .orWhereRaw('description_jieba_ts @@ query')
        }
      })

    const queryUsers = this.knexSearch
      .select(
        '*',
        this.knexSearch.raw(
          '(? * followers_rank + ? * user_name_equal_rank + ? * display_name_equal_rank + ? * user_name_like_rank + ? * display_name_like_rank + ? * display_name_ts_rank + ? * description_ts_rank) AS score',
          [c0, c1, c2, c3, c4, c5, c6]
        ),
        this.knexSearch.raw('COUNT(id) OVER() ::int AS total_count')
      )
      .from(baseQuery.as('base'))
      .modify((builder: Knex.QueryBuilder) => {
        if (quicksearch) {
          if (searchUserName) {
            builder
              .orderByRaw('user_name = ? DESC', [strippedName])
              .orderByRaw('display_name = ? DESC', [strippedName])
          } else {
            builder
              .orderByRaw('display_name = ? DESC', [strippedName])
              .orderByRaw('user_name = ? DESC', [strippedName])
          }
        } else {
          builder.orderByRaw('score DESC NULLS LAST')
        }
      })
      .orderByRaw('num_followers DESC NULLS LAST')
      .orderByRaw('id') // fallback to earlier first
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    const records = (await queryUsers) as Item[]
    const totalCount = records.length === 0 ? 0 : +records[0].totalCount

    logger.debug(
      `userService::searchV2 knexSearch instance got ${records.length} nodes from: ${totalCount} total:`,
      { key, keyOriginal, queryUsers: queryUsers.toString() },
      { sample: records?.slice(0, 3) }
    )

    const nodes = await this.models.userIdLoader.loadMany(
      records.map(({ id }) => id)
    )

    return { nodes, totalCount }
  }

  public findRecentSearches = async (userId: string) => {
    const result = await this.knexRO('search_history')
      .select('search_key')
      .where({ userId, archived: false })
      .whereNot({ searchKey: '' })
      .max('created_at as search_at')
      .groupBy('search_key')
      .orderBy('search_at', 'desc')
    return result.map(({ searchKey }) =>
      searchKey.slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
    )
  }

  public clearSearches = (userId: string) =>
    this.knex('search_history')
      .where({ userId, archived: false })
      .update({ archived: true })

  public triggerIndexingUser = async (userId: string) => {
    this.aws.sqsSendMessage({
      messageBody: { userId },
      queueUrl: QUEUE_URL.searchIndexUser,
    })
  }
  public indexUsers = async (userIds: string[]) => {
    if (userIds.length === 0) {
      return
    }
    const dedupedUserIds = [...new Set(userIds)]
    // Get user data from main database
    const users = await this.knexRO
      .with('user_followers', (builder) => {
        builder
          .from('action_user')
          .select(
            'target_id',
            this.knexRO.raw('COUNT(*) ::int AS num_followers'),
            this.knexRO.raw('MAX(created_at) AS last_followed_at')
          )
          .where({ action: USER_ACTION.follow })
          .whereIn('target_id', dedupedUserIds)
          .groupBy('target_id')
      })
      .from('user')
      .select([
        'id',
        'user_name',
        'display_name',
        'description',
        'state',
        'created_at',
        'user_followers.num_followers',
        'user_followers.last_followed_at',
      ])
      .whereIn('id', dedupedUserIds)
      .leftJoin('user_followers', 'user.id', 'user_followers.target_id')

    // Transform data for search index
    const now = new Date().toISOString()
    const rows = await Promise.all(
      users.map(async (user) => {
        return {
          id: user.id,
          userName: user.userName?.toLowerCase() || '',
          displayName: simplecc(user.displayName?.toLowerCase() || '', 't2s'),
          displayNameOrig: user.displayName,
          description: simplecc(user.description?.toLowerCase() || '', 't2s'),
          state: user.state,
          createdAt: user.createdAt.toISOString(),
          numFollowers: user.numFollowers,
          lastFollowedAt: user.lastFollowedAt?.toISOString(),
          indexedAt: now,
        }
      })
    )

    // Upsert into search index
    await this.knexSearch('search_index.user')
      .insert(rows)
      .onConflict('id')
      .merge()
  }

  public triggerIndexingTag = async (tagId: string) => {
    this.aws.sqsSendMessage({
      messageBody: { tagId },
      queueUrl: QUEUE_URL.searchIndexTag,
    })
  }

  public indexTags = async (tagIds: string[]) => {
    if (tagIds.length === 0) {
      return
    }
    const dedupedTagIds = [...new Set(tagIds)]

    // Get tag data from main database
    const tags = await this.knexRO
      .with('tag_followers', (builder) => {
        builder
          .from('action_tag')
          .select(
            'target_id',
            this.knexRO.raw('COUNT(*) ::int AS num_followers'),
            this.knexRO.raw('MAX(created_at) AS last_followed_at')
          )
          .where({ action: TAG_ACTION.follow })
          .whereIn('target_id', dedupedTagIds)
          .groupBy('target_id')
      })
      .with('tag_articles', (builder) => {
        builder
          .from('article_tag')
          .join('article', 'article_tag.article_id', 'article.id')
          .select(
            'tag_id',
            this.knexRO.raw('COUNT(*) ::int AS num_articles'),
            this.knexRO.raw('COUNT(DISTINCT author_id) ::int AS num_authors')
          )
          .where('article.state', ARTICLE_STATE.active)
          .whereIn('tag_id', dedupedTagIds)
          .groupBy('tag_id')
      })
      .from('tag')
      .select([
        'id',
        'content',
        'description',
        'created_at',
        'tag_articles.num_articles',
        'tag_articles.num_authors',
        'tag_followers.num_followers',
        'tag_followers.last_followed_at',
      ])
      .whereIn('id', dedupedTagIds)
      .leftJoin('tag_followers', 'tag.id', 'tag_followers.target_id')
      .leftJoin('tag_articles', 'tag.id', 'tag_articles.tag_id')

    // Transform data for search index
    const now = new Date().toISOString()
    const rows = await Promise.all(
      tags.map(async (tag) => {
        return {
          id: tag.id,
          content: simplecc(tag.content?.toLowerCase() || '', 't2s'),
          contentOrig: tag.content,
          description: simplecc(tag.description?.toLowerCase() || '', 't2s'),
          createdAt: tag.createdAt.toISOString(),
          numArticles: tag.numArticles,
          numAuthors: tag.numAuthors,
          numFollowers: tag.numFollowers,
          lastFollowedAt: tag.lastFollowedAt?.toISOString(),
          indexedAt: now,
        }
      })
    )

    // Upsert into search index
    await this.knexSearch('search_index.tag')
      .insert(rows)
      .onConflict('id')
      .merge()
  }

  public triggerIndexingArticle = async (articleId: string) => {
    this.aws.sqsSendMessage({
      messageBody: { articleId },
      queueUrl: QUEUE_URL.searchIndexArticle,
    })
  }

  public updateArticleReadData = async (articleId: string) => {
    const { numViews, lastReadAt } = (await this.knexRO('article_read_count')
      .select(
        'article_id',
        this.knexRO.raw('COUNT(*) OVER() ::integer AS num_views'),
        this.knexRO.raw('MAX(created_at) OVER() AS last_read_at')
      )
      .whereNotNull('user_id')
      .where('article_id', articleId)
      .first()) || { numViews: 0, lastReadAt: null }
    await this.knexSearch('search_index.article')
      .where('id', articleId)
      .update({
        numViews: numViews,
        lastReadAt: lastReadAt,
      })
  }

  public indexArticles = async (articleIds: string[]) => {
    if (articleIds.length === 0) {
      return
    }
    const dedupedArticleIds = [...new Set(articleIds)]

    // Gather article data from main database
    const articles = await this.knexRO
      .with('article_views', (builder) => {
        builder
          .from('article_read_count')
          .select(
            'article_id',
            this.knexRO.raw('COUNT(*) ::int AS num_views'),
            this.knexRO.raw('MAX(created_at) AS last_read_at')
          )
          .whereNotNull('user_id')
          .whereIn('article_id', dedupedArticleIds)
          .groupBy('article_id')
      })
      .from({ a: 'article' })
      .leftJoin('article_version_newest as avn', 'a.id', 'avn.article_id')
      .leftJoin('article_content as ac', 'avn.content_id', 'ac.id')
      .leftJoin('user as author', 'author.id', 'a.author_id')
      .leftJoin('article_views', 'article_views.article_id', 'a.id')
      .select([
        'a.id',
        'a.author_id',
        'a.state',
        this.knexRO.raw('author.state AS author_state'),
        'a.created_at',
        'avn.title',
        'avn.summary',
        'ac.content',
        'article_views.num_views',
        'article_views.last_read_at',
      ])
      .whereIn('a.id', dedupedArticleIds)

    // Transform data for search index
    const now = new Date().toISOString()
    const rows = await Promise.all(
      articles.map(async (article: any) => {
        // Extract plain text from HTML content
        let text = ''
        try {
          if (article.content) {
            const $ = cheerio.load(article.content)
            text = $('body')
              .children()
              .toArray()
              .map((e) => $(e).text().trim())
              .filter(Boolean)
              .join('\n')
          }
        } catch (err) {
          logger.error('Failed to extract article text', err)
        }

        return {
          id: article.id,
          title: simplecc((article.title || '').toLowerCase(), 't2s'),
          summary: simplecc((article.summary || '').toLowerCase(), 't2s'),
          textContentConverted: simplecc(text.toLowerCase(), 't2s'),
          authorId: article.authorId,
          state: article.state,
          authorState: article.authorState,
          createdAt: article?.createdAt?.toISOString(),
          numViews: article.numViews,
          lastReadAt: article?.lastReadAt?.toISOString(),
          indexedAt: now,
        }
      })
    )

    // Upsert into search index
    await this.knexSearch('search_index.article')
      .insert(rows)
      .onConflict('id')
      .merge()
  }
}
