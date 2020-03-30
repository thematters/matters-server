import { isNil } from 'lodash'

import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToAgentHashesResolver } from 'definitions'

export const agentHashes: OSSToAgentHashesResolver = async (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { systemService } }
) => {
  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await systemService.baseCount({}, 'blocklist')

  return connectionFromPromisedArray(
    systemService.baseFind({
      offset,
      limit: first,
      table: 'blocklist'
    }),
    connectionArgs,
    totalCount
  )
}
