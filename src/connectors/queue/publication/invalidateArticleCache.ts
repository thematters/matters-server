import { Article, Connections } from 'definitions'
import { PublishArticleData } from '../publication'
import { METRICS_NAMES, NODE_TYPES } from 'common/enums'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { AtomService } from 'connectors/atomService'
import { aws } from 'connectors/aws'
import { ArticleService } from 'connectors/articleService'
import { ChainedJob } from './job'

export class CompletePublication extends ChainedJob<PublishArticleData> {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly redis: Connections['redis']
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId, iscnPublish } = this.job.data

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

    this.#invalidateArticleCache(article)
    this.#measure()

    this.done(null, {
      articleId: article.id,
      draftId: draft.id,
      dataHash: articleVersion.dataHash,
      mediaHash: articleVersion.mediaHash,
      iscnPublish: iscnPublish || draft.iscnPublish,
      iscnId: articleVersion.iscnId,
    })
  }

  #invalidateArticleCache(article: Article) {
    invalidateFQC({
      node: { type: NODE_TYPES.Article, id: article.id },
      redis: this.redis,
    })
  }

  #measure() {
    // no await to put data async
    aws.putMetricData({
      MetricData: [
        {
          MetricName: METRICS_NAMES.ArticlePublishCount,
          // Counts: [1],
          Timestamp: new Date(),
          Unit: 'Count',
          Value: 1,
        },
      ],
    })
  }
}
