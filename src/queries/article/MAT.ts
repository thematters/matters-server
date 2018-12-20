import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  _: any,
  { articleService }: Context
) => {
  return await articleService.countAppreciation(id)
}

export default resolver
