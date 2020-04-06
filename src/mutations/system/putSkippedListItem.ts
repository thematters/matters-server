import { SKIPPED_LIST_ITEM_TYPES } from 'common/enums'
import { EntityNotFoundError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToPutSkippedListItemResolver } from 'definitions'

const resolver: MutationToPutSkippedListItemResolver = async (
  root,
  { input: { id, archived } },
  { viewer, dataSources: { systemService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const item = await systemService.baseFindById(dbId, 'blocklist')
  if (!item) {
    throw new EntityNotFoundError(`target ${dbId} does not exists`)
  }

  const params = { archived, updatedAt: new Date() }
  const updateItem = await systemService.updateSkippedItem({ id: dbId }, params)
  const updatedItems = [{ ...updateItem, id }]

  if (item.type === SKIPPED_LIST_ITEM_TYPES.EMAIL) {
    const relatedItem = await systemService.updateSkippedItem(
      { uuid: item.uuid, type: SKIPPED_LIST_ITEM_TYPES.AGENT_HASH },
      params
    )
    if (relatedItem) {
      updatedItems.push({
        ...relatedItem,
        id: toGlobalId({ type: 'SkippedListItem', id: relatedItem.id }),
      })
    }
  }

  return updatedItems
}

export default resolver
