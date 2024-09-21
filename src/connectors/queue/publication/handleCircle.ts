import { CircleHandler } from './circleHandler'
import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { ArticleService } from 'connectors/articleService'
import { ErrorHandlingJob, ChainedJob } from './job'
import { Logger } from 'winston'

export class HandleCircle extends ChainedJob<PublishArticleData> implements ErrorHandlingJob {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly handler: CircleHandler,
    private readonly logger?: Logger
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

    const articleVersion = await this.shared.remember(
      'articleVersion',
      async () => await this.articleService.loadLatestArticleVersion(articleId)
    )

    await this.handler.handle(
      article,
      articleVersion,
      // secret: key // TO update secret in 'article_circle' later after IPFS published
    )

    await this.job.progress(45)
  }

  handleError(err: unknown): void {
    this.logger?.warn('optional step failed: %j', {
      err,
      draftId: this.job.data.draftId,
      jobId: this.job.id,
    })
  }
}
