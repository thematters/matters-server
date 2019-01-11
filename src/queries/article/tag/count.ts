import { TagToCountResolver } from 'definitions'

const resolver: TagToCountResolver = (
  { id, count },
  _,
  { dataSources: { tagService } }
) => {
  return count || tagService.countArticles({ id })
}

export default resolver
