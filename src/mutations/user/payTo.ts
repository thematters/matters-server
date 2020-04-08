import { MutationToPayToResolver } from 'definitions'

const resolver: MutationToPayToResolver = async (
  parent,
  { input: { amount, currency } },
  { viewer, dataSources: { userService } }
) => {
  return {}
}

export default resolver
