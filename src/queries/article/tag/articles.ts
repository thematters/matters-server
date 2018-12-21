import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { tagService, articleService }
) => {
  const articleIds = await tagService.findArticleIds({ id })
  return articleService.idLoader.loadMany(articleIds)
}

export default resolver
