import { CircleHandler } from './circleHandler'
import { PublishArticleData } from '../publication'
import { AtomService } from 'connectors/atomService'
import { ArticleService } from 'connectors/articleService'
import { Job } from './job'

export class HandleCircle extends Job<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly handler: CircleHandler
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
}
