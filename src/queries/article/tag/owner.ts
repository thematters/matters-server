import { TagToOwnerResolver } from 'definitions'

const resolver: TagToOwnerResolver = (
  { owner },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(owner)

export default resolver
