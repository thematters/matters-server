import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['numArticles'] = async (
  { id, numArticles }: any,
  _,
  { dataSources: { tagService } }
) => {
  if (numArticles) {
    return numArticles
  }

  return tagService.countArticles({ id })
}

export default resolver
