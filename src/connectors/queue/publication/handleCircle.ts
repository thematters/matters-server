import { CircleHandler } from './circleHandler'
import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { ArticleService } from 'connectors/articleService'
import { ErrorHandlingJob, Job } from './job'
import { Logger } from 'winston'

export class HandleCircle extends Job<PublishArticleData> implements ErrorHandlingJob {
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

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)
    const articleVersion = await this.articleService.loadLatestArticleVersion(article.id)

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
