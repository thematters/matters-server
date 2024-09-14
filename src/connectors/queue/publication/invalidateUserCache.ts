import { AtomService } from 'connectors/atomService'
import { Connections } from 'definitions'
import { PublishArticleData } from '../publication'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { NODE_TYPES } from 'common/enums'
import { Job } from './job'

export class InvalidateUserCache extends Job<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly redis: Connections['redis']
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)

    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis: this.redis,
    })
  }
}
