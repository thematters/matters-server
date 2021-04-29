import { NODE_TYPES } from 'common/enums'
import { connectionFromArray, cursorToIndex, toGlobalId } from 'common/utils'
import { OSSToSkippedListItemsResolver } from 'definitions'

export const skippedListItems: OSSToSkippedListItemsResolver = async (
  root,
  { input: { type, ...connectionArgs } },
  { viewer, dataSources: { systemService } }
) => {
  const types = type ? [type] : ['email', 'agent_hash'] // backward compatible

  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await systemService.countSkippedItems({ types })

  const items = (
    await systemService.findSkippedItems({
      types,
      offset,
      limit: first,
    })
  ).map((item) => ({
    ...item,
    id: toGlobalId({ type: NODE_TYPES.SkippedListItem, id: item.id }),
  }))

  return connectionFromArray(items, connectionArgs, totalCount)
}
