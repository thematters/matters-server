import type { GQLMutationResolvers, GlobalId } from '#definitions/index.js'

import { NODE_TYPES, SKIPPED_LIST_ITEM_TYPES } from '#common/enums/index.js'
import { EntityNotFoundError, UserInputError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putSkippedListItem'] = async (
  _,
  { input: { id, type, value, archived } },
  { dataSources: { systemService, atomService } }
) => {
  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const item = await atomService.findUnique({
      where: { id: dbId },
      table: 'blocklist',
    })

    if (!item) {
      throw new EntityNotFoundError(`target ${dbId} does not exists`)
    }

    const params = { archived, updatedAt: new Date() }
    const updateItem = await systemService.updateSkippedItem(
      { id: dbId },
      params
    )
    const updatedItems = [
      { ...updateItem, id, uuid: updateItem.uuid as GlobalId },
    ]

    if (item.type === SKIPPED_LIST_ITEM_TYPES.EMAIL) {
      const relatedItem = await systemService.updateSkippedItem(
        { uuid: item.uuid, type: SKIPPED_LIST_ITEM_TYPES.AGENT_HASH },
        params
      )
      if (relatedItem) {
        updatedItems.push({
          ...relatedItem,
          id: toGlobalId({
            type: NODE_TYPES.SkippedListItem,
            id: relatedItem.id,
          }),
          uuid: relatedItem.uuid as GlobalId,
        })
      }
    }

    return updatedItems
  }

  // Create
  if (type && value) {
    if (type !== 'domain') {
      throw new UserInputError('invalid "type"')
    }

    const item = await systemService.createSkippedItem({
      type: SKIPPED_LIST_ITEM_TYPES.DOMAIN,
      value,
      archived: false,
    })

    return [
      {
        ...item,
        id: toGlobalId({ type: NODE_TYPES.SkippedListItem, id: item.id }),
        uuid: item.uuid as GlobalId,
      },
    ]
  }

  return null
}

export default resolver
