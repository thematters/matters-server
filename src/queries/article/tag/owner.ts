import { TagToOwnerResolver } from 'definitions'

const resolver: TagToOwnerResolver = (
  { owner },
  _,
  { dataSources: { userService } }
) => owner ? userService.dataloader.load(owner) : null

export default resolver
