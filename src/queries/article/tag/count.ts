import { Resolver } from 'definitions'

const resolver: Resolver = (
  { id, count },
  _,
  { dataSources: { tagService } }
) => {
  return count || tagService.countArticles({ id })
}

export default resolver
