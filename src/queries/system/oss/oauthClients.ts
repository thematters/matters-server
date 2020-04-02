import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToOauthClientsResolver } from 'definitions'

export const oauthClients: OSSToOauthClientsResolver = async (
  root,
  { input },
  { viewer, dataSources: { oauthService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await oauthService.baseCount()

  return connectionFromPromisedArray(
    oauthService.baseFind({
      offset,
      limit: first,
    }),
    input,
    totalCount
  )
}
