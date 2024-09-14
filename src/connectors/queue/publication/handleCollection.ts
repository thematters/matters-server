import { ConnectionHandler } from './connectionHandler'
import { AtomService } from 'connectors/atomService'
import { ArticleService } from 'connectors/articleService'
import { PublishArticleData } from '../publication'
import { Job } from './job'

export class HandleCollection extends Job<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly handler: ConnectionHandler
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
}
