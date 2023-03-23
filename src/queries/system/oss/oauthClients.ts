import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { OSSToOauthClientsResolver } from 'definitions'

export const oauthClients: OSSToOauthClientsResolver = async (
  root,
  { input },
  { viewer, dataSources: { oauthService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await oauthService.baseCount()

  return connectionFromPromisedArray(
    oauthService.baseFind({ skip, take }),
    input,
    totalCount
  )
}
