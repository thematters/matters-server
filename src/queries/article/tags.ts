import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['tags'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService, atomService } }
) => {
  const tagIds = await articleService.findTagIds({ id: articleId })
  return atomService.tagIdLoader.loadMany(tagIds)
}

export default resolver
