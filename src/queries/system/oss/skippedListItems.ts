import { connectionFromArray, cursorToIndex, toGlobalId } from 'common/utils'
import { OSSToSkippedListItemsResolver } from 'definitions'

export const skippedListItems: OSSToSkippedListItemsResolver = async (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { systemService } }
) => {
  const { first, after } = connectionArgs
  const offset = cursorToIndex(after) + 1
  const totalCount = await systemService.baseCount({}, 'blocklist')

  const items = (
    await systemService.baseFind({
      offset,
      limit: first,
      table: 'blocklist',
    })
  ).map((item) => ({
    ...item,
    id: toGlobalId({ type: 'SkippedListItem', id: item.id }),
  }))

  return connectionFromArray(items, connectionArgs, totalCount)
}
