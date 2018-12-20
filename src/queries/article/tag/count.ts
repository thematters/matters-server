import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { tagService }) => {
  return tagService.countArticles({ id })
}

export default resolver
