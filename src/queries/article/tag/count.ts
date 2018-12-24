import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { tagService } }) => {
  return tagService.countArticles({ id })
}

export default resolver
