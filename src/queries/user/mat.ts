import { GQLMATTypeResolver, Context, GQLTransactionPurpose } from 'definitions'

const resolver: GQLMATTypeResolver = {
  total: ({ id }, _, { dataSources: { userService } }: Context) =>
    userService.totalMAT(id),
  history: async (
    { id },
    { input },
    { dataSources: { userService } }: Context
  ) => {
    const history = await userService.transactionHistory({ id, ...input })

    return history
  }
}

export default resolver
