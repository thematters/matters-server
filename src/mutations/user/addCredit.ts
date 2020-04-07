import { MutationToAddCreditResolver } from 'definitions'

const resolver: MutationToAddCreditResolver = async (
  parent,
  { input: { amount } },
  ...rest
) => {
  return null
}

export default resolver
