import type { GQLOSSResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const oauthClients: GQLOSSResolvers['oauthClients'] = async (
  _,
  { input },
  { dataSources: { oauthService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await oauthService.baseCount()

  return connectionFromPromisedArray(
    oauthService.baseFind({ skip, take }),
    input,
    totalCount
  )
}
