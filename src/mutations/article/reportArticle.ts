import { MutationToReportArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import {
  UserInputError,
  ArticleNotFoundError,
  AssetNotFoundError
} from 'common/errors'

const resolver: MutationToReportArticleResolver = async (
  root,
  { input: { id, category, description, contact, assetIds: assetUUIDs } },
  { viewer, dataSources: { articleService, systemService } }
) => {
  if (!viewer.id && !contact) {
    throw new UserInputError('"contact" is required with visitor')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  let assetIds
  if (assetUUIDs) {
    const assets = await systemService.findAssetByUUIDs(assetUUIDs)
    if (!assets || assets.length <= 0) {
      assetIds = []
      // throw new AssetNotFoundError('Asset does not exists')
    }
    assetIds = assets.map((asset: any) => asset.id)
  }

  await articleService.report({
    articleId: article.id,
    userId: viewer.id,
    category,
    description,
    contact,
    assetIds
  })

  return true
}

export default resolver
