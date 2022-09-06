import { TagToNumArticlesResolver } from 'definitions'

const resolver: TagToNumArticlesResolver = async (
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
