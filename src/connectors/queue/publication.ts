import Queue from 'bull'
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
          const draft = await this.draftService.dataloader.load(draftId)

          if (draft.publishState !== PUBLISH_STATE.pending) {
            job.progress(100)
            done(null, `Publication of draft ${draftId} is not pending.`)
            return
          }

          // publish to IPFS
          const article = await this.articleService.publish(draft)
          job.progress(20)

          // mark draft as published
          await this.draftService.baseUpdateById(draft.id, {
            archived: true,
            publishState: PUBLISH_STATE.published
          })
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
              articleId: article.id,
              tagIds: dbTags.map(({ id }) => id)
            })
          } else {
            tags = []
          }
          job.progress(60)

          // add to search
          await this.articleService.addToSearch({ ...article, tags })
          job.progress(80)

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
          if (article.upstreamId) {
            const upstream = await this.articleService.dataloader.load(
              article.upstreamId
            )
            this.notificationService.trigger({
              event: 'article_new_downstream',
              actorId: article.authorId,
              recipientId: upstream.authorId,
              entities: [
                {
                  type: 'target',
                  entityTable: 'article',
                  entity: upstream
                },
                {
                  type: 'downstream',
                  entityTable: 'article',
                  entity: article
                }
              ]
            })
          }
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

export const publicationQueue = new PublicationQueue()
