import { GQLMATTypeResolver, Context } from 'definitions'

const resolver: GQLMATTypeResolver = {
  total: ({ id }, _, { dataSources: { userService } }: Context) =>
    userService.totalMAT(id),
  history: ({ id }, { input }, { dataSources: { userService } }: Context) =>
    userService.transactionHistory({ id, ...input })
}

export default resolver
