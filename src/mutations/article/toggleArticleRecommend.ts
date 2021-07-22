import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleArticleRecommendResolver } from 'definitions'

const resolver: MutationToToggleArticleRecommendResolver = async (
  root,
  { input: { id, enabled, type = 'icymi' } },
  { viewer, dataSources: { atomService, articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  switch (type) {
    case 'icymi':
      if (enabled) {
        const data = { articleId: dbId }
        await atomService.upsert({
          table: 'matters_choice',
          where: data,
          create: data,
          update: { ...data, updatedAt: new Date() },
        })
      } else {
        await atomService.deleteMany({
          table: 'matters_choice',
          where: { articleId: dbId },
        })
      }
      break
    case 'hottest':
      await atomService.upsert({
        table: 'article_recommend_setting',
        where: { articleId: dbId },
        create: { inHottest: true, articleId: dbId },
        update: { inHottest: true },
      })
      break
    case 'newest':
      await atomService.upsert({
        table: 'article_recommend_setting',
        where: { articleId: dbId },
        create: { inNewest: true, articleId: dbId },
        update: { inNewest: true },
      })
      break
  }

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
