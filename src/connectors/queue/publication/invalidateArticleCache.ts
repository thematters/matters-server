import { DoneCallback, Job } from 'bull'
import { Article, Connections } from 'definitions'
import { PublishArticleData } from '../publication'
import { METRICS_NAMES, NODE_TYPES } from 'common/enums'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { AtomService } from 'connectors/atomService'
import { aws } from 'connectors/aws'
import { ArticleService } from 'connectors/articleService'

export class InvalidateArticleCache {
  constructor(
    private readonly atomService: AtomService,
    private readonly articleService: ArticleService,
    private readonly redis: Connections['redis']
  ) {
    //
  }

  async handle(job: Job<PublishArticleData>, done: DoneCallback): Promise<any> {
    const { draftId, iscnPublish } = job.data

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    const article = await this.atomService.articleIdLoader.load(draft.articleId)
    const articleVersion = await this.articleService.loadLatestArticleVersion(article.id)

    this.#invalidateArticleCache(article)
    this.#measure()

    done(null, {
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
