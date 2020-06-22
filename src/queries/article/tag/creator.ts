import { TagToCreatorResolver } from 'definitions'

const resolver: TagToCreatorResolver = (
  { creator },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(creator)

export default resolver
