import { TagToNumArticlesResolver } from 'definitions'

const resolver: TagToNumArticlesResolver = async (
  { id, numAuthors },
  _,
  { dataSources: { tagService } }
) => {
  if (numAuthors) {
    return numAuthors
  }

  return tagService.countArticles({ id })
}

export default resolver
