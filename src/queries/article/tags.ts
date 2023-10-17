import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['tags'] = async (
  { articleId },
  _,
  { dataSources: { articleService, tagService } }
) => {
  const tagIds = await articleService.findTagIds({ id: articleId })
  return tagService.loadByIds(tagIds)
}

export default resolver
