import { isTarget } from 'common/utils'
import { ArticleToCoverResolver } from 'definitions'

const resolver: ArticleToCoverResolver = async (
  { articleId },
  _,
  { dataSources: { articleService, systemService }, req, viewer }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article?.cover
    ? systemService.findAssetUrl(article.cover, !isTarget(req, viewer))
    : null
}

export default resolver
