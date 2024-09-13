import Bull from 'bull'
import { AtomService } from 'connectors/atomService'
import { Connections } from 'definitions'
import { PublishArticleData } from '../publication'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { NODE_TYPES } from 'common/enums'

export class InvalidateUserCache {
  constructor(
    private readonly atomService: AtomService,
    private readonly redis: Connections['redis']
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>): Promise<any> {
    const { draftId } = job.data

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
