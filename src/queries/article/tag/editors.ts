import { environment } from 'common/environment'
import { TagToEditorsResolver } from 'definitions'

const resolver: TagToEditorsResolver = (
  { editors },
  { input },
  { dataSources: { userService } }
) => {
  if (input?.excludeAdmin === true) {
    return userService.dataloader.loadMany(
      editors.filter((editor: string) => editor !== environment.mattyId) || []
    )
  }
  return userService.dataloader.loadMany(editors || [])
}

export default resolver
