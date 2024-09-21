import { AtomService } from 'connectors/atomService'
import { Connections } from 'definitions'
import { PublishArticleData } from '../publication'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { NODE_TYPES } from 'common/enums'
import { ChainedJob } from './job'

export class InvalidateUserCache extends ChainedJob<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly redis: Connections['redis']
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.shared.remember(
      'draft',
      async () => await this.atomService.draftIdLoader.load(draftId)
    )

    const { articleId } = draft
    if (!articleId) {
      throw new Error(`Could not find the article with ID "${articleId}".`)
    }

    const article = await this.shared.remember(
      'article',
      async () => await this.atomService.articleIdLoader.load(articleId)
    )

    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis: this.redis,
    })
  }
}
