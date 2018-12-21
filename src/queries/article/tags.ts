import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { articleService, tagService }
) => {
  const tagIds = await articleService.findTagIds({ id })
  return tagService.idLoader.loadMany(tagIds)
}

export default resolver
