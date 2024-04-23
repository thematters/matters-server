import type { GQLMutationResolvers } from 'definitions'

import { NODE_TYPES, SKIPPED_LIST_ITEM_TYPES } from 'common/enums'
import { EntityNotFoundError, UserInputError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'

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
    const updatedItems = [{ ...updateItem, id }]

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
      },
    ]
  }

  return null
}

export default resolver
