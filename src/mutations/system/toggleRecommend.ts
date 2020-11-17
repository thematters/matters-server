import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleArticleRecommendResolver } from 'definitions'

const resolver: MutationToToggleArticleRecommendResolver = async (
  root,
  { input: { id, enabled, type } },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  switch (type) {
    case 'icymi':
      await (enabled
        ? articleService.addRecommendIcymi
        : articleService.removeRecommendIcymi)(dbId)
      break
    case 'hottest':
      await articleService.updateRecommendSetting({
        articleId: dbId,
        data: { inHottest: enabled },
      })
      break
    case 'newest':
      await articleService.updateRecommendSetting({
        articleId: dbId,
        data: { inNewest: enabled },
      })
      break
  }

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
