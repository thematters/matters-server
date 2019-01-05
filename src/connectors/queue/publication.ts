// external
import Queue from 'bull'
// internal
import { PUBLISH_STATE } from 'common/enums'
import {
  DraftService,
  ArticleService,
  TagService,
  NotificationService
} from 'connectors'
// local
import { queueSharedOpts, JOB } from './utils'

// console.log(typeof NotificationService)

class PublicationQueue {
  q: InstanceType<typeof Queue>
  tagService: InstanceType<typeof TagService>
  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  notificationService: InstanceType<typeof NotificationService>

  private queueName = 'publication_queue'

  constructor() {
    this.q = new Queue(this.queueName, queueSharedOpts)
    this.q
      .on('waiting', jobId => {
        console.log(`[Job:publication:waiting] ${jobId}`)
      })
      .on('active', job => {
        console.log(`[Job:publication:started] ${job.id}`)
      })
      .on('completed', job => {
        console.log(`[Job:publication:completed] ${job.id}`)
      })

    // this.notificationService = new NotificationService()
    this.tagService = new TagService()
    this.articleService = new ArticleService()
    this.draftService = new DraftService()

    this.addConsumers()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(JOB.publish, 100, async (job, done) => {
      const { draftId } = job.data
      const draft = await this.draftService.baseFindById(draftId)
      if (draft.publishState === PUBLISH_STATE.recalled) {
        console.log(
          `Publication of draft ${draftId} has been recalled, aborting.`
        )
        done()
        return
      }
      try {
        // publish
        const article = await this.articleService.publish({
          ...draft,
          draftId: draft.id
        })
        // mark draft as published
        await this.draftService.baseUpdateById(draft.id, {
          archived: true,
          publishState: PUBLISH_STATE.published
        })

        // handle tags
        let tags = draft.tags
        if (tags && tags.length > 0) {
          // create tag records, return tag record if already exists
          const dbTags = ((await Promise.all(
            tags.map((tag: string) => this.tagService.create({ content: tag }))
          )) as unknown) as [{ id: string; content: string }]
          // create article_tag record
          await this.tagService.createArticleTags({
            articleId: article.id,
            tagIds: dbTags.map(({ id }) => id)
          })
        } else {
          tags = []
        }

        // add to search
        await this.articleService.addToSearch({ ...article, tags })

        // TODO: Notification is undefined after import
        // trigger notifications
        // this.notificationService.trigger({
        //   event: 'article_published',
        //   recipientId: article.authorId,
        //   entities: [
        //     {
        //       type: 'target',
        //       entityTable: 'article',
        //       entity: article
        //     }
        //   ]
        // })
        // if (article.upstreamId) {
        //   const upstream = await this.articleService.baseFindById(
        //     article.upstreamId
        //   )
        //   this.notificationService.trigger({
        //     event: 'article_new_downstream',
        //     actorId: article.authorId,
        //     recipientId: upstream.authorId,
        //     entities: [
        //       {
        //         type: 'target',
        //         entityTable: 'article',
        //         entity: upstream
        //       },
        //       {
        //         type: 'downstream',
        //         entityTable: 'article',
        //         entity: article
        //       }
        //     ]
        //   })
        // }

        done()
      } catch (err) {
        throw err
      }
    })
  }
}

export const publicationQueue = new PublicationQueue()
