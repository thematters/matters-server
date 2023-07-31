import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['numArticles'] = async (
  { id, numArticles },
  _,
  { dataSources: { tagService } }
) => {
  if (numArticles) {
    return numArticles
  }

  return tagService.countArticles({ id })
}

export default resolver
