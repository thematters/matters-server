import Queue from 'bull'
import * as cheerio from 'cheerio'
// internal
import {
  PUBLISH_STATE,
  QUEUE_JOB,
  QUEUE_PRIORITY,
  QUEUE_NAME,
  QUEUE_CONCURRENCY,
  PUBLISH_ARTICLE_DELAY
} from 'common/enums'
import { isTest } from 'common/environment'
import { fromGlobalId } from 'common/utils'
import {
  DraftService,
  ArticleService,
  TagService,
  NotificationService
} from 'connectors'
// local
import { createQueue } from './utils'

class PublicationQueue {
  q: InstanceType<typeof Queue>
  tagService: InstanceType<typeof TagService>
  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  notificationService: InstanceType<typeof NotificationService>

  private queueName = QUEUE_NAME.publication

  constructor() {
    this.notificationService = new NotificationService()
    this.tagService = new TagService()
    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.q = createQueue(this.queueName)
    this.addConsumers()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    if (isTest) {
      return
    }

    this.q.process(
      QUEUE_JOB.publishArticle,
      QUEUE_CONCURRENCY.publishArticle,
      async (job, done) => {
        try {
          const { draftId } = job.data
          const draft = await this.draftService.baseFindById(draftId)

          if (draft.publishState !== PUBLISH_STATE.pending) {
            job.progress(100)
            done(null, `Publication of draft ${draftId} is not pending.`)
            return
          }

          if (draft.scheduledAt && draft.scheduledAt > new Date()) {
            job.progress(100)
            done(null, `Draft's (${draftId}) scheduledAt is greater than now`)
            return
          }

          // publish to IPFS
          let article: any
          try {
            article = await this.articleService.publish(draft)
          } catch (e) {
            await this.draftService.baseUpdate(draft.id, {
              publishState: PUBLISH_STATE.error
            })
            throw e
          }

          // mark draft as published
          await this.draftService.baseUpdate(draft.id, {
            archived: true,
            publishState: PUBLISH_STATE.published,
            updatedAt: new Date()
          })
          job.progress(20)

          // handle collection
          if (draft.collection && draft.collection.length > 0) {
            // create collection records
            await this.articleService.createCollection({
              entranceId: article.id,
              articleIds: draft.collection
            })
            draft.collection.forEach(async (id: string) => {
              const collection = await this.articleService.baseFindById(id)
              this.notificationService.trigger({
                event: 'article_new_collected',
                recipientId: collection.authorId,
                actorId: article.authorId,
                entities: [
                  {
                    type: 'target',
                    entityTable: 'article',
                    entity: collection
                  },
                  {
                    type: 'collection',
                    entityTable: 'article',
                    entity: article
                  }
                ]
              })
            })
          }
          job.progress(40)

          // handle tags
          let tags = draft.tags
          if (tags && tags.length > 0) {
            // create tag records, return tag record if already exists
            const dbTags = ((await Promise.all(
              tags.map((tag: string) =>
                this.tagService.create({ content: tag })
              )
            )) as unknown) as [{ id: string; content: string }]
            // create article_tag record
            await this.tagService.createArticleTags({
              articleIds: [article.id],
              tagIds: dbTags.map(({ id }) => id)
            })
          } else {
            tags = []
          }
          job.progress(60)

          // add to search
          await this.articleService.addToSearch({ ...article, tags })
          job.progress(80)

          // handle mentions
          const $ = cheerio.load(article.content)
          const mentionIds = $('a.mention')
            .map((index: number, node: any) => {
              const id = $(node).attr('data-id')
              if (id) {
                return id
              }
            })
            .get()

          mentionIds.forEach((id: string) => {
            const mentionId = fromGlobalId(id).id
            if (!mentionId) {
              return false
            }
            this.notificationService.trigger({
              event: 'article_mentioned_you',
              actorId: article.authorId,
              recipientId: mentionId,
              entities: [
                {
                  type: 'target',
                  entityTable: 'article',
                  entity: article
                }
              ]
            })
          })
          job.progress(90)

          // trigger notifications
          this.notificationService.trigger({
            event: 'article_published',
            recipientId: article.authorId,
            entities: [
              {
                type: 'target',
                entityTable: 'article',
                entity: article
              }
            ]
          })

          job.progress(100)

          done(null, {
            dataHash: article.dataHash,
            mediaHash: article.mediaHash
          })
        } catch (e) {
          done(e)
        }
      }
    )
  }

  /**
   * Producers
   */
  publishArticle = ({
    draftId,
    delay = PUBLISH_ARTICLE_DELAY
  }: {
    draftId: string
    delay?: number
  }) => {
    return this.q.add(
      QUEUE_JOB.publishArticle,
      { draftId },
      {
        delay,
        priority: QUEUE_PRIORITY.CRITICAL
        // removeOnComplete: true
      }
    )
  }
}

export default new PublicationQueue()
