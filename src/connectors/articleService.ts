import * as cheerio from 'cheerio'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { v4 } from 'uuid'
import slugify from '@matters/slugify'

import { ARTICLE_APPRECIATE_LIMIT, ARTICLE_STATE } from 'common/enums'
import { ItemData, GQLSearchInput } from 'definitions'

import { USER_ACTION, TRANSACTION_PURPOSE } from 'common/enums'
import { ipfs } from 'connectors/ipfs'
import { BaseService } from './baseService'
import { UserService } from './userService'

export class ArticleService extends BaseService {
  ipfs: typeof ipfs

  constructor() {
    super('article')
    this.ipfs = ipfs
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  // dump all data to es. Currently only used in test.
  initSearch = async () => {
    const articles = await this.knex(this.table).select(
      'content',
      'title',
      'id'
    )

    return this.es.indexItems({
      index: this.table,
      items: articles.map(
        (article: { content: string; title: string; id: string }) => ({
          ...article,
          content: this.stripHtml(article.content)
        })
      )
    })
  }

  /**
   * Create a new article item.
   */
  create = async (articleData: ItemData & { content: string }) => {
    // craete article
    const article = await this.baseCreate({
      uuid: v4(),
      wordCount: this.countWords(articleData.content),
      ...articleData
    })
    return article
  }

  // publish an article to IPFS
  publish = async ({
    authorId,
    upstreamId,
    title,
    cover,
    summary,
    content
  }: {
    [key: string]: string
  }) => {
    const userService = new UserService()

    // add content to ipfs
    const dataHash = await this.ipfs.addHTML(content)

    // add meta data to ipfs
    const { userName: name, description } = await userService.dataloader.load(
      authorId
    )

    const now = new Date()
    let mediaObj: { [key: string]: any } = {
      content: {
        html: {
          '/': dataHash
        }
      },
      author: {
        name,
        description: description || ''
      },
      publishedAt: now.toISOString()
    }

    // add cover to ipfs
    // TODO: check data type for cover
    const coverData = await this.ipfs.getDataAsFile(cover, '/')
    if (coverData && coverData.content) {
      const [{ hash }] = await this.ipfs.client.add(coverData.content, {
        pin: true
      })
      mediaObj.cover = { '/': hash }
    }

    // add upstream
    if (upstreamId) {
      const upstream = await this.dataloader.load(upstreamId)
      mediaObj.upstream = { '/': upstream.mediaHash }
    }

    // get media hash
    const [{ hash: mediaHash }] = await this.ipfs.client.add(
      Buffer.from(JSON.stringify(mediaObj)),
      {
        pin: true
      }
    )

    // TODO: add media object as IPLD instead of string
    // related discussion: https://github.com/ipld/ipld/issues/19
    // const cid = await this.ipfs.client.dag.put(mediaObj, {
    //   format: 'dag-pb',
    //   inputenc: 'json',
    //   pin: true,
    //   hashAlg: 'sha2-256'
    // })
    // const mediaHash = cid.toBaseEncodedString()

    // edit db record

    const article = await this.create({
      authorId,
      upstreamId,
      title,
      slug: slugify(title),
      summary,
      content,
      dataHash,
      mediaHash,
      state: ARTICLE_STATE.active
    })

    return article
  }

  addToSearch = async ({
    id,
    title,
    content,
    tags
  }: {
    [key: string]: string
  }) => {
    const result = await this.es.indexItems({
      index: this.table,
      items: [
        {
          id,
          title,
          content: this.stripHtml(content),
          tags
        }
      ]
    })
    return result
  }

  search = async ({ key }: GQLSearchInput) => {
    const body = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 5,
        fields: ['title^10', 'content']
      })
      .size(100)
      .build()

    try {
      const { hits } = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })
      const ids = hits.hits.map(({ _id }) => _id)
      return this.dataloader.loadMany(ids)
    } catch (err) {
      throw err
    }
  }

  recommendHottest = async () =>
    await this.knex('article_activity_view').orderBy(
      'latest_activity',
      'desc null last'
    )
  // .limit(limit)
  // .offset(offset)

  recommendNewest = async () =>
    await this.knex(this.table).orderBy('id', 'desc')
  // .limit(limit)
  // .offset(offset)

  recommendIcymi = async () =>
    await this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
  // .offset(offset)
  // .limit(limit)

  recommendTopics = async () =>
    await this.knex('article_count_view').orderBy('topic_score', 'desc')
  // .limit(limit)
  // .offset(offset)

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId, state: ARTICLE_STATE.active })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count total appreciaton by a given article id.
   */
  countAppreciation = async (articleId: string): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  /**
   * Count total appreciaton by a given article id and user ids.
   */
  countAppreciationByUserIds = async ({
    articleId,
    userIds
  }: {
    articleId: string
    userIds: string[]
  }): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .whereIn('senderId', userIds)
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  stripHtml = (html: string) => html.replace(/(<([^>]+)>)/gi, '')

  /**
   * Counts words witin in html content.
   */
  countWords = (html: string) =>
    this.stripHtml(html)
      .split(' ')
      .filter(s => s !== '').length

  /**
   * Find articles
   */
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

  /**
   *  Find articles by a given author id (user).
   */
  findByAuthor = async (authorId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .orderBy('id', 'desc')

  /**
   * Find article by media hash
   */
  findByMediaHash = async (mediaHash: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ mediaHash })
      .first()

  /**
   * Find articles by upstream id (article).
   */
  findByUpstream = async (upstreamId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ upstreamId })

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async (referenceId: string): Promise<any[]> =>
    await this.knex('transaction')
      .select()
      .where({
        referenceId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })

  /**
   * Find an article's appreciators by a given article id.
   */
  findAppreciators = async (articleId: string): Promise<any[]> =>
    await this.knex('transaction')
      .distinct('sender_id', 'id')
      .select('sender_id')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .orderBy('id', 'desc')

  appreciateLeftByUser = async ({
    articleId,
    userId
  }: {
    articleId: string
    userId: string
  }): Promise<number> => {
    const appreciations = await this.knex('transaction')
      .select()
      .where({
        senderId: userId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
    return Math.max(ARTICLE_APPRECIATE_LIMIT - appreciations.length, 0)
  }

  /**
   * Find tages by a given article id.
   */
  findTagIds = async ({
    id: articleId
  }: {
    id: string
  }): Promise<any | null> => {
    const result = await this.knex
      .select('tag_id')
      .from('article_tag')
      .where({ articleId })

    return result.map(({ tagId }: { tagId: string }) => tagId)
  }

  /**
   * Find an article's subscribers by a given targetId (article).
   */
  findSubscriptions = async (targetId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({ targetId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')

  /**
   * Find an article's subscriber by a given targetId (article) and user id.
   */
  // findSubscriptionByUserId = async (
  //   targetId: string,
  //   userId: string
  // ): Promise<any[]> =>
  //   await this.knex
  //     .select()
  //     .from('action_article')
  //     .where({
  //       targetId,
  //       userId,
  //       action: USER_ACTION.subscribe
  //     })

  isSubscribed = async ({
    userId,
    targetId
  }: {
    userId: string
    targetId: string
  }): Promise<boolean> => {
    const result = await this.knex
      .select()
      .from('action_article')
      .where({ userId, targetId, action: USER_ACTION.subscribe })
    return result.length > 0
  }

  hasAppreciate = async ({
    userId: senderId,
    articleId
  }: {
    userId: string
    articleId: string
  }): Promise<boolean> => {
    const result = await this.knex('transaction')
      .select()
      .where({
        senderId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
    return result.length > 0
  }

  /**
   * User subscribe an article
   */
  subscribe = async (targetId: string, userId: string): Promise<any[]> =>
    await this.baseCreate(
      {
        targetId,
        userId,
        action: USER_ACTION.subscribe
      },
      'action_article'
    )

  /**
   * User unsubscribe an article
   */
  unsubscribe = async (targetId: string, userId: string): Promise<any[]> =>
    await this.knex
      .from('action_article')
      .where({
        targetId,
        userId,
        action: USER_ACTION.subscribe
      })
      .del()

  /**
   * User appreciate an article
   */
  appreciate = async ({
    uuid,
    articleId,
    senderId,
    senderMAT,
    recipientId,
    amount
  }: {
    uuid: string
    articleId: string
    senderId: string
    senderMAT: number
    recipientId: string
    amount: number
  }): Promise<any> => {
    const result = await this.knex('transaction')
      .insert({
        uuid,
        senderId,
        recipientId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate,
        amount
      })
      .into('transaction')
      .returning('*')
    return result
  }

  /**
   * User read an article
   */
  read = async (articleId: string, userId: string): Promise<any[]> => {
    const readHistory = await this.knex
      .select()
      .from('article_read')
      .where({ articleId, userId, archived: false })
      .first()

    if (readHistory) {
      return readHistory
    }

    return await this.baseCreate(
      {
        uuid: v4(),
        articleId,
        userId
      },
      'article_read'
    )
  }

  /**
   * User report an article
   */
  report = async ({
    articleId,
    userId,
    category,
    description,
    contact,
    assetIds
  }: {
    articleId?: string
    userId?: string | null
    category: string
    description?: string
    contact?: string
    assetIds?: string[]
  }): Promise<void> => {
    // create report
    const { id: reportId } = await this.baseCreate(
      {
        userId,
        articleId,
        category,
        description,
        contact
      },
      'report'
    )
    // create report assets
    if (!assetIds || assetIds.length <= 0) {
      return
    }
    const reportAssets = assetIds.map(assetId => ({
      reportId,
      assetId
    }))
    await this.baseBatchCreate(reportAssets, 'report_asset')
  }

  // TODO
  getContentFromHash = (hash: string) => `
    <html>
      <head>
        <title></title>
      </head>
      <body>
        <p></p>
      </body>
    </html>`
}
