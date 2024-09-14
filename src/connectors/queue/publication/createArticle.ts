import { PUBLISH_STATE } from 'common/enums'
import { ArticleService } from 'connectors/articleService'
import { AtomService } from 'connectors/atomService'
import { PublishArticleData } from '../publication'
import { Job } from './job'

export class CreateArticle extends Job<PublishArticleData> {
  constructor(
    private readonly articleService: ArticleService,
    private readonly atomService: AtomService
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.atomService.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    const [article] = await this.articleService.createArticle(draft)

    await this.job.progress(20)

    await this.atomService.update({
      table: 'draft',
      where: { id: draft.id },
      data: {
        publishState: PUBLISH_STATE.published,
        articleId: article.id,
      },
    })

    await this.job.progress(30)
  }
}
