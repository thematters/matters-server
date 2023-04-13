import { NODE_TYPES } from 'common/enums'
import {
  connectionFromArray,
  fromConnectionArgs,
  toGlobalId,
} from 'common/utils'
import { OSSToSkippedListItemsResolver } from 'definitions'

export const skippedListItems: OSSToSkippedListItemsResolver = async (
  _,
  { input },
  { dataSources: { systemService } }
) => {
  const { type } = input
  const types = type ? [type] : ['email', 'agent_hash'] // backward compatible

  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await systemService.countSkippedItems({ types })

  const items = (
    await systemService.findSkippedItems({ types, skip, take })
  ).map((item) => ({
    ...item,
    id: toGlobalId({ type: NODE_TYPES.SkippedListItem, id: item.id }),
  }))

  return connectionFromArray(items, input, totalCount)
}
