import { invalidateFQC } from '@matters/apollo-response-cache'
import { makeSummary } from '@matters/matters-html-formatter'
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
import { environment, isTest } from 'common/environment'
import logger from 'common/logger'
import { countWords, fromGlobalId } from 'common/utils'
import { AtomService, NotificationService } from 'connectors'
import { GQLArticleAccessType } from 'definitions'

import { BaseQueue } from './baseQueue'

interface RevisedArticleData {
  draftId: string
  iscnPublish?: boolean
}

class RevisionQueue extends BaseQueue {
  atomService: InstanceType<typeof AtomService>
  notificationService: InstanceType<typeof NotificationService>

  constructor() {
    super(QUEUE_NAME.revision)
    this.atomService = new AtomService()
    this.notificationService = new NotificationService()
    this.addConsumers()
  }

  publishRevisedArticle = (data: RevisedArticleData) => {
    return this.q.add(QUEUE_JOB.publishRevisedArticle, data, {
      priority: QUEUE_PRIORITY.CRITICAL,
    })
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    if (isTest) {
      return
    }

    this.q
      .on('error', (err) => {
        // An error occured.
        console.error('RevisionQueue: job error unhandled:', err)
      })
      .on('waiting', (jobId) => {
        // A Job is waiting to be processed as soon as a worker is idling.
      })
      .on('progress', (job, progress) => {
        // A job's progress was updated!
        console.log(
          `RevisionQueue: Job#${job.id}/${job.name} progress progress:`,
          { progress, data: job.data }
        )
      })
      .on('failed', (job, err) => {
        // A job failed with reason `err`!
        console.error('RevisionQueue: job failed:', err, job)
      })
      .on('completed', (job, result) => {
        // A job successfully completed with a `result`.
        console.log('RevisionQueue: job completed:', {
          result,
          inputData: job.data,
        })
      })

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

      const draft = await this.draftService.baseFindById(draftId)

      // Step 1: checks
      console.log(
        `handlePublishRevisedArticle: progress 0 of revise publishing for draftId: ${draft?.id}:`,
        draft
      )

      if (!draft) {
        job.progress(100)
        done(null, `Revision draft ${draftId} not found`)
        return
      }
      if (draft.publishState !== PUBLISH_STATE.pending) {
        job.progress(100)
        done(null, `Revision draft ${draftId} isn\'t in pending state.`)
        return
      }
      const article = await this.articleService.baseFindById(draft.articleId)
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
      const preDraft = await this.draftService.baseFindById(article.draftId)
      job.progress(10)

      try {
        const summary = draft.summary || makeSummary(draft.content)
        const wordCount = countWords(draft.content)

        // Step 2: publish content to IPFS
        const revised = { ...draft, summary }

        const {
          contentHash: dataHash,
          mediaHash,
          key,
        } = await this.articleService.publishToIPFS(revised)
        job.progress(30)

        console.log(
          `handlePublishRevisedArticle: progress 30 of revise publishing for draftId: ${draft.id}: articleId: ${article.id}:`,
          article
        )

        // Step 3: update draft
        await Promise.all([
          this.draftService.baseUpdate(draft.id, {
            dataHash,
            mediaHash,
            wordCount,
            archived: true,
            // iscnId,
            publishState: PUBLISH_STATE.published,
            pinState: PIN_STATE.pinned,
            updatedAt: this.knex.fn.now(),
          }),
          // iscnId && this.articleService.baseUpdate(article.id, { iscnId }),
        ])

        job.progress(40)

        // Step 4: update secret
        if (draft.circleId) {
          const secret =
            draft.access === GQLArticleAccessType.paywall ? key : null
          await this.handleCircle({ article, circleId: draft.circleId, secret })
        }
        job.progress(45)

        // Step 5: update back to article
        const revisionCount =
          (article.revisionCount || 0) +
          (iscnPublish || draft.iscnPublish ? 0 : 1) // skip revisionCount for iscnPublish retry
        const updatedArticle = await this.articleService.baseUpdate(
          article.id,
          {
            draftId: draft.id,
            dataHash,
            mediaHash,
            summary,
            wordCount,
            revisionCount,
            slug: slugify(draft.title),
            updatedAt: this.knex.fn.now(),
          }
        )
        job.progress(50)

        // Note: the following steps won't affect the publication.
        try {
          const author = await this.userService.baseFindById(article.authorId)
          const { userName, displayName } = author

          console.log(
            `handlePublishRevisedArticle: start optional steps of publishing for draft id: ${draft.id}:`,
            draft
          )

          // Step 6: copy previous draft asset maps for current draft
          // Note: collection and tags are handled in edit resolver.
          // @see src/mutations/article/editArticle.ts
          const { id: entityTypeId } =
            await this.systemService.baseFindEntityTypeId('draft')
          await this.systemService.copyAssetMapEntities({
            source: preDraft.id,
            target: draft.id,
            entityTypeId,
          })
          job.progress(60)

          console.log(`before iscnPublish:`, job.data, draft)

          // Step: iscn publishing
          let iscnId = null
          if (iscnPublish || draft.iscnPublish != null) {
            const liker = (await this.userService.findLiker({
              userId: author.id,
            }))!
            const cosmosWallet =
              await this.userService.likecoin.getCosmosWallet({
                liker,
              })

            iscnId = await this.userService.likecoin.iscnPublish({
              mediaHash: `hash://sha256/${mediaHash}`,
              ipfsHash: `ipfs://${dataHash}`,
              cosmosWallet, // 'TBD',
              userName: `${displayName} (@${userName})`,
              title: draft.title,
              description: summary,
              datePublished: article.created_at?.toISOString().substring(0, 10),
              url: `${environment.siteDomain}/@${userName}/${article.id}-${article.slug}-${mediaHash}`,
              tags: draft.tags,

              // for liker auth&headers info
              liker,
              // likerIp,
              // userAgent,
            })

            console.log('draft.iscnPublish result:', {
              iscnId,
              articleId: article.id,
              title: article.title,
            })
          }

          console.log(
            `iscnPublish for draft id: ${draft.id} "${draft.title}":`,
            { iscnId, draft }
          )

          if (iscnPublish || draft.iscnPublish != null) {
            // handling both cases of set to true or false, but not omit (undefined)
            await Promise.all([
              this.draftService.baseUpdate(draft.id, {
                iscnId,
                updatedAt: this.knex.fn.now(),
              }),
              this.articleService.baseUpdate(article.id, {
                iscnId,
                updatedAt: this.knex.fn.now(),
              }),
            ])
          }
          job.progress(70)

          // Step 7: add to search
          await this.articleService.addToSearch({
            ...article,
            content: draft.content,
            userName,
            displayName,
          })
          job.progress(80)

          // Step 8: handle newly added mentions
          await this.handleMentions({
            article: updatedArticle,
            preDraftContent: preDraft.content,
            content: draft.content,
          })
          job.progress(90)

          // Step 9: trigger notifications
          this.notificationService.trigger({
            event: DB_NOTICE_TYPE.revised_article_published,
            recipientId: article.authorId,
            entities: [
              {
                type: 'target',
                entityTable: 'article',
                entity: article,
              },
            ],
          })
          job.progress(95)

          // Step 10: invalidate article and user cache
          await Promise.all([
            invalidateFQC({
              node: { type: NODE_TYPES.User, id: article.authorId },
              redis: this.cacheService.redis,
            }),
            invalidateFQC({
              node: { type: NODE_TYPES.Article, id: article.id },
              redis: this.cacheService.redis,
            }),
          ])
          job.progress(100)
        } catch (e) {
          // ignore errors caused by these steps
          logger.error(e)

          console.error(
            new Date(),
            'job failed at optional step:',
            e,
            job,
            draft
          )
        }

        done(null, {
          articleId: article.id,
          draftId: draft.id,
          dataHash,
          mediaHash,
        })
      } catch (e) {
        await this.draftService.baseUpdate(draft.id, {
          publishState: PUBLISH_STATE.error,
        })

        this.notificationService.trigger({
          event: DB_NOTICE_TYPE.revised_article_not_published,
          recipientId: article.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: article,
            },
          ],
        })

        done(e)
      }
    }

  private handleCircle = async ({
    article,
    circleId,
    secret = null,
  }: {
    article: any
    circleId: string
    secret?: string | null
  }) => {
    await this.atomService.update({
      table: 'article_circle',
      where: { articleId: article.id, circleId },
      data: {
        secret,
        updatedAt: this.knex.fn.now(), // new Date()
      },
    })
  }

  private handleMentions = async ({
    article,
    preDraftContent,
    content,
  }: {
    article: any
    preDraftContent: string
    content: string
  }) => {
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

      this.notificationService.trigger({
        event: DB_NOTICE_TYPE.article_mentioned_you,
        actorId: article.authorId,
        recipientId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })
  }
}

export const revisionQueue = new RevisionQueue()
