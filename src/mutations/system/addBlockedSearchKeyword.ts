import { ASSET_TYPE, NODE_TYPES } from 'common/enums'
import {
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToAddBlockedSearchKeywordResolver } from 'definitions'

const resolver: MutationToAddBlockedSearchKeywordResolver = async (
  root,
  { input: { keyword } },
  { dataSources: { atomService, systemService }, viewer }
) => {
  const table = 'blocked_search_keyword'

 
  // update
  if (keyword) {
    const { id: dbId } = fromGlobalId(keyword)
    const item = await atomService.findUnique({
      table,
      where: { id: dbId },
    })

    if (!item) {
      throw new EntityNotFoundError(`target ${dbId} not found`)
    }

    const updatedItem = await atomService.update({
      table,
      where: { id: dbId },
      data: {
        ...(keyword ? { keyword } : {})
      },
    })
    // return updated anounncement
    const updatedAnnouncement = {
      ...updatedItem
    }
    return updatedAnnouncement
  }

  // create
  if (!keyword) {
    
    throw new UserInputError('required parameters missing: keyword')
  }

  const newItem = await atomService.create({
    table,
    data: { keyword },
  })

  const newAddedKeyword = {
    ...newItem,

  }
  console.log(newItem)
  console.log(newAddedKeyword)
  return true
}

export default resolver
