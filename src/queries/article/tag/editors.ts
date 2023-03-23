import { environment } from 'common/environment.js'
import { TagToEditorsResolver } from 'definitions'

const resolver: TagToEditorsResolver = (
  { editors, owner },
  { input },
  { dataSources: { userService } }
) => {
  let ids = editors || []

  if (input?.excludeAdmin === true) {
    ids = ids.filter((editor: string) => editor !== environment.mattyId)
  }

  if (input?.excludeOwner === true) {
    ids = ids.filter((editor: string) => editor !== owner)
  }

  return userService.dataloader.loadMany(ids)
}

export default resolver
