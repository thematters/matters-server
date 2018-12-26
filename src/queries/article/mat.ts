import { Resolver, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  _: any,
  { dataSources: { articleService } }: Context
) => {
  return await articleService.countAppreciation(id)
}

export default resolver
