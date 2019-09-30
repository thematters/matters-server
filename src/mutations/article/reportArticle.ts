import {
  ArticleNotFoundError,
  AssetNotFoundError,
  UserInputError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToReportArticleResolver } from 'definitions'

const resolver: MutationToReportArticleResolver = async (
  root,
  { input: { id, category, description, contact, assetIds: assetUUIDs } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      systemService,
      notificationService
    }
  }
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

  // trigger notification
  const articleAuthor = await userService.dataloader.load(article.authorId)
  notificationService.trigger({
    event: 'article_reported',
    entities: [{ type: 'target', entityTable: 'article', entity: article }],
    recipientId: articleAuthor.id
  })

  return true
}

export default resolver
