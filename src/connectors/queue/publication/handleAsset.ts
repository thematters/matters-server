import { PublishArticleData } from '../publication'
import { SystemService } from 'connectors/systemService'
import { AtomService } from 'connectors/atomService'
import { ErrorHandlingJob, Job } from './job'
import { Logger } from 'winston'

export class HandleAsset extends Job<PublishArticleData> implements ErrorHandlingJob {
  constructor(
    private readonly atomService: AtomService,
    private readonly systemService: SystemService,
    private readonly logger?: Logger
  ) {
    super()
  }

  async handle(): Promise<any> {
    const { draftId } = this.job.data

    /**
     * Relationship between asset_map and entity:
     *
     * cover -> article
     * embed -> draft
     *
     * @see {@url https://github.com/thematters/matters-server/pull/1510}
     */
    const [{ id: draftEntityTypeId }, { id: articleEntityTypeId }] =
      await Promise.all([
        this.systemService.baseFindEntityTypeId('draft'),
        this.systemService.baseFindEntityTypeId('article'),
      ])

    const draft = await this.atomService.draftIdLoader.load(draftId)

    if (!draft.articleId) {
      throw new Error(`Could not find the article with ID "${draft.articleId}".`)
    }

    // Remove unused assets
    // await this.deleteUnusedAssets({ draftEntityTypeId, draft })
    await this.job.progress(70)

    // Swap cover assets from draft to article
    const coverAssets = await this.systemService
      .findAssetAndAssetMap({
        entityTypeId: draftEntityTypeId,
        entityId: draft.id,
        assetType: 'cover',
      })

    await this.systemService.swapAssetMapEntity(
      coverAssets.map((ast: { id: string }) => ast.id),
      articleEntityTypeId,
      draft.articleId
    )

    await this.job.progress(75)
  }

  handleError(err: unknown): void {
    this.logger?.warn('optional step failed: %j', {
      err,
      draftId: this.job.data.draftId,
      jobId: this.job.id,
    })
  }
}
