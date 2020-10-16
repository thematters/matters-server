import { ArticleToRemarkResolver } from 'definitions'

const resolver: ArticleToRemarkResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.remark
}

export default resolver
