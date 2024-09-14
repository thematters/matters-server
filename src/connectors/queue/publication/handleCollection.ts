import { ConnectionHandler } from './connectionHandler'
import { AtomService } from 'connectors/atomService'
import { ArticleService } from 'connectors/articleService'
import { PublishArticleData } from '../publication'
import { ErrorHandlingJob, ChainedJob } from './job'
import { Logger } from 'winston'

export class HandleCollection extends ChainedJob<PublishArticleData> implements ErrorHandlingJob {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly handler: ConnectionHandler,
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

    await this.handler.handle(article, articleVersion)

    await this.job.progress(40)
  }

  handleError(err: unknown): void {
    this.logger?.warn('optional step failed: %j', {
      err,
      draftId: this.job.data.draftId,
      jobId: this.job.id,
    })
  }
}
