import { TagToCreatorResolver } from 'definitions'

const resolver: TagToCreatorResolver = (
  { creator },
  _,
  { dataSources: { userService } }
) => {
  if (!creator) {
    return
  }

  return userService.dataloader.load(creator)
}

export default resolver
