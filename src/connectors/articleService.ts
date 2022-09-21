import {
  makeHtmlBundle,
  makeMetaData,
  stripHtml,
  TemplateOptions,
} from '@matters/matters-html-formatter'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { Knex } from 'knex'
import { v4 } from 'uuid'

import {
  APPRECIATION_PURPOSE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  CIRCLE_STATE,
  COMMENT_TYPE,
  MINUTE,
  PUBLISH_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  USER_ACTION,
} from 'common/enums'
import { environment, isTest } from 'common/environment'
import { ArticleNotFoundError, ServerError } from 'common/errors'
import logger from 'common/logger'
import {
  AtomService,
  BaseService,
  Feed,
  ipfs,
  SystemService,
  // TagService,
  UserService,
} from 'connectors'
import { GQLSearchExclude, Item } from 'definitions'

export class ArticleService extends BaseService {
  ipfs: typeof ipfs
  draftLoader: DataLoader<string, Item>

  constructor() {
    super('article')
    this.ipfs = ipfs

    this.dataloader = new DataLoader(async (ids: readonly string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      return result
    })

    this.draftLoader = new DataLoader(async (ids: readonly string[]) => {
      const items = await this.baseFindByIds(ids)

      if (items.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      const draftIds = items.map((item: any) => item.draftId)
      const result = await this.baseFindByIds(draftIds, 'draft')
      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError("Cannot find article's linked draft")
      }

      return result
    })
  }

  /**
   * Create a active article with linked draft
   */
  createArticle = async ({
    draftId,
    authorId,
    title,
    slug,
    wordCount,
    summary,
    content,
    cover,
    dataHash,
    mediaHash,
  }: Record<string, any>) =>
    this.baseCreate({
      uuid: v4(),
      state: ARTICLE_STATE.active,
      draftId,
      authorId,
      title,
      slug,
      wordCount,
      summary,
      content,
      cover,
      dataHash,
      mediaHash,
    })

  /**
   * Publish draft data to IPFS
   */
  publishToIPFS = async ({
    authorId,
    title,
    cover,
    content,
    circleId,
    summary,
    summaryCustomized,
    access,
  }: Record<string, any>) => {
    const userService = new UserService()
    const systemService = new SystemService()
    // const atomService = new AtomService()

    // prepare metadata
    const author = await userService.dataloader.load(authorId)
    const { avatar, description, displayName, userName, paymentPointer } =
      author
    const userImg = avatar && (await systemService.findAssetUrl(avatar))
    const articleImg = cover && (await systemService.findAssetUrl(cover))

    const bundleInfo = {
      title,
      author: {
        name: displayName,
        link: {
          text: `${displayName} (@${userName})`,
          url: new URL(`/@${userName}`, environment.siteDomain).href,
        },
      },
      from: {
        text: 'Matters',
        url: environment.siteDomain,
      },
      content,
    } as TemplateOptions

    // paywall info
    if (circleId) {
      const circle = await this.knex('circle')
        .select('name', 'displayName')
        .where({ id: circleId, state: CIRCLE_STATE.active })
        .first()
      const circleName = circle?.name
      const circleDisplayName = circle?.displayName

      if (circleName && circleDisplayName) {
        bundleInfo.readMore = {
          url: `${environment.siteDomain}/~${circleName}`,
          text: circleDisplayName,
        }
      }

      // encrypt paywalled content
      if (access === ARTICLE_ACCESS_TYPE.paywall) {
        bundleInfo.encrypt = true
      }
    }

    // add summury when customized or encrypted
    if (summaryCustomized || bundleInfo.encrypt) {
      bundleInfo.summary = summary
    }

    // payment pointer
    if (paymentPointer) {
      bundleInfo.paymentPointer = paymentPointer
    }

    // make bundle and add content to ipfs
    const directoryName = 'article'
    const { bundle, key } = await makeHtmlBundle(bundleInfo)

    const results = []
    for await (const result of this.ipfs.client.addAll(
      bundle.map((file) =>
        file ? { ...file, path: `${directoryName}/${file.path}` } : undefined
      )
    )) {
      results.push(result)
    }

    // filter out the hash for the bundle
    let entry = results.filter(
      ({ path }: { path: string }) => path === directoryName
    )

    // FIXME: fix missing bundle path and remove fallback logic
    // fallback to index file when no bundle path is matched
    if (entry.length === 0) {
      entry = results.filter(({ path }: { path: string }) =>
        path.endsWith('index.html')
      )
    }

    const contentHash = entry[0].cid.toString()

    // add meta data to ipfs
    const articleInfo = {
      contentHash,
      author: {
        name: userName,
        ...(userImg ? { image: userImg } : null), // `undefined` is not supported by the IPLD Data Model and cannot be encoded
        url: `https://matters.news/@${userName}`,
        description,
      },
      description: summary,
      image: articleImg,
    }

    const metaData = makeMetaData(articleInfo)

    // console.log(new Date, 'articleInfo:', { articleInfo, metaData, })
    const cid = await this.ipfs.client.dag.put(metaData, {
      // storeCodec: 'dag-cbor',
      format: 'dag-cbor',
      pin: true,
      hashAlg: 'sha2-256',
    })
    // console.log(new Date, 'after dag.put:', { cid, })
    const mediaHash = cid.toV1().toString() // cid.toBaseEncodedString()
    // console.log(new Date, 'after dag.put:', { cid, mediaHash, })

    return { contentHash, mediaHash, key }
  }

  publishFeedToIPNS = async (
    author: Item // Record<string, any>
    // articles: Array<Record<string, any>>
  ) => {
    const atomService = new AtomService()
    // const { userName, avatar, description, displayName } = author

    let ipnsKeyRec = await atomService.findFirst({
      table: 'user_ipns_keys',
      where: { userId: author.id },
    })
    const kname = `for-${author.userName}-${author.uuid}`
    let pem = ipnsKeyRec?.privKeyPem
    if (!pem) {
      const {
        // publicKey,
        privateKey,
      } = await this.ipfs.genKey()
      pem = privateKey.export({ format: 'pem', type: 'pkcs8' })
    }

    let ipnsKey = ipnsKeyRec?.ipnsKey
    try {
      // always try import; might be on another new ipfs node, or never has it before
      const res = await this.ipfs.importKey(kname, pem)
      if (!ipnsKey && res) {
        ipnsKey = res?.Id
      }
    } catch (err) {
      // ignore import error if already exists;
      if (!ipnsKey && err) {
        console.error(
          new Date(),
          `ERROR: no ipnsKey for user: ${author.userName}`,
          err
        )
      }
    }

    if (!ipnsKeyRec) {
      ipnsKeyRec = await atomService.create({
        table: 'user_ipns_keys',
        data: {
          userId: author.id,
          ipnsKey,
          privKeyPem: pem,
          privKeyName: kname,
          // lastPublication: this.knex.fn.now(),
        },
      })
    }

    const directoryName = `${kname}`
    // const { bundle, key } = await makeHtmlBundle(bundleInfo)
    // make a bundle of json+xml+html index

    const articleIds = await this.findByAuthor(author.id, {
      columns: ['article.id'],
      take: 50,
    })
    const articles = (await this.dataloader.loadMany(
      articleIds.map(({ id }: { id: string }) => id)
    )) as Item[]

    const feed = new Feed(author, ipnsKey, articles)
    await feed.loadData()

    const contents = ['feed.json', 'rss.xml', 'index.html']
      .map((file) =>
        // file ? { ...file, path: `${directoryName}/${file.path}` } : undefined
        ({
          path: `${directoryName}/${file}`,
          content: feed[file]?.(), // contents[file] as string,
        })
      )
      .filter(({ content }) => content)

    // add files by MFS FILES API
    await this.ipfs.client.files.mkdir(`/${directoryName}`)
    await Promise.all(
      contents.map(async ({ path, content }) =>
        this.ipfs.client.files.write(`/${path}`, content, {
          create: true,
          // parents: true,
          truncate: true,
        })
      )
    )
    let dirStat = await this.ipfs.client.files.stat(`/${directoryName}`)
    console.log(
      new Date(),
      `directoryName stat:`,
      dirStat.cid.toString(),
      dirStat
    )

    // attach MFS for each old publication
    for (const arti of articles) {
      await this.ipfs.client.files.cp(
        `/ipfs/${arti.dataHash}`,
        `/${directoryName}/${arti.id}-${arti.slug}`
      )
    }

    dirStat = await this.ipfs.client.files.stat(`/${directoryName}`)
    console.log(
      new Date(),
      `directoryName stat after attached ${articles.length} articles:`,
      dirStat.cid.toString(),
      dirStat
    )

    const results = []
    for await (const result of this.ipfs.client.addAll(contents)) {
      results.push(result)
    }
    let entry = results.filter(
      ({ path }: { path: string }) => path === directoryName
    )

    console.log(new Date(), 'contents feed.json ::', contents, results)

    if (entry.length === 0) {
      entry = results.filter(({ path }: { path: string }) =>
        path.endsWith('index.html')
      )
    }

    // const cidToPublish = entry[0].cid
    const cidToPublish = dirStat.cid
    const published = await this.ipfs.publish(cidToPublish, {
      lifetime: '1680h',
      key: kname,
    })
    console.log(new Date(), 'published:', published)

    await atomService.update({
      table: 'user_ipns_keys',
      where: { userId: author.id },
      data: {
        // privKeyPem: pem,
        // privKeyName: kname,
        // ipnsAddress,
        lastDataHash: cidToPublish.toString(),
        lastPublished: this.knex.fn.now(),
      },
    })
  }

  /**
   * Archive article
   */
  archive = async (id: string) => {
    // update search
    try {
      await this.es.client.update({
        index: this.table,
        id,
        body: {
          doc: { state: ARTICLE_STATE.archived },
        },
      })
    } catch (e) {
      logger.error(e)
    }

    return this.baseUpdate(id, {
      state: ARTICLE_STATE.archived,
      sticky: false,
      updatedAt: new Date(),
    })
  }

  /**
   *  Find articles by a given author id (user).
   */
  findByAuthor = async (
    authorId: string,
    // filter = {},
    {
      columns = ['draft_id'],
      // filter = {},
      showAll = false,
      stickyFirst = false,
      tagIds,
      inRangeStart,
      inRangeEnd,
      skip,
      take,
    }: {
      columns?: string[]
      // filter?: object
      showAll?: boolean
      stickyFirst?: boolean
      tagIds?: string[]
      inRangeStart?: string
      inRangeEnd?: string
      skip?: number
      take?: number
    } = {}
  ) =>
    this.knex
      .select(columns)
      .from(this.knex.ref(this.table))
      .join(
        this.knex
          .from('draft')
          .select('id', 'article_id')
          .distinctOn('article_id')
          .where({ authorId, publishState: PUBLISH_STATE.published })
          .orderByRaw('article_id DESC NULLS LAST') // the first orderBy must match distinctOn
          .as('t'),
        'article_id',
        'article.id'
      )
      .where({
        authorId,
        ...(showAll
          ? null
          : {
              state: ARTICLE_STATE.active,
            }),
      })
      .modify((builder: Knex.QueryBuilder) => {
        if (Array.isArray(tagIds) && tagIds.length > 0) {
          builder
            .join('article_tag AS at', 'at.article_id', 'article.id')
            .andWhere('tag_id', 'in', tagIds)
        }
        if (inRangeStart != null && inRangeEnd != null) {
          // neither null nor undefined
          builder.andWhereBetween('article.created_at', [
            inRangeStart,
            inRangeEnd,
          ])
        } else if (inRangeStart != null) {
          builder.andWhere('article.created_at', '>=', inRangeStart)
        } else if (inRangeEnd != null) {
          builder.andWhere('article.created_at', '<', inRangeEnd)
        }

        if (stickyFirst === true) {
          builder.orderBy('article.sticky', 'desc')
        }
        // always as last orderBy
        builder.orderBy('article.id', 'desc')

        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })

  /**
   * Find article by title
   */
  findByTitle = async ({
    title,
    oss = false,
    filter,
  }: {
    title: string
    oss?: boolean
    filter?: Record<string, any>
  }) => {
    const query = this.knex.select().from(this.table).where({ title })

    if (!oss) {
      query.andWhere({ state: ARTICLE_STATE.active })
    }

    if (filter && Object.keys(filter).length > 0) {
      query.andWhere(filter)
    }

    return query.orderBy('id', 'desc')
  }

  /**
   * Find articles by which commented by author.
   */
  findByCommentedAuthor = async ({
    id,
    skip,
    take,
  }: {
    id: string
    skip?: number
    take?: number
  }) => {
    const query = this.knex
      .select('article.*')
      .max('comment.id', { as: '_comment_id_' })
      .from('comment')
      .innerJoin(this.table, 'comment.target_id', 'article.id')
      .where({
        'comment.author_id': id,
        'comment.type': COMMENT_TYPE.article,
      })
      .groupBy('article.id')
      .orderBy('_comment_id_', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  /**
   * Dump all data to ES (Currently only used in test)
   */
  initSearch = async () => {
    const articles = await this.knex(this.table)
      .innerJoin('user', `${this.table}.author_id`, 'user.id')
      .select(
        `${this.table}.id as id`,
        'title',
        'content',
        'author_id as authorId',
        'user.user_name as userName',
        'user.display_name as displayName'
      )

    return this.es.indexManyItems({
      index: this.table,
      items: articles.map(
        (article: { content: string; title: string; id: string }) => ({
          ...article,
          content: stripHtml(article.content),
        })
      ),
    })
  }

  addToSearch = async ({
    id,
    title,
    content,
    authorId,
    userName,
    displayName,
    tags,
  }: {
    [key: string]: any
  }) => {
    try {
      return await this.es.indexItems({
        index: this.table,
        items: [
          {
            id,
            title,
            content: stripHtml(content),
            state: ARTICLE_STATE.active,
            authorId,
            userName,
            displayName,
            tags,
          },
        ],
      })
    } catch (error) {
      logger.error(error)
    }
  }

  searchByMediaHash = async ({
    key,
    oss = false,
    filter,
  }: {
    key: string
    oss?: boolean
    filter?: Record<string, any>
  }) => {
    const query = this.knex.select().from(this.table).where({ mediaHash: key })

    if (!oss) {
      query.andWhere({ state: ARTICLE_STATE.active })
    }

    if (filter && Object.keys(filter).length > 0) {
      query.andWhere(filter)
    }

    const rows = await query
    if (rows.length > 0) {
      return {
        nodes: rows,
        totalCount: rows.length,
      }
    } else {
      throw new ServerError('article search by media hash failed')
    }
  }

  search = async ({
    key,
    take,
    skip,
    oss = false,
    filter,
    exclude,
    viewerId,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    oss?: boolean
    filter?: Record<string, any>
    viewerId?: string | null
    exclude?: GQLSearchExclude
  }) => {
    const searchBody = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 'AUTO',
        fields: [
          'displayName^15',
          'title^10',
          'title.synonyms^5',
          'content^2',
          'content.synonyms',
        ],
        type: 'most_fields',
      })
      .from(skip)
      .size(take)

    // only return active if not in oss
    if (!oss) {
      searchBody.filter('term', { state: ARTICLE_STATE.active })
    }

    // add filter
    if (filter && Object.keys(filter).length > 0) {
      searchBody.filter('term', filter)
    }

    // gather users that blocked viewer
    const excludeBlocked = exclude === GQLSearchExclude.blocked && viewerId
    let blockedIds: string[] = []
    if (excludeBlocked) {
      blockedIds = (
        await this.knex('action_user')
          .select('user_id')
          .where({ action: USER_ACTION.block, targetId: viewerId })
      ).map(({ userId }) => userId)
    }

    try {
      // check if media hash in search key
      const re = /^([0-9a-zA-Z]{49,59})$/gi
      const match = re.exec(key)
      if (match) {
        const matched = await this.searchByMediaHash({
          key: match[1],
          oss,
          filter,
        })
        let items = (await this.draftLoader.loadMany(
          matched.nodes.map((item) => item.id)
        )) as Array<Record<string, any>>

        if (excludeBlocked) {
          items = items.filter((item) => !blockedIds.includes(item.authorId))
        }
        return { nodes: items, totalCount: items.length }
      }

      // take the condition that searching for exact article title into consideration
      const idsByTitle = []
      if (key.length >= 5 && skip === 0) {
        const articles = await this.findByTitle({ title: key, oss, filter })
        for (const article of articles) {
          idsByTitle.push(article.id)
        }
      }
      searchBody.notFilter('ids', { values: idsByTitle })

      const body = await this.es.client.search({
        index: this.table,
        body: searchBody.build(),
      })
      const { hits } = body
      const ids = idsByTitle.concat(
        hits.hits.map(({ _id }: { _id: any }) => _id)
      )

      let nodes = (await this.draftLoader.loadMany(ids)) as Array<
        Record<string, any>
      >

      if (excludeBlocked) {
        nodes = nodes.filter((node) => !blockedIds.includes(node.authorId))
      }

      return { nodes, totalCount: nodes.length }
    } catch (err) {
      logger.error(err)
      throw new ServerError('article search failed')
    }
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/
  related = async ({
    id,
    size,
    notIn = [],
  }: {
    id: string
    size: number
    notIn?: string[]
  }) => {
    // skip if in test
    if (isTest) {
      return []
    }

    // get vector score
    const scoreResult = await this.es.client.get({
      index: this.table,
      id,
    })

    const factors = (scoreResult as any)?._source?.embedding_vector

    // return empty list if we don't have any score
    if (!factors) {
      return []
    }

    const searchBody = {
      index: this.table,
      knn: {
        field: 'embedding_vector',
        query_vector: factors,
        k: 10,
        num_candidates: size,
      },
      filter: {
        bool: {
          must: { term: { state: ARTICLE_STATE.active } },
          must_not: { ids: { values: notIn.concat([id]) } },
        },
      },
    }

    const body = await this.es.client.knnSearch(searchBody)
    // add recommendation
    return body.hits.hits.map((hit: any) => ({ ...hit, id: hit._id }))
  }

  /**
   * Boost & Score
   */
  setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate({
      where: { articleId: id },
      data: { articleId: id, boost, updatedAt: new Date() },
      table: 'article_boost',
    })

  /*********************************
   *                               *
   *          Appreciaton          *
   *                               *
   *********************************/
  /**
   * Sum total appreciaton by a given article id.
   */
  sumAppreciation = async (articleId: string) => {
    const result = await this.knex
      .select()
      .from('appreciation')
      .whereIn(
        ['reference_id', 'purpose'],
        [
          [articleId, APPRECIATION_PURPOSE.appreciate],
          [articleId, APPRECIATION_PURPOSE.appreciateSubsidy],
        ]
      )
      .sum('amount', { as: 'sum' })
      .first()
    return parseInt(result?.sum || '0', 10)
  }

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async ({
    referenceId,
    take,
    skip,
  }: {
    referenceId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex('appreciation')
      .select('reference_id', 'sender_id')
      .where({
        referenceId,
        purpose: APPRECIATION_PURPOSE.appreciate,
      })
      .groupBy('sender_id', 'reference_id')
      .sum('amount as amount')
      .max('created_at as created_at')
      .orderBy('created_at', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  appreciateLeftByUser = async ({
    articleId,
    userId,
  }: {
    articleId: string
    userId: string
  }) => {
    const appreciations = await this.knex('appreciation')
      .select()
      .where({
        senderId: userId,
        referenceId: articleId,
        purpose: APPRECIATION_PURPOSE.appreciate,
      })
      .sum('amount as total')
      .first()
    const total = appreciations?.total ?? 0

    return Math.max(ARTICLE_APPRECIATE_LIMIT - total, 0)
  }

  /**
   * User appreciate an article
   */
  appreciate = async ({
    articleId,
    senderId,
    recipientId,
    amount,
    type,
  }: {
    articleId: string
    senderId: string
    recipientId: string
    amount: number
    type: string
  }) => {
    const appreciation = {
      senderId,
      recipientId,
      referenceId: articleId,
      purpose: APPRECIATION_PURPOSE.appreciate,
      type,
    }

    // find appreciations within 1 minutes and bundle
    const bundle = await this.knex('appreciation')
      .select()
      .where(appreciation)
      .andWhere(
        'created_at',
        '>=',
        this.knex.raw(`now() - INTERVAL '5 minutes'`)
      )
      .orderBy('created_at')
      .first()

    let result

    if (bundle) {
      result = await this.knex('appreciation')
        .where({ id: bundle.id })
        .update({
          amount: Math.min(bundle.amount + amount, ARTICLE_APPRECIATE_LIMIT),
          createdAt: this.knex.fn.now(),
        })
    } else {
      const uuid = v4()
      result = await this.knex('appreciation')
        .insert({
          ...appreciation,
          uuid,
          amount,
        })
        .into('appreciation')
        .returning('*')
    }

    return result
  }

  /*********************************
   *                               *
   *              Tag              *
   *                               *
   *********************************/
  /**
   * Find tags by a given article id.
   */
  findTagIds = async ({
    id: articleId,
  }: {
    id: string
  }): Promise<any | null> => {
    const result = await this.knex
      .select('tag_id')
      .from('article_tag')
      .where({ articleId })
      .orderBy('created_at', 'desc')

    return result.map(({ tagId }: { tagId: string }) => tagId)
  }

  /*********************************
   *                               *
   *          Subscription         *
   *                               *
   *********************************/
  /**
   * Find an article's subscribers by a given targetId (article).
   */
  findSubscriptions = async ({
    id: targetId,
    take,
    skip,
  }: {
    id: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_article')
      .where({ targetId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  /**
   * User read an article
   */
  read = async ({
    userId,
    articleId,
    ip,
  }: {
    articleId: string
    userId?: string | null
    ip?: string
  }) => {
    const table = 'article_read_count'

    /***
     * recording parameters:
     * updatedAt: last heart beat update
     * lastRead: last new read start timestamp
     * readTime: total read time in seconds, accumulated from heart beat and updatedAt
     */

    // current read data
    const newData = {
      articleId,
      userId,
      updatedAt: new Date(),
      archived: false,
      ip,
    }

    // get past record
    const record = await this.baseFind({ where: { articleId, userId }, table })

    /**
     * Case 1: no past record exists
     * create new record and return
     */
    if (!record || record.length === 0) {
      await this.baseCreate(
        {
          ...newData,
          count: 1,
          timedCount: 1,
          readTime: userId ? 0 : null,
          lastRead: new Date(),
        },
        table
      )
      return { newRead: true }
    }

    // get old data
    const oldData = record[0]

    // prepare funtion to only update count
    const updateReadCount = async () => {
      await this.baseUpdate(
        oldData.id,
        {
          ...oldData,
          ...newData,
          count: parseInt(oldData.count, 10) + 1,
          timedCount: parseInt(oldData.timedCount, 10) + 1,
          lastRead: new Date(),
        },
        table
      )
    }

    /**
     *
     * Case 2: visitor
     * don't accumulate read time
     * add a new count and update last read timestamp for visitors
     */
    if (!userId) {
      await updateReadCount()
      return { newRead: true }
    }

    // for logged-in user, calculate lapsed time in milisecondes
    // based on updatedAt
    const lapse = Date.now() - new Date(oldData.updatedAt).getTime()

    // calculate total time since last read started
    const readLength = Date.now() - new Date(oldData.lastRead).getTime()

    // calculate total read time by accumulating heart beat
    const readTime = Math.round(parseInt(oldData.readTime, 10) + lapse / 1000)

    /**
     * Case 3: user continuous read that exceeds 30 minutes
     * stop accumulating read time and only update updatedAt
     *
     * also check if lapse time is longer than 5 minutes,
     * if so it's a new read and go to case 4
     */
    if (lapse < MINUTE * 5 && readLength > MINUTE * 30) {
      await this.baseUpdate(
        oldData.id,
        {
          updatedAt: newData.updatedAt,
        },
        table
      )
      return { newRead: false }
    }

    /**
     * Case 4: lapse equal or longer than 5 minutes
     * treat as a new read
     * add a new count and update last read timestamp
     */
    if (lapse >= MINUTE * 5) {
      await updateReadCount()
      return { newRead: true }
    }

    /**
     * Case 5: all other normal readings
     * accumulate time and update data
     */
    await this.baseUpdate(
      oldData.id,
      {
        ...oldData,
        ...newData,
        readTime,
      },
      table
    )
    return { newRead: false }
  }

  /*********************************
   *                               *
   *          Collection           *
   *                               *
   *********************************/
  /**
   * Find an article's collections by a given article id.
   */
  findCollections = async ({
    entranceId,
    take,
    skip,
  }: {
    entranceId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex('collection')
      .select('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId, state: ARTICLE_STATE.active })
      .orderBy('order', 'asc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /**
   * Count an article is collected by how many active articles.
   */
  countActiveCollectedBy = async (id: string) => {
    const query = this.knex('collection')
      .rightJoin('article', 'collection.entrance_id', 'article.id')
      .where({
        'collection.article_id': id,
        'article.state': ARTICLE_STATE.active,
      })
      .countDistinct('entrance_id')
      .first()
    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *           Response            *
   *                               *
   *********************************/
  makeResponseQuery = ({
    id,
    order,
    state,
    fields = '*',
    articleOnly = false,
  }: {
    id: string
    order: string
    state?: string
    fields?: string
    articleOnly?: boolean
  }) =>
    this.knex.select(fields).from((wrapper: any) => {
      wrapper
        .select(
          this.knex.raw('row_number() over (order by created_at) as seq, *')
        )
        .from((knex: any) => {
          const source = knex.union((operator: any) => {
            operator
              .select(
                this.knex.raw(
                  "'Article' as type, entrance_id as entity_id, collection.created_at"
                )
              )
              .from('collection')
              .rightJoin('article', 'collection.entrance_id', 'article.id')
              .where({ 'collection.article_id': id, 'article.state': state })
          })

          if (articleOnly !== true) {
            source.union((operator: any) => {
              operator
                .select(
                  this.knex.raw(
                    "'Comment' as type, id as entity_id, created_at"
                  )
                )
                .from('comment')
                .where({
                  targetId: id,
                  parentCommentId: null,
                  type: COMMENT_TYPE.article,
                })
            })
          }

          source.as('base_sources')
          return source
        })
        .orderBy('created_at', order)
        .as('sources')
    })

  makeResponseFilterQuery = ({
    id,
    entityId,
    order,
    state,
    articleOnly,
  }: {
    id: string
    entityId: string
    order: string
    state?: string
    articleOnly?: boolean
  }) => {
    const query = this.makeResponseQuery({
      id,
      order,
      state,
      fields: 'seq',
      articleOnly,
    })
    return query.where({ entityId }).first()
  }

  findResponses = ({
    id,
    order = 'desc',
    state = ARTICLE_STATE.active,
    after,
    before,
    first,
    includeAfter = false,
    includeBefore = false,
    articleOnly = false,
  }: {
    id: string
    order?: string
    state?: string
    after?: any
    before?: any
    first?: number
    includeAfter?: boolean
    includeBefore?: boolean
    articleOnly?: boolean
  }) => {
    const query = this.makeResponseQuery({ id, order, state, articleOnly })
    if (after) {
      const subQuery = this.makeResponseFilterQuery({
        id,
        order,
        state,
        entityId: after,
        articleOnly,
      })
      if (includeAfter) {
        query.andWhere('seq', order === 'asc' ? '>=' : '<=', subQuery)
      } else {
        query.andWhere('seq', order === 'asc' ? '>' : '<', subQuery)
      }
    }
    if (before) {
      const subQuery = this.makeResponseFilterQuery({
        id,
        order,
        state,
        entityId: before,
      })
      if (includeBefore) {
        query.andWhere('seq', order === 'asc' ? '<=' : '>=', subQuery)
      } else {
        query.andWhere('seq', order === 'asc' ? '<' : '>', subQuery)
      }
    }
    if (first) {
      query.limit(first)
    }
    return query
  }

  responseRange = async ({
    id,
    order,
    state,
  }: {
    id: string
    order: string
    state: string
  }) => {
    const query = this.makeResponseQuery({ id, order, state, fields: '' })
    const { count, max, min } = (await query
      .max('seq')
      .min('seq')
      .count()
      .first()) as Record<string, any>
    return {
      count: parseInt(count, 10),
      max: parseInt(max, 10),
      min: parseInt(min, 10),
    }
  }

  /*********************************
   *                               *
   *          Transaction          *
   *                               *
   *********************************/
  /**
   * Count an article's transactions by a given articleId.
   */
  countTransactions = async ({
    purpose = TRANSACTION_PURPOSE.donation,
    state = TRANSACTION_STATE.succeeded,
    targetId,
    targetType = TRANSACTION_TARGET_TYPE.article,
  }: {
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
    const result = await this.knex
      .select()
      .from((knex: any) => {
        const source = knex
          .select('sender_id', 'target_id')
          .from('transaction')
          .where({
            purpose,
            state,
            targetId,
            targetType: entityTypeId,
          })
          .groupBy('sender_id', 'target_id')
        source.as('source')
      })
      .count()
      .first()

    return parseInt((result?.count as string) || '0', 10)
  }

  /**
   * Find an article's transactions by a given articleId.
   */
  findTransactions = async ({
    take,
    skip,
    purpose = TRANSACTION_PURPOSE.donation,
    state = TRANSACTION_STATE.succeeded,
    targetId,
    targetType = TRANSACTION_TARGET_TYPE.article,
  }: {
    take?: number
    skip?: number
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
    const query = this.knex('transaction')
      .select('sender_id', 'target_id')
      .where({
        purpose,
        state,
        targetId,
        targetType: entityTypeId,
      })
      .groupBy('sender_id', 'target_id')
      .sum('amount as amount')
      .max('created_at as created_at')
      .orderBy('created_at', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /**
   * Count articles which also donated by the donator of a given article
   */
  makeRelatedDonationsQuery = ({
    articleId,
    targetTypeId,
    notIn,
  }: {
    articleId: string
    targetTypeId: string
    notIn: string[]
  }) => {
    // 1 LIKE = 0.05 HKD
    const RATE_HKD_TO_LIKE = 20

    const baseWhere = {
      targetType: targetTypeId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    }

    const donatorsQuery = this.knex('transaction')
      .select('sender_id as user_id')
      .where({
        targetId: articleId,
        ...baseWhere,
      })
      .groupBy('sender_id')
      .as('donators')

    const relatedDonationsQuery = this.knex('transaction')
      .select('target_id')
      .select(
        this.knex.raw(`
            sum(
              CASE WHEN currency = 'HKD' THEN
                amount * ${RATE_HKD_TO_LIKE}
              ELSE
                amount
              END
            ) score
          `)
      )
      .rightJoin(donatorsQuery, 'donators.user_id', 'transaction.sender_id')
      .where({ ...baseWhere })
      .whereNotIn('target_id', notIn)
      .groupBy('target_id')
      .as('related_donations')

    return this.knex
      .select('article.*')
      .from(this.table)
      .rightJoin(
        relatedDonationsQuery,
        'article.id',
        'related_donations.target_id'
      )
      .where({ state: ARTICLE_STATE.active })
  }

  countRelatedDonations = async ({
    articleId,
    notIn,
  }: {
    articleId: string
    notIn: string[]
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const query = this.makeRelatedDonationsQuery({
      articleId,
      targetTypeId: entityTypeId,
      notIn,
    })

    const result = await this.knex.from(query.as('base')).count().first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find articles which also donated by the donator of a given article
   */
  findRelatedDonations = async ({
    articleId,
    notIn,
    take,
    skip,
  }: {
    articleId: string
    notIn: string[]
    take?: number
    skip?: number
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const query = this.makeRelatedDonationsQuery({
      articleId,
      targetTypeId: entityTypeId,
      notIn,
    })

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query.orderBy('score')
  }

  /*********************************
   *                               *
   *            Access             *
   *                               *
   *********************************/
  findArticleCircle = async (articleId: string) => {
    return this.knex
      .select('article_circle.*')
      .from('article_circle')
      .join('circle', 'article_circle.circle_id', 'circle.id')
      .where({
        'article_circle.article_id': articleId,
        'circle.state': CIRCLE_STATE.active,
      })
      .first()
  }
}
