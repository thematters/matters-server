import { MutationToPayToResolver } from 'definitions'

const resolver: MutationToPayToResolver = async (
  parent,
  { input: { amount, currency } },
  ...rest
) => {
  return {}
}

export default resolver
