import { Resolver } from 'definitions'
import { ARTICLE_APPRECIATE_LIMIT } from 'common/enums'

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return 0
  }

  const appreciations = await articleService.findAppreciationsByUser({
    articleId: id,
    userId: viewer.id
  })

  return Math.max(ARTICLE_APPRECIATE_LIMIT - appreciations.length, 0)
}

export default resolver
