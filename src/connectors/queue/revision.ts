import type { Connections } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/ipns-site-generator'
import slugify from '@matters/slugify'
import Queue from 'bull'
import * as cheerio from 'cheerio'
import _difference from 'lodash/difference'
import _uniq from 'lodash/uniq'

import {
  ARTICLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PIN_STATE,
  PUBLISH_STATE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { countWords, fromGlobalId } from 'common/utils'
import {
  AtomService,
  NotificationService,
  DraftService,
  ArticleService,
  UserService,
  SystemService,
} from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-revision')

interface RevisedArticleData {
  draftId: string
  iscnPublish?: boolean
}

export class RevisionQueue extends BaseQueue {
  constructor(connections: Connections) {
    super(QUEUE_NAME.revision, connections)
    this.addConsumers()
  }

  publishRevisedArticle = (data: RevisedArticleData) =>
    this.q.add(QUEUE_JOB.publishRevisedArticle, data, {
      priority: QUEUE_PRIORITY.CRITICAL,
    })

  /**
   * Cusumers
   */
  private addConsumers = () => {
    // publish revised article
    this.q.process(
      QUEUE_JOB.publishRevisedArticle,
      QUEUE_CONCURRENCY.publishRevisedArticle,
      this.handlePublishRevisedArticle
    )
  }

  /**
   * Publish revised article
   */
  private handlePublishRevisedArticle: Queue.ProcessCallbackFunction<unknown> =
    async (job, done) => {
      const { draftId, iscnPublish } = job.data as RevisedArticleData

      const draftService = new DraftService(this.connections)
      const articleService = new ArticleService(this.connections)
      const userService = new UserService(this.connections)
      const systemService = new SystemService(this.connections)
      const notificationService = new NotificationService(this.connections)
      const atomService = new AtomService(this.connections)

      let draft = await draftService.baseFindById(draftId)

      // Step 1: checks
      if (!draft) {
        job.progress(100)
        done(null, `Revision draft ${draftId} not found`)
        return
      }
      if (draft.publishState !== PUBLISH_STATE.pending) {
        job.progress(100)
        done(null, `Revision draft ${draftId} isn't in pending state.`)
        return
      }
      let article = await articleService.baseFindById(draft.articleId)
      if (!article) {
        job.progress(100)
        done(null, `Revised article ${draft.articleId} not found`)
        return
      }
      if (article.state !== ARTICLE_STATE.active) {
        job.progress(100)
        done(null, `Revised article ${draft.articleId} is not active`)
        return
      }
      const preDraft = await draftService.baseFindById(article.draftId)
      job.progress(10)

      try {
        const summary = draft.summary || makeSummary(draft.content)
        const wordCount = countWords(draft.content)

        // Step 2: publish content to IPFS
        const revised = { ...draft, summary }

        // Step 3: update draft
        ;[draft] = await Promise.all([
          draftService.baseUpdate(draft.id, {
            // dataHash,
            // mediaHash,
            wordCount,
            archived: true,
            // iscnId,
            publishState: PUBLISH_STATE.published,
            pinState: PIN_STATE.pinned,
          }),
          // iscnId && this.articleService.baseUpdate(article.id, { iscnId }),
        ])

        job.progress(40)

        // Step 4: update back to article
        const revisionCount =
          (article.revisionCount || 0) + (iscnPublish ? 0 : 1) // skip revisionCount for iscnPublish retry
        const updatedArticle = await articleService.baseUpdate(article.id, {
          draftId: draft.id,
          dataHash: null, // TBD in Section2
          mediaHash: null,
          summary,
          wordCount,
          revisionCount,
          slug: slugify(draft.title),
        })
        job.progress(50)

        const author = await userService.baseFindById(article.authorId)
        const { userName, displayName } = author

        // Note: the following steps won't affect the publication.
        // Section1: update local DB related
        try {
          // Step 5: copy previous draft asset maps for current draft
          // Note: collection and tags are handled in edit resolver.
          // @see src/mutations/article/editArticle.ts
          const { id: entityTypeId } = await systemService.baseFindEntityTypeId(
            'draft'
          )
          await systemService.copyAssetMapEntities({
            source: preDraft.id,
            target: draft.id,
            entityTypeId,
          })

          // Step 7: handle newly added mentions
          await this.handleMentions(
            {
              article: updatedArticle,
              preDraftContent: preDraft.content,
              content: draft.content,
            },
            notificationService
          )

          job.progress(70)
        } catch (err) {
          // ignore errors caused by these steps
          logger.warn('job failed at optional step: %j', {
            err,
            job,
            draftId: draft.id,
          })
        }

        // Step 8: trigger notifications
        notificationService.trigger({
          event: DB_NOTICE_TYPE.revised_article_published,
          recipientId: article.authorId,
          entities: [
            { type: 'target', entityTable: 'article', entity: article },
          ],
        })

        // Step 9: invalidate article and user cache
        await Promise.all([
          invalidateFQC({
            node: { type: NODE_TYPES.User, id: article.authorId },
            redis: this.connections.redis,
          }),
          invalidateFQC({
            node: { type: NODE_TYPES.Article, id: article.id },
            redis: this.connections.redis,
          }),
        ])

        // Section2: publish to external services like: IPFS / IPNS / ISCN / etc...
        let ipnsRes: any
        try {
          const {
            contentHash: dataHash,
            mediaHash,
            key,
          } = (await articleService.publishToIPFS(revised))!

          ;[draft, article] = await Promise.all([
            draftService.baseUpdate(draft.id, {
              dataHash,
              mediaHash,
            }),
            articleService.baseUpdate(article.id, {
              dataHash,
              mediaHash,
            }),
          ])

          // update secret
          if (key) {
            await this.handleCircle(
              {
                article,
                circleId: draft.circleId,
                secret: key,
              },
              atomService
            )
          }

          // Step: iscn publishing
          if (iscnPublish) {
            const liker = (await userService.findLiker({
              userId: author.id,
            }))!
            const cosmosWallet = await userService.likecoin.getCosmosWallet({
              liker,
            })

            const iscnId = await userService.likecoin.iscnPublish({
              mediaHash: `hash://sha256/${mediaHash}`,
              ipfsHash: `ipfs://${dataHash}`,
              cosmosWallet, // 'TBD',
              userName: `${displayName} (@${userName})`,
              title: draft.title,
              description: summary,
              datePublished: article.created_at?.toISOString().substring(0, 10),
              url: `https://${environment.siteDomain}/@${userName}/${article.id}-${article.slug}-${mediaHash}`,
              tags: draft.tags,

              // for liker auth&headers info
              liker,
              // likerIp,
              // userAgent,
            })

            // handling both cases of set to true or false, but not omit (undefined)
            ;[draft, article] = await Promise.all([
              draftService.baseUpdate(draft.id, {
                iscnId,
                iscnPublish, // : iscnPublish || draft.iscnPublish,
              }),
              articleService.baseUpdate(article.id, {
                iscnId,
              }),
            ])
          }

          ipnsRes = await articleService.publishFeedToIPNS({
            userName,
            // incremental: true, // attach the last just published article
            updatedDrafts: [draft],
            forceReplace: true,
          })
        } catch (err) {
          logger.warn('job failed at optional step: %j', {
            err,
            job,
            draftId: draft.id,
          })
        }

        job.progress(100)

        // no await to notify async
        articleService
          .sendArticleFeedMsgToSQS({ article, author, ipnsData: ipnsRes })
          .catch((err: Error) => logger.error('failed sqs notify:', err))

        // no await to notify async
        atomService.aws
          ?.snsPublishMessage({
            // MessageGroupId: `ipfs-articles-${environment.env}:articles-feed`,
            MessageBody: {
              articleId: article.id,
              title: article.title,
              url: `https://${environment.siteDomain}/@${userName}/${article.id}-${article.slug}`,
              dataHash: article.dataHash,
              mediaHash: article.mediaHash,

              // ipns info:
              ipnsKey: ipnsRes?.ipnsKey,
              lastDataHash: ipnsRes?.lastDataHash,

              // author info:
              userName,
              displayName,
            },
          })
          .catch((err: Error) => logger.error('failed sns notify:', err))

        done(null, {
          articleId: article.id,
          draftId: draft.id,
          dataHash: article.dataHash,
          mediaHash: article.mediaHash,
          iscnPublish, // : iscnPublish || draft.iscnPublish,
          iscnId: draft.iscnId,
        })
      } catch (err: any) {
        await draftService.baseUpdate(draft.id, {
          publishState: PUBLISH_STATE.error,
        })

        notificationService.trigger({
          event: DB_NOTICE_TYPE.revised_article_not_published,
          recipientId: article.authorId,
          entities: [
            { type: 'target', entityTable: 'article', entity: article },
          ],
        })

        done(err)
      }
    }

  private handleCircle = async (
    {
      article,
      circleId,
      secret,
    }: {
      article: any
      circleId: string
      secret: string
    },
    atomService: AtomService
  ) => {
    await atomService.update({
      table: 'article_circle',
      where: { articleId: article.id, circleId },
      data: {
        secret,
        updatedAt: this.connections.knex.fn.now(),
      },
    })
  }

  private handleMentions = async (
    {
      article,
      preDraftContent,
      content,
    }: {
      article: any
      preDraftContent: string
      content: string
    },
    notificationService: NotificationService
  ) => {
    // gather pre-draft ids
    let $ = cheerio.load(preDraftContent)
    const filter = (index: number, node: any) => {
      const id = $(node).attr('data-id')
      if (id) {
        return id
      }
    }
    const preIds = $('a.mention').map(filter).get()

    // gather curr-draft ids
    $ = cheerio.load(content)
    const currIds = $('a.mention').map(filter).get()

    const diffs = _difference(currIds, preIds)
    diffs.forEach((id: string) => {
      const { id: recipientId } = fromGlobalId(id)

      if (!recipientId) {
        return false
      }

      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId,
        entities: [{ type: 'target', entityTable: 'article', entity: article }],
      })
    })
  }
}
