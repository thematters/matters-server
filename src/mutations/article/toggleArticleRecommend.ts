import { ForbiddenError } from 'apollo-server'
import { MutationToToggleArticleRecommendResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToToggleArticleRecommendResolver = async (
  root,
  { input: { id, enabled, type } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  switch (type) {
    case 'today':
      await (enabled
        ? articleService.addRecommendToday
        : articleService.removeRecommendToday)(dbId)
      break
    case 'icymi':
      await (enabled
        ? articleService.addRecommendIcymi
        : articleService.removeRecommendIcymi)(dbId)
      break
    case 'hottest':
      await articleService.updateRecommendSetting({
        articleId: dbId,
        data: { inHottest: enabled }
      })
      break
    case 'newest':
      await articleService.updateRecommendSetting({
        articleId: dbId,
        data: { inNewest: enabled }
      })
      break
  }

  const updatedArticle = await articleService.dataloader.load(dbId)
  return updatedArticle
}

export default resolver
