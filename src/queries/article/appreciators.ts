import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { articleService, userService }: Context
) => {
  const appreciators = await articleService.findAppreciatorsInBatch(
    id,
    offset,
    limit
  )
  return userService.idLoader.loadMany(appreciators.map(({ userId }) => userId))
}

export default resolver
