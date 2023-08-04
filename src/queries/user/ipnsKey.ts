import type { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['ipnsKey'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const res = await atomService.findFirst({
    table: 'user_ipns_keys',
    where: { userId: id },
  })
  return res?.ipnsKey // ipnsAddress
}

export default resolver
