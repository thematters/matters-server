import { ArticleToCoverResolver } from 'definitions'

const resolver: ArticleToCoverResolver = async (
  { articleId },
  _,
  { dataSources: { articleService, systemService }, req }
) => {
  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.origin as string)
  const article = await articleService.dataloader.load(articleId)
  return article?.cover
    ? systemService.findAssetUrl(article.cover, useS3)
    : null
}

export default resolver
