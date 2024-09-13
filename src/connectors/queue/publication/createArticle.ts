import Bull from "bull";
import { PUBLISH_STATE } from "common/enums";
import { ArticleService } from "connectors/articleService";
import { AtomService } from "connectors/atomService";
import { PublishArticleData } from "../publication";

export class CreateArticle {
  constructor(
    private readonly articleService: ArticleService,
    private readonly atomService: AtomService
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>): Promise<any> {
    const { draftId } = job.data

    const draft = await this.atomService.findUnique({
      table: 'draft',
      where: { id: draftId },
    })

    const [article] = await this.articleService.createArticle(draft)

    await job.progress(20)

    await this.atomService.update({
      table: 'draft',
      where: { id: draft.id },
      data: {
        publishState: PUBLISH_STATE.published,
        articleId: article.id,
      },
    })

    await job.progress(30)
  }
}
