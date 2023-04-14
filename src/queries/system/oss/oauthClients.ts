import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { OSSToOauthClientsResolver } from 'definitions'

export const oauthClients: OSSToOauthClientsResolver = async (
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
