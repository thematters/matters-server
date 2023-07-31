import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['numAuthors'] = async (
  { id, numAuthors },
  _,
  { dataSources: { tagService } }
) => {
  if (numAuthors) {
    return numAuthors
  }

  return tagService.countAuthors({ id })
}

export default resolver
