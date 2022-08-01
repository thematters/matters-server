import { TagToNumAuthorsResolver } from 'definitions'

const resolver: TagToNumAuthorsResolver = async (
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
