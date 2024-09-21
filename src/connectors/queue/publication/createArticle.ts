import { PUBLISH_STATE } from 'common/enums'
import { ArticleService } from 'connectors/articleService'
import { AtomService } from 'connectors/atomService'
import { PublishArticleData } from '../publication'
import { ChainedJob } from './job'

export class CreateArticle extends ChainedJob<PublishArticleData> {
  constructor(
    private readonly articleService: ArticleService,
    private readonly atomService: AtomService
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    const draft = await this.shared.remember(
      'draft',
      async () => await this.atomService.draftIdLoader.load(draftId)
    )

    const [article, articleVersion] = await this.articleService.createArticle(draft)

    this.shared.set('article', article)
    this.shared.set('articleVersion', articleVersion)

    await this.job.progress(20)

    this.shared.set(
      'draft',
      await this.atomService.update({
        table: 'draft',
        where: { id: draft.id },
        data: {
          publishState: PUBLISH_STATE.published,
          articleId: article.id,
        },
      })
    )

    await this.job.progress(30)
  }
}
