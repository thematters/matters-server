import Bull from 'bull'
import { PublishArticleData } from '../publication'
import { SystemService } from 'connectors/systemService'
import { AtomService } from 'connectors/atomService'

export class HandleAsset {
  constructor(
    private readonly atomService: AtomService,
    private readonly systemService: SystemService
  ) {
    //
  }

  async handle(job: Bull.Job<PublishArticleData>): Promise<any> {
    const { draftId } = job.data

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
    await job.progress(70)

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

    await job.progress(75)
  }
}
