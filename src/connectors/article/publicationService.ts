import type {
  Connections,
  Draft,
  Article,
  ArticleVersion,
  ArticleConnection,
  Collection,
  Campaign,
} from '#definitions/index.js'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NOTICE_TYPE,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_FEATURE_FLAG_TYPE,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
} from '#common/enums/index.js'
import {
  ActionFailedError,
  ArticleNotFoundError,
  ForbiddenError,
  ArticleCollectionReachLimitError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  countWords,
  shortHash,
  genMD5,
  stripMentions,
  stripHtml,
  normalizeTagInput,
  extractMentionIds,
  extractAssetDataFromHtml,
} from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import * as Sentry from '@sentry/node'
import _ from 'lodash'
import { createRequire } from 'node:module'

import { BaseService } from '../baseService.js'
import { CampaignService } from '../campaignService.js'
import { ChannelService } from '../channel/channelService.js'
import { CollectionService } from '../collectionService.js'
import { DraftService } from '../draftService.js'
import { LanguageDetector } from '../languageDetector.js'
import { NotificationService } from '../notification/notificationService.js'
import { SearchService } from '../searchService.js'
import { SpamDetector } from '../spamDetector.js'
import { SystemService } from '../systemService.js'
import { TagService } from '../tagService.js'
import { UserService } from '../userService.js'

import { ArticleService } from './articleService.js'
import { IPFSPublicationService } from './ipfsPublicationService.js'

const require = createRequire(import.meta.url)
const { html2md } = require('@matters/matters-editor/transformers')
const logger = getLogger('service-article')
const { difference, isEqual, uniq } = _

export class PublicationService extends BaseService<Article> {
  private systemService: SystemService
  private notificationService: NotificationService
  private searchService: SearchService
  private articleService: ArticleService

  public constructor(connections: Connections) {
    super('article', connections)

    this.systemService = new SystemService(this.connections)
    this.notificationService = new NotificationService(this.connections)
    this.searchService = new SearchService(this.connections)
    this.articleService = new ArticleService(this.connections)
  }

  public publishArticle = async (draftId: string) => {
    let draft = await this.models.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    // Step 1: checks
    if (!draft || draft.publishState !== PUBLISH_STATE.pending) {
      return draft
    }

    // Step 2: create an article
    const [article, articleVersion] = await this.createArticle(draft)

    draft = await this.models.update({
      table: 'draft',
      where: { id: draft.id },
      data: {
        publishState: PUBLISH_STATE.published,
        articleId: article.id,
      },
    })

    // Note: the following steps won't affect the publication.
    let failed = false
    try {
      // Step 4: handle collection, circles, tags & mentions
      const failedCollections = await this.handleCollections({
        draft,
        article,
      })
      const failedConnections = await this.handleConnections({
        article,
        articleVersion,
      })
      const failedCampaigns = await this.handleCampaigns({ draft, article })
      await this.handleCircle({
        article,
        articleVersion,
      })
      await this.handleTags({ article, articleVersion })
      await this.handleMentions({ article, content: draft.content })
      /**
       * Step 5: Handle Assets
       *
       * Relationship between asset_map and entity:
       *
       * cover -> article
       * embed -> draft
       *
       * @see {@url https://github.com/thematters/matters-server/pull/1510}
       */
      const [{ id: draftEntityTypeId }, { id: articleEntityTypeId }] =
        await Promise.all([
          this.systemService.baseFindEntityTypeId('draft'),
          this.systemService.baseFindEntityTypeId('article'),
        ])

      // Remove unused assets
      await this.deleteUnusedAssets({ draftEntityTypeId, draft })

      // Swap cover assets from draft to article
      const coverAssets = await this.systemService.findAssetAndAssetMap({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
        assetType: 'cover',
      })
      await this.systemService.swapAssetMapEntity(
        coverAssets.map((ast: { id: string }) => ast.id),
        articleEntityTypeId,
        article.id
      )
      // notify any failed steps for scheduled publication
      if (draft.publishAt) {
        if (failedCollections && failedCollections.length > 0) {
          this.notificationService.trigger({
            event: NOTICE_TYPE.scheduled_article_published,
            recipientId: article.authorId,
            entities: [
              { type: 'target', entityTable: 'article', entity: article },
              ...failedCollections.map((failedCollection: Collection) => ({
                type: 'collection' as const,
                entityTable: 'collection' as const,
                entity: failedCollection,
              })),
            ],
          })
          failed = true
        }
        if (failedConnections && failedConnections.length > 0) {
          this.notificationService.trigger({
            event: NOTICE_TYPE.scheduled_article_published,
            recipientId: article.authorId,
            entities: [
              { type: 'target', entityTable: 'article', entity: article },
              ...failedConnections.map((failedArticle: Article) => ({
                type: 'connection' as const,
                entityTable: 'article' as const,
                entity: failedArticle,
              })),
            ],
          })
          failed = true
        }
        if (failedCampaigns && failedCampaigns.length > 0) {
          await this.notificationService.trigger({
            event: NOTICE_TYPE.scheduled_article_published,
            recipientId: article.authorId,
            entities: [
              { type: 'target', entityTable: 'article', entity: article },
              ...failedCampaigns.map((failedCampaign: Campaign) => ({
                type: 'campaign' as const,
                entityTable: 'campaign' as const,
                entity: failedCampaign,
              })),
            ],
          })
          failed = true
        }
      }
    } catch (err) {
      // ignore errors caused by these steps
      logger.warn('optional step failed: %j', {
        err,
        draftId: draft.id,
      })
      Sentry.captureException(err)
    }

    // Step 7: trigger notifications
    if (draft.publishAt) {
      if (!failed) {
        this.notificationService.trigger({
          event: NOTICE_TYPE.scheduled_article_published,
          recipientId: article.authorId,
          entities: [
            { type: 'target', entityTable: 'article', entity: article },
          ],
        })
      }
    } else {
      this.notificationService.trigger({
        event: NOTICE_TYPE.article_published,
        recipientId: article.authorId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    }

    // Step 8: invalidate cache
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis: this.connections.redis,
    })
    invalidateFQC({
      node: { type: NODE_TYPES.Article, id: article.id },
      redis: this.connections.redis,
    })

    return draft
  }

  /**
   * Create article from draft
   */
  public createArticle = async ({
    id: draftId,
    authorId,
    title,
    summary,
    content,
    contentMd,
    cover,
    tags,
    connections,
    circleId,
    access,
    license,
    requestForDonation,
    replyToDonator,
    canComment,
    indentFirstLine,
    sensitiveByAuthor,
  }: Partial<Draft> & {
    authorId: string
    title: string
    content: string
  }): Promise<[Article, ArticleVersion]> => {
    const wordCount = countWords(content)
    const summaryCustomized = !!summary

    // get contentId and contentMdId
    const { id: contentId } = await this.getOrCreateArticleContent(content)
    let _contentMd
    try {
      _contentMd = contentMd || html2md(content)
    } catch (e) {
      logger.warn('draft %s failed to convert HTML to Markdown', draftId)
      Sentry.captureException(e)
    }
    let contentMdId
    if (_contentMd) {
      const { id: _contentMdId } = await this.getOrCreateArticleContent(
        _contentMd
      )
      contentMdId = _contentMdId
    }

    // create article and article version
    const trx = await this.knex.transaction()
    try {
      const [article] = await trx<Article>('article')
        .insert({
          authorId,
          state: ARTICLE_STATE.active,
          shortHash: shortHash(), // retry handling at higher level of a very low probability of collision, or increase the nanoid length when it comes to higher probability;
        })
        .returning('*')
      const [articleVersion] = await trx<ArticleVersion>('article_version')
        .insert({
          articleId: article.id,
          title,
          summary: summary || '',
          summaryCustomized,
          contentId,
          contentMdId,
          cover,
          tags: tags ?? [],
          connections: connections ?? [],
          wordCount,
          circleId,
          access: access ?? ARTICLE_ACCESS_TYPE.public,
          license: license ?? ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4,
          requestForDonation,
          replyToDonator,
          canComment: canComment ?? true,
          indentFirstLine: indentFirstLine ?? false,
          sensitiveByAuthor: sensitiveByAuthor ?? false,
        })
        .returning('*')
      await trx.commit()

      this._runPostProcessing(article, articleVersion, content)

      // copy asset_map from draft to article if there is a draft
      if (draftId) {
        const [draftEntity, articleEntity] = await Promise.all([
          this.systemService.baseFindEntityTypeId('draft'),
          this.systemService.baseFindEntityTypeId('article'),
        ])
        await this.systemService.copyAssetMapEntities({
          source: { entityTypeId: draftEntity.id, entityId: draftId },
          target: { entityTypeId: articleEntity.id, entityId: article.id },
        })
      }
      return [article, articleVersion]
    } catch (e) {
      await trx.rollback()
      Sentry.captureException(e)
      throw e
    }
  }

  /*********************************
   *                               *
   *       Article Content         *
   *                               *
   *********************************/

  public getOrCreateArticleContent = async (content: string) => {
    const contentHash = genMD5(content)
    const result = await this.models.findUnique({
      table: 'article_content',
      where: { hash: contentHash },
    })
    if (result) {
      return result
    } else {
      return this.models.create({
        table: 'article_content',
        data: { hash: contentHash, content },
      })
    }
  }

  public createNewArticleVersion = async (
    articleId: string,
    actorId: string,
    newData: Partial<Draft>,
    description?: string
  ) => {
    if (Object.keys(newData).length === 0) {
      throw new ActionFailedError('newData is empty')
    }
    const lastData = await this.articleService.latestArticleVersionLoader.load(
      articleId
    )
    let data = { ...lastData } as Partial<ArticleVersion>
    delete data.id
    delete data.description
    delete data.createdAt
    delete data.updatedAt
    const newContent = newData.content

    if (newData.title) {
      data = { ...data, title: newData.title }
      delete newData.title
    }

    if (newData.content) {
      const { id: contentId } = await this.getOrCreateArticleContent(
        newData.content
      )
      data = { ...data, contentId, wordCount: countWords(newData.content) }
      let _contentMd
      try {
        _contentMd = newData.contentMd || html2md(newData.content)
      } catch (e) {
        logger.warn(
          'failed to convert HTML to Markdown for new article version of article %s',
          articleId
        )
        Sentry.captureException(e)
      }
      if (_contentMd) {
        const { id: _contentMdId } = await this.getOrCreateArticleContent(
          _contentMd
        )
        data = { ...data, contentMdId: _contentMdId }
      }
      delete newData.content
    } else {
      data = {
        ...data,
        contentId: lastData.contentId,
        contentMdId: lastData.contentMdId,
        wordCount: lastData.wordCount,
        dataHash: lastData.dataHash,
        mediaHash: lastData.mediaHash,
        iscnId: lastData.iscnId,
      }
    }
    if (newData.summary || newData.summary === null || newData.summary === '') {
      data = {
        ...data,
        summary: newData.summary ?? '',
        summaryCustomized: newData.summary ? true : false,
      }
      delete newData.summary
    } else {
      data = {
        ...data,
        summary: lastData.summary,
        summaryCustomized: lastData.summaryCustomized,
      }
    }
    if (newData.connections || newData.connections === null) {
      data = { ...data, connections: newData.connections ?? [] }
      await this.updateArticleConnections({
        articleId,
        connections: newData.connections ?? [],
      })
      delete newData.connections
    }

    if (newData.circleId) {
      const _data = { articleId, circleId: newData.circleId }
      await this.models.upsert({
        table: 'article_circle',
        where: _data,
        create: { ..._data, access: newData.access || data.access },
        update: { ..._data, access: newData.access || data.access },
      })
    }
    if (newData.circleId === null) {
      await this.models.deleteMany({
        table: 'article_circle',
        where: { articleId },
      })
    }

    if (newData.tags || newData.tags === null) {
      const tagService = new TagService(this.connections)
      await tagService.updateArticleTags({
        articleId,
        actorId,
        tags: newData.tags ?? [],
      })
      data = { ...data, tags: newData.tags ?? [] }
      delete newData.tags
    }

    const articleVersion = await this.models.create({
      table: 'article_version',
      data: { ...data, ...newData, description } as Partial<ArticleVersion>,
    })

    if (newContent) {
      this._runPostProcessing(
        { id: articleId, authorId: actorId },
        articleVersion,
        newContent
      )
    }
    this.articleService.latestArticleVersionLoader.clear(articleId)
    return articleVersion
  }

  /*********************************
   *                               *
   *        Spam detection         *
   *                               *
   *********************************/

  public detectSpam = async (id: string, spamDetector?: SpamDetector) => {
    const detector = spamDetector ?? new SpamDetector()
    const { title, summary, summaryCustomized } =
      await this.articleService.loadLatestArticleVersion(id)
    const content = await this.articleService.loadLatestArticleContent(id)
    await this._detectSpam(
      { id, title, content, summary: summaryCustomized ? summary : undefined },
      detector
    )
  }

  private _detectSpam = async (
    {
      id,
      title,
      content,
      summary,
    }: { id: string; title: string; content: string; summary?: string },
    spamDetector?: SpamDetector
  ) => {
    const detector = spamDetector ?? new SpamDetector()
    const text = summary
      ? title + '\n' + summary + '\n' + content
      : title + '\n' + content
    const score = await detector.detect(text)
    logger.info(`Spam detection for article ${id}: ${score}`)

    if (score) {
      await this.models.update({
        table: 'article',
        where: { id },
        data: { spamScore: score },
      })
    }
    return score
  }

  public isSpam = async (articleId: string) => {
    const {
      spamScore: _spamScore,
      isSpam: _isSpam,
      authorId,
    } = await this.models.articleIdLoader.load(articleId)
    const pypassSpam = !!(await this.models.findFirst({
      table: 'user_feature_flag',
      where: {
        userId: authorId,
        type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
      },
    }))
    const spamThreshold = (await this.systemService.getSpamThreshold()) || 1
    const spamScore = _spamScore ?? 0
    return _isSpam ?? (pypassSpam ? false : spamScore >= spamThreshold)
  }

  public detectLanguage = async (articleVersionId: string) => {
    const languageDetector = new LanguageDetector()

    const { title, summary, contentId } =
      await this.models.articleVersionIdLoader.load(articleVersionId)
    const { content } = await this.models.articleContentIdLoader.load(contentId)
    const excerpt = stripHtml(stripMentions(content), {
      lineReplacement: ' ',
    }).slice(0, 300)

    return languageDetector.detect(`${title} ${summary} ${excerpt}`)
  }

  public runPostProcessing = async (article: Article, isSpam?: boolean) => {
    const articleVersion = await this.articleService.loadLatestArticleVersion(
      article.id
    )
    const content = await this.articleService.loadLatestArticleContent(
      article.id
    )

    return this._runPostProcessing(article, articleVersion, content, isSpam)
  }

  private _runPostProcessing = async (
    article: Pick<Article, 'id' | 'authorId'>,
    articleVersion: ArticleVersion,
    content: string,
    isSpam?: boolean
  ) => {
    const { id: articleId } = article
    const { title, summary: _summary, summaryCustomized } = articleVersion
    const summary = summaryCustomized ? _summary : undefined

    let _isSpam = isSpam
    if (_isSpam === undefined) {
      const pypassSpam = await this.models.exists({
        table: 'user_feature_flag',
        where: {
          userId: article.authorId,
          type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
        },
      })
      const score =
        (await this._detectSpam({ id: articleId, title, content, summary })) ||
        0
      const spamThreshold = (await this.systemService.getSpamThreshold()) || 1
      _isSpam = pypassSpam ? false : score >= spamThreshold
    }

    if (_isSpam) {
      return
    }

    // infer article channels if not spam
    const channelService = new ChannelService(this.connections)
    channelService.classifyArticlesChannels({ ids: [articleId] })

    // detect language
    this.detectLanguage(articleVersion.id).then((language) => {
      if (!language) {
        return
      }

      this.models.update({
        table: 'article_version',
        where: { id: articleVersion.id },
        data: { language },
      })
    })

    // trigger search indexing
    this.searchService.triggerIndexingArticle(article.id)

    // trigger IPFS publication
    const ipfsPublicationService = new IPFSPublicationService(this.connections)
    ipfsPublicationService.triggerPublication({
      articleId: article.id,
      articleVersionId: articleVersion.id,
    })
  }

  public findScheduledAndPublish = async (date: Date, lastHours = 1) => {
    const draftService = new DraftService(this.connections)
    const drafts = await draftService.findUnpublishedByPublishAt({
      start: new Date(date.getTime() - 1000 * 60 * 60 * lastHours),
      end: date,
    })
    return Promise.all(
      drafts.map(async (draft) => {
        await this.models.update({
          table: 'draft',
          where: { id: draft.id },
          data: { publishState: PUBLISH_STATE.pending },
        })
        try {
          return await this.publishArticle(draft.id)
        } catch (err) {
          logger.error(`Failed to publish draft ${draft.id}: ${err}`)
          Sentry.captureException(err)

          return await this.models.update({
            table: 'draft',
            where: { id: draft.id },
            data: { publishState: PUBLISH_STATE.unpublished },
          })
        }
      })
    )
  }

  private handleConnections = async ({
    article,
    articleVersion,
  }: {
    article: Article
    articleVersion: ArticleVersion
  }) => {
    if (articleVersion.connections.length <= 0) {
      return
    }

    const connections: Array<
      Pick<ArticleConnection, 'entranceId' | 'articleId' | 'order'>
    > = []
    const successed: Article[] = []
    const faileded: Article[] = []
    await Promise.all(
      articleVersion.connections.map(
        async (articleId: string, index: number) => {
          const _article = await this.models.findUnique({
            table: 'article',
            where: { id: articleId },
          })
          if (!_article) {
            logger.warn(`article connection not found: ${articleId}`)
            // should not added to faileded, as _article is undefined
            return
          }

          if (_article.state !== ARTICLE_STATE.active) {
            logger.warn(`article connection not active: ${articleId}`)
            faileded.push(_article)
            return
          }
          successed.push(_article)
          connections.push({
            entranceId: article.id,
            articleId,
            order: index,
          })
        }
      )
    )

    await this.baseBatchCreate<ArticleConnection>(
      connections,
      'article_connection'
    )

    // trigger notifications
    successed.forEach(async (a: Article) => {
      this.notificationService.trigger({
        event: NOTICE_TYPE.article_new_collected,
        recipientId: a.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: a },
          {
            // TODO: rename to 'connection' and migrate notice_entity table
            type: 'collection',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })

    return faileded
  }

  private handleCollections = async ({
    draft,
    article,
  }: {
    draft: Draft
    article: Article
  }) => {
    if (!draft.collections || draft.collections.length === 0) {
      return
    }
    const faileded: string[] = []
    const collectionService = new CollectionService(this.connections)
    await Promise.all(
      draft.collections.map(async (collectionId: string) => {
        try {
          await collectionService.addArticles({
            collectionId,
            articleIds: [article.id],
            userId: article.authorId,
          })
        } catch (err) {
          logger.warn(
            `Failed to add article to collection ${collectionId}: ${err}`
          )
          faileded.push(collectionId)
        }
      })
    )
    if (faileded.length > 0 && draft.publishAt) {
      return Promise.all(
        faileded.map(async (failedCollectionId: string) =>
          this.models.findUnique({
            table: 'collection',
            where: { id: failedCollectionId },
          })
        )
      )
    }
  }

  private handleCircle = async ({
    article,
    articleVersion,
    secret,
  }: {
    article: Article
    articleVersion: ArticleVersion
    secret?: string
  }) => {
    if (!articleVersion.circleId) {
      return
    }

    const userService = new UserService(this.connections)

    if (articleVersion.access) {
      const data = {
        articleId: articleVersion.articleId,
        circleId: articleVersion.circleId,
        ...(secret ? { secret } : {}),
      }

      await this.models.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: articleVersion.access },
        update: {
          ...data,
          access: articleVersion.access,
        },
      })
    }

    // handle 'circle_new_article' notification
    const recipients = await userService.findCircleRecipients(
      articleVersion.circleId
    )

    recipients.forEach((recipientId: string) => {
      this.notificationService.trigger({
        event: NOTICE_TYPE.circle_new_article,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })

    await invalidateFQC({
      node: { type: NODE_TYPES.Circle, id: articleVersion.circleId },
      redis: this.connections.redis,
    })
  }

  private handleTags = async ({
    article,
    articleVersion,
  }: {
    article: Article
    articleVersion: ArticleVersion
  }) => {
    const tagService = new TagService(this.connections)
    const tags = articleVersion.tags as string[]

    if (!tags?.length) {
      return []
    }

    // create tag records, return tag record if already exists
    const dbTags = (
      (await Promise.all(
        tags.filter(Boolean).map((content: string) =>
          tagService.create(
            { content, creator: article.authorId },
            {
              columns: ['id', 'content'],
              skipCreate: normalizeTagInput(content) !== content,
            }
          )
        )
      )) as unknown as [{ id: string; content: string }]
    ).filter(Boolean)

    // create article_tag record
    await tagService.createArticleTags({
      articleIds: [article.id],
      creator: article.authorId,
      tagIds: dbTags.map(({ id }) => id),
    })

    await Promise.all(
      dbTags.map((tag) =>
        invalidateFQC({
          node: { type: NODE_TYPES.Tag, id: tag.id },
          redis: this.connections.redis,
        })
      )
    )

    return tags
  }

  private handleMentions = async ({
    article,
    content,
  }: {
    article: Article
    content: string
  }) => {
    const mentionIds = extractMentionIds(content)

    mentionIds.forEach((id: string) => {
      if (!id) {
        return false
      }

      this.notificationService.trigger({
        event: NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId: id,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
        tag: `publication:${article.id}`,
      })
    })
  }

  private handleCampaigns = async ({
    draft,
    article,
  }: {
    draft: Draft
    article: Article
  }) => {
    if (draft.campaigns && draft.campaigns.length > 0) {
      const campaignService = new CampaignService(this.connections)
      const faileded: string[] = []
      for (const { campaign, stage } of draft.campaigns) {
        try {
          await campaignService.submitArticleToCampaign(
            article,
            campaign,
            stage
          )
          invalidateFQC({
            node: { type: NODE_TYPES.Campaign, id: campaign },
            redis: this.connections.redis,
          })
        } catch (err) {
          logger.warn(
            `Failed to submit article to campaign ${campaign}: ${err}`
          )
          faileded.push(campaign)
        }
      }
      return Promise.all(
        faileded.map(async (failedCampaign: string) =>
          this.models.findUnique({
            table: 'campaign',
            where: { id: failedCampaign },
          })
        )
      )
    }
  }

  /**
   * Delete unused assets from S3 and DB, skip if error is thrown.
   */
  private deleteUnusedAssets = async ({
    draftEntityTypeId,
    draft,
  }: {
    draftEntityTypeId: string
    draft: Draft
  }) => {
    try {
      const [assets, uuids] = await Promise.all([
        this.systemService.findAssetAndAssetMap({
          entityTypeId: draftEntityTypeId,
          entityId: draft.id,
        }),
        extractAssetDataFromHtml(draft.content),
      ])

      const unusedAssetPaths: { [id: string]: string } = {}
      assets.forEach((asset: any) => {
        const isCover = draft.cover === asset.assetId
        const isEmbed = uuids && uuids.includes(asset.uuid)

        if (!isCover && !isEmbed) {
          unusedAssetPaths[`${asset.assetId}`] = asset.path
        }
      })

      if (Object.keys(unusedAssetPaths).length > 0) {
        await this.systemService.deleteAssetAndAssetMap(unusedAssetPaths)
      }
    } catch (e) {
      logger.error(e)
    }
  }

  private updateArticleConnections = async ({
    articleId,
    connections,
  }: {
    articleId: string
    connections: string[]
  }) => {
    const oldIds = (
      await this.articleService.findConnections({
        entranceId: articleId,
      })
    ).map(({ articleId: id }: { articleId: string }) => id)
    const newIds = uniq(connections)

    // do nothing if no change
    if (isEqual(oldIds, newIds)) {
      return
    }

    const newIdsToAdd = difference(newIds, oldIds)
    const oldIdsToDelete = difference(oldIds, newIds)

    // only validate new-added articles
    if (newIdsToAdd.length) {
      if (
        newIds.length > MAX_ARTICLES_PER_CONNECTION_LIMIT &&
        newIds.length >= oldIds.length
      ) {
        throw new ArticleCollectionReachLimitError(
          `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in connection`
        )
      }
      await Promise.all(
        newIdsToAdd.map(async (id) => {
          const collectedArticle = await this.models.findUnique({
            table: 'article',
            where: { id: articleId },
          })

          if (!collectedArticle) {
            throw new ArticleNotFoundError(`Cannot find article ${id}`)
          }

          if (collectedArticle.state !== ARTICLE_STATE.active) {
            throw new ForbiddenError(`Article ${id} cannot be collected.`)
          }
        })
      )
    }

    interface Item {
      entranceId: string
      articleId: string
      order: number
    }
    const addItems: Item[] = []
    const updateItems: Item[] = []

    // gather data
    newIds.forEach((id: string, index: number) => {
      const isNew = newIdsToAdd.includes(id)
      if (isNew) {
        addItems.push({ entranceId: articleId, articleId: id, order: index })
      }
      if (!isNew && index !== oldIds.indexOf(id)) {
        updateItems.push({ entranceId: articleId, articleId: id, order: index })
      }
    })

    await Promise.all([
      ...addItems.map((item) =>
        this.models.create({
          table: 'article_connection',
          data: {
            ...item,
          },
        })
      ),
      ...updateItems.map((item) =>
        this.models.update({
          table: 'article_connection',
          where: { entranceId: item.entranceId, articleId: item.articleId },
          data: { order: item.order },
        })
      ),
    ])

    // delete unwanted
    await this.models.deleteMany({
      table: 'article_connection',
      where: { entranceId: articleId },
      whereIn: ['article_id', oldIdsToDelete],
    })

    // trigger notifications
    const article = await this.models.articleIdLoader.load(articleId)
    const notificationService = new NotificationService(this.connections)
    newIdsToAdd.forEach(async (id) => {
      const targetConnection = await this.models.findUnique({
        table: 'article',
        where: { id },
      })
      if (targetConnection) {
        notificationService.trigger({
          event: NOTICE_TYPE.article_new_collected,
          recipientId: targetConnection.authorId,
          actorId: article.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: targetConnection,
            },
            {
              type: 'collection',
              entityTable: 'article',
              entity: article,
            },
          ],
        })
      }
    })
  }
}
